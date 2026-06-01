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

  // Core helper: focus editor → restore selection → run command → keep selection
  // Focus MUST come before addRange — otherwise iOS ignores addRange
  const withSelection = useCallback((fn) => {
    if (!savedRangeRef.current) return
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current.cloneRange())
    }
    fn()
    // After fn(), save whatever selection is active (fn() may have set a new one)
    const selAfter = window.getSelection()
    if (selAfter && !selAfter.isCollapsed && selAfter.rangeCount > 0) {
      savedRangeRef.current = selAfter.getRangeAt(0).cloneRange()
    }
    setTimeout(() => {
      editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }))
    }, 0)
  }, [savedRangeRef, editorRef])

  // Bold / italic / underline / strikethrough
  const exec = useCallback((cmd) => {
    withSelection(() => document.execCommand(cmd, false, null))
  }, [withSelection])

  // Heading toggle
  const toggleHeading = useCallback(() => {
    withSelection(() => {
      const sel = window.getSelection()
      let node = sel?.getRangeAt(0)?.commonAncestorContainer
      if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode
      document.execCommand('formatBlock', false, node?.closest?.('h1,h2,h3') ? 'div' : 'h3')
    })
  }, [withSelection])

  // Font size — mark with font[size="7"] then replace with real span, then re-select
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
      // Re-select the new spans so selection stays visible for repeated size changes
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

  // Highlight color
  const applyHighlight = useCallback((color) => {
    withSelection(() => {
      document.execCommand('styleWithCSS', false, true)
      document.execCommand('hiliteColor', false, color)
    })
    setShowColors(false)
  }, [withSelection])

  // Save selection on bar mousedown (desktop) — focus stays in editor
  const handleBarMouseDown = useCallback((e) => {
    const sel = window.getSelection()
    if (sel && !sel.isCollapsed) {
      const range = sel.getRangeAt(0)
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange()
      }
    }
    e.preventDefault()
  }, [savedRangeRef, editorRef])

  // Save selection when opening color picker (before iOS dismisses it)
  const handleOpenColors = useCallback(() => {
    const sel = window.getSelection()
    if (sel && !sel.isCollapsed) {
      const range = sel.getRangeAt(0)
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange()
      }
    }
    setShowColors((v) => !v)
  }, [savedRangeRef, editorRef])

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
        <button className={styles.btn} style={s} onClick={handleOpenColors} title="Выделить цветом">
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
                onClick={() => applyHighlight(color)}
                title={label} />
            ))}
            <button
              className={styles.dot}
              style={{ background: 'transparent', border: `1.5px solid ${textColor}40`, color: textColor, fontSize: 10 }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyHighlight('transparent')}
              title="Убрать">✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
