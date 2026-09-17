import { useState, useEffect, useRef, useMemo } from 'react'
import { searchAll } from '../utils/search'
import styles from './SearchOverlay.module.css'

const WHERE = {
  canvas: 'название холста',
  title: 'заголовок',
  text: 'в тексте',
}

function foundForm(n) {
  const last2 = n % 100
  const last1 = n % 10
  if (last2 >= 11 && last2 <= 14) return 'находок'
  if (last1 === 1) return 'находка'
  if (last1 >= 2 && last1 <= 4) return 'находки'
  return 'находок'
}

/**
 * Поиск по всем холстам сразу (Ctrl+F).
 * Стрелки — выбрать, Enter — открыть, Esc — закрыть.
 */
export function SearchOverlay({ canvases, onGo, onClose }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const { items, truncated } = useMemo(() => searchAll(canvases, query), [canvases, query])

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setSelected(0) }, [query])

  // Выбранная строка всегда видна, даже если список уехал вниз
  useEffect(() => {
    listRef.current?.querySelector(`[data-row="${selected}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const go = (item) => { if (item) onGo(item.canvasId, item.noteId) }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(items[selected])
    }
  }

  const asked = query.trim().length > 0

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={styles.panel} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.searchRow}>
          <span className={styles.icon}>🔍</span>
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Искать во всех холстах…"
          />
          <button className={styles.close} onClick={onClose} title="Закрыть (Esc)">✕</button>
        </div>

        {asked && (
          <div className={styles.count}>
            {items.length > 0
              ? `${items.length} ${foundForm(items.length)}${truncated ? ' — показаны первые' : ''}`
              : 'Ничего не нашлось'}
          </div>
        )}

        {items.length > 0 && (
          <div className={styles.list} ref={listRef}>
            {items.map((item, i) => (
              <button
                key={item.key}
                data-row={i}
                className={`${styles.row} ${i === selected ? styles.rowActive : ''}`}
                onMouseEnter={() => setSelected(i)}
                onClick={() => go(item)}
              >
                <div className={styles.rowTop}>
                  <span className={styles.rowTitle}>
                    {item.noteId === null ? '🗂 ' : ''}{item.title}
                  </span>
                  <span className={styles.rowCanvas}>{item.canvasName}</span>
                </div>
                <div className={styles.rowSnippet}>
                  <span className={styles.rowWhere}>{WHERE[item.where]}:</span>{' '}
                  {item.before}<mark className={styles.mark}>{item.match}</mark>{item.after}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className={styles.hint}>
          {asked ? (
            <>
              {/* На телефоне подсказка про стрелки ни к чему — там нажимают пальцем */}
              <span className={styles.hintKeys}>↑ ↓ — выбрать · Enter — открыть · Esc — закрыть</span>
              <span className={styles.hintTap}>Нажми на находку, чтобы открыть</span>
            </>
          ) : 'Ищет в названиях холстов, заголовках, тексте заметок и полях анкет'}
        </div>
      </div>
    </div>
  )
}
