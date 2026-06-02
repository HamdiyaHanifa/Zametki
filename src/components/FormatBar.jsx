import { useState, useCallback, useEffect, useRef } from 'react'
import styles from './FormatBar.module.css'

const SIZES = [
  { px: 11, label: 'S' },
  { px: 14, label: 'M' },
  { px: 18, label: 'L' },
  { px: 24, label: 'XL' },
]

export function FormatBar({ editorRef, savedRangeRef, textColor }) {
  const [showSizes, setShowSizes] = useState(false)
  const [stepSize, setStepSize] = useState(14)
  const sizeWrapRef = useRef(null)

  // Close dropdown on click outside the size button/dropdown
  useEffect(() => {
    if (!showSizes) return
    const onClose = (e) => {
      if (!sizeWrapRef.current?.contains(e.target)) setShowSizes(false)
    }
    const id = setTimeout(() => window.addEventListener('pointerdown', onClose), 0)
    return () => { clearTimeout(id); window.removeEventListener('pointerdown', onClose) }
  }, [showSizes])

  const withSelection = useCallback((fn) => {
    if (!savedRangeRef.current) return
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current.cloneRange())
    }
    fn()
    const selAfter = window.getSelection()
    if (selAfter && !selAfter.isCollapsed && selAfter.rangeCount > 0) {
      savedRangeRef.current = selAfter.getRangeAt(0).cloneRange()
    }
    setTimeout(() => {
      editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }))
    }, 0)
  }, [savedRangeRef, editorRef])

  const exec = useCallback((cmd) => {
    withSelection(() => document.execCommand(cmd, false, null))
  }, [withSelection])

  const toggleHeading = useCallback(() => {
    withSelection(() => {
      const sel = window.getSelection()
      let node = sel?.getRangeAt(0)?.commonAncestorContainer
      if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode
      document.execCommand('formatBlock', false, node?.closest?.('h1,h2,h3') ? 'div' : 'h3')
    })
  }, [withSelection])

  const applyFontSize = useCallback((px) => {
    withSelection(() => {
      document.execCommand('fontSize', false, '7')
      const fonts = [...(editorRef.current?.querySelectorAll('font[size="7"]') || [])]
      const newSpans = fonts.map(font => {
        const span = document.createElement('span')
        span.style.fontSize = px + 'px'
        while (font.firstChild) span.appendChild(font.firstChild)
        font.parentNode?.replaceChild(span, font)
        return span
      })
      if (newSpans.length > 0) {
        const range = document.createRange()
        range.setStart(newSpans[0], 0)
        const last = newSpans[newSpans.length - 1]
        range.setEnd(last, last.childNodes.length)
        const sel = window.getSelection()
        if (sel) { sel.removeAllRanges(); sel.addRange(range) }
        savedRangeRef.current = range.cloneRange()
      }
    })
  }, [withSelection, editorRef, savedRangeRef])

  const saveSelectionNow = useCallback(() => {
    const sel = window.getSelection()
    if (sel && !sel.isCollapsed) {
      const range = sel.getRangeAt(0)
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange()
      }
    }
  }, [savedRangeRef, editorRef])

  const handleBarMouseDown = useCallback((e) => {
    saveSelectionNow()
    e.preventDefault()
  }, [saveSelectionNow])

  const handleOpenSizes = useCallback(() => {
    saveSelectionNow()
    const sel = window.getSelection()
    if (sel?.rangeCount > 0) {
      const node = sel.getRangeAt(0).commonAncestorContainer
      const el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node
      const computed = el ? parseInt(window.getComputedStyle(el).fontSize) : 14
      if (computed > 0) setStepSize(computed)
    }
    setShowSizes((v) => !v)
  }, [saveSelectionNow])

  const applyStep = useCallback((delta) => {
    const next = Math.max(6, Math.min(72, stepSize + delta))
    setStepSize(next)
    applyFontSize(next)
  }, [stepSize, applyFontSize])

  const s = { color: textColor }

  return (
    <div
      className={styles.bar}
      style={{ borderColor: `${textColor}14`, background: `${textColor}07` }}
      onMouseDown={handleBarMouseDown}
    >
      <button className={styles.btn} style={s} onClick={() => exec('bold')} title="Жирный"><b>B</b></button>
      <button className={styles.btn} style={{ ...s, fontStyle: 'italic' }} onClick={() => exec('italic')} title="Курсив"><i>I</i></button>
      <button className={styles.btn} style={{ ...s, textDecoration: 'underline' }} onClick={() => exec('underline')} title="Подчёркнутый">U</button>
      <button className={styles.btn} style={{ ...s, textDecoration: 'line-through' }} onClick={() => exec('strikeThrough')} title="Зачёркнутый">S</button>
      <button className={styles.btn} style={{ ...s, fontWeight: 700, fontSize: 14 }} onClick={toggleHeading} title="Заголовок">H</button>

      <span className={styles.sep} />

      {/* sizeWrap is the positioning anchor for the dropdown */}
      <div className={styles.sizeWrap} ref={sizeWrapRef}>
        <button
          className={`${styles.btn} ${styles.sizeToggle}`}
          style={s}
          onTouchStart={(e) => { e.preventDefault(); handleOpenSizes() }}
          onClick={handleOpenSizes}
          title="Размер текста"
        >
          <span className={styles.aaIcon}>Аа</span>
        </button>

        {showSizes && (
          <div
            className={styles.sizeDrop}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className={styles.sizePresets}>
              {SIZES.map(({ px, label }, i) => (
                <button
                  key={px}
                  className={styles.presetBtn}
                  style={{ color: textColor, fontSize: 9 + i * 2.5 }}
                  onTouchStart={(e) => { e.preventDefault(); applyFontSize(px); setStepSize(px) }}
                  onClick={() => { applyFontSize(px); setStepSize(px) }}
                  title={`${px}px`}
                >{label}</button>
              ))}
            </div>
            <div className={styles.dropSep} />
            <div className={styles.stepper}>
              <button
                className={styles.stepBtn}
                style={{ color: textColor }}
                onTouchStart={(e) => { e.preventDefault(); applyStep(-1) }}
                onClick={() => applyStep(-1)}
              >−</button>
              <span className={styles.stepDisplay} style={{ color: textColor }}>{stepSize}px</span>
              <button
                className={styles.stepBtn}
                style={{ color: textColor }}
                onTouchStart={(e) => { e.preventDefault(); applyStep(+1) }}
                onClick={() => applyStep(+1)}
              >+</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
