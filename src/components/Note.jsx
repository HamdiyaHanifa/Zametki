import { useCallback, useState } from 'react'
import { useDrag } from '../hooks/useDrag'
import styles from './Note.module.css'

const COLORS = [
  { header: '#533483', body: '#0f3460' },
  { header: '#1a472a', body: '#0d2b17' },
  { header: '#7b2d00', body: '#3d1600' },
  { header: '#1a3a5c', body: '#0a1f36' },
  { header: '#4a1942', body: '#260d22' },
]

export function Note({ note, onUpdate, onMove, onDelete, onFocus, zIndex }) {
  const [isEditing, setIsEditing] = useState(false)
  const colors = COLORS[note.colorIndex % COLORS.length]

  const handlePositionChange = useCallback((dx, dy) => {
    onMove(note.id, dx, dy)
  }, [note.id, onMove])

  const { onMouseDown: dragMouseDown, onTouchStart: dragTouchStart } = useDrag(handlePositionChange)

  const handleHeaderMouseDown = useCallback((e) => {
    e.stopPropagation()
    onFocus(note.id)
    dragMouseDown(e)
  }, [note.id, onFocus, dragMouseDown])

  const handleHeaderTouchStart = useCallback((e) => {
    e.stopPropagation()
    onFocus(note.id)
    dragTouchStart(e)
  }, [note.id, onFocus, dragTouchStart])

  return (
    <div
      className={styles.note}
      style={{
        left: note.x,
        top: note.y,
        zIndex,
        '--header-color': colors.header,
        '--body-color': colors.body,
        width: note.minimized ? 220 : 280,
      }}
      onMouseDown={(e) => { e.stopPropagation(); onFocus(note.id) }}
      onTouchStart={(e) => { e.stopPropagation(); onFocus(note.id) }}
    >
      <div
        className={styles.header}
        onMouseDown={handleHeaderMouseDown}
        onTouchStart={handleHeaderTouchStart}
        onDoubleClick={() => onUpdate(note.id, { minimized: !note.minimized })}
      >
        <input
          className={styles.titleInput}
          value={note.title}
          onChange={(e) => onUpdate(note.id, { title: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          placeholder="Заголовок..."
        />
        <div className={styles.controls}>
          <button
            className={styles.btnMin}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => onUpdate(note.id, { minimized: !note.minimized })}
            title={note.minimized ? 'Развернуть' : 'Свернуть'}
          >
            {note.minimized ? '□' : '─'}
          </button>
          <button
            className={styles.btnClose}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => onDelete(note.id)}
            title="Удалить"
          >
            ✕
          </button>
        </div>
      </div>

      {!note.minimized && (
        <div className={styles.body}>
          <textarea
            className={styles.content}
            value={note.content}
            onChange={(e) => onUpdate(note.id, { content: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onFocus={() => setIsEditing(true)}
            onBlur={() => setIsEditing(false)}
            placeholder="Введите текст заметки..."
            style={{ height: note.height || 150 }}
          />
          <div
            className={styles.resizeHandle}
            onMouseDown={(e) => {
              e.stopPropagation()
              const startY = e.clientY
              const startH = note.height || 150
              const onMove = (e) => {
                onUpdate(note.id, { height: Math.max(80, startH + (e.clientY - startY)) })
              }
              const onUp = () => {
                window.removeEventListener('mousemove', onMove)
                window.removeEventListener('mouseup', onUp)
              }
              window.addEventListener('mousemove', onMove)
              window.addEventListener('mouseup', onUp)
            }}
            onTouchStart={(e) => {
              e.stopPropagation()
              const startY = e.touches[0].clientY
              const startH = note.height || 150
              const onMove = (e) => {
                e.preventDefault()
                onUpdate(note.id, { height: Math.max(80, startH + (e.touches[0].clientY - startY)) })
              }
              const onUp = () => {
                window.removeEventListener('touchmove', onMove)
                window.removeEventListener('touchend', onUp)
              }
              window.addEventListener('touchmove', onMove, { passive: false })
              window.addEventListener('touchend', onUp)
            }}
          />
        </div>
      )}
    </div>
  )
}
