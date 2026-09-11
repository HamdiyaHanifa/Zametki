import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, cloudConfigured } from './supabase'

const TABLE = 'zametki_state'
const SAVE_DELAY = 3000        // ждём 3 секунды после последней правки
const SIZE_WARN = 15 * 1024 * 1024

/**
 * Синхронизация заметок с облаком Supabase.
 *
 * Правило безопасности: облако никогда не затирает локальные заметки само.
 * Если версии разошлись — статус становится 'conflict', и выбирает человек.
 *
 * status: off | signed-out | loading | conflict | saving | saved | error
 */
export function useCloudSync({ data, applyData }) {
  const [session, setSession] = useState(null)
  const [status, setStatus] = useState(cloudConfigured ? 'loading' : 'off')
  const [error, setError] = useState(null)
  const [conflict, setConflict] = useState(null)
  const [ready, setReady] = useState(false)   // автосохранение включается после сверки

  const dataRef = useRef(data)
  dataRef.current = data
  const lastSentRef = useRef(null)

  // Следим за входом и выходом
  useEffect(() => {
    if (!cloudConfigured) return
    let alive = true
    supabase.auth.getSession().then(({ data: d }) => {
      if (alive) setSession(d.session ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ?? null)
    })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  const push = useCallback(async (payload) => {
    if (!supabase || !session) return
    const body = payload ?? dataRef.current
    const text = JSON.stringify(body)
    if (text.length > SIZE_WARN) {
      setStatus('error')
      setError('Заметки слишком тяжёлые для одной отправки — скорее всего из-за больших картинок.')
      return
    }
    setStatus('saving')
    const { error: e } = await supabase.from(TABLE).upsert({
      user_id: session.user.id,
      data: body,
      updated_at: new Date().toISOString(),
    })
    if (e) {
      setStatus('error')
      setError(e.message)
      return
    }
    lastSentRef.current = text
    setError(null)
    setStatus('saved')
  }, [session])

  // При входе — сверяем локальное с облачным
  useEffect(() => {
    if (!cloudConfigured) { setStatus('off'); return }
    if (!session) { setStatus('signed-out'); setReady(false); setConflict(null); return }

    let alive = true
    setStatus('loading')
    ;(async () => {
      const { data: row, error: e } = await supabase
        .from(TABLE)
        .select('data, updated_at')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (!alive) return

      if (e) { setStatus('error'); setError(e.message); return }

      // В облаке пусто — заливаем то, что есть на этом устройстве
      if (!row) {
        await push(dataRef.current)
        if (alive) setReady(true)
        return
      }

      const localText = JSON.stringify(dataRef.current)
      const cloudText = JSON.stringify(row.data)
      if (localText === cloudText) {
        lastSentRef.current = cloudText
        setStatus('saved')
        setReady(true)
        return
      }

      // Версии разные — спрашиваем человека, ничего не трогаем
      setConflict({
        cloudData: row.data,
        cloudAt: row.updated_at,
        cloudNotes: countNotes(row.data),
        localNotes: countNotes(dataRef.current),
      })
      setStatus('conflict')
    })()
    return () => { alive = false }
  }, [session, push])

  // Автосохранение с задержкой
  useEffect(() => {
    if (!ready || !session || conflict) return
    const text = JSON.stringify(data)
    if (text === lastSentRef.current) return
    const t = setTimeout(() => { push(data) }, SAVE_DELAY)
    return () => clearTimeout(t)
  }, [data, ready, session, conflict, push])

  const resolveConflict = useCallback(async (choice) => {
    if (!conflict) return
    if (choice === 'cloud') {
      applyData(conflict.cloudData)
      lastSentRef.current = JSON.stringify(conflict.cloudData)
      setStatus('saved')
    } else {
      await push(dataRef.current)
    }
    setConflict(null)
    setReady(true)
  }, [conflict, applyData, push])

  const signIn = useCallback(async (email) => {
    if (!supabase) return { error: 'Облако не настроено' }
    const { error: e } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    })
    return { error: e?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setReady(false)
    lastSentRef.current = null
  }, [])

  return {
    enabled: cloudConfigured,
    session, status, error, conflict,
    signIn, signOut, resolveConflict,
    saveNow: () => push(dataRef.current),
  }
}

function countNotes(data) {
  try {
    return (data.canvases ?? []).reduce((sum, c) => sum + (c.notes?.length ?? 0), 0)
  } catch { return 0 }
}
