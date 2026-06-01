import { useState, useCallback } from 'react'
import { Note } from './components/Note'
import { Toolbar } from './components/Toolbar'
import styles from './App.module.css'

let nextId = 4
const COLORS_COUNT = 5

function createNote(id, colorIndex) {
  return {
    id,
    title: '',
    content: '',
    x: 80 + (id % 4) * 60,
    y: 80 + (id % 3) * 60,
    colorIndex,
    minimized: false,
    height: 150,
  }
}

const INITIAL_NOTES = [
  { ...createNote(1, 0), title: 'Идеи', content: 'Записывай свои идеи здесь...' },
  { ...createNote(2, 1), x: 380, y: 100, title: 'Задачи', content: '- Задача 1\n- Задача 2' },
  { ...createNote(3, 2), x: 680, y: 160, title: 'Заметка', content: '' },
]

export default function App() {
  const [notes, setNotes] = useState(INITIAL_NOTES)
  const [order, setOrder] = useState(INITIAL_NOTES.map((n) => n.id))

  const bringToFront = useCallback((id) => {
    setOrder((prev) => {
      if (prev[prev.length - 1] === id) return prev
      return [...prev.filter((x) => x !== id), id]
    })
  }, [])

  const addNote = useCallback(() => {
    const id = nextId++
    const colorIndex = id % COLORS_COUNT
    const note = {
      ...createNote(id, colorIndex),
      x: 100 + Math.random() * (window.innerWidth - 400),
      y: 80 + Math.random() * (window.innerHeight - 300),
    }
    setNotes((prev) => [...prev, note])
    setOrder((prev) => [...prev, id])
  }, [])

  const updateNote = useCallback((id, patch) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }, [])

  const moveNote = useCallback((id, dx, dy) => {
    setNotes((prev) => prev.map((n) => {
      if (n.id !== id) return n
      return {
        ...n,
        x: Math.max(0, Math.min(window.innerWidth - 280, n.x + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 60, n.y + dy)),
      }
    }))
  }, [])

  const deleteNote = useCallback((id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    setOrder((prev) => prev.filter((x) => x !== id))
  }, [])

  return (
    <div className={styles.canvas}>
      <Toolbar onAdd={addNote} />
      <div className={styles.board}>
        {notes.map((note) => (
          <Note
            key={note.id}
            note={note}
            onUpdate={updateNote}
            onMove={moveNote}
            onDelete={deleteNote}
            onFocus={bringToFront}
            zIndex={order.indexOf(note.id) + 1}
          />
        ))}
        {notes.length === 0 && (
          <div className={styles.empty}>
            Нет заметок. Нажмите «+ Новая заметка» чтобы добавить.
          </div>
        )}
      </div>
    </div>
  )
}
