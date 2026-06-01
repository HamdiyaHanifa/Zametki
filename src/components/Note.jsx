import { useCallback, useState, useRef, useEffect } from 'react'
import { useDrag } from '../hooks/useDrag'
import { PALETTE } from '../palette'
import { FormatBar } from './FormatBar'
import styles from './Note.module.css'

const DEFAULT_W_TEXT = 280
const DEFAULT_W_IMG  = 300
const DEFAULT_H_TEXT = 150
const DEFAULT_H_IMG  = 220
const MIN_W = 180
const MIN_H = 80

export function Note({ note, onUpdate, onMove, onDelete, onFocus, onOpenFocus, zIndex, scale }) {
  const [showPicker, setShowPicker] = useState(false)
  const color = PALETTE[note.colorIndex % PALETTE.length]
  const isImage = Boolean(note.imageUrl)

  const w = note.minimized ? 220 : (note.width || (isImage ? DEFAULT_W_IMG : DEFAULT_W_TEXT))
  const h = note.height || (isImage ? DEFAULT_H_IMG : DEFAULT_H_TEXT)

  const editorRef    = useRef(null)
  const savedRangeRef = useRef(null)

  useEffect(() => {
    if (!editorRef.current) return
    editorRef.current.innerHTML = note.htmlContent || ''
  }, [note.id]) // eslint-disable-line

  useEffect(() => {
    if (!editorRef.current) return
    if (document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = note.htmlContent || ''
    }
  }, [note.htmlContent])

  const saveRange = useCallback(() => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange()
  }, [])

  // iOS fix: selectionchange fires BEFORE click, keeping savedRangeRef fresh
  // so format buttons can restore the selection even after iOS clears it on tap
  useEffect(() => {
    if (isImage) return
    const onSel = () => {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0 && editorRef.current) {
        const range = sel.getRangeAt(0)
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          savedRangeRef.current = range.cloneRange()
        }
      }
    }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [isImage])

  const handleInput = useCallback(() => {
    onUpdate(note.id, { htmlContent: editorRef.current?.innerHTML || '' })
  }, [note.id, onUpdate])

  const handlePositionChange = useCallback((dx, dy) => {
    onMove(note.id, dx, dy)
  }, [note.id, onMove])

  const { onMouseDown: dragMouseDown, onTouchStart: dragTouchStart } = useDrag(handlePositionChange)

  const handleHeaderMouseDown = useCallback((e) => {
    e.stopPropagation(); onFocus(note.id); dragMouseDown(e)
  }, [note.id, onFocus, dragMouseDown])

  const handleHeaderTouchStart = useCallback((e) => {
    e.stopPropagation(); onFocus(note.id); dragTouchStart(e)
  }, [note.id, onFocus, dragTouchStart])

  // Corner resize (width + height)
  const makeResizeHandlers = (startW, startH) => ({
    onMouseDown(e) {
      e.stopPropagation()
      const sx = e.clientX, sy = e.clientY
      const s = scale || 1
      const onMove = (e) => onUpdate(note.id, {
        width:  Math.max(MIN_W, startW + (e.clientX - sx) / s),
        height: Math.max(MIN_H, startH + (e.clientY - sy) / s),
      })
      const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    onTouchStart(e) {
      e.stopPropagation()
      const sx = e.touches[0].clientX, sy = e.touches[0].clientY
      const s = scale || 1
      const onMove = (e) => {
        e.preventDefault()
        onUpdate(note.id, {
          width:  Math.max(MIN_W, startW + (e.touches[0].clientX - sx) / s),
          height: Math.max(MIN_H, startH + (e.touches[0].clientY - sy) / s),
        })
      }
      const onUp = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp) }
      window.addEventListener('touchmove', onMove, { passive: false })
      window.addEventListener('touchend', onUp)
    },
  })

  return (
    <div
      className={styles.note}
      style={{ left: note.x, top: note.y, zIndex, width: w }}
      onMouseDown={(e) => { e.stopPropagation(); onFocus(note.id) }}
      onTouchStart={(e) => { e.stopPropagation(); onFocus(note.id) }}
    >
      {/* Header */}
      <div
        className={styles.header}
        style={{ background: color.header }}
        onMouseDown={handleHeaderMouseDown}
        onTouchStart={handleHeaderTouchStart}
        onDoubleClick={() => onUpdate(note.id, { minimized: !note.minimized })}
      >
        {note.minimized && isImage && <img src={note.imageUrl} className={styles.thumb} draggable={false} />}
        <input
          className={styles.titleInput}
          style={{ color: color.text }}
          value={note.title}
          onChange={(e) => onUpdate(note.id, { title: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          placeholder={isImage ? 'Подпись...' : 'Заголовок...'}
        />
        <div className={styles.controls}>
          {!isImage && (
            <button className={`${styles.btn} ${styles.btnIcon}`} style={{ background: `${color.text}18`, color: color.text }}
              onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
              onClick={() => setShowPicker((v) => !v)} title="Цвет заметки">
              🎨
            </button>
          )}
          <button className={`${styles.btn} ${styles.btnIcon}`} style={{ background: `${color.text}18`, color: color.text }}
            onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
            onClick={() => onOpenFocus(note.id)} title="На весь экран">
            <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
              <path d="M1 3.5V1H3.5M6.5 1H9V3.5M9 6.5V9H6.5M3.5 9H1V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button className={`${styles.btn} ${styles.btnIcon}`} style={{ background: `${color.text}18`, color: color.text }}
            onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
            onClick={() => onUpdate(note.id, { minimized: !note.minimized })} title={note.minimized ? 'Развернуть' : 'Свернуть'}>
            {note.minimized ? '□' : '─'}
          </button>
          <button className={`${styles.btn} ${styles.btnClose}`}
            onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
            onClick={() => onDelete(note.id)} title="Удалить">
            ✕
          </button>
        </div>
      </div>

      {/* Palette picker */}
      {showPicker && !isImage && (
        <div className={styles.picker} style={{ background: color.body, borderColor: `${color.header}88` }}
          onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
          {PALETTE.map((c, i) => (
            <button key={i} className={styles.swatch}
              style={{ background: c.header, outline: note.colorIndex === i ? `2px solid ${c.text}` : 'none', outlineOffset: 2 }}
              onClick={() => { onUpdate(note.id, { colorIndex: i }); setShowPicker(false) }} />
          ))}
        </div>
      )}

      {/* Body */}
      {!note.minimized && (
        <div className={styles.body} style={{ background: isImage ? 'transparent' : color.body }}>
          {isImage ? (
            <img src={note.imageUrl} className={styles.image} style={{ height: h }}
              draggable={false} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} />
          ) : (
            <>
              <FormatBar editorRef={editorRef} savedRangeRef={savedRangeRef} textColor={color.text} bodyColor={color.body} />
              <div ref={editorRef} className={styles.editor}
                style={{ color: color.text, height: h }}
                contentEditable suppressContentEditableWarning
                onInput={handleInput}
                onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
                onMouseUp={saveRange} onKeyUp={saveRange} onTouchEnd={saveRange} onBlur={saveRange}
                data-placeholder="Введите текст заметки..." />
            </>
          )}
          {/* Corner resize handle */}
          <div
            className={styles.resizeCorner}
            style={{ '--rc': color.header }}
            {...makeResizeHandlers(w, h)}
          />
        </div>
      )}
    </div>
  )
}
