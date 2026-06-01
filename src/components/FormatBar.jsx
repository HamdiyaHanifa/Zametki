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

export function FormatBar({ editorRef, savedRangeRef, textColor, bodyColor }) {
  const [showColors, setShowColors] = useState(false)

  const restoreAndExec = useCallback((fn) => {
    const sel = window.getSelection()
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current)
    }
    fn()
    editorRef.current?.focus()
  }, [editorRef, savedRangeRef])

  const exec = useCallback((cmd, value) => {
    restoreAndExec(() => document.execCommand(cmd, false, value ?? null))
  }, [restoreAndExec])

  const toggleHeading = useCallback(() => {
    restoreAndExec(() => {
      const sel = window.getSelection()
      if (!sel || !sel.rangeCount) return
      let node = sel.getRangeAt(0).commonAncestorContainer
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode
      const inHeading = node.closest('h1,h2,h3')
      document.execCommand('formatBlock', false, inHeading ? 'div' : 'h3')
    })
  }, [restoreAndExec])

  const applyHighlight = useCallback((color) => {
    restoreAndExec(() => document.execCommand('hiliteColor', false, color))
    setShowColors(false)
  }, [restoreAndExec])

  // Save selection before button steals focus (desktop)
  const handleBarMouseDown = useCallback((e) => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    }
    e.preventDefault()
  }, [savedRangeRef])

  const btnStyle = { color: textColor }

  return (
    <div
      className={styles.bar}
      style={{ borderColor: `${textColor}14`, background: `${textColor}07` }}
      onMouseDown={handleBarMouseDown}
    >
      <button className={styles.btn} style={btnStyle} onClick={() => exec('bold')} title="Жирный">
        <b>B</b>
      </button>
      <button className={styles.btn} style={{ ...btnStyle, fontStyle: 'italic' }} onClick={() => exec('italic')} title="Курсив">
        <i>I</i>
      </button>
      <button className={styles.btn} style={{ ...btnStyle, textDecoration: 'underline' }} onClick={() => exec('underline')} title="Подчёркнутый">
        U
      </button>
      <button className={styles.btn} style={{ ...btnStyle, textDecoration: 'line-through' }} onClick={() => exec('strikeThrough')} title="Зачёркнутый">
        S
      </button>
      <button className={styles.btn} style={{ ...btnStyle, fontWeight: 700, fontSize: 15 }} onClick={toggleHeading} title="Заголовок">
        H
      </button>

      <span className={styles.sep} />

      <div className={styles.colorWrap}>
        <button
          className={styles.btn}
          style={btnStyle}
          onClick={() => setShowColors((v) => !v)}
          title="Выделить цветом"
        >
          <span className={styles.aIcon}>A</span>
        </button>
        {showColors && (
          <div className={styles.colorDrop} style={{ background: bodyColor }}>
            {HIGHLIGHTS.map(({ color, label }) => (
              <button
                key={color}
                className={styles.dot}
                style={{ background: color }}
                onClick={() => applyHighlight(color)}
                title={label}
              />
            ))}
            <button
              className={styles.dot}
              style={{ background: 'transparent', border: `1.5px solid ${textColor}40`, color: textColor, fontSize: 10 }}
              onClick={() => applyHighlight('rgba(0,0,0,0)')}
              title="Убрать выделение"
            >✕</button>
          </div>
        )}
      </div>
    </div>
  )
}
