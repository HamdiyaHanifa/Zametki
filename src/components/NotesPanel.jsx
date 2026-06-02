import { useState, useRef } from 'react'
import { PALETTE } from '../palette'
import styles from './NotesPanel.module.css'

function stripHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  return div.textContent || ''
}

export function NotesPanel({ notes, onNavigate, onOpenFocus, onClose, focusMode, onAddFloating, currentNoteId, onAdd, onAddProfile, onDelete, onUpdate }) {
  const [selectedId, setSelectedId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [editingTitleId, setEditingTitleId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const inputRef = useRef(null)

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

  const startRename = (note, e) => {
    e.stopPropagation()
    setConfirmDeleteId(null)
    setEditingTitleId(note.id)
    setEditTitle(note.title || '')
    // focus the input on next tick after render
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const saveTitle = () => {
    if (editingTitleId && onUpdate) {
      onUpdate(editingTitleId, { title: editTitle })
    }
    setEditingTitleId(null)
  }

  const cancelRename = () => setEditingTitleId(null)

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

        {(onAdd || onAddProfile) && (
          <div className={styles.addBar}>
            {onAdd && (
              <button className={styles.footerBtn} onClick={onAdd}>+ Заметка</button>
            )}
            {onAddProfile && (
              <button className={styles.footerBtn} onClick={onAddProfile}>+ Анкета</button>
            )}
          </div>
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
            const isEditing = editingTitleId === note.id

            if (isEditing) {
              return (
                <div key={note.id} className={styles.cardRow}>
                  <input
                    ref={inputRef}
                    className={styles.renameInput}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTitle()
                      if (e.key === 'Escape') cancelRename()
                    }}
                    onBlur={saveTitle}
                    placeholder={isProfile ? 'Имя персонажа...' : 'Заголовок...'}
                  />
                  <button
                    className={styles.renameOkBtn}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={saveTitle}
                  >✓</button>
                  <button
                    className={styles.renameCancelBtn}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={cancelRename}
                  >✕</button>
                </div>
              )
            }

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
                    {isSelected && <span className={styles.hint} style={{ color: color.text }}>нажмите чтобы открыть</span>}
                    {isCurrent && <span className={styles.hint} style={{ color: color.text }}>открыта</span>}
                    {!isSelected && !isCurrent && isProfile && <span className={styles.badge} style={{ color: color.text }}>анкета</span>}
                    {!isSelected && !isCurrent && !isProfile && note.minimized && <span className={styles.badge} style={{ color: color.text }}>свёрнута</span>}
                  </div>
                  {note.imageUrl ? (
                    <img src={note.imageUrl} className={styles.thumb} alt="" />
                  ) : preview ? (
                    <p className={styles.preview} style={{ color: color.text }}>{preview}</p>
                  ) : null}
                </button>

                {onUpdate && (
                  <button
                    className={styles.renameBtn}
                    title="Переименовать"
                    onClick={(e) => startRename(note, e)}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M8.5 1.5a1.414 1.414 0 0 1 2 2L3.5 10.5l-2.5.5.5-2.5L8.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}

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
      </div>
    </>
  )
}
