import { useCallback, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useDrag } from '../hooks/useDrag'
import { PALETTE, paletteFromHex } from '../palette'
import { FormatBar } from './FormatBar'
import { ImageResizer } from './ImageResizer'
import { FreeImage } from './FreeImage'
import { NoteHandles } from './NoteHandles'
import { countWords, wordForm, noteWordCount } from '../utils/wordCount'
import { TAGS, TAGS_MAP } from '../utils/tags'
import styles from './Note.module.css'

const DEFAULT_W_TEXT = 280
const DEFAULT_W_IMG  = 300
const DEFAULT_H_TEXT = 150
const DEFAULT_H_IMG  = 220
const MIN_W = 180
const MIN_H = 80

function lastVisible(html, mode) {
  const el = document.createElement('div')
  el.innerHTML = html || ''
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (mode === 'word') return text.match(/\S+$/)?.[0] || ''
  const parts = text.split(/[.!?]\s+|\n/)
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i].trim()
    if (p) return p
  }
  return text
}

export function Note({ note, onUpdate, onMove, onDelete, onDuplicate, onFocus, onOpenFocus, zIndex, scale, onResetWordCount, onCumulativeAdd, onTimerDangerActivity, blindMode = 'off', timerDangerResetSignal }) {
  const [showPicker, setShowPicker] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [selectedImg, setSelectedImg] = useState(null) // { el, rect }
  const color = note.customColor
    ? paletteFromHex(note.customColor, note.customColorSat ?? 1)
    : PALETTE[note.colorIndex % PALETTE.length]
  const isImage = Boolean(note.imageUrl)

  const w = note.minimized ? 220 : (note.width || (isImage ? DEFAULT_W_IMG : DEFAULT_W_TEXT))
  const h = note.height || (isImage ? DEFAULT_H_IMG : DEFAULT_H_TEXT)

  const noteRef          = useRef(null)
  const editorRef        = useRef(null)
  const savedRangeRef    = useRef(null)
  const freeImgWrapRef   = useRef(null)
  const prevWordsRef     = useRef(countWords(note.htmlContent || ''))
  const [showHandles, setShowHandles] = useState(false)
  const hideTimerRef     = useRef(null)
  const resizingRef      = useRef(false)

  useEffect(() => {
    if (!editorRef.current) return
    editorRef.current.innerHTML = note.htmlContent || ''
    prevWordsRef.current = countWords(note.htmlContent || '')
  }, [note.id, note.minimized]) // eslint-disable-line

  useEffect(() => {
    if (!editorRef.current) return
    if (document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = note.htmlContent || ''
    }
  }, [note.htmlContent])

  // Force-reset editor when danger mode fires (bypasses the activeElement guard)
  useEffect(() => {
    if (!timerDangerResetSignal || !editorRef.current) return
    if (timerDangerResetSignal.noteId === note.id) {
      editorRef.current.innerHTML = timerDangerResetSignal.htmlContent
    } else if (timerDangerResetSignal.noteId === null && timerDangerResetSignal.allNotes) {
      const snap = timerDangerResetSignal.allNotes.find(n => n.id === note.id)
      if (snap) editorRef.current.innerHTML = snap.htmlContent
    }
  }, [timerDangerResetSignal, note.id])

  const saveRange = useCallback(() => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange()
  }, [])

  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection()
      // Only save when there's actual non-collapsed selection (not just cursor)
      if (sel && !sel.isCollapsed && editorRef.current) {
        const range = sel.getRangeAt(0)
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          savedRangeRef.current = range.cloneRange()
        }
      }
    }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [])

  const handleInput = useCallback(() => {
    const html = editorRef.current?.innerHTML || ''
    onUpdate(note.id, { htmlContent: html })
    onTimerDangerActivity?.()
    const newWords = countWords(html)
    const delta = newWords - prevWordsRef.current
    if (delta > 0) onCumulativeAdd?.(delta)
    prevWordsRef.current = newWords
  }, [note.id, onUpdate, onTimerDangerActivity, onCumulativeAdd])

  const handleEditorMouseDown = useCallback((e) => {
    e.stopPropagation()
    if (e.target.tagName === 'IMG' && e.target.dataset.freeimg) {
      e.preventDefault()
      setSelectedImg({ el: e.target, rect: e.target.getBoundingClientRect() })
      return
    }
    setSelectedImg(null)
    const li = e.target.closest?.('ul[data-todo] > li')
    if (li) {
      const rect = li.getBoundingClientRect()
      if (e.clientX - rect.left < 22) {
        e.preventDefault()
        li.dataset.checked = li.dataset.checked === 'true' ? 'false' : 'true'
        onUpdate(note.id, { htmlContent: editorRef.current?.innerHTML || '' })
        return
      }
    }
  }, [note.id, onUpdate])

  const handleEditorTouchStart = useCallback((e) => {
    e.stopPropagation()
    if (e.target.tagName === 'IMG' && e.target.dataset.freeimg) {
      e.preventDefault()
      setSelectedImg({ el: e.target, rect: e.target.getBoundingClientRect() })
      return
    }
    setSelectedImg(null)
    const touch = e.touches[0]
    if (!touch) return
    const li = e.target.closest?.('ul[data-todo] > li')
    if (li) {
      const rect = li.getBoundingClientRect()
      if (touch.clientX - rect.left < 22) {
        e.preventDefault()
        li.dataset.checked = li.dataset.checked === 'true' ? 'false' : 'true'
        onUpdate(note.id, { htmlContent: editorRef.current?.innerHTML || '' })
        return
      }
    }
  }, [note.id, onUpdate])

  const handlePositionChange = useCallback((dx, dy) => {
    onMove(note.id, dx, dy)
  }, [note.id, onMove])

  const { onMouseDown: dragMouseDown, onTouchStart: dragTouchStart } = useDrag(handlePositionChange)

  const handleHeaderMouseDown = useCallback((e) => {
    e.stopPropagation(); onFocus(note.id); dragMouseDown(e)
  }, [note.id, onFocus, dragMouseDown])

  const handleHeaderTouchStart = useCallback((e) => {
    e.stopPropagation(); onFocus(note.id); dragTouchStart(e)
  }, [note.id, onFocus, dragTouchStart])

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      if (!resizingRef.current) setShowHandles(false)
    }, 150)
  }, [])

  const cancelHide = useCallback(() => clearTimeout(hideTimerRef.current), [])

  const getNoteState = useCallback(() => ({
    x: note.x,
    y: note.y,
    w: note.width  || (isImage ? DEFAULT_W_IMG  : DEFAULT_W_TEXT),
    h: note.height || (isImage ? DEFAULT_H_IMG  : DEFAULT_H_TEXT),
  }), [note, isImage])

  const handleNoteResize = useCallback(({ x, y, w, h }) => {
    onUpdate(note.id, { x, y, width: w, height: h })
  }, [note.id, onUpdate])

  const handleResizingChange = useCallback((active) => {
    resizingRef.current = active
    if (!active) scheduleHide()
  }, [scheduleHide])

  const freeImages = note.freeImages || []
  const addFreeImg = useCallback((src) => {
    if (!editorRef.current) return
    editorRef.current.focus()
    const sel = window.getSelection()
    if (savedRangeRef.current) {
      sel?.removeAllRanges()
      sel?.addRange(savedRangeRef.current.cloneRange())
    } else if (!sel?.rangeCount) {
      const range = document.createRange()
      range.selectNodeContents(editorRef.current)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    document.execCommand('insertHTML', false,
      `<img src="${src}" data-freeimg="1" style="float:left;width:45%;margin:4px 10px 4px 0;border-radius:4px;">`)
    setTimeout(() => {
      onUpdate(note.id, { htmlContent: editorRef.current?.innerHTML || '' })
    }, 0)
  }, [note.id, editorRef, savedRangeRef, onUpdate])
  const applyImgLayout = useCallback((layout) => {
    const el = selectedImg?.el
    if (!el) return
    if (layout === 'left') {
      Object.assign(el.style, { float: 'left', margin: '4px 10px 4px 0', maxWidth: '45%', display: '' })
    } else if (layout === 'right') {
      Object.assign(el.style, { float: 'right', margin: '4px 0 4px 10px', maxWidth: '45%', display: '' })
    } else {
      Object.assign(el.style, { float: 'none', margin: '8px auto', maxWidth: '100%', display: 'block' })
    }
    onUpdate(note.id, { htmlContent: editorRef.current?.innerHTML || '' })
    setSelectedImg(null)
  }, [selectedImg, note.id, editorRef, onUpdate])

  const deleteSelectedImg = useCallback(() => {
    selectedImg?.el?.remove()
    onUpdate(note.id, { htmlContent: editorRef.current?.innerHTML || '' })
    setSelectedImg(null)
  }, [selectedImg, note.id, editorRef, onUpdate])

  const updateFreeImg = useCallback((imgId, changes) => {
    onUpdate(note.id, { freeImages: (note.freeImages || []).map(i => i.id === imgId ? { ...i, ...changes } : i) })
  }, [note.id, note.freeImages, onUpdate])
  const deleteFreeImg = useCallback((imgId) => {
    onUpdate(note.id, { freeImages: (note.freeImages || []).filter(i => i.id !== imgId) })
  }, [note.id, note.freeImages, onUpdate])

  const imgBtnStyle = {
    border: 'none', background: 'transparent', cursor: 'pointer',
    borderRadius: 6, padding: '2px 4px', display: 'flex', alignItems: 'center',
    transition: 'background 0.1s',
  }

  return (
    <div
      ref={noteRef}
      className={styles.note}
      style={{ left: note.x, top: note.y, zIndex, width: w }}
      onMouseDown={(e) => { e.stopPropagation(); onFocus(note.id) }}
      onTouchStart={(e) => { e.stopPropagation(); onFocus(note.id) }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { setConfirmDelete(false); setShowTagPicker(false) } }}
      onMouseEnter={() => { cancelHide(); setShowHandles(true) }}
      onMouseLeave={scheduleHide}
    >
      {/* Header */}
      <div
        className={styles.header}
        style={{ background: color.header }}
        onMouseDown={handleHeaderMouseDown}
        onTouchStart={handleHeaderTouchStart}
        onDoubleClick={() => onUpdate(note.id, { minimized: !note.minimized })}
      >
        {/* Dedicated drag grip — large touch target, always draggable */}
        <div
          className={styles.dragGrip}
          onMouseDown={handleHeaderMouseDown}
          onTouchStart={handleHeaderTouchStart}
        >
          {note.minimized && isImage
            ? <img src={note.imageUrl} className={styles.thumb} draggable={false} />
            : (
              <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" style={{ color: color.text, opacity: 0.35 }}>
                <circle cx="2.5" cy="3"  r="1.4"/><circle cx="7.5" cy="3"  r="1.4"/>
                <circle cx="2.5" cy="8"  r="1.4"/><circle cx="7.5" cy="8"  r="1.4"/>
                <circle cx="2.5" cy="13" r="1.4"/><circle cx="7.5" cy="13" r="1.4"/>
              </svg>
            )
          }
        </div>
        <input
          className={styles.titleInput}
          style={{ color: color.text }}
          value={note.title}
          onChange={(e) => { onUpdate(note.id, { title: e.target.value }); onTimerDangerActivity?.() }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          placeholder={isImage ? 'Подпись...' : 'Заголовок...'}
        />
        <div className={styles.controls}>
          {!isImage && (
            <button className={`${styles.btn} ${styles.btnIcon}`} style={{ background: `${color.text}18`, color: color.text }}
              onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
              onClick={() => setShowPicker((v) => !v)} title="Цвет заметки">
              🎨
            </button>
          )}
          <button className={`${styles.btn} ${styles.btnIcon}`} style={{ background: `${color.text}18`, color: color.text }}
            onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
            onClick={() => onOpenFocus(note.id)} title="На весь экран">
            <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
              <path d="M1 3.5V1H3.5M6.5 1H9V3.5M9 6.5V9H6.5M3.5 9H1V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button className={`${styles.btn} ${styles.btnIcon}`} style={{ background: `${color.text}18`, color: color.text }}
            onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
            onClick={() => onUpdate(note.id, { minimized: !note.minimized })} title={note.minimized ? 'Развернуть' : 'Свернуть'}>
            {note.minimized ? '□' : '─'}
          </button>
          <button className={`${styles.btn} ${styles.btnIcon}`} style={{ background: `${color.text}18`, color: color.text }}
            onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
            onClick={() => onDuplicate(note.id)} title="Дублировать">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <rect x="3.5" y="0.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
              <rect x="0.5" y="3.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.12"/>
            </svg>
          </button>
          {confirmDelete ? (
            <div
              className={styles.confirmRow}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <button className={`${styles.btn} ${styles.btnConfirm}`}
                style={{ background: '#e53935', color: '#fff' }}
                onClick={() => onDelete(note.id)}>
                Удалить
              </button>
              <button className={`${styles.btn} ${styles.btnCancel}`}
                style={{ background: `${color.text}18`, color: color.text }}
                onClick={() => setConfirmDelete(false)}>
                Нет
              </button>
            </div>
          ) : (
            <button className={`${styles.btn} ${styles.btnClose}`}
              onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
              onClick={() => setConfirmDelete(true)} title="Удалить">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tag strip */}
      {!isImage && (
        <div
          className={styles.tagRow}
          style={{ background: color.body, borderBottomColor: `${color.header}80` }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <button
            className={`${styles.tagChip} ${!note.tag ? styles.tagChipEmpty : ''}`}
            style={note.tag ? {
              color: TAGS_MAP[note.tag].color,
              borderColor: `${TAGS_MAP[note.tag].color}55`,
              background: TAGS_MAP[note.tag].bg,
            } : { color: color.text }}
            onClick={() => setShowTagPicker(v => !v)}
            title="Тег заметки"
          >
            {note.tag ? TAGS_MAP[note.tag].label : '＋ тег'}
          </button>
        </div>
      )}

      {/* Tag picker */}
      {showTagPicker && !isImage && (
        <div
          className={styles.tagPicker}
          style={{ background: color.body, borderBottomColor: `${color.header}80` }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {TAGS.map(tag => (
            <button
              key={tag.id}
              className={styles.tagPickerBtn}
              style={{
                color: tag.color,
                borderColor: `${tag.color}60`,
                background: note.tag === tag.id ? tag.bg : 'transparent',
              }}
              onClick={() => { onUpdate(note.id, { tag: tag.id }); setShowTagPicker(false) }}
            >
              {tag.label}
            </button>
          ))}
          {note.tag && (
            <button
              className={styles.tagRemoveBtn}
              onClick={() => { onUpdate(note.id, { tag: null }); setShowTagPicker(false) }}
            >
              Убрать
            </button>
          )}
        </div>
      )}

      {/* Palette picker */}
      {showPicker && !isImage && (
        <div className={styles.picker} style={{ background: color.body, borderColor: `${color.header}88` }}
          onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
          {PALETTE.map((c, i) => (
            <button key={i} className={styles.swatch}
              style={{ background: c.header, outline: (!note.customColor && note.colorIndex === i) ? `2px solid ${c.text}` : 'none', outlineOffset: 2 }}
              onClick={() => { onUpdate(note.id, { colorIndex: i, customColor: null, customColorSat: null }); setShowPicker(false) }} />
          ))}
          <label
            className={styles.swatch}
            style={{
              background: note.customColor || 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
              outline: note.customColor ? '2px solid rgba(0,0,0,0.45)' : 'none',
              outlineOffset: 2,
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
            }}
            title="Свой цвет"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <input
              type="color"
              style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', padding: 0, border: 'none' }}
              value={note.customColor || '#e8a4ae'}
              onChange={(e) => onUpdate(note.id, { customColor: e.target.value })}
            />
          </label>
          {note.customColor && (
            <div className={styles.pickerSatRow}>
              <input type="range" min="0.1" max="1" step="0.05"
                value={note.customColorSat ?? 1}
                className={styles.pickerSatSlider}
                onChange={(e) => onUpdate(note.id, { customColorSat: parseFloat(e.target.value) })} />
              <span className={styles.pickerSatValue}>{Math.round((note.customColorSat ?? 1) * 100)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Body */}
      {!note.minimized && (
        <div className={styles.body} style={{ background: isImage ? 'transparent' : color.body }}>
          {isImage ? (
            <img src={note.imageUrl} className={styles.image} style={{ height: h }}
              draggable={false} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} />
          ) : (
            <>
              <FormatBar editorRef={editorRef} savedRangeRef={savedRangeRef} textColor={color.text} bodyColor={color.body} onAddFreeImage={addFreeImg} />
              <div ref={freeImgWrapRef} style={{ position: 'relative', height: h, flexShrink: 0 }}>
                <div ref={editorRef} className={styles.editor}
                  style={{ color: blindMode !== 'off' ? 'transparent' : color.text, caretColor: color.text, height: '100%' }}
                  contentEditable suppressContentEditableWarning
                  onInput={handleInput}
                  onMouseDown={handleEditorMouseDown}
                  onTouchStart={handleEditorTouchStart}
                  onMouseUp={saveRange} onKeyUp={saveRange} onTouchEnd={saveRange} onBlur={saveRange}
                  data-placeholder="Введите текст заметки..." />
                {freeImages.map(img => (
                  <FreeImage key={img.id} img={img} containerRef={freeImgWrapRef}
                    onUpdate={(ch) => updateFreeImg(img.id, ch)}
                    onDelete={() => deleteFreeImg(img.id)} />
                ))}
              </div>
              <ImageResizer
                editorRef={editorRef}
                onSave={() => editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }))}
              />
              {blindMode !== 'off' && (
                <div className={styles.blindReveal} style={{ color: color.text, borderTopColor: `${color.text}25` }}>
                  {blindMode === 'all'
                    ? <span className={styles.blindRevealHint}>текст скрыт</span>
                    : <span>{lastVisible(note.htmlContent, blindMode) || '…'}</span>
                  }
                </div>
              )}
              {(() => {
                const raw = countWords(note.htmlContent)
                if (raw === 0) return null
                const wc = noteWordCount(note)
                return (
                  <div className={styles.wordCountRow} style={{ color: color.text }}>
                    <span>{wc} {wordForm(wc)}</span>
                    <button
                      className={styles.resetWordBtn}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); onResetWordCount?.(note.id) }}
                      title="Сбросить счётчик слов"
                    >↺</button>
                  </div>
                )
              })()}
            </>
          )}
        </div>
      )}
      {selectedImg && createPortal(
        <div
          style={{
            position: 'fixed',
            top: selectedImg.rect.top - 42,
            left: selectedImg.rect.left,
            zIndex: 99999,
            display: 'flex',
            gap: 4,
            background: 'rgba(255,250,246,0.98)',
            borderRadius: 10,
            padding: '5px 8px',
            boxShadow: '0 3px 14px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.07)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button onClick={() => applyImgLayout('left')} title="Текст справа" style={imgBtnStyle}>
            <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
              <rect x="1" y="1" width="10" height="10" rx="2" fill={color.header}/>
              <rect x="13" y="2" width="12" height="2" rx="1" fill={color.header} opacity=".5"/>
              <rect x="13" y="6" width="10" height="2" rx="1" fill={color.header} opacity=".5"/>
              <rect x="13" y="10" width="11" height="2" rx="1" fill={color.header} opacity=".5"/>
              <rect x="1" y="14" width="24" height="2" rx="1" fill={color.header} opacity=".35"/>
              <rect x="1" y="17" width="20" height="2" rx="1" fill={color.header} opacity=".35"/>
            </svg>
          </button>
          <button onClick={() => applyImgLayout('block')} title="На всю ширину" style={imgBtnStyle}>
            <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
              <rect x="1" y="4" width="24" height="12" rx="2" fill={color.header}/>
            </svg>
          </button>
          <button onClick={() => applyImgLayout('right')} title="Текст слева" style={imgBtnStyle}>
            <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
              <rect x="15" y="1" width="10" height="10" rx="2" fill={color.header}/>
              <rect x="1" y="2" width="12" height="2" rx="1" fill={color.header} opacity=".5"/>
              <rect x="3" y="6" width="10" height="2" rx="1" fill={color.header} opacity=".5"/>
              <rect x="2" y="10" width="11" height="2" rx="1" fill={color.header} opacity=".5"/>
              <rect x="1" y="14" width="24" height="2" rx="1" fill={color.header} opacity=".35"/>
              <rect x="1" y="17" width="20" height="2" rx="1" fill={color.header} opacity=".35"/>
            </svg>
          </button>
          <div style={{ width: 1, background: 'rgba(0,0,0,0.12)', margin: '2px 2px' }}/>
          <button onClick={deleteSelectedImg} title="Удалить фото" style={{ ...imgBtnStyle, color: '#e53935' }}>✕</button>
        </div>,
        document.body
      )}
      {showHandles && !note.minimized && (
        <NoteHandles
          noteRef={noteRef}
          scale={scale}
          getState={getNoteState}
          onResize={handleNoteResize}
          color={color}
          minW={MIN_W}
          minH={MIN_H}
          onResizingChange={handleResizingChange}
          onHandleEnter={cancelHide}
          onHandleLeave={scheduleHide}
        />
      )}
    </div>
  )
}
