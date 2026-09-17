import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, cloudConfigured } from './supabase'
import { signature, countNotes, decideSync } from './compare'

const TABLE = 'zametki_state'
const SAVE_DELAY = 3000        // ждём 3 секунды после последней правки
const SIZE_WARN = 15 * 1024 * 1024
const MARK_KEY = 'zametki_sync'

// ── Точка синхронизации ──────────────────────────────────────
// Запоминаем отпечаток, на котором местные заметки и облако в последний раз
// совпали. По нему видно, кто менялся с тех пор: это устройство, облако или оба.
// Без такой отметки пришлось бы спрашивать человека при любом различии.

function loadMark(userId) {
  try {
    const mark = JSON.parse(localStorage.getItem(MARK_KEY))
    return mark?.userId === userId ? mark : null   // сменился вход — отметка чужая
  } catch {
    return null
  }
}

function saveMark(userId, changes) {
  try {
    const prev = loadMark(userId) ?? {}
    localStorage.setItem(MARK_KEY, JSON.stringify({ ...prev, userId, ...changes }))
  } catch { /* storage full */ }
}

/**
 * Синхронизация заметок с облаком Supabase.
 *
 * Правило безопасности: облако само затирает местные заметки только тогда,
 * когда на этом устройстве с прошлой синхронизации ничего не меняли — то есть
 * терять нечего. Если менялись обе версии, статус становится 'conflict'
 * и выбирает человек.
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
  const lastSentSigRef = useRef(null)

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
    // Отправили — теперь местное и облако совпадают
    const sig = signature(body)
    lastSentSigRef.current = sig
    saveMark(session.user.id, { sig })
    setError(null)
    setStatus('saved')
  }, [session])

  // При входе — сверяем местное с облачным
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

      const localSig = signature(dataRef.current)
      const cloudSig = signature(row.data)
      const mark = loadMark(session.user.id)

      switch (decideSync({ localSig, cloudSig, markSig: mark?.sig ?? null })) {
        // Содержимое одинаковое — спрашивать не о чем
        case 'same':
          lastSentSigRef.current = localSig
          saveMark(session.user.id, { sig: localSig })
          setStatus('saved')
          setReady(true)
          return

        // Меняли только на этом устройстве — отправляем молча
        case 'push':
          await push(dataRef.current)
          if (alive) setReady(true)
          return

        // Меняли только в облаке (на другом устройстве) — забираем молча.
        // Здесь ничего не теряется: местная версия — просто старая копия облачной.
        case 'pull':
          applyData(row.data)
          lastSentSigRef.current = cloudSig
          saveMark(session.user.id, { sig: cloudSig })
          setStatus('saved')
          setReady(true)
          return
      }

      // Менялись обе версии — это настоящий конфликт, выбирает человек
      setConflict({
        cloudData: row.data,
        cloudAt: row.updated_at,
        cloudNotes: countNotes(row.data),
        localNotes: countNotes(dataRef.current),
        localAt: mark?.editedAt ?? null,
        firstTime: !mark,            // отметки нет — сравнить по времени не с чем
      })
      setStatus('conflict')
    })()
    return () => { alive = false }
  }, [session, push, applyData])

  // Автосохранение с задержкой
  useEffect(() => {
    if (!ready || !session || conflict) return
    const sig = signature(data)
    if (sig === lastSentSigRef.current) return
    saveMark(session.user.id, { editedAt: Date.now() })   // когда правили на этом устройстве
    const t = setTimeout(() => { push(data) }, SAVE_DELAY)
    return () => clearTimeout(t)
  }, [data, ready, session, conflict, push])

  const resolveConflict = useCallback(async (choice) => {
    if (!conflict) return
    if (choice === 'cloud') {
      applyData(conflict.cloudData)
      const sig = signature(conflict.cloudData)
      lastSentSigRef.current = sig
      if (session) saveMark(session.user.id, { sig })
      setStatus('saved')
    } else {
      await push(dataRef.current)
    }
    setConflict(null)
    setReady(true)
  }, [conflict, applyData, push, session])

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
    lastSentSigRef.current = null
  }, [])

  return {
    enabled: cloudConfigured,
    session, status, error, conflict,
    signIn, signOut, resolveConflict,
    saveNow: () => push(dataRef.current),
  }
}
