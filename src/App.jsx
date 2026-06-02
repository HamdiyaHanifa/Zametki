import { useState, useCallback, useRef, useEffect } from 'react'
import { Note } from './components/Note'
import { Toolbar } from './components/Toolbar'
import { FocusView } from './components/FocusView'
import { NotesPanel } from './components/NotesPanel'
import styles from './App.module.css'

let nextId = 4
const COLORS_COUNT = 12
const MIN_SCALE = 0.1
const MAX_SCALE = 4
const STORAGE_KEY = 'zametki_v1'

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

const INITIAL_NOTES = [
  { ...createNote(1, 0), title: 'Идеи', htmlContent: '<p>Записывай свои <b>идеи</b> здесь...</p>' },
  { ...createNote(2, 1), title: 'Задачи', htmlContent: '<p>- Задача 1</p><p>- Задача 2</p>' },
  { ...createNote(3, 2), title: 'Заметка', htmlContent: '' },
]

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { notes, order, nextId: savedId } = JSON.parse(raw)
    if (savedId && savedId > nextId) nextId = savedId
    return { notes, order }
  } catch { return null }
}

export default function App() {
  const saved = loadSaved()
  const [notes, setNotes] = useState(saved?.notes ?? INITIAL_NOTES)
  const [order, setOrder] = useState(saved?.order ?? INITIAL_NOTES.map((n) => n.id))
  const [focusedNoteId, setFocusedNoteId] = useState(null)
  const [showPanel, setShowPanel] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [floatingNotes, setFloatingNotes] = useState([])
  const floatUidRef = useRef(0)
  const floatPosRef = useRef({}) // uid → { x, y, w, h } — live pos, no re-render
  const [viewport, setVpState] = useState({ x: 0, y: 0, scale: 1 })
  const vpRef = useRef(viewport)
  const gestureRef = useRef(null)
  const bgRef = useRef(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const setViewport = useCallback((vp) => {
    vpRef.current = vp
    setVpState(vp)
  }, [])

  // Auto-save to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ notes, order, nextId }))
    } catch { /* storage full — ignore */ }
  }, [notes, order])

  const bringToFront = useCallback((id) => {
    setOrder((prev) => {
      if (prev[prev.length - 1] === id) return prev
      return [...prev.filter((x) => x !== id), id]
    })
  }, [])

  const spawnNote = useCallback((patch) => {
    const id = nextId++
    const vp = vpRef.current
    const worldX = (window.innerWidth / 2 - vp.x) / vp.scale - 150
    const worldY = (window.innerHeight / 2 - vp.y) / vp.scale - 100
    const note = {
      ...createNote(id, id % COLORS_COUNT),
      x: worldX + (Math.random() - 0.5) * 100,
      y: worldY + (Math.random() - 0.5) * 100,
      ...patch,
    }
    setNotes((prev) => [...prev, note])
    setOrder((prev) => [...prev, id])
  }, [])

  const addNote = useCallback(() => spawnNote({}), [spawnNote])

  const loadImageFile = useCallback((file, worldX, worldY) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const id = nextId++
      const vp = vpRef.current
      const x = worldX ?? (window.innerWidth / 2 - vp.x) / vp.scale - 150
      const y = worldY ?? (window.innerHeight / 2 - vp.y) / vp.scale - 100
      const note = {
        ...createNote(id, id % COLORS_COUNT),
        title: file.name.replace(/\.[^.]+$/, ''),
        imageUrl: e.target.result,
        width: 300,
        height: 220,
        x,
        y,
      }
      setNotes((prev) => [...prev, note])
      setOrder((prev) => [...prev, id])
    }
    reader.readAsDataURL(file)
  }, [])

  const updateNote = useCallback((id, patch) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }, [])

  const moveNote = useCallback((id, screenDx, screenDy) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n
        const s = vpRef.current.scale
        return { ...n, x: n.x + screenDx / s, y: n.y + screenDy / s }
      })
    )
  }, [])

  const deleteNote = useCallback((id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    setOrder((prev) => prev.filter((x) => x !== id))
  }, [])

  // Pan canvas to center on a note (panel navigation)
  const navigateToNote = useCallback((id) => {
    const note = notes.find((n) => n.id === id)
    if (!note) return
    const vp = vpRef.current
    const PANEL_W = 300
    const w = note.width || 280
    const h = note.height || 150
    // Center in the visible area left of the panel
    const visibleCx = (window.innerWidth - PANEL_W) / 2
    const visibleCy = (window.innerHeight - 52) / 2 + 52
    const newX = visibleCx - (note.x + w / 2) * vp.scale
    const newY = visibleCy - (note.y + h / 2) * vp.scale
    setNavigating(true)
    setViewport({ ...vp, x: newX, y: newY })
    setTimeout(() => setNavigating(false), 500)
  }, [notes, setViewport])

  // Floating note windows inside FocusView
  const addFloatingNote = useCallback((noteId, x, y, w, h) => {
    setFloatingNotes((prev) => {
      if (prev.some((f) => f.noteId === noteId)) return prev
      const uid = floatUidRef.current++
      const entry = {
        uid,
        noteId,
        x: x ?? 60 + prev.length * 30,
        y: y ?? 80 + prev.length * 30,
        w: w ?? 360,
        h: h ?? 280,
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

  // Swap: if noteId is a floating window, it becomes the main note and current main
  // becomes a floating window at the same position/size the floating window was
  const openOrSwapFocus = useCallback((noteId) => {
    setFloatingNotes((prev) => {
      const floating = prev.find((f) => f.noteId === noteId)
      if (!floating) {
        // Not a floating note — just switch main
        setFocusedNoteId(noteId)
        return prev
      }
      // Get current live pos/size of the floating note
      const livePos = floatPosRef.current[floating.uid] || { x: floating.x, y: floating.y, w: floating.w ?? 360, h: floating.h ?? 280 }
      // Remove the floating note that's becoming main
      const withoutSwapped = prev.filter((f) => f.noteId !== noteId)
      delete floatPosRef.current[floating.uid]
      // Add current main as floating at the same spot
      const newUid = floatUidRef.current++
      floatPosRef.current[newUid] = livePos
      const newEntry = { uid: newUid, noteId: focusedNoteId, ...livePos }
      setFocusedNoteId(noteId)
      return [...withoutSwapped, newEntry]
    })
  }, [focusedNoteId])

  // Clear floating notes when FocusView closes
  const closeFocusView = useCallback(() => {
    setFocusedNoteId(null)
    setFloatingNotes([])
    setShowPanel(false)
  }, [])

  // Export all notes to a .json file
  const exportNotes = useCallback(() => {
    const data = JSON.stringify({ notes, order, nextId }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `заметки_${new Date().toLocaleDateString('ru')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [notes, order])

  // Import notes from a .json file
  const importNotes = useCallback((file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const { notes: n, order: o, nextId: id } = JSON.parse(e.target.result)
        if (Array.isArray(n) && Array.isArray(o)) {
          if (id && id > nextId) nextId = id
          setNotes(n)
          setOrder(o)
        }
      } catch { alert('Не удалось открыть файл заметок') }
    }
    reader.readAsText(file)
  }, [])

  // Mouse pan on background
  const handleBgMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    const start = { x: e.clientX, y: e.clientY, vx: vpRef.current.x, vy: vpRef.current.y }
    const onMove = (e) => {
      setViewport({ ...vpRef.current, x: start.vx + e.clientX - start.x, y: start.vy + e.clientY - start.y })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [setViewport])

  // Wheel zoom
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
  }, [setViewport])

  // Paste image from clipboard
  useEffect(() => {
    const onPaste = (e) => {
      const items = Array.from(e.clipboardData?.items || [])
      const imgItem = items.find((i) => i.type.startsWith('image/'))
      if (imgItem) loadImageFile(imgItem.getAsFile())
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [loadImageFile])

  // Drop image onto canvas
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    files.forEach((file) => {
      const vp = vpRef.current
      const worldX = (e.clientX - vp.x) / vp.scale - 150
      const worldY = (e.clientY - vp.y) / vp.scale - 20
      loadImageFile(file, worldX, worldY)
    })
  }, [loadImageFile])

  // Touch pan + pinch zoom
  const handleBgTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0]
      gestureRef.current = {
        type: 'pan',
        sx: t.clientX, sy: t.clientY,
        vx: vpRef.current.x, vy: vpRef.current.y,
      }
    } else if (e.touches.length >= 2) {
      const t0 = e.touches[0], t1 = e.touches[1]
      gestureRef.current = {
        type: 'pinch',
        startDist: Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY),
        startScale: vpRef.current.scale,
        cx: (t0.clientX + t1.clientX) / 2,
        cy: (t0.clientY + t1.clientY) / 2,
        vx: vpRef.current.x, vy: vpRef.current.y,
      }
    }

    const onMove = (e) => {
      const g = gestureRef.current
      if (!g) return
      e.preventDefault()
      if (e.touches.length >= 2) {
        const t0 = e.touches[0], t1 = e.touches[1]
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
        if (g.type === 'pan') {
          gestureRef.current = {
            type: 'pinch',
            startDist: dist,
            startScale: vpRef.current.scale,
            cx: (t0.clientX + t1.clientX) / 2,
            cy: (t0.clientY + t1.clientY) / 2,
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
      } else if (e.touches.length === 1 && g.type === 'pan') {
        const t = e.touches[0]
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

  const focusedNote = focusedNoteId ? notes.find((n) => n.id === focusedNoteId) : null

  return (
    <div className={styles.canvas}>
      <Toolbar
        onAdd={addNote}
        onUploadImage={loadImageFile}
        scale={viewport.scale}
        onExport={exportNotes}
        onImport={importNotes}
        onTogglePanel={() => setShowPanel((v) => !v)}
        noteCount={notes.length}
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
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
            transition: navigating ? 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)' : undefined,
          }}
        >
          {notes.map((note) => (
            <Note
              key={note.id}
              note={note}
              onUpdate={updateNote}
              onMove={moveNote}
              onDelete={deleteNote}
              onFocus={bringToFront}
              onOpenFocus={setFocusedNoteId}
              scale={viewport.scale}
              zIndex={order.indexOf(note.id) + 1}
            />
          ))}
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
