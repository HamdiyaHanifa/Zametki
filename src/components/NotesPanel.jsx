import { PALETTE } from '../palette'
import styles from './NotesPanel.module.css'

function stripHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  return div.textContent || ''
}

export function NotesPanel({ notes, onOpenFocus, onClose }) {
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
            return (
              <button
                key={note.id}
                className={styles.card}
                style={{ background: color.body, borderLeftColor: color.header }}
                onClick={() => { onOpenFocus(note.id); onClose() }}
              >
                <div className={styles.cardTop}>
                  <span
                    className={styles.dot}
                    style={{ background: color.header }}
                  />
                  <span className={styles.cardTitle} style={{ color: color.text }}>
                    {note.title || 'Без названия'}
                  </span>
                  {note.minimized && (
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
