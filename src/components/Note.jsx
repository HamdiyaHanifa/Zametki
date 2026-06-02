import { useCallback, useState, useRef, useEffect } from 'react'
import { useDrag } from '../hooks/useDrag'
import { PALETTE } from '../palette'
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

export function Note({ note, onUpdate, onMove, onDelete, onFocus, onOpenFocus, zIndex, scale, onResetWordCount, onTimerDangerActivity, blindMode = 'off', timerDangerResetSignal }) {
  const [showPicker, setShowPicker] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const color = PALETTE[note.colorIndex % PALETTE.length]
  const isImage = Boolean(note.imageUrl)

  const w = note.minimized ? 220 : (note.width || (isImage ? DEFAULT_W_IMG : DEFAULT_W_TEXT))
  const h = note.height || (isImage ? DEFAULT_H_IMG : DEFAULT_H_TEXT)

  const noteRef          = useRef(null)
  const editorRef        = useRef(null)
  const savedRangeRef    = useRef(null)
  const freeImgWrapRef   = useRef(null)
  const [showHandles, setShowHandles] = useState(false)
  const hideTimerRef     = useRef(null)
  const resizingRef      = useRef(false)

  useEffect(() => {
    if (!editorRef.current) return
    editorRef.current.innerHTML = note.htmlContent || ''
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
    if (isImage) return
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
  }, [isImage])

  const handleInput = useCallback(() => {
    onUpdate(note.id, { htmlContent: editorRef.current?.innerHTML || '' })
    onTimerDangerActivity?.()
  }, [note.id, onUpdate, onTimerDangerActivity])

  const handleEditorMouseDown = useCallback((e) => {
    e.stopPropagation()
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
    onUpdate(note.id, { freeImages: [...(note.freeImages || []), { id: String(Date.now()), src, x: 0.02, y: 0.02, w: 0.45 }] })
  }, [note.id, note.freeImages, onUpdate])
  const updateFreeImg = useCallback((imgId, changes) => {
    onUpdate(note.id, { freeImages: (note.freeImages || []).map(i => i.id === imgId ? { ...i, ...changes } : i) })
  }, [note.id, note.freeImages, onUpdate])
  const deleteFreeImg = useCallback((imgId) => {
    onUpdate(note.id, { freeImages: (note.freeImages || []).filter(i => i.id !== imgId) })
  }, [note.id, note.freeImages, onUpdate])

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
              style={{ background: c.header, outline: note.colorIndex === i ? `2px solid ${c.text}` : 'none', outlineOffset: 2 }}
              onClick={() => { onUpdate(note.id, { colorIndex: i }); setShowPicker(false) }} />
          ))}
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
