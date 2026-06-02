import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import styles from './ImageResizer.module.css'

function getCaretRange(x, y) {
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y)
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y)
    if (!p) return null
    const r = document.createRange()
    r.setStart(p.offsetNode, p.offset)
    r.collapse(true)
    return r
  }
  return null
}

export function ImageResizer({ editorRef, onSave }) {
  const [sel, setSel] = useState(null)
  const overlayRef = useRef(null)

  const measure = useCallback((img) => {
    const r = img.getBoundingClientRect()
    setSel({ img, rect: { left: r.left, top: r.top, width: r.width, height: r.height } })
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const onClick = (e) => {
      if (e.target.tagName === 'IMG' && editor.contains(e.target)) {
        measure(e.target)
      } else if (!overlayRef.current?.contains(e.target)) {
        setSel(null)
      }
    }
    editor.addEventListener('click', onClick)
    return () => editor.removeEventListener('click', onClick)
  }, [editorRef, measure])

  // Re-measure when editor scrolls so overlay tracks the image
  useEffect(() => {
    if (!sel) return
    const editor = editorRef.current
    if (!editor) return
    const onScroll = () => measure(sel.img)
    editor.addEventListener('scroll', onScroll, { passive: true })
    return () => editor.removeEventListener('scroll', onScroll)
  }, [sel, editorRef, measure])

  if (!sel) return null
  const { img, rect } = sel

  // ── Resize: drag bottom-right corner ──────────────────────────────────────
  const startResize = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX ?? e.touches[0].clientX
    const startW = img.offsetWidth

    const onMove = (mv) => {
      mv.preventDefault()
      const cx = mv.clientX ?? mv.touches[0].clientX
      img.style.width = Math.max(40, startW + cx - startX) + 'px'
      img.style.height = 'auto'
      measure(img)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
      onSave?.()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
  }

  // ── Move: drag image to a new position in the editor text ─────────────────
  const startMove = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const editor = editorRef.current
    const startX = e.clientX ?? e.touches[0].clientX
    const startY = e.clientY ?? e.touches[0].clientY
    let moved = false

    const ghost = document.createElement('img')
    ghost.src = img.src
    ghost.style.cssText = [
      'position:fixed', 'pointer-events:none', 'z-index:99999',
      `left:${rect.left}px`, `top:${rect.top}px`,
      `width:${rect.width}px`, `height:${rect.height}px`,
      'object-fit:contain', 'opacity:0.55',
    ].join(';')
    document.body.appendChild(ghost)
    img.style.opacity = '0.15'
    setSel(null)

    const onMove = (mv) => {
      mv.preventDefault()
      const cx = mv.clientX ?? mv.touches[0].clientX
      const cy = mv.clientY ?? mv.touches[0].clientY
      if (!moved && (Math.abs(cx - startX) > 6 || Math.abs(cy - startY) > 6)) moved = true
      ghost.style.left = cx - rect.width / 2 + 'px'
      ghost.style.top  = cy - rect.height / 2 + 'px'
    }

    const onUp = (mv) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
      ghost.remove()
      img.style.opacity = ''

      if (moved && editor) {
        const cx = mv.clientX ?? mv.changedTouches?.[0].clientX
        const cy = mv.clientY ?? mv.changedTouches?.[0].clientY
        if (cx != null) {
          const range = getCaretRange(cx, cy)
          if (range && editor.contains(range.startContainer) && !img.contains(range.startContainer)) {
            // Use a text marker so the target position survives img.remove()
            const marker = document.createTextNode('')
            range.insertNode(marker)
            img.remove()
            marker.parentNode?.insertBefore(img, marker)
            marker.remove()
            onSave?.()
          }
        }
      }
      measure(img)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
  }

  return createPortal(
    <div
      ref={overlayRef}
      className={styles.overlay}
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      onMouseDown={startMove}
      onTouchStart={startMove}
    >
      <div className={styles.border} />
      <div
        className={styles.handle}
        onMouseDown={startResize}
        onTouchStart={startResize}
      />
    </div>,
    document.body
  )
}
