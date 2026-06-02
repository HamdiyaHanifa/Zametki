import { useState, useCallback } from 'react'
import styles from './FormatBar.module.css'

const HIGHLIGHTS = [
  { color: '#FFF59D', label: 'Жёлтый' },
  { color: '#FFCDD2', label: 'Розовый' },
  { color: '#C8E6C9', label: 'Зелёный' },
  { color: '#BBDEFB', label: 'Голубой' },
  { color: '#FFE0B2', label: 'Оранжевый' },
  { color: '#E1BEE7', label: 'Фиолетовый' },
]

const SIZES = [
  { px: 11, label: 'S' },
  { px: 14, label: 'M' },
  { px: 18, label: 'L' },
  { px: 24, label: 'XL' },
]

export function FormatBar({ editorRef, savedRangeRef, textColor, bodyColor }) {
  const [showColors, setShowColors] = useState(false)

  // Restore selection into editor and run a command, then keep selection
  // focus() MUST come before addRange — iOS requirement
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

  // Highlight — pure DOM range manipulation, no execCommand, works on iOS
  const applyHighlight = useCallback((color) => {
    const range = savedRangeRef.current
    if (!range || range.collapsed) { setShowColors(false); return }

    try {
      if (color === 'transparent') {
        const spans = [...(editorRef.current?.querySelectorAll('span') || [])]
        spans.forEach((span) => {
          if (!span.style.backgroundColor) return
          try {
            if (range.intersectsNode(span)) {
              span.style.backgroundColor = ''
              if (!span.getAttribute('style')?.replace(/\s/g, '')) {
                const parent = span.parentNode
                while (span.firstChild) parent.insertBefore(span.firstChild, span)
                parent.removeChild(span)
              }
            }
          } catch { }
        })
      } else {
        const frag = range.extractContents()
        const span = document.createElement('span')
        span.style.backgroundColor = color
        span.appendChild(frag)
        range.insertNode(span)
        const newRange = document.createRange()
        newRange.selectNodeContents(span)
        savedRangeRef.current = newRange.cloneRange()
      }
    } catch { }

    // Dispatch input synchronously so the change is saved before any re-render
    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }))
    setShowColors(false)
  }, [savedRangeRef, editorRef])

  // Save selection — call on any FormatBar touch/mousedown to capture before iOS collapses it
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

  // On iOS, touchstart fires BEFORE the selection collapses — save range here
  const handleBarTouchStart = useCallback(() => {
    saveSelectionNow()
  }, [saveSelectionNow])

  const handleOpenColors = useCallback(() => {
    saveSelectionNow()
    setShowColors((v) => !v)
  }, [saveSelectionNow])

  const s = { color: textColor }

  return (
    <div
      className={styles.bar}
      style={{ borderColor: `${textColor}14`, background: `${textColor}07` }}
      onMouseDown={handleBarMouseDown}
      onTouchStart={handleBarTouchStart}
    >
      <button className={styles.btn} style={s} onClick={() => exec('bold')} title="Жирный"><b>B</b></button>
      <button className={styles.btn} style={{ ...s, fontStyle: 'italic' }} onClick={() => exec('italic')} title="Курсив"><i>I</i></button>
      <button className={styles.btn} style={{ ...s, textDecoration: 'underline' }} onClick={() => exec('underline')} title="Подчёркнутый">U</button>
      <button className={styles.btn} style={{ ...s, textDecoration: 'line-through' }} onClick={() => exec('strikeThrough')} title="Зачёркнутый">S</button>
      <button className={styles.btn} style={{ ...s, fontWeight: 700, fontSize: 14 }} onClick={toggleHeading} title="Заголовок">H</button>

      <span className={styles.sep} />

      {SIZES.map(({ px, label }, i) => (
        <button key={px} className={styles.sizeBtn}
          style={{ color: textColor, fontSize: 9 + i * 2.5 }}
          onClick={() => applyFontSize(px)}
          title={`${px}px`}>
          {label}
        </button>
      ))}

      <span className={styles.sep} />

      <div className={styles.colorWrap}>
        <button className={styles.btn} style={s}
          onTouchStart={handleOpenColors}
          onClick={handleOpenColors}
          title="Выделить цветом">
          <span className={styles.aIcon}>A</span>
        </button>
        {showColors && (
          <div
            className={styles.colorDrop}
            style={{ background: bodyColor }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {HIGHLIGHTS.map(({ color, label }) => (
              <button key={color} className={styles.dot}
                style={{ background: color }}
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => { e.preventDefault(); applyHighlight(color) }}
                onClick={() => applyHighlight(color)}
                title={label} />
            ))}
            <button
              className={styles.dot}
              style={{ background: 'transparent', border: `1.5px solid ${textColor}40`, color: textColor, fontSize: 10 }}
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => { e.preventDefault(); applyHighlight('transparent') }}
              onClick={() => applyHighlight('transparent')}
              title="Убрать">✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
