import { useState, useRef, useEffect } from 'react'
import styles from './HomeScreen.module.css'

export function HomeScreen({ canvases, onCreate, onOpen, onDelete, onRename }) {
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editingId !== null) inputRef.current?.select()
  }, [editingId])

  const startEdit = (e, canvas) => {
    e.stopPropagation()
    setConfirmDeleteId(null)
    setEditingId(canvas.id)
    setEditingName(canvas.name)
  }

  const commitEdit = () => {
    if (editingId !== null) {
      onRename(editingId, editingName.trim() || 'Холст')
      setEditingId(null)
    }
  }

  return (
    <div className={styles.home}>
      <div className={styles.header}>
        <span className={styles.logo}>📝</span>
        <h1 className={styles.title}>Заметки</h1>
      </div>

      <p className={styles.subtitle}>Ваши холсты</p>

      <div className={styles.grid}>
        <button className={styles.newCard} onClick={onCreate}>
          <span className={styles.plus}>+</span>
          <span className={styles.newLabel}>Новый холст</span>
        </button>

        {[...canvases].reverse().map((canvas) => (
          <div
            key={canvas.id}
            className={styles.card}
            onClick={() => {
              if (editingId === canvas.id || confirmDeleteId === canvas.id) return
              onOpen(canvas.id)
            }}
          >
            <div className={styles.cardBody}>
              {editingId === canvas.id ? (
                <input
                  ref={inputRef}
                  className={styles.nameInput}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={styles.name}>{canvas.name}</span>
              )}
              <span className={styles.count}>
                {canvas.notes.length === 0
                  ? 'Пусто'
                  : `${canvas.notes.length} ${noteWord(canvas.notes.length)}`}
              </span>
            </div>

            <div className={styles.cardFooter} onClick={(e) => e.stopPropagation()}>
              {confirmDeleteId === canvas.id ? (
                <>
                  <span className={styles.confirmText}>Удалить?</span>
                  <button
                    className={styles.confirmYes}
                    onClick={() => { onDelete(canvas.id); setConfirmDeleteId(null) }}
                  >Да</button>
                  <button
                    className={styles.confirmNo}
                    onClick={() => setConfirmDeleteId(null)}
                  >Нет</button>
                </>
              ) : (
                <>
                  <button
                    className={styles.editBtn}
                    onClick={(e) => startEdit(e, canvas)}
                    title="Переименовать"
                  >✎</button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => { setEditingId(null); setConfirmDeleteId(canvas.id) }}
                    title="Удалить"
                  >✕</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function noteWord(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'заметка'
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'заметки'
  return 'заметок'
}
