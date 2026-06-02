import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'

const HANDLE_R = 7

const HANDLES = [
  { id: 'tl', rx: 0,   ry: 0,   cursor: 'nwse-resize' },
  { id: 't',  rx: 0.5, ry: 0,   cursor: 'ns-resize'   },
  { id: 'tr', rx: 1,   ry: 0,   cursor: 'nesw-resize' },
  { id: 'r',  rx: 1,   ry: 0.5, cursor: 'ew-resize'   },
  { id: 'br', rx: 1,   ry: 1,   cursor: 'nwse-resize' },
  { id: 'b',  rx: 0.5, ry: 1,   cursor: 'ns-resize'   },
  { id: 'bl', rx: 0,   ry: 1,   cursor: 'nesw-resize' },
  { id: 'l',  rx: 0,   ry: 0.5, cursor: 'ew-resize'   },
]

export function NoteHandles({
  noteRef, scale, getState, onResize, color,
  minW = 180, minH = 80,
  onResizingChange, onHandleEnter, onHandleLeave,
}) {
  const [rect, setRect] = useState(null)
  const frameRef = useRef(null)
  const prevRef  = useRef(null)

  useEffect(() => {
    const tick = () => {
      if (noteRef.current) {
        const r = noteRef.current.getBoundingClientRect()
        const p = prevRef.current
        if (!p || p.left !== r.left || p.top !== r.top || p.width !== r.width || p.height !== r.height) {
          const next = { left: r.left, top: r.top, width: r.width, height: r.height }
          prevRef.current = next
          setRect(next)
        }
      }
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [noteRef])

  if (!rect) return null

  const s = scale || 1
  const hColor = color.header

  const startResize = (handleId, clientX, clientY) => {
    onResizingChange?.(true)
    const { x: startX, y: startY, w: startW, h: startH } = getState()
    const sx = clientX, sy = clientY

    const onMove = (mv) => {
      const cx = mv.touches ? mv.touches[0].clientX : mv.clientX
      const cy = mv.touches ? mv.touches[0].clientY : mv.clientY
      if (mv.touches) mv.preventDefault()

      const wDx = (cx - sx) / s
      const wDy = (cy - sy) / s

      let newW = startW, newH = startH, newX = startX, newY = startY

      if (handleId === 'r' || handleId === 'tr' || handleId === 'br') {
        newW = Math.max(minW, startW + wDx)
      } else if (handleId === 'l' || handleId === 'tl' || handleId === 'bl') {
        newW = Math.max(minW, startW - wDx)
        newX = startX + startW - newW
      }

      if (handleId === 'b' || handleId === 'bl' || handleId === 'br') {
        newH = Math.max(minH, startH + wDy)
      } else if (handleId === 't' || handleId === 'tl' || handleId === 'tr') {
        newH = Math.max(minH, startH - wDy)
        newY = startY + startH - newH
      }

      onResize({ x: newX, y: newY, w: newW, h: newH })
    }

    const onUp = () => {
      onResizingChange?.(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
  }

  return createPortal(
    <>
      <div style={{
        position: 'fixed',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        border: `1.5px solid ${hColor}`,
        borderRadius: 14 * s,
        pointerEvents: 'none',
        zIndex: 70000,
        boxSizing: 'border-box',
      }} />
      {HANDLES.map(h => (
        <div
          key={h.id}
          onMouseEnter={onHandleEnter}
          onMouseLeave={onHandleLeave}
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); startResize(h.id, e.clientX, e.clientY) }}
          onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); startResize(h.id, e.touches[0].clientX, e.touches[0].clientY) }}
          style={{
            position: 'fixed',
            left: rect.left + rect.width  * h.rx - HANDLE_R,
            top:  rect.top  + rect.height * h.ry - HANDLE_R,
            width:  HANDLE_R * 2,
            height: HANDLE_R * 2,
            borderRadius: '50%',
            background: '#fff',
            border: `2px solid ${hColor}`,
            cursor: h.cursor,
            pointerEvents: 'auto',
            zIndex: 70001,
            boxSizing: 'border-box',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        />
      ))}
    </>,
    document.body
  )
}
