import { useRef, useCallback, useEffect, useState } from 'react'
import { PALETTE } from '../palette'
import { FormatBar } from './FormatBar'
import { FloatingNote } from './FloatingNote'
import styles from './FocusView.module.css'

export function FocusView({
  note, onUpdate, onClose,
  notes, onSwitchFocus,
  floatingNotes, onAddFloating, onRemoveFloating,
  showPanel, onTogglePanel,
}) {
  const color = PALETTE[note.colorIndex % PALETTE.length]
  const isImage = Boolean(note.imageUrl)
  const editorRef = useRef(null)
  const savedRangeRef = useRef(null)
  const [isDragTarget, setIsDragTarget] = useState(false)

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = note.htmlContent || ''
      editorRef.current.focus()
    }
  }, []) // init once on mount

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
    if (isImage) return
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
  }, [isImage])

  const handleInput = useCallback(() => {
    onUpdate(note.id, { htmlContent: editorRef.current?.innerHTML || '' })
  }, [note.id, onUpdate])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragTarget(false)
    const noteId = parseInt(e.dataTransfer.getData('noteId'))
    if (noteId && noteId !== note.id) {
      onAddFloating(noteId, e.clientX - 180, e.clientY - 40)
    }
  }, [note.id, onAddFloating])

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
          placeholder={isImage ? 'Подпись...' : 'Заголовок...'}
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

      {isImage ? (
        <div className={styles.imageWrap}>
          <img src={note.imageUrl} className={styles.image} draggable={false} />
        </div>
      ) : (
        <>
          <FormatBar
            editorRef={editorRef}
            savedRangeRef={savedRangeRef}
            textColor={color.text}
            bodyColor={color.body}
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
        </>
      )}

      {/* Floating note windows */}
      {floatingNotes?.map(({ uid, noteId, x, y }) => {
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
          />
        )
      })}

      {isDragTarget && (
        <div className={styles.dropHint}>Отпустите чтобы открыть заметку здесь</div>
      )}
    </div>
  )
}
