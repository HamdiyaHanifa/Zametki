import { useState } from 'react'
import { PALETTE } from '../palette'
import styles from './TrashScreen.module.css'

const MONTH_MS = 30 * 24 * 60 * 60 * 1000

function daysLeft(deletedAt) {
  return Math.max(0, Math.ceil((deletedAt + MONTH_MS - Date.now()) / (24 * 60 * 60 * 1000)))
}

function noteTitle(note) {
  return note.title || (note.noteType === 'profile' ? 'Анкета персонажа' : 'Без названия')
}

export function TrashScreen({ trash, canvases, onBack, onRestore, onPermanentDelete, onEmptyTrash }) {
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState(null)

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
            <path d="M6 1L1 6l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Назад
        </button>
        <h2 className={styles.title}>Корзина</h2>
        {trash.length > 0 && (
          confirmEmpty ? (
            <div className={styles.confirmRow}>
              <span className={styles.confirmText}>Удалить всё навсегда?</span>
              <button className={styles.confirmYes} onClick={() => { onEmptyTrash(); setConfirmEmpty(false) }}>Да</button>
              <button className={styles.confirmNo} onClick={() => setConfirmEmpty(false)}>Нет</button>
            </div>
          ) : (
            <button className={styles.clearBtn} onClick={() => setConfirmEmpty(true)}>Очистить всё</button>
          )
        )}
      </div>

      {trash.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🗑</span>
          <p className={styles.emptyText}>Корзина пуста</p>
        </div>
      ) : (
        <>
          <p className={styles.hint}>Заметки удаляются автоматически через 30 дней после удаления</p>
          <div className={styles.list}>
            {trash.map((item, idx) => {
              const color = PALETTE[(item.note.colorIndex ?? 0) % PALETTE.length]
              const isProfile = item.note.noteType === 'profile'
              const canvasExists = canvases.some(c => c.id === item.canvasId)
              const days = daysLeft(item.deletedAt)
              const isConfirming = confirmDeleteIdx === idx

              return (
                <div
                  key={idx}
                  className={styles.item}
                  style={{ background: color.body, borderLeftColor: color.header }}
                >
                  <div className={styles.itemTop}>
                    {isProfile ? (
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor"
                        style={{ color: color.header, flexShrink: 0, opacity: 0.8 }}>
                        <circle cx="7" cy="4.5" r="2.5"/>
                        <path d="M2 13.5c0-3.5 2.2-5 5-5s5 1.5 5 5H2z"/>
                      </svg>
                    ) : (
                      <span className={styles.dot} style={{ background: color.header }} />
                    )}
                    <span className={styles.itemTitle} style={{ color: color.text }}>
                      {noteTitle(item.note)}
                    </span>
                  </div>

                  <div className={styles.itemMeta}>
                    <span className={styles.canvasTag} style={{ color: color.text, opacity: 0.55 }}>
                      {item.canvasName}{!canvasExists && ' (холст удалён)'}
                    </span>
                    <span className={styles.daysTag} style={{ color: days <= 3 ? '#c0392b' : undefined }}>
                      {days === 0 ? 'удаляется сегодня' : `ещё ${days} дн.`}
                    </span>
                  </div>

                  <div className={styles.itemActions}>
                    <button
                      className={styles.restoreBtn}
                      style={{ color: color.text, background: `${color.header}28`, borderColor: `${color.header}60` }}
                      onClick={() => { setConfirmDeleteIdx(null); onRestore(idx) }}
                    >
                      Восстановить
                    </button>
                    {isConfirming ? (
                      <>
                        <button
                          className={styles.delConfirmBtn}
                          onClick={() => { onPermanentDelete(idx); setConfirmDeleteIdx(null) }}
                        >Удалить</button>
                        <button
                          className={styles.delCancelBtn}
                          onClick={() => setConfirmDeleteIdx(null)}
                        >Нет</button>
                      </>
                    ) : (
                      <button
                        className={styles.delBtn}
                        onClick={() => setConfirmDeleteIdx(idx)}
                        title="Удалить навсегда"
                      >✕</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
