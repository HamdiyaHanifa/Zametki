import { useState, useRef, useCallback } from 'react'
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

  const restoreRange = useCallback(() => {
    const sel = window.getSelection()
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current.cloneRange())
    }
  }, [savedRangeRef])

  const restoreAndExec = useCallback((fn) => {
    restoreRange()
    fn()
    editorRef.current?.focus()
  }, [restoreRange, editorRef])

  const exec = useCallback((cmd, value) => {
    restoreAndExec(() => document.execCommand(cmd, false, value ?? null))
  }, [restoreAndExec])

  const toggleHeading = useCallback(() => {
    restoreAndExec(() => {
      const sel = window.getSelection()
      if (!sel || !sel.rangeCount) return
      let node = sel.getRangeAt(0).commonAncestorContainer
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode
      document.execCommand('formatBlock', false, node.closest('h1,h2,h3') ? 'div' : 'h3')
    })
  }, [restoreAndExec])

  const applyHighlight = useCallback((color) => {
    restoreAndExec(() => document.execCommand('hiliteColor', false, color))
    setShowColors(false)
  }, [restoreAndExec])

  const applyFontSize = useCallback((px) => {
    const sel = window.getSelection()
    if (!sel) return
    restoreRange()
    const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null
    if (!range || range.collapsed) { editorRef.current?.focus(); return }
    const span = document.createElement('span')
    span.style.fontSize = px + 'px'
    try {
      range.surroundContents(span)
    } catch {
      const contents = range.extractContents()
      span.appendChild(contents)
      range.insertNode(span)
    }
    editorRef.current?.focus()
  }, [restoreRange, editorRef])

  // Save selection before button takes focus (desktop)
  const handleBarMouseDown = useCallback((e) => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    e.preventDefault()
  }, [savedRangeRef])

  const s = { color: textColor }

  return (
    <div className={styles.bar} style={{ borderColor: `${textColor}14`, background: `${textColor}07` }}
      onMouseDown={handleBarMouseDown}>

      {/* Formatting */}
      <button className={styles.btn} style={s} onClick={() => exec('bold')} title="Жирный"><b>B</b></button>
      <button className={styles.btn} style={{ ...s, fontStyle: 'italic' }} onClick={() => exec('italic')} title="Курсив"><i>I</i></button>
      <button className={styles.btn} style={{ ...s, textDecoration: 'underline' }} onClick={() => exec('underline')} title="Подчёркнутый">U</button>
      <button className={styles.btn} style={{ ...s, textDecoration: 'line-through' }} onClick={() => exec('strikeThrough')} title="Зачёркнутый">S</button>
      <button className={styles.btn} style={{ ...s, fontWeight: 700, fontSize: 14 }} onClick={toggleHeading} title="Заголовок">H</button>

      <span className={styles.sep} />

      {/* Font size */}
      {SIZES.map(({ px, label }, i) => (
        <button
          key={px}
          className={styles.sizeBtn}
          style={{ color: textColor, fontSize: 9 + i * 2.5 }}
          onClick={() => applyFontSize(px)}
          title={`${px}px`}
        >
          {label}
        </button>
      ))}

      <span className={styles.sep} />

      {/* Highlight color */}
      <div className={styles.colorWrap}>
        <button className={styles.btn} style={s} onClick={() => setShowColors((v) => !v)} title="Выделить цветом">
          <span className={styles.aIcon}>A</span>
        </button>
        {showColors && (
          <div className={styles.colorDrop} style={{ background: bodyColor }}>
            {HIGHLIGHTS.map(({ color, label }) => (
              <button key={color} className={styles.dot} style={{ background: color }}
                onClick={() => applyHighlight(color)} title={label} />
            ))}
            <button className={styles.dot}
              style={{ background: 'transparent', border: `1.5px solid ${textColor}40`, color: textColor, fontSize: 10 }}
              onClick={() => applyHighlight('rgba(0,0,0,0)')} title="Убрать">✕</button>
          </div>
        )}
      </div>
    </div>
  )
}
