import { useRef, useCallback, useEffect, useState } from 'react'
import { FormatBar } from './FormatBar'
import { ImageResizer } from './ImageResizer'
import { FreeImage } from './FreeImage'
import { NoteHandles } from './NoteHandles'
import { PALETTE } from '../palette'
import styles from './FloatingNote.module.css'

const MIN_W = 240
const MIN_H = 150

const DEFAULT_FIELDS = [
  { id: 1, label: 'Имя', value: '' },
  { id: 2, label: 'Пол', value: '' },
  { id: 3, label: 'Возраст', value: '' },
  { id: 4, label: 'Роль', value: '' },
]

export function FloatingNote({ note, onUpdate, onClose, initialX, initialY, initialW, initialH, onPosChange }) {
  const color = PALETTE[note.colorIndex % PALETTE.length]
  const isProfile = note.noteType === 'profile'
  const isImage = !isProfile && Boolean(note.imageUrl)
  const floatingNoteRef = useRef(null)
  const editorRef     = useRef(null)
  const savedRangeRef = useRef(null)
  const photoRef      = useRef(null)
  const editorWrapRef = useRef(null)
  const [pos, setPos] = useState({ x: initialX ?? 60, y: initialY ?? 60 })
  const [size, setSize] = useState({ w: initialW ?? 360, h: initialH ?? 280 })
  const posRef = useRef(pos)
  const sizeRef = useRef(size)
  const [showHandles, setShowHandles] = useState(false)
  const hideTimerRef = useRef(null)
  const resizingRef  = useRef(false)

  const fields = note.fields ?? DEFAULT_FIELDS

  useEffect(() => { posRef.current = pos }, [pos])
  useEffect(() => { sizeRef.current = size }, [size])

  useEffect(() => {
    if (!isProfile && !isImage && editorRef.current) editorRef.current.innerHTML = note.htmlContent || ''
  }, []) // eslint-disable-line

  useEffect(() => {
    if (!isProfile && !isImage && editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = note.htmlContent || ''
    }
  }, [note.htmlContent, isProfile, isImage])

  const saveRange = useCallback(() => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange()
  }, [])

  useEffect(() => {
    if (isProfile || isImage) return
    const onSel = () => {
      const sel = window.getSelection()
      if (sel && !sel.isCollapsed && editorRef.current) {
        const range = sel.getRangeAt(0)
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          savedRangeRef.current = range.cloneRange()
        }
      }
    }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [isProfile])

  const handleInput = useCallback(() => {
    onUpdate(note.id, { htmlContent: editorRef.current?.innerHTML || '' })
  }, [note.id, onUpdate])

  const handlePhotoChange = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onUpdate(note.id, { imageUrl: ev.target.result })
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [note.id, onUpdate])

  const addField = useCallback(() => {
    onUpdate(note.id, { fields: [...fields, { id: Date.now(), label: 'Поле', value: '' }] })
  }, [note.id, fields, onUpdate])

  const updateField = useCallback((fid, key, val) => {
    onUpdate(note.id, { fields: fields.map(f => f.id === fid ? { ...f, [key]: val } : f) })
  }, [note.id, fields, onUpdate])

  const removeField = useCallback((fid) => {
    onUpdate(note.id, { fields: fields.filter(f => f.id !== fid) })
  }, [note.id, fields, onUpdate])

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      if (!resizingRef.current) setShowHandles(false)
    }, 150)
  }, [])

  const cancelHide = useCallback(() => clearTimeout(hideTimerRef.current), [])

  const getFloatState = useCallback(() => ({
    x: posRef.current.x,
    y: posRef.current.y,
    w: sizeRef.current.w,
    h: sizeRef.current.h,
  }), [])

  const handleFloatResize = useCallback(({ x, y, w, h }) => {
    const newPos  = { x, y }
    const newSize = { w, h }
    posRef.current  = newPos
    sizeRef.current = newSize
    setPos(newPos)
    setSize(newSize)
    onPosChange?.({ x, y, w, h })
  }, [onPosChange])

  const handleResizingChange = useCallback((active) => {
    resizingRef.current = active
    if (!active) scheduleHide()
  }, [scheduleHide])

  const startDrag = useCallback((clientX, clientY) => {
    const ox = clientX - posRef.current.x
    const oy = clientY - posRef.current.y
    const onMove = (mv) => {
      const cx = mv.touches ? mv.touches[0].clientX : mv.clientX
      const cy = mv.touches ? mv.touches[0].clientY : mv.clientY
      const p = { x: cx - ox, y: cy - oy }
      posRef.current = p
      setPos(p)
      onPosChange?.({ ...p, w: sizeRef.current.w, h: sizeRef.current.h })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
  }, [onPosChange])

  const handleHeaderMouseDown = useCallback((e) => {
    e.stopPropagation(); startDrag(e.clientX, e.clientY)
  }, [startDrag])

  const handleHeaderTouchStart = useCallback((e) => {
    e.stopPropagation(); startDrag(e.touches[0].clientX, e.touches[0].clientY)
  }, [startDrag])


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
      ref={floatingNoteRef}
      className={styles.floatingNote}
      style={{ left: pos.x, top: pos.y, width: size.w, background: color.body }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onMouseEnter={() => { cancelHide(); setShowHandles(true) }}
      onMouseLeave={scheduleHide}
    >
      <div
        className={styles.header}
        style={{ background: color.header }}
        onMouseDown={handleHeaderMouseDown}
        onTouchStart={handleHeaderTouchStart}
      >
        {isProfile && (
          <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor" style={{ color: color.text, opacity: 0.55, flexShrink: 0 }}>
            <circle cx="7" cy="4.5" r="2.5"/>
            <path d="M2 13.5c0-3.5 2.2-5 5-5s5 1.5 5 5H2z"/>
          </svg>
        )}
        <input
          className={styles.titleInput}
          style={{ color: color.text }}
          value={note.title}
          onChange={(e) => onUpdate(note.id, { title: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder={isProfile ? 'Имя персонажа...' : 'Заголовок...'}
        />
        <button
          className={styles.closeBtn}
          style={{ background: `${color.text}18`, color: color.text }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={onClose}
        >✕</button>
      </div>

      {isImage ? (
        <div className={styles.imageBody} style={{ height: size.h }}>
          <img src={note.imageUrl} className={styles.imageDisplay} draggable={false} />
        </div>
      ) : isProfile ? (
        <div className={styles.profileBody} style={{ height: size.h }}>
          <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          {/* Photo */}
          <div
            className={styles.profilePhotoWrap}
            style={{ borderColor: `${color.text}22` }}
            onClick={() => photoRef.current?.click()}
          >
            {note.imageUrl ? (
              <>
                <img src={note.imageUrl} className={styles.profilePhoto} draggable={false} />
                <div className={styles.profilePhotoActions}>
                  <button
                    className={styles.profileChangePhoto}
                    style={{ color: color.text, background: `${color.body}dd` }}
                    onClick={(e) => { e.stopPropagation(); photoRef.current?.click() }}
                  >Изменить</button>
                  <button
                    className={styles.profileChangePhoto}
                    style={{ color: '#e05060', background: `${color.body}dd` }}
                    onClick={(e) => { e.stopPropagation(); onUpdate(note.id, { imageUrl: null }) }}
                  >Удалить</button>
                </div>
              </>
            ) : (
              <div className={styles.profilePhotoPlaceholder} style={{ color: color.text }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" opacity="0.2">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7H4z"/>
                </svg>
                <span className={styles.profilePhotoLabel}>Фото персонажа</span>
                <span className={styles.profilePhotoHint}>нажмите чтобы добавить</span>
              </div>
            )}
          </div>
          {/* Fields */}
          <div className={styles.profileFields} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            {fields.map(f => (
              <div key={f.id} className={styles.profileFieldRow}>
                <input
                  className={styles.profileLabelInput}
                  style={{ color: color.text }}
                  value={f.label}
                  onChange={(e) => updateField(f.id, 'label', e.target.value)}
                  placeholder="Поле"
                />
                <span className={styles.profileColon} style={{ color: color.text }}>:</span>
                <textarea
                  className={styles.profileValueInput}
                  style={{ color: color.text, borderBottomColor: `${color.text}28` }}
                  value={f.value}
                  rows={1}
                  onChange={(e) => {
                    const el = e.target
                    el.style.height = 'auto'
                    el.style.height = el.scrollHeight + 'px'
                    updateField(f.id, 'value', e.target.value)
                  }}
                  onFocus={(e) => {
                    const el = e.target
                    el.style.height = 'auto'
                    el.style.height = el.scrollHeight + 'px'
                  }}
                  placeholder="—"
                />
                <button
                  className={styles.profileRemoveBtn}
                  style={{ color: color.text }}
                  onClick={() => removeField(f.id)}
                >×</button>
              </div>
            ))}
            <button
              className={styles.profileAddBtn}
              style={{ color: color.text, borderColor: `${color.text}22` }}
              onClick={addField}
            >+ Добавить строку</button>
            <textarea
              className={styles.profileDescriptionInput}
              style={{ color: color.text, borderColor: `${color.text}18` }}
              value={note.description || ''}
              onChange={(e) => {
                const el = e.target
                el.style.height = 'auto'
                el.style.height = el.scrollHeight + 'px'
                onUpdate(note.id, { description: e.target.value })
              }}
              onFocus={(e) => {
                const el = e.target
                el.style.height = 'auto'
                el.style.height = el.scrollHeight + 'px'
              }}
              placeholder="Описание персонажа..."
              rows={2}
            />
          </div>
        </div>
      ) : (
        <>
          <FormatBar
            editorRef={editorRef}
            savedRangeRef={savedRangeRef}
            textColor={color.text}
            onAddFreeImage={addFreeImg}
          />
          <div ref={editorWrapRef} style={{ position: 'relative', height: size.h, flexShrink: 0 }}>
            <div
              ref={editorRef}
              className={styles.editor}
              style={{ color: color.text, height: '100%', background: color.body }}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onMouseUp={saveRange}
              onKeyUp={saveRange}
              onTouchEnd={saveRange}
              onBlur={saveRange}
              data-placeholder="Введите текст..."
            />
            {freeImages.map(img => (
              <FreeImage key={img.id} img={img} containerRef={editorWrapRef}
                onUpdate={(ch) => updateFreeImg(img.id, ch)}
                onDelete={() => deleteFreeImg(img.id)} />
            ))}
          </div>
          <ImageResizer
            editorRef={editorRef}
            onSave={() => editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }))}
          />
        </>
      )}

      {showHandles && (
        <NoteHandles
          noteRef={floatingNoteRef}
          scale={1}
          getState={getFloatState}
          onResize={handleFloatResize}
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
