import { useCallback, useState, useRef } from 'react'
import { useDrag } from '../hooks/useDrag'
import { PALETTE } from '../palette'
import styles from './ProfileNote.module.css'

const MIN_W = 220

const DEFAULT_FIELDS = [
  { id: 1, label: 'Имя', value: '' },
  { id: 2, label: 'Пол', value: '' },
  { id: 3, label: 'Возраст', value: '' },
  { id: 4, label: 'Роль', value: '' },
]

export function ProfileNote({ note, onUpdate, onMove, onDelete, onFocus, onOpenFocus, zIndex, scale }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const color = PALETTE[note.colorIndex % PALETTE.length]
  const fileRef = useRef(null)

  const w = note.width || 260
  const fields = note.fields ?? DEFAULT_FIELDS

  const handlePositionChange = useCallback((dx, dy) => onMove(note.id, dx, dy), [note.id, onMove])
  const { onMouseDown: dragMouseDown, onTouchStart: dragTouchStart } = useDrag(handlePositionChange)

  const handleHeaderMouseDown = useCallback((e) => {
    e.stopPropagation(); onFocus(note.id); dragMouseDown(e)
  }, [note.id, onFocus, dragMouseDown])

  const handleHeaderTouchStart = useCallback((e) => {
    e.stopPropagation(); onFocus(note.id); dragTouchStart(e)
  }, [note.id, onFocus, dragTouchStart])

  const addField = useCallback(() => {
    onUpdate(note.id, { fields: [...fields, { id: Date.now(), label: 'Поле', value: '' }] })
  }, [note.id, fields, onUpdate])

  const updateField = useCallback((fid, key, val) => {
    onUpdate(note.id, { fields: fields.map(f => f.id === fid ? { ...f, [key]: val } : f) })
  }, [note.id, fields, onUpdate])

  const removeField = useCallback((fid) => {
    onUpdate(note.id, { fields: fields.filter(f => f.id !== fid) })
  }, [note.id, fields, onUpdate])

  const handlePhotoChange = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onUpdate(note.id, { imageUrl: ev.target.result })
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [note.id, onUpdate])

  const handleResizeMouseDown = useCallback((e) => {
    e.stopPropagation()
    const sx = e.clientX, sw = w, s = scale || 1
    const onMv = (ev) => onUpdate(note.id, { width: Math.max(MIN_W, sw + (ev.clientX - sx) / s) })
    const onUp = () => { window.removeEventListener('mousemove', onMv); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMv); window.addEventListener('mouseup', onUp)
  }, [note.id, onUpdate, w, scale])

  const handleResizeTouchStart = useCallback((e) => {
    e.stopPropagation()
    const sx = e.touches[0].clientX, sw = w, s = scale || 1
    const onMv = (ev) => { ev.preventDefault(); onUpdate(note.id, { width: Math.max(MIN_W, sw + (ev.touches[0].clientX - sx) / s) }) }
    const onUp = () => { window.removeEventListener('touchmove', onMv); window.removeEventListener('touchend', onUp) }
    window.addEventListener('touchmove', onMv, { passive: false }); window.addEventListener('touchend', onUp)
  }, [note.id, onUpdate, w, scale])

  return (
    <div
      className={styles.note}
      style={{ left: note.x, top: note.y, zIndex, width: w }}
      onMouseDown={(e) => { e.stopPropagation(); onFocus(note.id) }}
      onTouchStart={(e) => { e.stopPropagation(); onFocus(note.id) }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setConfirmDelete(false) }}
    >
      {/* ── Header ── */}
      <div
        className={styles.header}
        style={{ background: color.header }}
        onMouseDown={handleHeaderMouseDown}
        onTouchStart={handleHeaderTouchStart}
      >
        <div className={styles.dragGrip} onMouseDown={handleHeaderMouseDown} onTouchStart={handleHeaderTouchStart}>
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" style={{ color: color.text, opacity: 0.35 }}>
            <circle cx="2.5" cy="3"  r="1.4"/><circle cx="7.5" cy="3"  r="1.4"/>
            <circle cx="2.5" cy="8"  r="1.4"/><circle cx="7.5" cy="8"  r="1.4"/>
            <circle cx="2.5" cy="13" r="1.4"/><circle cx="7.5" cy="13" r="1.4"/>
          </svg>
        </div>
        {/* Character silhouette icon */}
        <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor" style={{ color: color.text, opacity: 0.55, flexShrink: 0 }}>
          <circle cx="7" cy="4.5" r="2.5"/>
          <path d="M2 13.5c0-3.5 2.2-5 5-5s5 1.5 5 5H2z"/>
        </svg>
        <input
          className={styles.titleInput}
          style={{ color: color.text }}
          value={note.title}
          onChange={(e) => onUpdate(note.id, { title: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          placeholder="Имя персонажа..."
        />
        <div className={styles.controls}>
          <button className={`${styles.btn} ${styles.btnIcon}`}
            style={{ background: `${color.text}18`, color: color.text }}
            onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
            onClick={() => setShowPicker(v => !v)} title="Цвет карточки">🎨</button>
          <button className={`${styles.btn} ${styles.btnIcon}`}
            style={{ background: `${color.text}18`, color: color.text }}
            onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
            onClick={() => onOpenFocus?.(note.id)} title="На весь экран">
            <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
              <path d="M1 3.5V1H3.5M6.5 1H9V3.5M9 6.5V9H6.5M3.5 9H1V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button className={`${styles.btn} ${styles.btnIcon}`}
            style={{ background: `${color.text}18`, color: color.text }}
            onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
            onClick={() => onUpdate(note.id, { minimized: !note.minimized })}
            title={note.minimized ? 'Развернуть' : 'Свернуть'}>
            {note.minimized ? '□' : '─'}
          </button>
          {confirmDelete ? (
            <div className={styles.confirmRow}
              onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
              <button className={`${styles.btn} ${styles.btnConfirm}`}
                style={{ background: '#e53935', color: '#fff' }}
                onClick={() => onDelete(note.id)}>Удалить</button>
              <button className={`${styles.btn} ${styles.btnCancel}`}
                style={{ background: `${color.text}18`, color: color.text }}
                onClick={() => setConfirmDelete(false)}>Нет</button>
            </div>
          ) : (
            <button className={`${styles.btn} ${styles.btnClose}`}
              onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
              onClick={() => setConfirmDelete(true)} title="Удалить">✕</button>
          )}
        </div>
      </div>

      {/* ── Color picker ── */}
      {showPicker && (
        <div className={styles.picker}
          style={{ background: color.body, borderColor: `${color.header}88` }}
          onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
          {PALETTE.map((c, i) => (
            <button key={i} className={styles.swatch}
              style={{ background: c.header, outline: note.colorIndex === i ? `2px solid ${c.text}` : 'none', outlineOffset: 2 }}
              onClick={() => { onUpdate(note.id, { colorIndex: i }); setShowPicker(false) }} />
          ))}
        </div>
      )}

      {/* ── Body ── */}
      {!note.minimized && (
        <div
          className={styles.body}
          style={{ background: color.body }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {/* Photo */}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          <div
            className={styles.photoWrap}
            style={{ borderColor: `${color.text}22` }}
            onClick={() => fileRef.current?.click()}
          >
            {note.imageUrl ? (
              <>
                <img src={note.imageUrl} className={styles.photo} draggable={false} />
                <div className={styles.photoActions}>
                  <button
                    className={styles.changePhotoBtn}
                    style={{ color: color.text, background: `${color.body}dd` }}
                    onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
                  >Изменить</button>
                  <button
                    className={styles.changePhotoBtn}
                    style={{ color: '#e05060', background: `${color.body}dd` }}
                    onClick={(e) => { e.stopPropagation(); onUpdate(note.id, { imageUrl: null }) }}
                  >Удалить</button>
                </div>
              </>
            ) : (
              <div className={styles.photoPlaceholder} style={{ color: color.text }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" opacity="0.22">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7H4z"/>
                </svg>
                <span className={styles.photoLabel}>Фото персонажа</span>
                <span className={styles.photoHint}>нажмите чтобы добавить</span>
              </div>
            )}
          </div>

          {/* Fields */}
          <div className={styles.fields}>
            {fields.map(f => (
              <div key={f.id} className={styles.fieldRow}>
                <input
                  className={styles.labelInput}
                  style={{ color: color.text }}
                  value={f.label}
                  onChange={(e) => updateField(f.id, 'label', e.target.value)}
                  placeholder="Поле"
                />
                <span className={styles.colon} style={{ color: color.text }}>:</span>
                <input
                  className={styles.valueInput}
                  style={{ color: color.text, borderBottomColor: `${color.text}28` }}
                  value={f.value}
                  onChange={(e) => updateField(f.id, 'value', e.target.value)}
                  placeholder="—"
                />
                <button
                  className={styles.removeBtn}
                  style={{ color: color.text }}
                  onClick={() => removeField(f.id)}
                  title="Удалить строку"
                >×</button>
              </div>
            ))}
            <button
              className={styles.addFieldBtn}
              style={{ color: color.text, borderColor: `${color.text}22` }}
              onClick={addField}
            >+ Добавить строку</button>
            <textarea
              className={styles.descriptionInput}
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

          {/* Right-edge resize */}
          <div
            className={styles.resizeEdge}
            onMouseDown={handleResizeMouseDown}
            onTouchStart={handleResizeTouchStart}
          />
        </div>
      )}
    </div>
  )
}
