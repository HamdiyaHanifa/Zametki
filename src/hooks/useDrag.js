import { useCallback, useRef } from 'react'

export function useDrag(onPositionChange) {
  const drag = useRef(null)

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    e.preventDefault()
    drag.current = { startX: e.clientX, startY: e.clientY }

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
  }, [onPositionChange])

  return onMouseDown
}
