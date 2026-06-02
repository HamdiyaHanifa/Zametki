import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './FreeImage.module.css'

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

export function FreeImage({ img, containerRef, onUpdate, onDelete }) {
  const { x, y, w } = img
  const wrapRef = useRef(null)
  const [selected, setSelected] = useState(false)

  // Deselect when clicking outside
  useEffect(() => {
    if (!selected) return
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setSelected(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [selected])

  const startDrag = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    setSelected(true)
    const container = containerRef.current
    if (!container) return
    const sx = e.clientX ?? e.touches[0].clientX
    const sy = e.clientY ?? e.touches[0].clientY
    const ox = x, oy = y

    const onMove = (mv) => {
      mv.preventDefault()
      const r = container.getBoundingClientRect()
      const cx = mv.clientX ?? mv.touches[0].clientX
      const cy = mv.clientY ?? mv.touches[0].clientY
      onUpdate({
        x: clamp(ox + (cx - sx) / r.width,  0, 1 - w),
        y: clamp(oy + (cy - sy) / r.height, 0, 0.97),
      })
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
  }, [x, y, w, containerRef, onUpdate])

  const startResize = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const sx = e.clientX ?? e.touches[0].clientX
    const sw = w

    const onMove = (mv) => {
      mv.preventDefault()
      const r = container.getBoundingClientRect()
      const cx = mv.clientX ?? mv.touches[0].clientX
      const minW = 40 / r.width
      onUpdate({ w: clamp(sw + (cx - sx) / r.width, minW, 1 - x) })
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
  }, [x, w, containerRef, onUpdate])

  return (
    <div
      ref={wrapRef}
      className={`${styles.wrap} ${selected ? styles.sel : ''}`}
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%` }}
      onMouseDown={startDrag}
      onTouchStart={startDrag}
    >
      <img src={img.src} className={styles.photo} draggable={false} />
      <button
        className={styles.del}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => { e.stopPropagation(); e.preventDefault() }}
        onClick={(e) => { e.stopPropagation(); onDelete() }}
      >✕</button>
      <div
        className={styles.resizeHandle}
        onMouseDown={startResize}
        onTouchStart={startResize}
      />
    </div>
  )
}
