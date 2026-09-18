import { useState, useRef, useEffect } from 'react'
import { Burst, Cloud, Doodle, Sparkle, Squiggle, Sun, Waves } from './Doodles'
import { ThemePicker } from './ThemePicker'
import styles from './HomeScreen.module.css'

// Контурные значки: одинаково выглядят на любом устройстве, в отличие от эмодзи
function Icon({ d, size = 18, width = 2.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d}
    </svg>
  )
}
const I_SEARCH  = <><circle cx="11" cy="11" r="7.5" /><path d="M21 21l-4.6-4.6" /></>
const I_PALETTE = <><path d="M12 3a9 9 0 100 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 005-5c0-4-4-7.4-9-7.4z" /><circle cx="7.5" cy="11" r="1" fill="currentColor" /><circle cx="10.5" cy="7.5" r="1" fill="currentColor" /><circle cx="15" cy="7.5" r="1" fill="currentColor" /></>
const I_PLUS    = <path d="M12 5v14M5 12h14" />
const I_EDIT    = <path d="M4 20h4L19 9l-4-4L4 16z" />
const I_COPY    = <><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6a2 2 0 012-2h9" /></>
const I_TRASH   = <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
const I_CHEVRON = <path d="M9 5l7 7-7 7" />

export function HomeScreen({ canvases, onCreate, onOpen, onDelete, onRename, onDuplicate, trashCount, onOpenTrash, onOpenSearch, theme, onPickTheme }) {
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [showThemes, setShowThemes] = useState(false)
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

  const { decor, art } = theme
  const totalNotes = canvases.reduce((sum, c) => sum + c.notes.length, 0)
  const doodles = decor.doodles ? art.doodles : []

  return (
    <div className={styles.home}>
      <header className={`${styles.hero} ${decor.hero === 'band' ? styles.heroBand : ''} ${decor.pattern === 'clouds' ? styles.heroClouds : ''}`}>
        {decor.pattern === 'waves' && <Waves color={art.wave} className={styles.waves} />}
        {decor.pattern === 'clouds' && (
          <>
            <span className={styles.cloudA}><Cloud width={150} color={art.cloud} /></span>
            <span className={styles.cloudB}><Cloud width={110} color={art.cloud} /></span>
            <span className={styles.cloudC}><Cloud width={88} color="#FFFFFF" /></span>
          </>
        )}
        {art.sparkles.length > 0 && decor.pattern !== 'none' && (
          <>
            <span className={styles.spark1}><Sparkle size={22} color={art.sparkles[0]} /></span>
            <span className={styles.spark2}><Sparkle size={14} color={art.sparkles[1]} /></span>
            <span className={styles.spark3}><Sparkle size={16} color={art.sparkles[2]} /></span>
          </>
        )}
        {decor.sun && <span className={styles.sun}><Sun size={88} /></span>}

        <div className={styles.heroInner}>
          <div>
            <h1 className={styles.title}>Заметки</h1>
            <p className={styles.stats}>
              {canvases.length} {canvasWord(canvases.length)} · {totalNotes} {noteWord(totalNotes)}
            </p>
          </div>
          <div className={styles.heroButtons}>
            <button type="button" className={styles.heroBtn} onClick={() => setShowThemes(true)}
              aria-label="Тема оформления" title="Тема оформления">
              <Icon d={I_PALETTE} size={22} />
            </button>
            <button type="button" className={styles.heroBtn} onClick={onOpenSearch}
              aria-label="Поиск по всем холстам (Ctrl+F)" title="Поиск по всем холстам (Ctrl+F)">
              <Icon d={I_SEARCH} size={22} width={2.6} />
            </button>
          </div>
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.sectionTitle}>
          <h2>Мои холсты</h2>
          <Squiggle color={art.squiggle} />
        </div>

        <div className={styles.grid}>
          <button type="button" className={styles.newCard} onClick={onCreate}>
            <span className={styles.newCircle}><Icon d={I_PLUS} size={26} width={3} /></span>
            <span className={styles.newLabel}>Новый холст</span>
          </button>

          {[...canvases].reverse().map((canvas, i) => (
            <div
              key={canvas.id}
              className={styles.card}
              data-tone={i % 3}
              onClick={() => {
                if (editingId === canvas.id || confirmDeleteId === canvas.id) return
                onOpen(canvas.id)
              }}
            >
              {doodles.length > 0 && (
                <span className={styles.doodle}><Doodle spec={doodles[i % doodles.length]} size={84} /></span>
              )}

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
                    aria-label="Название холста"
                  />
                ) : (
                  <span className={styles.name} title={canvas.name}>{canvas.name}</span>
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
                    <button type="button" className={styles.confirmYes}
                      onClick={() => { onDelete(canvas.id); setConfirmDeleteId(null) }}>Да</button>
                    <button type="button" className={styles.confirmNo}
                      onClick={() => setConfirmDeleteId(null)}>Нет</button>
                  </>
                ) : (
                  <>
                    <button type="button" className={styles.cardBtn} onClick={(e) => startEdit(e, canvas)}
                      aria-label="Переименовать" title="Переименовать">
                      <Icon d={I_EDIT} size={16} />
                    </button>
                    <button type="button" className={styles.cardBtn}
                      onClick={(e) => { e.stopPropagation(); onDuplicate(canvas.id) }}
                      aria-label="Дублировать" title="Дублировать">
                      <Icon d={I_COPY} size={16} />
                    </button>
                    <button type="button" className={styles.cardBtn}
                      onClick={() => { setEditingId(null); setConfirmDeleteId(canvas.id) }}
                      aria-label="Удалить" title="Удалить">
                      <Icon d={I_TRASH} size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <button type="button" className={styles.trashBar} onClick={onOpenTrash}>
          <Icon d={I_TRASH} size={18} />
          <span className={styles.trashLabel}>Корзина</span>
          <span className={styles.trashCount}>
            {trashCount === 0 ? 'пусто' : `${trashCount} ${objectWord(trashCount)}`}
          </span>
          <span className={styles.trashArrow}><Icon d={I_CHEVRON} size={18} /></span>
        </button>

        {decor.doodles && (
          <div className={styles.footerArt} aria-hidden="true">
            <Sparkle size={18} color={art.sparkles[1] ?? art.squiggle} />
            <Burst size={14} color={art.squiggle} />
            <Sparkle size={12} color={art.sparkles[2] ?? art.squiggle} />
          </div>
        )}
      </main>

      {showThemes && (
        <ThemePicker currentId={theme.id} onPick={onPickTheme} onClose={() => setShowThemes(false)} />
      )}
    </div>
  )
}

function canvasWord(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'холст'
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'холста'
  return 'холстов'
}

function noteWord(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'заметка'
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'заметки'
  return 'заметок'
}

function objectWord(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'удалённый объект'
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'удалённых объекта'
  return 'удалённых объектов'
}
