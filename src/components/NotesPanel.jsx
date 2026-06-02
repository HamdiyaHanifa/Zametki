import { useState } from 'react'
import { PALETTE } from '../palette'
import styles from './NotesPanel.module.css'

function stripHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  return div.textContent || ''
}

export function NotesPanel({ notes, onNavigate, onOpenFocus, onClose }) {
  const [selectedId, setSelectedId] = useState(null)

  const handleCardClick = (note) => {
    if (selectedId === note.id) {
      onOpenFocus(note.id)
    } else {
      setSelectedId(note.id)
      onNavigate(note.id)
    }
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.heading}>Все заметки</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.list}>
          {notes.length === 0 && (
            <p className={styles.empty}>Пока нет заметок</p>
          )}
          {notes.map((note) => {
            const color = PALETTE[note.colorIndex % PALETTE.length]
            const preview = note.imageUrl
              ? null
              : stripHtml(note.htmlContent).trim().slice(0, 100)
            const isSelected = selectedId === note.id
            return (
              <button
                key={note.id}
                className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
                style={{
                  background: color.body,
                  borderLeftColor: isSelected ? color.text : color.header,
                }}
                onClick={() => handleCardClick(note)}
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
                  {!isSelected && note.minimized && (
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
            )
          })}
        </div>
      </div>
    </>
  )
}
