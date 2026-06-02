import { useCallback } from 'react'
import styles from './FormatBar.module.css'

const SIZES = [
  { px: 11, label: 'S' },
  { px: 14, label: 'M' },
  { px: 18, label: 'L' },
  { px: 24, label: 'XL' },
]

export function FormatBar({ editorRef, savedRangeRef, textColor }) {
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

  const handleBarMouseDown = useCallback((e) => {
    e.preventDefault()
  }, [])

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
    </div>
  )
}
