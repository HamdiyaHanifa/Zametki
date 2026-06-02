import { useRef, useCallback, useEffect, useState } from 'react'
import { PALETTE } from '../palette'
import { FormatBar } from './FormatBar'
import { FloatingNote } from './FloatingNote'
import { countWords, wordForm } from '../utils/wordCount'
import styles from './FocusView.module.css'

const DEFAULT_FIELDS = [
  { id: 1, label: 'Имя', value: '' },
  { id: 2, label: 'Пол', value: '' },
  { id: 3, label: 'Возраст', value: '' },
  { id: 4, label: 'Роль', value: '' },
]

export function FocusView({
  note, onUpdate, onClose,
  notes, onSwitchFocus,
  floatingNotes, onAddFloating, onRemoveFloating, onUpdateFloatPos,
  showPanel, onTogglePanel,
}) {
  const color = PALETTE[note.colorIndex % PALETTE.length]
  const isProfile = note.noteType === 'profile'
  const isImage = !isProfile && Boolean(note.imageUrl)
  const editorRef = useRef(null)
  const savedRangeRef = useRef(null)
  const photoRef = useRef(null)
  const [isDragTarget, setIsDragTarget] = useState(false)

  const fields = note.fields ?? DEFAULT_FIELDS

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = note.htmlContent || ''
      editorRef.current.focus()
    }
  }, [note.id])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const saveRange = useCallback(() => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    }
  }, [])

  useEffect(() => {
    if (isImage || isProfile) return
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
  }, [isImage, isProfile])

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

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragTarget(false)
    const noteId = parseInt(e.dataTransfer.getData('noteId'))
    if (noteId && noteId !== note.id) {
      onAddFloating(noteId, e.clientX - 180, e.clientY - 40)
    }
  }, [note.id, onAddFloating])

  const titlePlaceholder = isProfile ? 'Имя персонажа...' : isImage ? 'Подпись...' : 'Заголовок...'

  return (
    <div
      className={`${styles.overlay} ${isDragTarget ? styles.dragTarget : ''}`}
      style={{ background: color.body }}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragTarget(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragTarget(false) }}
    >
      {/* Top bar */}
      <div className={styles.topBar} style={{ background: color.header }}>
        <button className={styles.backBtn} style={{ color: color.text }} onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Назад
        </button>
        <input
          className={styles.titleInput}
          style={{ color: color.text }}
          value={note.title}
          onChange={(e) => onUpdate(note.id, { title: e.target.value })}
          placeholder={titlePlaceholder}
        />
        <button
          className={styles.panelBtn}
          style={{ color: color.text, background: showPanel ? `${color.text}18` : 'transparent' }}
          onClick={onTogglePanel}
          title="Список заметок"
        >
          <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
            <rect x="1" y="2" width="13" height="2.5" rx="1.2" fill="currentColor"/>
            <rect x="1" y="6.25" width="13" height="2.5" rx="1.2" fill="currentColor"/>
            <rect x="1" y="10.5" width="13" height="2.5" rx="1.2" fill="currentColor"/>
          </svg>
          {notes && <span className={styles.noteCount}>{notes.length}</span>}
        </button>
      </div>

      {isProfile ? (
        <div className={styles.profileWrap}>
          <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          {/* Photo */}
          <div
            className={styles.profilePhotoArea}
            style={{ borderColor: `${color.text}28` }}
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
                <svg width="52" height="52" viewBox="0 0 24 24" fill="currentColor" opacity="0.18">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7H4z"/>
                </svg>
                <span className={styles.profilePhotoLabel}>Фото персонажа</span>
                <span className={styles.profilePhotoHint}>нажмите чтобы добавить</span>
              </div>
            )}
          </div>
          {/* Fields */}
          <div className={styles.profileFields}>
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
                  title="Удалить строку"
                >×</button>
              </div>
            ))}
            <button
              className={styles.profileAddBtn}
              style={{ color: color.text, borderColor: `${color.text}30` }}
              onClick={addField}
            >+ Добавить строку</button>
            <textarea
              className={styles.profileDescription}
              style={{ color: color.text, borderColor: `${color.text}20` }}
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
              rows={3}
            />
          </div>
        </div>
      ) : isImage ? (
        <div className={styles.imageWrap}>
          <img src={note.imageUrl} className={styles.image} draggable={false} />
        </div>
      ) : (
        <>
          <FormatBar
            editorRef={editorRef}
            savedRangeRef={savedRangeRef}
            textColor={color.text}
          />
          <div
            ref={editorRef}
            className={styles.editor}
            style={{ color: color.text }}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onMouseUp={saveRange}
            onKeyUp={saveRange}
            onTouchEnd={saveRange}
            onBlur={saveRange}
            data-placeholder="Начните писать..."
          />
          {(() => { const wc = countWords(note.htmlContent); return wc > 0 ? (
            <div className={styles.wordCount} style={{ color: color.text }}>
              {wc} {wordForm(wc)}
            </div>
          ) : null })()}
        </>
      )}

      {/* Floating note windows */}
      {floatingNotes?.map(({ uid, noteId, x, y, w, h }) => {
        const floatNote = notes?.find((n) => n.id === noteId)
        if (!floatNote) return null
        return (
          <FloatingNote
            key={uid}
            note={floatNote}
            onUpdate={onUpdate}
            onClose={() => onRemoveFloating(uid)}
            initialX={x}
            initialY={y}
            initialW={w}
            initialH={h}
            onPosChange={(pos) => onUpdateFloatPos?.(uid, pos)}
          />
        )
      })}

      {isDragTarget && (
        <div className={styles.dropHint}>Отпустите чтобы открыть заметку здесь</div>
      )}
    </div>
  )
}
