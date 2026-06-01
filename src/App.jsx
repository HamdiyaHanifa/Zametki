import { useState, useCallback, useRef, useEffect } from 'react'
import { Note } from './components/Note'
import { Toolbar } from './components/Toolbar'
import { FocusView } from './components/FocusView'
import styles from './App.module.css'

let nextId = 4
const COLORS_COUNT = 12
const MIN_SCALE = 0.1
const MAX_SCALE = 4

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

export default function App() {
  const [notes, setNotes] = useState(INITIAL_NOTES)
  const [order, setOrder] = useState(INITIAL_NOTES.map((n) => n.id))
  const [focusedNoteId, setFocusedNoteId] = useState(null)
  const [viewport, setVpState] = useState({ x: 0, y: 0, scale: 1 })
  const vpRef = useRef(viewport)
  const gestureRef = useRef(null)
  const bgRef = useRef(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const setViewport = useCallback((vp) => {
    vpRef.current = vp
    setVpState(vp)
  }, [])

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
      <Toolbar onAdd={addNote} onUploadImage={loadImageFile} scale={viewport.scale} />
      {focusedNote && (
        <FocusView
          note={focusedNote}
          onUpdate={updateNote}
          onClose={() => setFocusedNoteId(null)}
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
          style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}
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
