import { useState } from 'react'
import { PALETTE } from '../palette'
import styles from './NotesPanel.module.css'

function stripHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  return div.textContent || ''
}

export function NotesPanel({ notes, onNavigate, onOpenFocus, onClose, focusMode, onAddFloating, currentNoteId, onAdd, onAddProfile, onDelete }) {
  const [selectedId, setSelectedId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const handleCardClick = (note) => {
    setConfirmDeleteId(null)
    if (focusMode) {
      onOpenFocus(note.id)
      onClose()
    } else if (note.noteType === 'profile' || selectedId === note.id) {
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
            const isProfile = note.noteType === 'profile'
            const preview = isProfile
              ? (note.fields ?? []).filter(f => f.value).slice(0, 3).map(f => `${f.label}: ${f.value}`).join(' · ')
              : note.imageUrl
                ? null
                : stripHtml(note.htmlContent).trim().slice(0, 100)
            const isSelected = !focusMode && selectedId === note.id
            const isCurrent = focusMode && note.id === currentNoteId
            const isConfirming = confirmDeleteId === note.id
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
                    {isProfile ? (
                      <svg className={styles.profileIcon} style={{ color: color.header }} width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                        <circle cx="7" cy="4.5" r="2.5"/>
                        <path d="M2 13.5c0-3.5 2.2-5 5-5s5 1.5 5 5H2z"/>
                      </svg>
                    ) : (
                      <span className={styles.dot} style={{ background: color.header }} />
                    )}
                    <span className={styles.cardTitle} style={{ color: color.text }}>
                      {note.title || (isProfile ? 'Анкета персонажа' : 'Без названия')}
                    </span>
                    {isSelected && (
                      <span className={styles.hint} style={{ color: color.text }}>
                        нажмите чтобы открыть
                      </span>
                    )}
                    {isCurrent && (
                      <span className={styles.hint} style={{ color: color.text }}>открыта</span>
                    )}
                    {!isSelected && !isCurrent && isProfile && (
                      <span className={styles.badge} style={{ color: color.text }}>анкета</span>
                    )}
                    {!isSelected && !isCurrent && !isProfile && note.minimized && (
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

                {onDelete && !isCurrent && (
                  isConfirming ? (
                    <>
                      <button
                        className={styles.delConfirmBtn}
                        onClick={(e) => { e.stopPropagation(); onDelete(note.id); setConfirmDeleteId(null) }}
                      >Удалить</button>
                      <button
                        className={styles.delCancelBtn}
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}
                      >Нет</button>
                    </>
                  ) : (
                    <button
                      className={styles.delBtn}
                      title="Удалить"
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(note.id) }}
                    >✕</button>
                  )
                )}
              </div>
            )
          })}
        </div>

        {(onAdd || onAddProfile) && (
          <div className={styles.footer}>
            {onAdd && (
              <button className={styles.footerBtn} onClick={() => { onAdd(); onClose() }}>
                + Заметка
              </button>
            )}
            {onAddProfile && (
              <button className={styles.footerBtn} onClick={() => { onAddProfile(); onClose() }}>
                + Анкета
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
