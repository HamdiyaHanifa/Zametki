import { useState, useCallback, useEffect, useRef } from 'react'
import styles from './FormatBar.module.css'

const SIZES = [
  { px: 11, label: 'S' },
  { px: 14, label: 'M' },
  { px: 18, label: 'L' },
  { px: 24, label: 'XL' },
]

const HIGHLIGHT_COLORS = [
  '#FFEB3B', '#A5D6A7', '#F48FB1',
  '#90CAF9', '#FFCC80', '#CE93D8',
]

export function FormatBar({ editorRef, savedRangeRef, textColor }) {
  const [showSizes, setShowSizes] = useState(false)
  const [showListDrop, setShowListDrop] = useState(false)
  const [showHighlight, setShowHighlight] = useState(false)
  const [lastHighlight, setLastHighlight] = useState('#FFEB3B')
  const [stepSize, setStepSize] = useState(14)
  const sizeWrapRef = useRef(null)
  const listWrapRef = useRef(null)
  const highlightWrapRef = useRef(null)

  useEffect(() => {
    if (!showSizes) return
    const onClose = (e) => {
      if (!sizeWrapRef.current?.contains(e.target)) setShowSizes(false)
    }
    const id = setTimeout(() => window.addEventListener('pointerdown', onClose), 0)
    return () => { clearTimeout(id); window.removeEventListener('pointerdown', onClose) }
  }, [showSizes])

  useEffect(() => {
    if (!showListDrop) return
    const onClose = (e) => {
      if (!listWrapRef.current?.contains(e.target)) setShowListDrop(false)
    }
    const id = setTimeout(() => window.addEventListener('pointerdown', onClose), 0)
    return () => { clearTimeout(id); window.removeEventListener('pointerdown', onClose) }
  }, [showListDrop])

  useEffect(() => {
    if (!showHighlight) return
    const onClose = (e) => {
      if (!highlightWrapRef.current?.contains(e.target)) setShowHighlight(false)
    }
    const id = setTimeout(() => window.addEventListener('pointerdown', onClose), 0)
    return () => { clearTimeout(id); window.removeEventListener('pointerdown', onClose) }
  }, [showHighlight])

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

  const insertTodoList = useCallback(() => {
    editorRef.current?.focus()
    if (savedRangeRef.current) {
      const s = window.getSelection()
      s?.removeAllRanges()
      s?.addRange(savedRangeRef.current.cloneRange())
    }
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    let node = sel.getRangeAt(0).commonAncestorContainer
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode
    const existingTodo = node?.closest?.('ul[data-todo]')
    if (existingTodo) {
      existingTodo.removeAttribute('data-todo')
      existingTodo.querySelectorAll('li[data-checked]').forEach(li => li.removeAttribute('data-checked'))
    } else {
      document.execCommand('insertUnorderedList', false, null)
      const sel2 = window.getSelection()
      if (!sel2?.rangeCount) return
      let n = sel2.getRangeAt(0).commonAncestorContainer
      if (n?.nodeType === Node.TEXT_NODE) n = n.parentNode
      const ul = n?.closest?.('ul')
      if (ul && !ul.dataset.todo) ul.dataset.todo = 'true'
    }
    setTimeout(() => {
      editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }))
    }, 0)
  }, [editorRef, savedRangeRef])

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

  const handleListOption = useCallback((type) => {
    setShowListDrop(false)
    if (type === 'ul') exec('insertUnorderedList')
    else if (type === 'ol') exec('insertOrderedList')
    else if (type === 'todo') insertTodoList()
  }, [exec, insertTodoList])

  const applyHighlight = useCallback((color) => {
    setShowHighlight(false)
    if (color !== 'transparent') setLastHighlight(color)
    withSelection(() => document.execCommand('hiliteColor', false, color))
  }, [withSelection])

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

      {/* List type dropdown */}
      <div className={styles.sizeWrap} ref={listWrapRef}>
        <button
          className={styles.btn}
          style={s}
          onTouchStart={(e) => { e.preventDefault(); setShowListDrop(v => !v) }}
          onClick={() => setShowListDrop(v => !v)}
          title="Списки"
        >
          <svg width="13" height="11" viewBox="0 0 13 11" fill="currentColor">
            <circle cx="1.5" cy="1.5" r="1.5"/>
            <rect x="4" y="0.5" width="9" height="2" rx="1"/>
            <circle cx="1.5" cy="5.5" r="1.5"/>
            <rect x="4" y="4.5" width="9" height="2" rx="1"/>
            <circle cx="1.5" cy="9.5" r="1.5"/>
            <rect x="4" y="8.5" width="9" height="2" rx="1"/>
          </svg>
        </button>

        {showListDrop && (
          <div className={styles.sizeDrop} style={{ minWidth: 160 }} onMouseDown={(e) => e.preventDefault()}>
            <button
              className={styles.listOption}
              style={{ color: textColor }}
              onTouchStart={(e) => { e.preventDefault(); handleListOption('ul') }}
              onClick={() => handleListOption('ul')}
            >
              <svg width="11" height="10" viewBox="0 0 11 10" fill="currentColor" style={{ flexShrink: 0 }}>
                <circle cx="1.2" cy="1.5" r="1.2"/><rect x="3.5" y="0.5" width="7.5" height="2" rx="0.8"/>
                <circle cx="1.2" cy="5" r="1.2"/><rect x="3.5" y="4" width="7.5" height="2" rx="0.8"/>
                <circle cx="1.2" cy="8.5" r="1.2"/><rect x="3.5" y="7.5" width="7.5" height="2" rx="0.8"/>
              </svg>
              Список
            </button>
            <button
              className={styles.listOption}
              style={{ color: textColor }}
              onTouchStart={(e) => { e.preventDefault(); handleListOption('ol') }}
              onClick={() => handleListOption('ol')}
            >
              <svg width="11" height="10" viewBox="0 0 11 10" fill="currentColor" style={{ flexShrink: 0 }}>
                <rect x="0.3" y="0" width="2" height="3" rx="0.6"/>
                <rect x="3.5" y="0.5" width="7.5" height="2" rx="0.8"/>
                <rect x="0.3" y="3.5" width="2" height="3" rx="0.6"/>
                <rect x="3.5" y="4" width="7.5" height="2" rx="0.8"/>
                <rect x="0.3" y="7" width="2" height="3" rx="0.6"/>
                <rect x="3.5" y="7.5" width="7.5" height="2" rx="0.8"/>
              </svg>
              Нумерованный
            </button>
            <div className={styles.dropSep} />
            <button
              className={styles.listOption}
              style={{ color: textColor }}
              onTouchStart={(e) => { e.preventDefault(); handleListOption('todo') }}
              onClick={() => handleListOption('todo')}
            >
              <svg width="11" height="10" viewBox="0 0 11 10" fill="none" style={{ flexShrink: 0 }}>
                <rect x="0.6" y="0.6" width="2.3" height="2.3" rx="0.5" stroke="currentColor" strokeWidth="1.1"/>
                <rect x="3.5" y="0.5" width="7.5" height="2" rx="0.8" fill="currentColor"/>
                <rect x="0.6" y="3.8" width="2.3" height="2.3" rx="0.5" stroke="currentColor" strokeWidth="1.1"/>
                <path d="M1.1 5l0.65 0.65 1.1-1.1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="3.5" y="4" width="7.5" height="2" rx="0.8" fill="currentColor"/>
                <rect x="0.6" y="7" width="2.3" height="2.3" rx="0.5" stroke="currentColor" strokeWidth="1.1"/>
                <rect x="3.5" y="7.5" width="7.5" height="2" rx="0.8" fill="currentColor"/>
              </svg>
              Галочки
            </button>
          </div>
        )}
      </div>

      {/* Highlight color dropdown */}
      <div className={styles.sizeWrap} ref={highlightWrapRef}>
        <button
          className={styles.btn}
          style={s}
          onTouchStart={(e) => { e.preventDefault(); setShowHighlight(v => !v) }}
          onClick={() => setShowHighlight(v => !v)}
          title="Выделение цветом"
        >
          <span className={styles.hlIcon}>
            <span>A</span>
            <span className={styles.hlBar} style={{ background: lastHighlight }} />
          </span>
        </button>

        {showHighlight && (
          <div className={styles.sizeDrop} onMouseDown={(e) => e.preventDefault()}>
            <div className={styles.hlSwatches}>
              {HIGHLIGHT_COLORS.map(color => (
                <button
                  key={color}
                  className={styles.hlSwatch}
                  style={{ background: color }}
                  onTouchStart={(e) => { e.preventDefault(); applyHighlight(color) }}
                  onClick={() => applyHighlight(color)}
                />
              ))}
            </div>
            <div className={styles.dropSep} />
            <button
              className={styles.listOption}
              style={{ color: textColor }}
              onTouchStart={(e) => { e.preventDefault(); applyHighlight('transparent') }}
              onClick={() => applyHighlight('transparent')}
            >Убрать выделение</button>
          </div>
        )}
      </div>

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
