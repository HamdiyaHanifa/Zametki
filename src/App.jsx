import { useState, useCallback, useRef, useEffect } from 'react'
import { Note } from './components/Note'
import { ProfileNote } from './components/ProfileNote'
import { Toolbar } from './components/Toolbar'
import { FocusView } from './components/FocusView'
import { FocusMode } from './components/FocusMode'
import { countWords, noteWordCount } from './utils/wordCount'
import { TAGS_MAP } from './utils/tags'
import { NotesPanel } from './components/NotesPanel'
import { HomeScreen } from './components/HomeScreen'
import styles from './App.module.css'

const COLORS_COUNT = 12
const MIN_SCALE = 0.1
const MAX_SCALE = 4
const STORAGE_KEY = 'zametki_v2'
const LEGACY_KEY = 'zametki_v1'

function createNote(id, colorIndex) {
  return {
    id,
    title: '',
    htmlContent: '',
    imageUrl: null,
    x: 100 + (id % 4) * 240,
    y: 100 + (id % 3) * 220,
    colorIndex,
    minimized: false,
    width: 280,
    height: 150,
  }
}

function createCanvas(id, name) {
  return {
    id,
    name: name || `Холст ${id}`,
    notes: [],
    order: [],
    nextNoteId: 1,
    viewport: { x: 0, y: 0, scale: 1 },
  }
}

const DEFAULT_NOTES = [
  { ...createNote(1, 0), title: 'Идеи', htmlContent: '<p>Записывай свои <b>идеи</b> здесь...</p>' },
  { ...createNote(2, 1), title: 'Задачи', htmlContent: '<p>- Задача 1</p><p>- Задача 2</p>' },
  { ...createNote(3, 2), title: 'Заметка', htmlContent: '' },
]

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (Array.isArray(data?.canvases)) return data
    }
    // Migrate from v1
    const raw1 = localStorage.getItem(LEGACY_KEY)
    if (raw1) {
      const { notes, order, nextId } = JSON.parse(raw1)
      if (Array.isArray(notes)) {
        return {
          canvases: [{
            id: 1,
            name: 'Мой холст',
            notes,
            order: order ?? notes.map((n) => n.id),
            nextNoteId: nextId ?? notes.length + 1,
            viewport: { x: 0, y: 0, scale: 1 },
          }],
          nextCanvasId: 2,
        }
      }
    }
  } catch { /* ignore */ }
  return null
}

export default function App() {
  const saved = loadSaved()
  const [canvases, setCanvases] = useState(() => saved?.canvases ?? [{
    ...createCanvas(1, 'Мой холст'),
    notes: DEFAULT_NOTES,
    order: DEFAULT_NOTES.map((n) => n.id),
    nextNoteId: 4,
  }])
  const nextCanvasIdRef = useRef(saved?.nextCanvasId ?? 2)

  const [activeCanvasId, setActiveCanvasId] = useState(null)
  const [focusedNoteId, setFocusedNoteId] = useState(null)
  const [showPanel, setShowPanel] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [showFocusMode, setShowFocusMode] = useState(false)
  const [timerDangerProgress, setTimerDangerProgress] = useState(0)
  const [timerDangerActive, setTimerDangerActive] = useState(false)
  const [timerDangerResetSignal, setTimerDangerResetSignal] = useState(null)
  const [timerBlindMode, setTimerBlindMode] = useState('off')

  const focusedNoteRef = useRef(null)
  const notesRef = useRef([])
  const updateNoteRef = useRef(null)
  const timerDangerActiveRef = useRef(false)
  const timerDangerLastActivityRef = useRef(0)
  const timerDangerStartDataRef = useRef({ noteId: null, htmlContent: '' })
  const timerDangerFailCbRef = useRef(null)
  const timerDangerTimeoutRef = useRef(5)
  const timerDangerIntervalRef = useRef(null)

  const handleTimerDangerStart = useCallback((inactivitySec, onInactivityFail) => {
    const n = focusedNoteRef.current
    if (n) {
      timerDangerStartDataRef.current = { noteId: n.id, htmlContent: n.htmlContent }
    } else {
      // Canvas mode: snapshot every text note
      timerDangerStartDataRef.current = {
        noteId: null,
        htmlContent: '',
        allNotes: notesRef.current.map(({ id, htmlContent }) => ({ id, htmlContent })),
      }
    }
    timerDangerLastActivityRef.current = Date.now()
    timerDangerTimeoutRef.current = inactivitySec
    timerDangerFailCbRef.current = onInactivityFail
    timerDangerActiveRef.current = true
    setTimerDangerActive(true)
  }, [])

  const restoreDangerSnapshot = useCallback(() => {
    const { noteId, htmlContent, allNotes } = timerDangerStartDataRef.current
    if (noteId !== null) {
      updateNoteRef.current?.(noteId, { htmlContent })
      setTimerDangerResetSignal({ noteId, htmlContent, t: Date.now() })
    } else if (allNotes?.length) {
      allNotes.forEach(({ id, htmlContent: hc }) => updateNoteRef.current?.(id, { htmlContent: hc }))
      setTimerDangerResetSignal({ noteId: null, allNotes, t: Date.now() })
    }
  }, [])

  const handleTimerDangerStop = useCallback((keepText) => {
    clearInterval(timerDangerIntervalRef.current)
    timerDangerActiveRef.current = false
    setTimerDangerActive(false)
    setTimerDangerProgress(0)
    if (!keepText) restoreDangerSnapshot()
  }, [restoreDangerSnapshot])

  const handleTimerDangerActivity = useCallback(() => {
    if (timerDangerActiveRef.current) {
      timerDangerLastActivityRef.current = Date.now()
      setTimerDangerProgress(0)
    }
  }, [])
  const [floatingNotes, setFloatingNotes] = useState([])
  const floatUidRef = useRef(0)
  const floatPosRef = useRef({})

  const [vpState, setVpState] = useState({ x: 0, y: 0, scale: 1 })
  const vpRef = useRef(vpState)
  const gestureRef = useRef(null)
  const bgRef = useRef(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Derived from active canvas
  const activeCanvas = canvases.find((c) => c.id === activeCanvasId) ?? null
  const notes = activeCanvas?.notes ?? []
  const order = activeCanvas?.order ?? []

  // Auto-save whenever canvases change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        canvases,
        nextCanvasId: nextCanvasIdRef.current,
      }))
    } catch { /* storage full */ }
  }, [canvases])

  // Save viewport on tab close
  useEffect(() => {
    const onUnload = () => {
      if (!activeCanvasId) return
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return
        const data = JSON.parse(raw)
        data.canvases = data.canvases.map((c) =>
          c.id === activeCanvasId ? { ...c, viewport: vpRef.current } : c
        )
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch { /* ignore */ }
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [activeCanvasId])

  // Safety: if active canvas was deleted, go home
  useEffect(() => {
    if (activeCanvasId && !activeCanvas) setActiveCanvasId(null)
  }, [activeCanvasId, activeCanvas])

  // ── Canvas management ──────────────────────────────────────────

  const openCanvas = useCallback((id) => {
    const canvas = canvases.find((c) => c.id === id)
    const vp = canvas?.viewport ?? { x: 0, y: 0, scale: 1 }
    vpRef.current = vp
    setVpState(vp)
    setFocusedNoteId(null)
    setFloatingNotes([])
    setShowPanel(false)
    setActiveCanvasId(id)
  }, [canvases])

  const openHome = useCallback(() => {
    // Persist current viewport before leaving
    setCanvases((prev) => prev.map((c) =>
      c.id === activeCanvasId ? { ...c, viewport: vpRef.current } : c
    ))
    setActiveCanvasId(null)
    setFocusedNoteId(null)
    setFloatingNotes([])
    setShowPanel(false)
  }, [activeCanvasId])

  const createNewCanvas = useCallback(() => {
    const id = nextCanvasIdRef.current++
    const canvas = createCanvas(id)
    setCanvases((prev) => [...prev, canvas])
    vpRef.current = canvas.viewport
    setVpState(canvas.viewport)
    setFocusedNoteId(null)
    setFloatingNotes([])
    setShowPanel(false)
    setActiveCanvasId(id)
  }, [])

  const deleteCanvas = useCallback((id) => {
    setCanvases((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const renameCanvas = useCallback((id, name) => {
    setCanvases((prev) => prev.map((c) => c.id === id ? { ...c, name } : c))
  }, [])

  // ── Note mutations (all patch canvases array) ──────────────────

  const patchCanvas = useCallback((updater) => {
    setCanvases((prev) => prev.map((c) => c.id === activeCanvasId ? updater(c) : c))
  }, [activeCanvasId])

  const bringToFront = useCallback((id) => {
    patchCanvas((c) => ({
      ...c,
      order: c.order[c.order.length - 1] === id
        ? c.order
        : [...c.order.filter((x) => x !== id), id],
    }))
  }, [patchCanvas])

  const spawnNote = useCallback((patch) => {
    const vp = vpRef.current
    const worldX = (window.innerWidth / 2 - vp.x) / vp.scale - 150
    const worldY = (window.innerHeight / 2 - vp.y) / vp.scale - 100
    patchCanvas((c) => {
      const id = c.nextNoteId
      const note = {
        ...createNote(id, id % COLORS_COUNT),
        x: worldX + (Math.random() - 0.5) * 100,
        y: worldY + (Math.random() - 0.5) * 100,
        ...patch,
      }
      return { ...c, notes: [...c.notes, note], order: [...c.order, id], nextNoteId: id + 1 }
    })
  }, [patchCanvas])

  const addNote = useCallback(() => spawnNote({}), [spawnNote])

  const addProfile = useCallback(() => spawnNote({
    noteType: 'profile',
    title: '',
    htmlContent: '',
    imageUrl: null,
    fields: [
      { id: 1, label: 'Имя', value: '' },
      { id: 2, label: 'Пол', value: '' },
      { id: 3, label: 'Возраст', value: '' },
      { id: 4, label: 'Роль', value: '' },
    ],
    width: 260,
    height: 150,
  }), [spawnNote])

  const loadImageFile = useCallback((file, worldX, worldY) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const vp = vpRef.current
      const x = worldX ?? (window.innerWidth / 2 - vp.x) / vp.scale - 150
      const y = worldY ?? (window.innerHeight / 2 - vp.y) / vp.scale - 100
      patchCanvas((c) => {
        const id = c.nextNoteId
        const note = {
          ...createNote(id, id % COLORS_COUNT),
          title: file.name.replace(/\.[^.]+$/, ''),
          imageUrl: e.target.result,
          width: 300,
          height: 220,
          x,
          y,
        }
        return { ...c, notes: [...c.notes, note], order: [...c.order, id], nextNoteId: id + 1 }
      })
    }
    reader.readAsDataURL(file)
  }, [patchCanvas])

  const updateNote = useCallback((id, patch) => {
    patchCanvas((c) => ({
      ...c,
      notes: c.notes.map((n) => n.id === id ? { ...n, ...patch } : n),
    }))
  }, [patchCanvas])

  useEffect(() => {
    focusedNoteRef.current = focusedNoteId ? notes.find(n => n.id === focusedNoteId) : null
  }, [focusedNoteId, notes])

  useEffect(() => { notesRef.current = notes }, [notes])
  useEffect(() => { updateNoteRef.current = updateNote }, [updateNote])

  useEffect(() => {
    if (!timerDangerActive) return
    timerDangerIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - timerDangerLastActivityRef.current) / 1000
      const prog = Math.min(elapsed / timerDangerTimeoutRef.current, 1)
      setTimerDangerProgress(prog)
      if (elapsed >= timerDangerTimeoutRef.current) {
        clearInterval(timerDangerIntervalRef.current)
        timerDangerActiveRef.current = false
        setTimerDangerActive(false)
        setTimerDangerProgress(0)
        restoreDangerSnapshot()
        timerDangerFailCbRef.current?.()
      }
    }, 80)
    return () => clearInterval(timerDangerIntervalRef.current)
  }, [timerDangerActive, restoreDangerSnapshot])

  const resetNoteWordCount = useCallback((id) => {
    patchCanvas((c) => ({
      ...c,
      notes: c.notes.map((n) => n.id === id
        ? { ...n, wordCountOffset: countWords(n.htmlContent) + countWords(n.description) }
        : n
      ),
    }))
  }, [patchCanvas])

  const resetAllWordCounts = useCallback(() => {
    patchCanvas((c) => ({
      ...c,
      notes: c.notes.map((n) => ({
        ...n,
        wordCountOffset: countWords(n.htmlContent) + countWords(n.description),
      })),
    }))
  }, [patchCanvas])

  const moveNote = useCallback((id, screenDx, screenDy) => {
    const s = vpRef.current.scale
    patchCanvas((c) => ({
      ...c,
      notes: c.notes.map((n) =>
        n.id === id ? { ...n, x: n.x + screenDx / s, y: n.y + screenDy / s } : n
      ),
    }))
  }, [patchCanvas])

  const deleteNote = useCallback((id) => {
    patchCanvas((c) => ({
      ...c,
      notes: c.notes.filter((n) => n.id !== id),
      order: c.order.filter((x) => x !== id),
    }))
  }, [patchCanvas])

  const navigateToNote = useCallback((id) => {
    const note = notes.find((n) => n.id === id)
    if (!note) return
    const vp = vpRef.current
    const PANEL_W = 300
    const w = note.width || 280
    const h = note.height || 150
    const visibleCx = (window.innerWidth - PANEL_W) / 2
    const visibleCy = (window.innerHeight - 52) / 2 + 52
    const newVp = { ...vp, x: visibleCx - (note.x + w / 2) * vp.scale, y: visibleCy - (note.y + h / 2) * vp.scale }
    vpRef.current = newVp
    setNavigating(true)
    setVpState(newVp)
    setTimeout(() => setNavigating(false), 500)
  }, [notes])

  // ── Floating notes ─────────────────────────────────────────────

  const addFloatingNote = useCallback((noteId, x, y, w, h) => {
    setFloatingNotes((prev) => {
      if (prev.some((f) => f.noteId === noteId)) return prev
      const uid = floatUidRef.current++
      const entry = {
        uid, noteId,
        x: x ?? 60 + prev.length * 30,
        y: y ?? 80 + prev.length * 30,
        w: w ?? 360, h: h ?? 280,
      }
      floatPosRef.current[uid] = { x: entry.x, y: entry.y, w: entry.w, h: entry.h }
      return [...prev, entry]
    })
  }, [])

  const removeFloatingNote = useCallback((uid) => {
    delete floatPosRef.current[uid]
    setFloatingNotes((prev) => prev.filter((f) => f.uid !== uid))
  }, [])

  const updateFloatPos = useCallback((uid, pos) => {
    floatPosRef.current[uid] = pos
  }, [])

  const openOrSwapFocus = useCallback((noteId) => {
    const floating = floatingNotes.find((f) => f.noteId === noteId)
    if (!floating) { setFocusedNoteId(noteId); return }
    const livePos = floatPosRef.current[floating.uid] || { x: floating.x, y: floating.y, w: floating.w ?? 360, h: floating.h ?? 280 }
    delete floatPosRef.current[floating.uid]
    const newUid = floatUidRef.current++
    floatPosRef.current[newUid] = livePos
    setFloatingNotes([...floatingNotes.filter((f) => f.noteId !== noteId), { uid: newUid, noteId: focusedNoteId, ...livePos }])
    setFocusedNoteId(noteId)
  }, [floatingNotes, focusedNoteId])

  const closeFocusView = useCallback(() => {
    setFocusedNoteId(null)
    setFloatingNotes([])
    setShowPanel(false)
  }, [])

  // ── Export / Import ────────────────────────────────────────────

  const exportNotes = useCallback((tagFilter = null, format = 'json') => {
    const filteredCanvases = tagFilter
      ? canvases
          .map(c => {
            const filteredNotes = c.notes.filter(n => n.tag === tagFilter)
            return { ...c, notes: filteredNotes, order: c.order.filter(id => filteredNotes.some(n => n.id === id)) }
          })
          .filter(c => c.notes.length > 0)
      : canvases
    const tagSuffix = tagFilter ? `_${TAGS_MAP[tagFilter]?.label ?? tagFilter}` : ''
    const date = new Date().toLocaleDateString('ru')

    let blob
    let filename
    if (format === 'txt') {
      const noteParts = []
      filteredCanvases.forEach(canvas => {
        canvas.notes.forEach(note => {
          const lines = []
          if (note.title) { lines.push(note.title); lines.push('') }
          if (note.noteType === 'profile') {
            ;(note.fields ?? []).forEach(f => { if (f.value) lines.push(`${f.label}: ${f.value}`) })
            const desc = (note.description || '').trim()
            if (desc) { lines.push(''); lines.push(desc) }
          } else if (note.imageUrl) {
            lines.push('[Изображение]')
          } else {
            const text = (note.htmlContent || '')
              .replace(/<\/(p|h[1-6]|div|li)>/gi, '\n')
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
              .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
              .replace(/\n{3,}/g, '\n\n').trim()
            if (text) lines.push(text)
          }
          if (lines.length) noteParts.push(lines.join('\n').trimEnd())
        })
      })
      blob = new Blob([noteParts.join('\n\n—\n\n')], { type: 'text/plain;charset=utf-8' })
      filename = `заметки${tagSuffix}_${date}.txt`
    } else {
      const data = JSON.stringify({ canvases: filteredCanvases, nextCanvasId: nextCanvasIdRef.current }, null, 2)
      blob = new Blob([data], { type: 'application/json' })
      filename = `заметки${tagSuffix}_${date}.json`
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [canvases])

  const importNotes = useCallback((file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result)
        if (Array.isArray(parsed?.canvases)) {
          if (parsed.nextCanvasId) nextCanvasIdRef.current = Math.max(nextCanvasIdRef.current, parsed.nextCanvasId)
          setCanvases(parsed.canvases)
          setActiveCanvasId(null)
          return
        }
        // Legacy v1 format — import into current canvas
        const { notes: n, order: o, nextId: sid } = parsed
        if (Array.isArray(n) && activeCanvasId) {
          patchCanvas((c) => ({
            ...c,
            notes: n,
            order: o ?? n.map((nn) => nn.id),
            nextNoteId: Math.max(c.nextNoteId, sid ?? n.length + 1),
          }))
        }
      } catch { alert('Не удалось открыть файл заметок') }
    }
    reader.readAsText(file)
  }, [activeCanvasId, patchCanvas])

  // ── Viewport ───────────────────────────────────────────────────

  const setViewport = useCallback((vp) => {
    vpRef.current = vp
    setVpState(vp)
  }, [])

  const handleBgMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    const start = { x: e.clientX, y: e.clientY, vx: vpRef.current.x, vy: vpRef.current.y }
    const onMove = (ev) => setViewport({ ...vpRef.current, x: start.vx + ev.clientX - start.x, y: start.vy + ev.clientY - start.y })
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [setViewport])

  useEffect(() => {
    const el = bgRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const vp = vpRef.current
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, vp.scale * factor))
      setViewport({
        x: e.clientX - (e.clientX - vp.x) * (newScale / vp.scale),
        y: e.clientY - (e.clientY - vp.y) * (newScale / vp.scale),
        scale: newScale,
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [setViewport, activeCanvasId]) // re-run when canvas changes (bgRef re-mounts)

  useEffect(() => {
    const onPaste = (e) => {
      const items = Array.from(e.clipboardData?.items || [])
      const imgItem = items.find((i) => i.type.startsWith('image/'))
      if (imgItem) loadImageFile(imgItem.getAsFile())
    }
    if (activeCanvasId) window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [loadImageFile, activeCanvasId])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    files.forEach((file) => {
      const vp = vpRef.current
      loadImageFile(file, (e.clientX - vp.x) / vp.scale - 150, (e.clientY - vp.y) / vp.scale - 20)
    })
  }, [loadImageFile])

  const handleBgTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0]
      gestureRef.current = { type: 'pan', sx: t.clientX, sy: t.clientY, vx: vpRef.current.x, vy: vpRef.current.y }
    } else if (e.touches.length >= 2) {
      const t0 = e.touches[0], t1 = e.touches[1]
      gestureRef.current = {
        type: 'pinch',
        startDist: Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY),
        startScale: vpRef.current.scale,
        cx: (t0.clientX + t1.clientX) / 2, cy: (t0.clientY + t1.clientY) / 2,
        vx: vpRef.current.x, vy: vpRef.current.y,
      }
    }

    const onMove = (ev) => {
      const g = gestureRef.current
      if (!g) return
      ev.preventDefault()
      if (ev.touches.length >= 2) {
        const t0 = ev.touches[0], t1 = ev.touches[1]
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
        if (g.type === 'pan') {
          gestureRef.current = {
            type: 'pinch',
            startDist: dist, startScale: vpRef.current.scale,
            cx: (t0.clientX + t1.clientX) / 2, cy: (t0.clientY + t1.clientY) / 2,
            vx: vpRef.current.x, vy: vpRef.current.y,
          }
          return
        }
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, g.startScale * dist / g.startDist))
        setViewport({
          x: g.cx - (g.cx - g.vx) * (newScale / g.startScale),
          y: g.cy - (g.cy - g.vy) * (newScale / g.startScale),
          scale: newScale,
        })
      } else if (ev.touches.length === 1 && g.type === 'pan') {
        const t = ev.touches[0]
        setViewport({ ...vpRef.current, x: g.vx + t.clientX - g.sx, y: g.vy + t.clientY - g.sy })
      }
    }

    const onEnd = () => {
      gestureRef.current = null
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }

    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
  }, [setViewport])

  // ── Render ─────────────────────────────────────────────────────

  if (!activeCanvasId) {
    return (
      <HomeScreen
        canvases={canvases}
        onCreate={createNewCanvas}
        onOpen={openCanvas}
        onDelete={deleteCanvas}
        onRename={renameCanvas}
      />
    )
  }

  const focusedNote = focusedNoteId ? notes.find((n) => n.id === focusedNoteId) : null

  const exportTagCounts = {}
  canvases.forEach(c => c.notes.forEach(n => {
    if (n.tag) exportTagCounts[n.tag] = (exportTagCounts[n.tag] || 0) + 1
  }))

  return (
    <div className={styles.canvas}>
      <Toolbar
        onAdd={addNote}
        onAddProfile={addProfile}
        onUploadImage={loadImageFile}
        scale={vpState.scale}
        onExport={exportNotes}
        onImport={importNotes}
        onTogglePanel={() => setShowPanel((v) => !v)}
        noteCount={notes.length}
        exportTagCounts={exportTagCounts}
        totalWords={notes.reduce((sum, n) => sum + noteWordCount(n), 0)}
        notes={notes}
        onResetAllWordCounts={resetAllWordCounts}
        onResetNoteWordCount={resetNoteWordCount}
        onToggleFocus={() => setShowFocusMode(v => !v)}
        focusActive={showFocusMode}
        onHome={openHome}
        canvasName={activeCanvas?.name}
      />
      <FocusMode
        totalWords={notes.reduce((sum, n) => sum + noteWordCount(n), 0)}
        onClose={() => setShowFocusMode(false)}
        onDangerStart={handleTimerDangerStart}
        onDangerStop={handleTimerDangerStop}
        dangerInactiveProgress={timerDangerProgress}
        visible={showFocusMode}
        onShow={() => setShowFocusMode(true)}
        onBlindModeChange={setTimerBlindMode}
      />
      {showPanel && (
        <NotesPanel
          notes={notes}
          onNavigate={navigateToNote}
          onOpenFocus={focusedNoteId
            ? (id) => { openOrSwapFocus(id); setShowPanel(false) }
            : (id) => { setFocusedNoteId(id); setShowPanel(false) }
          }
          onClose={() => setShowPanel(false)}
          focusMode={!!focusedNoteId}
          currentNoteId={focusedNoteId}
          onAddFloating={(id) => { addFloatingNote(id); setShowPanel(false) }}
        />
      )}
      {focusedNote && (
        <FocusView
          note={focusedNote}
          onUpdate={updateNote}
          onClose={closeFocusView}
          notes={notes}
          onSwitchFocus={setFocusedNoteId}
          floatingNotes={floatingNotes}
          onAddFloating={addFloatingNote}
          onRemoveFloating={removeFloatingNote}
          onUpdateFloatPos={updateFloatPos}
          showPanel={showPanel}
          onTogglePanel={() => setShowPanel((v) => !v)}
          totalWords={notes.reduce((sum, n) => sum + noteWordCount(n), 0)}
          onToggleFocusMode={() => setShowFocusMode(v => !v)}
          focusModeVisible={showFocusMode}
          onTimerDangerActivity={handleTimerDangerActivity}
          timerDangerResetSignal={timerDangerResetSignal}
          blindMode={timerBlindMode}
        />
      )}
      <div
        ref={bgRef}
        className={`${styles.background} ${isDragOver ? styles.dragOver : ''}`}
        onMouseDown={handleBgMouseDown}
        onTouchStart={handleBgTouchStart}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
      >
        <div
          className={styles.world}
          style={{
            transform: `translate(${vpState.x}px, ${vpState.y}px) scale(${vpState.scale})`,
            transition: navigating ? 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)' : undefined,
          }}
        >
          {notes.map((note) =>
            note.noteType === 'profile' ? (
              <ProfileNote
                key={note.id}
                note={note}
                onUpdate={updateNote}
                onMove={moveNote}
                onDelete={deleteNote}
                onFocus={bringToFront}
                onOpenFocus={setFocusedNoteId}
                scale={vpState.scale}
                zIndex={order.indexOf(note.id) + 1}
                onResetWordCount={resetNoteWordCount}
              />
            ) : (
              <Note
                key={note.id}
                note={note}
                onUpdate={updateNote}
                onMove={moveNote}
                onDelete={deleteNote}
                onFocus={bringToFront}
                onOpenFocus={setFocusedNoteId}
                scale={vpState.scale}
                zIndex={order.indexOf(note.id) + 1}
                onResetWordCount={resetNoteWordCount}
                onTimerDangerActivity={handleTimerDangerActivity}
                blindMode={timerBlindMode}
                timerDangerResetSignal={timerDangerResetSignal}
              />
            )
          )}
        </div>
        {isDragOver && (
          <div className={styles.dropHint}>Отпустите чтобы добавить изображение</div>
        )}
        {notes.length === 0 && !isDragOver && (
          <div className={styles.empty}>Нет заметок. Нажмите «+ Заметка» или перетащите фото.</div>
        )}
      </div>
    </div>
  )
}
