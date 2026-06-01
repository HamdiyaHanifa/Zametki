import { useCallback, useState } from 'react'
import { useDrag } from '../hooks/useDrag'
import { PALETTE } from '../palette'
import styles from './Note.module.css'

export function Note({ note, onUpdate, onMove, onDelete, onFocus, zIndex }) {
  const [showPicker, setShowPicker] = useState(false)
  const color = PALETTE[note.colorIndex % PALETTE.length]
  const isImage = Boolean(note.imageUrl)
  const noteWidth = isImage ? (note.width || 300) : (note.minimized ? 220 : 280)

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
      style={{ left: note.x, top: note.y, zIndex, width: noteWidth }}
      onMouseDown={(e) => { e.stopPropagation(); onFocus(note.id) }}
      onTouchStart={(e) => { e.stopPropagation(); onFocus(note.id) }}
    >
      {/* Header */}
      <div
        className={styles.header}
        style={{ background: color.header }}
        onMouseDown={handleHeaderMouseDown}
        onTouchStart={handleHeaderTouchStart}
        onDoubleClick={() => onUpdate(note.id, { minimized: !note.minimized })}
      >
        {note.minimized && isImage && (
          <img src={note.imageUrl} className={styles.thumb} draggable={false} />
        )}
        <input
          className={styles.titleInput}
          style={{ color: color.text }}
          value={note.title}
          onChange={(e) => onUpdate(note.id, { title: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          placeholder={isImage ? 'Подпись...' : 'Заголовок...'}
        />
        <div className={styles.controls}>
          {!isImage && (
            <button
              className={styles.btnColor}
              style={{ background: color.header, border: `2px solid ${color.text}22` }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => setShowPicker((v) => !v)}
              title="Цвет"
            >
              <span style={{ fontSize: 11 }}>🎨</span>
            </button>
          )}
          <button
            className={styles.btnMin}
            style={{ background: `${color.text}18`, color: color.text }}
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

      {/* Color picker */}
      {showPicker && !isImage && (
        <div
          className={styles.picker}
          style={{ background: color.body, borderColor: `${color.header}88` }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {PALETTE.map((c, i) => (
            <button
              key={i}
              className={styles.swatch}
              style={{
                background: c.header,
                outline: note.colorIndex === i ? `2px solid ${c.text}` : 'none',
                outlineOffset: 2,
              }}
              onClick={() => { onUpdate(note.id, { colorIndex: i }); setShowPicker(false) }}
            />
          ))}
        </div>
      )}

      {/* Body */}
      {!note.minimized && (
        <div className={styles.body} style={{ background: isImage ? 'transparent' : color.body }}>
          {isImage ? (
            <img
              src={note.imageUrl}
              className={styles.image}
              style={{ height: note.height || 220 }}
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            />
          ) : (
            <textarea
              className={styles.content}
              style={{ color: color.text, height: note.height || 150 }}
              value={note.content}
              onChange={(e) => onUpdate(note.id, { content: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              placeholder="Введите текст заметки..."
            />
          )}
          <div
            className={styles.resizeHandle}
            style={{ '--handle-color': color.header }}
            onMouseDown={(e) => {
              e.stopPropagation()
              const startY = e.clientY
              const startH = note.height || (isImage ? 220 : 150)
              const onMove = (e) => {
                onUpdate(note.id, { height: Math.max(60, startH + (e.clientY - startY)) })
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
              const startH = note.height || (isImage ? 220 : 150)
              const onMove = (e) => {
                e.preventDefault()
                onUpdate(note.id, { height: Math.max(60, startH + (e.touches[0].clientY - startY)) })
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
