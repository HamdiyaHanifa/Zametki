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

  // ── Helpers ────────────────────────────────────────────────────────────────

  const restoreSelection = useCallback(() => {
    if (!savedRangeRef.current) return null
    const sel = window.getSelection()
    if (!sel) return null
    sel.removeAllRanges()
    sel.addRange(savedRangeRef.current.cloneRange())
    return sel.getRangeAt(0)
  }, [savedRangeRef])

  const triggerInput = useCallback(() => {
    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }))
  }, [editorRef])

  // execCommand-based (bold/italic/underline/strikethrough/heading)
  const execCmd = useCallback((cmd, value) => {
    const sel = window.getSelection()
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current.cloneRange())
    }
    document.execCommand(cmd, false, value ?? null)
    editorRef.current?.focus()
    triggerInput()
  }, [savedRangeRef, editorRef, triggerInput])

  // Range-based — wraps selection in <span style={key: value}>
  const applySpan = useCallback((styleKey, styleValue) => {
    const range = restoreSelection()
    if (!range || range.collapsed) { editorRef.current?.focus(); return }

    const span = document.createElement('span')
    span.style[styleKey] = styleValue
    try {
      range.surroundContents(span)
    } catch {
      const contents = range.extractContents()
      span.appendChild(contents)
      range.insertNode(span)
    }
    editorRef.current?.focus()
    triggerInput()
  }, [restoreSelection, editorRef, triggerInput])

  // ── Actions ────────────────────────────────────────────────────────────────

  const toggleHeading = useCallback(() => {
    const sel = window.getSelection()
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current.cloneRange())
    }
    let node = sel?.getRangeAt(0)?.commonAncestorContainer
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode
    document.execCommand('formatBlock', false, node?.closest?.('h1,h2,h3') ? 'div' : 'h3')
    editorRef.current?.focus()
    triggerInput()
  }, [savedRangeRef, editorRef, triggerInput])

  const applyFontSize = useCallback((px) => applySpan('fontSize', px + 'px'), [applySpan])

  const applyHighlight = useCallback((color) => {
    applySpan('backgroundColor', color)
    setShowColors(false)
  }, [applySpan])

  // ── Range saving ───────────────────────────────────────────────────────────

  // Save range from editor when bar is about to receive interaction (desktop)
  const handleBarMouseDown = useCallback((e) => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange()
      }
    }
    e.preventDefault() // keep focus in editor
  }, [savedRangeRef, editorRef])

  // Also save when opening the color picker (critical on mobile)
  const handleOpenColors = useCallback(() => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange()
      }
    }
    setShowColors((v) => !v)
  }, [savedRangeRef, editorRef])

  // ── Render ─────────────────────────────────────────────────────────────────

  const s = { color: textColor }

  return (
    <div
      className={styles.bar}
      style={{ borderColor: `${textColor}14`, background: `${textColor}07` }}
      onMouseDown={handleBarMouseDown}
    >
      <button className={styles.btn} style={s} onClick={() => execCmd('bold')} title="Жирный"><b>B</b></button>
      <button className={styles.btn} style={{ ...s, fontStyle: 'italic' }} onClick={() => execCmd('italic')} title="Курсив"><i>I</i></button>
      <button className={styles.btn} style={{ ...s, textDecoration: 'underline' }} onClick={() => execCmd('underline')} title="Подчёркнутый">U</button>
      <button className={styles.btn} style={{ ...s, textDecoration: 'line-through' }} onClick={() => execCmd('strikeThrough')} title="Зачёркнутый">S</button>
      <button className={styles.btn} style={{ ...s, fontWeight: 700, fontSize: 14 }} onClick={toggleHeading} title="Заголовок">H</button>

      <span className={styles.sep} />

      {SIZES.map(({ px, label }, i) => (
        <button key={px} className={styles.sizeBtn}
          style={{ color: textColor, fontSize: 9 + i * 2.5 }}
          onClick={() => applyFontSize(px)} title={`${px}px`}>
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
