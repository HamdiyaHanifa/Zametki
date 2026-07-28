import { useCallback, useRef } from 'react'

export function useDrag(onPositionChange) {
  const drag = useRef(null)

  const start = useCallback((clientX, clientY) => {
    drag.current = { startX: clientX, startY: clientY }
  }, [])

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    e.preventDefault()
    start(e.clientX, e.clientY)

    const onMove = (e) => {
      if (!drag.current) return
      const dx = e.clientX - drag.current.startX
      const dy = e.clientY - drag.current.startY
      drag.current.startX = e.clientX
      drag.current.startY = e.clientY
      onPositionChange(dx, dy)
    }

    const onUp = () => {
      drag.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onPositionChange, start])

  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    start(touch.clientX, touch.clientY)

    const onMove = (e) => {
      if (!drag.current) return
      e.preventDefault()
      const touch = e.touches[0]
      const dx = touch.clientX - drag.current.startX
      const dy = touch.clientY - drag.current.startY
      drag.current.startX = touch.clientX
      drag.current.startY = touch.clientY
      onPositionChange(dx, dy)
    }

    const onUp = () => {
      drag.current = null
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }

    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
  }, [onPositionChange, start])

  return { onMouseDown, onTouchStart }
}
