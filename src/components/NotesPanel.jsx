import { useState } from 'react'
import { PALETTE } from '../palette'
import styles from './NotesPanel.module.css'

function stripHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  return div.textContent || ''
}

export function NotesPanel({ notes, onNavigate, onOpenFocus, onClose, focusMode, onAddFloating, currentNoteId }) {
  const [selectedId, setSelectedId] = useState(null)

  const handleCardClick = (note) => {
    if (focusMode) {
      onOpenFocus(note.id)
      onClose()
    } else if (selectedId === note.id) {
      onOpenFocus(note.id)
    } else {
      setSelectedId(note.id)
      onNavigate(note.id)
    }
  }

  return (
    <>
      <div
        className={styles.backdrop}
        style={{ pointerEvents: focusMode ? 'none' : 'auto' }}
        onClick={focusMode ? undefined : onClose}
      />
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.heading}>Все заметки</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        {focusMode && (
          <p className={styles.focusHint}>Нажмите чтобы открыть · Перетащите в заметку</p>
        )}
        <div className={styles.list}>
          {notes.length === 0 && (
            <p className={styles.empty}>Пока нет заметок</p>
          )}
          {notes.map((note) => {
            const color = PALETTE[note.colorIndex % PALETTE.length]
            const preview = note.imageUrl
              ? null
              : stripHtml(note.htmlContent).trim().slice(0, 100)
            const isSelected = !focusMode && selectedId === note.id
            const isCurrent = focusMode && note.id === currentNoteId
            return (
              <div
                key={note.id}
                className={`${styles.cardRow} ${isCurrent ? styles.currentRow : ''}`}
              >
                <button
                  className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
                  style={{
                    background: color.body,
                    borderLeftColor: isSelected ? color.text : color.header,
                    opacity: isCurrent ? 0.5 : 1,
                  }}
                  draggable={focusMode}
                  onDragStart={(e) => e.dataTransfer.setData('noteId', note.id.toString())}
                  onClick={() => !isCurrent && handleCardClick(note)}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.dot} style={{ background: color.header }} />
                    <span className={styles.cardTitle} style={{ color: color.text }}>
                      {note.title || 'Без названия'}
                    </span>
                    {isSelected && (
                      <span className={styles.hint} style={{ color: color.text }}>
                        нажмите чтобы открыть
                      </span>
                    )}
                    {isCurrent && (
                      <span className={styles.hint} style={{ color: color.text }}>открыта</span>
                    )}
                    {!isSelected && !isCurrent && note.minimized && (
                      <span className={styles.badge} style={{ color: color.text }}>свёрнута</span>
                    )}
                  </div>
                  {note.imageUrl ? (
                    <img src={note.imageUrl} className={styles.thumb} alt="" />
                  ) : preview ? (
                    <p className={styles.preview} style={{ color: color.text }}>
                      {preview}
                    </p>
                  ) : null}
                </button>

                {focusMode && !isCurrent && (
                  <button
                    className={styles.addBtn}
                    style={{ color: color.text, background: color.header }}
                    title="Открыть как окно"
                    onClick={() => { onAddFloating(note.id); onClose() }}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <rect x="0.5" y="0.5" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M4.5 4.5h4v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8.5 4.5L4 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
