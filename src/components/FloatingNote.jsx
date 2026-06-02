import { useRef, useCallback, useEffect, useState } from 'react'
import { FormatBar } from './FormatBar'
import { PALETTE } from '../palette'
import styles from './FloatingNote.module.css'

const MIN_W = 240
const MIN_H = 150

export function FloatingNote({ note, onUpdate, onClose, initialX, initialY, initialW, initialH, onPosChange }) {
  const color = PALETTE[note.colorIndex % PALETTE.length]
  const editorRef = useRef(null)
  const savedRangeRef = useRef(null)
  const [pos, setPos] = useState({ x: initialX ?? 60, y: initialY ?? 60 })
  const [size, setSize] = useState({ w: initialW ?? 360, h: initialH ?? 280 })
  const posRef = useRef(pos)
  const sizeRef = useRef(size)

  useEffect(() => { posRef.current = pos }, [pos])
  useEffect(() => { sizeRef.current = size }, [size])

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = note.htmlContent || ''
  }, []) // eslint-disable-line

  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = note.htmlContent || ''
    }
  }, [note.htmlContent])

  const saveRange = useCallback(() => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange()
  }, [])

  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection()
      if (sel && !sel.isCollapsed && editorRef.current) {
        const range = sel.getRangeAt(0)
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          savedRangeRef.current = range.cloneRange()
        }
      }
    }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [])

  const handleInput = useCallback(() => {
    onUpdate(note.id, { htmlContent: editorRef.current?.innerHTML || '' })
  }, [note.id, onUpdate])

  const startDrag = useCallback((clientX, clientY) => {
    const ox = clientX - posRef.current.x
    const oy = clientY - posRef.current.y
    const onMove = (mv) => {
      const cx = mv.touches ? mv.touches[0].clientX : mv.clientX
      const cy = mv.touches ? mv.touches[0].clientY : mv.clientY
      const p = { x: cx - ox, y: cy - oy }
      posRef.current = p
      setPos(p)
      onPosChange?.({ ...p, w: sizeRef.current.w, h: sizeRef.current.h })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
  }, [onPosChange])

  const handleHeaderMouseDown = useCallback((e) => {
    e.stopPropagation(); startDrag(e.clientX, e.clientY)
  }, [startDrag])

  const handleHeaderTouchStart = useCallback((e) => {
    e.stopPropagation(); startDrag(e.touches[0].clientX, e.touches[0].clientY)
  }, [startDrag])

  const handleResizeMouseDown = useCallback((e) => {
    e.stopPropagation()
    const sx = e.clientX, sy = e.clientY
    const sw = sizeRef.current.w, sh = sizeRef.current.h
    const onMove = (mv) => {
      const ns = { w: Math.max(MIN_W, sw + mv.clientX - sx), h: Math.max(MIN_H, sh + mv.clientY - sy) }
      sizeRef.current = ns; setSize(ns)
      onPosChange?.({ ...posRef.current, ...ns })
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onPosChange])

  const handleResizeTouchStart = useCallback((e) => {
    e.stopPropagation()
    const sx = e.touches[0].clientX, sy = e.touches[0].clientY
    const sw = sizeRef.current.w, sh = sizeRef.current.h
    const onMove = (mv) => {
      mv.preventDefault()
      const ns = { w: Math.max(MIN_W, sw + mv.touches[0].clientX - sx), h: Math.max(MIN_H, sh + mv.touches[0].clientY - sy) }
      sizeRef.current = ns; setSize(ns)
      onPosChange?.({ ...posRef.current, ...ns })
    }
    const onUp = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp) }
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
  }, [onPosChange])

  return (
    <div
      className={styles.floatingNote}
      style={{ left: pos.x, top: pos.y, width: size.w, background: color.body }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div
        className={styles.header}
        style={{ background: color.header }}
        onMouseDown={handleHeaderMouseDown}
        onTouchStart={handleHeaderTouchStart}
      >
        <input
          className={styles.titleInput}
          style={{ color: color.text }}
          value={note.title}
          onChange={(e) => onUpdate(note.id, { title: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Заголовок..."
        />
        <button
          className={styles.closeBtn}
          style={{ background: `${color.text}18`, color: color.text }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={onClose}
        >✕</button>
      </div>
      <FormatBar
        editorRef={editorRef}
        savedRangeRef={savedRangeRef}
        textColor={color.text}
      />
      <div
        ref={editorRef}
        className={styles.editor}
        style={{ color: color.text, height: size.h, background: color.body }}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onMouseUp={saveRange}
        onKeyUp={saveRange}
        onTouchEnd={saveRange}
        onBlur={saveRange}
        data-placeholder="Введите текст..."
      />
      <div
        className={styles.resizeHandle}
        onMouseDown={handleResizeMouseDown}
        onTouchStart={handleResizeTouchStart}
      />
    </div>
  )
}
