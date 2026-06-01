import { useRef, useCallback, useEffect } from 'react'
import { PALETTE } from '../palette'
import { FormatBar } from './FormatBar'
import styles from './FocusView.module.css'

export function FocusView({ note, onUpdate, onClose }) {
  const color = PALETTE[note.colorIndex % PALETTE.length]
  const isImage = Boolean(note.imageUrl)
  const editorRef = useRef(null)
  const savedRangeRef = useRef(null)

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = note.htmlContent || ''
      editorRef.current.focus()
    }
  }, []) // init once on mount

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const saveRange = useCallback(() => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    }
  }, [])

  const handleInput = useCallback(() => {
    onUpdate(note.id, { htmlContent: editorRef.current?.innerHTML || '' })
  }, [note.id, onUpdate])

  return (
    <div className={styles.overlay} style={{ background: color.body }}>
      {/* Top bar */}
      <div className={styles.topBar} style={{ background: color.header }}>
        <button
          className={styles.backBtn}
          style={{ color: color.text }}
          onClick={onClose}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Назад
        </button>
        <input
          className={styles.titleInput}
          style={{ color: color.text }}
          value={note.title}
          onChange={(e) => onUpdate(note.id, { title: e.target.value })}
          placeholder={isImage ? 'Подпись...' : 'Заголовок...'}
        />
      </div>

      {isImage ? (
        <div className={styles.imageWrap}>
          <img src={note.imageUrl} className={styles.image} draggable={false} />
        </div>
      ) : (
        <>
          <FormatBar
            editorRef={editorRef}
            savedRangeRef={savedRangeRef}
            textColor={color.text}
            bodyColor={color.body}
          />
          <div
            ref={editorRef}
            className={styles.editor}
            style={{ color: color.text }}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onMouseUp={saveRange}
            onKeyUp={saveRange}
            onTouchEnd={saveRange}
            onBlur={saveRange}
            data-placeholder="Начните писать..."
          />
        </>
      )}
    </div>
  )
}
