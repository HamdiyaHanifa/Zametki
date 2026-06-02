import { useRef, useCallback, useEffect, useState } from 'react'
import { PALETTE } from '../palette'
import { FormatBar } from './FormatBar'
import { FloatingNote } from './FloatingNote'
import { countWords, wordForm } from '../utils/wordCount'
import { TAGS, TAGS_MAP } from '../utils/tags'
import styles from './FocusView.module.css'

const DEFAULT_FIELDS = [
  { id: 1, label: 'Имя', value: '' },
  { id: 2, label: 'Пол', value: '' },
  { id: 3, label: 'Возраст', value: '' },
  { id: 4, label: 'Роль', value: '' },
]

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

export function FocusView({
  note, onUpdate, onClose,
  notes, onSwitchFocus,
  floatingNotes, onAddFloating, onRemoveFloating, onUpdateFloatPos,
  showPanel, onTogglePanel,
  totalWords,
  onToggleFocusMode,
  focusModeVisible = false,
  onTimerDangerActivity,
  timerDangerResetSignal,
  blindMode = 'off',
}) {
  const color = PALETTE[note.colorIndex % PALETTE.length]
  const isProfile = note.noteType === 'profile'
  const isImage = !isProfile && Boolean(note.imageUrl)
  const editorRef = useRef(null)
  const savedRangeRef = useRef(null)
  const photoRef = useRef(null)
  const [isDragTarget, setIsDragTarget] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const tagBtnRef = useRef(null)
  const tagPanelRef = useRef(null)

  useEffect(() => {
    if (!showTagPicker) return
    const close = (e) => {
      if (
        tagPanelRef.current && !tagPanelRef.current.contains(e.target) &&
        tagBtnRef.current && !tagBtnRef.current.contains(e.target)
      ) setShowTagPicker(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close) }
  }, [showTagPicker])

  // ── Standalone danger mode ────────────────────────────────────────
  const DANGER_PRESETS = [5, 10, 15, 20, 30]
  const [dangerPhase, setDangerPhase] = useState('off') // 'off'|'setup'|'active'|'dying'
  const [dangerTimeout, setDangerTimeout] = useState(5)
  const [dangerInactiveFor, setDangerInactiveFor] = useState(0)
  const dangerPhaseRef = useRef('off')
  const dangerLastActivityRef = useRef(0)
  const dangerStartContentRef = useRef('')
  const dangerIntervalRef = useRef(null)

  const startDangerSession = useCallback(() => {
    dangerStartContentRef.current = note.htmlContent || ''
    dangerLastActivityRef.current = Date.now()
    dangerPhaseRef.current = 'active'
    setDangerInactiveFor(0)
    setDangerPhase('active')
  }, [note.htmlContent])

  const stopDangerSession = useCallback((save) => {
    clearInterval(dangerIntervalRef.current)
    dangerPhaseRef.current = 'off'
    setDangerPhase('off')
    setDangerInactiveFor(0)
    if (!save) {
      const restored = dangerStartContentRef.current
      if (editorRef.current) editorRef.current.innerHTML = restored
      onUpdate(note.id, { htmlContent: restored })
    }
  }, [note.id, onUpdate])

  // Inactivity check interval for standalone danger
  useEffect(() => {
    if (dangerPhase !== 'active') return
    dangerIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - dangerLastActivityRef.current) / 1000
      setDangerInactiveFor(Math.min(elapsed, dangerTimeout))
      if (elapsed >= dangerTimeout) {
        clearInterval(dangerIntervalRef.current)
        dangerPhaseRef.current = 'dying'
        setDangerPhase('dying')
      }
    }, 80)
    return () => clearInterval(dangerIntervalRef.current)
  }, [dangerPhase, dangerTimeout])

  // After burn animation, restore content
  useEffect(() => {
    if (dangerPhase !== 'dying') return
    const t = setTimeout(() => {
      const restored = dangerStartContentRef.current
      if (editorRef.current) editorRef.current.innerHTML = restored
      onUpdate(note.id, { htmlContent: restored })
      dangerPhaseRef.current = 'off'
      setDangerPhase('off')
      setDangerInactiveFor(0)
    }, 1600)
    return () => clearTimeout(t)
  }, [dangerPhase, note.id, onUpdate])

  // Cleanup on unmount
  useEffect(() => () => clearInterval(dangerIntervalRef.current), [])

  // Restore editor content when App.jsx signals a timer danger reset
  useEffect(() => {
    if (!timerDangerResetSignal) return
    if (timerDangerResetSignal.noteId !== note.id) return
    if (editorRef.current) editorRef.current.innerHTML = timerDangerResetSignal.htmlContent
  }, [timerDangerResetSignal, note.id])

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
    if (editorRef.current) {
      editorRef.current.querySelectorAll('ul[data-todo] > li').forEach(li => {
        if (!li.querySelector('.todo-cb')) {
          const cb = document.createElement('span')
          cb.className = 'todo-cb'
          cb.setAttribute('contenteditable', 'false')
          li.insertBefore(cb, li.firstChild)
        }
      })
    }
    onUpdate(note.id, { htmlContent: editorRef.current?.innerHTML || '' })
    if (dangerPhaseRef.current === 'active') {
      dangerLastActivityRef.current = Date.now()
    }
    onTimerDangerActivity?.()
  }, [note.id, onUpdate, onTimerDangerActivity])

  const handleTodoCbClick = useCallback((e) => {
    if (e.target.classList.contains('todo-cb')) {
      const li = e.target.closest('li')
      if (li) {
        li.dataset.checked = li.dataset.checked === 'true' ? 'false' : 'true'
        onUpdate(note.id, { htmlContent: editorRef.current?.innerHTML || '' })
      }
    }
  }, [note.id, onUpdate])

  const handleEditorKeyDown = useCallback(() => {
    if (dangerPhaseRef.current === 'active') {
      dangerLastActivityRef.current = Date.now()
      setDangerInactiveFor(0)
    }
    onTimerDangerActivity?.()
  }, [onTimerDangerActivity])

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
        {!isProfile && !isImage && (
          <button
            className={styles.focusTimerBtn}
            style={{
              color: dangerPhase === 'active' ? '#e53935' : dangerPhase === 'dying' ? '#e53935' : color.text,
              background: dangerPhase === 'active' ? 'rgba(229,57,53,0.12)'
                        : dangerPhase === 'setup'  ? `${color.text}22`
                        : `${color.text}0e`,
              animation: dangerPhase === 'active' ? 'dangerPulse 1.4s ease-in-out infinite' : 'none',
            }}
            onClick={() => {
              if (dangerPhase === 'off') setDangerPhase('setup')
              else if (dangerPhase === 'setup') setDangerPhase('off')
              else if (dangerPhase === 'active') stopDangerSession(true)
            }}
            title={dangerPhase === 'active' ? 'Завершить (сохранить текст)' : 'Опасный режим'}
          >⚡{dangerPhase === 'active' ? ' Стоп' : ''}</button>
        )}
        <button
          className={styles.focusTimerBtn}
          style={{
            color: color.text,
            background: focusModeVisible ? `${color.text}22` : `${color.text}0e`,
          }}
          onClick={onToggleFocusMode}
          title="Режим фокуса"
        >⏱</button>
        {!isProfile && !isImage && (
          <button
            ref={tagBtnRef}
            className={styles.focusTimerBtn}
            style={{
              color: note.tag ? TAGS_MAP[note.tag].color : color.text,
              background: note.tag ? TAGS_MAP[note.tag].bg : showTagPicker ? `${color.text}18` : `${color.text}0e`,
              fontWeight: note.tag ? 700 : undefined,
              fontSize: note.tag ? 12 : undefined,
            }}
            onClick={() => setShowTagPicker(v => !v)}
            title="Тег заметки"
          >
            {note.tag ? TAGS_MAP[note.tag].label : '○'}
          </button>
        )}
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

      {/* Tag picker panel */}
      {showTagPicker && !isProfile && !isImage && (
        <div ref={tagPanelRef} className={styles.tagPanel} style={{ borderColor: `${color.text}18` }}>
          <div className={styles.tagPanelTitle} style={{ color: color.text }}>Тег заметки</div>
          <div className={styles.tagOptions}>
            {TAGS.map(tag => (
              <button
                key={tag.id}
                className={styles.tagOption}
                style={{
                  color: tag.color,
                  borderColor: `${tag.color}60`,
                  background: note.tag === tag.id ? tag.bg : 'transparent',
                  fontWeight: note.tag === tag.id ? 700 : 600,
                }}
                onClick={() => { onUpdate(note.id, { tag: tag.id }); setShowTagPicker(false) }}
              >
                {tag.label}
              </button>
            ))}
          </div>
          {note.tag && (
            <button
              className={styles.tagOptionRemove}
              style={{ color: color.text }}
              onClick={() => { onUpdate(note.id, { tag: null }); setShowTagPicker(false) }}
            >
              Убрать тег
            </button>
          )}
        </div>
      )}

      {/* Danger mode setup panel */}
      {dangerPhase === 'setup' && (
        <div className={styles.dangerPanel} style={{ borderColor: `${color.text}18` }}>
          <div className={styles.dangerPanelTitle} style={{ color: color.text }}>⚡ Опасный режим</div>
          <div className={styles.dangerPanelSub} style={{ color: color.text }}>
            Если перестанешь писать на...
          </div>
          <div className={styles.dangerPresets}>
            {DANGER_PRESETS.map(s => (
              <button
                key={s}
                className={`${styles.dangerPreset} ${dangerTimeout === s ? styles.dangerPresetActive : ''}`}
                style={dangerTimeout !== s ? { color: color.text, borderColor: `${color.text}30` } : {}}
                onClick={() => setDangerTimeout(s)}
              >
                {s}<span className={styles.dangerPresetUnit}>с</span>
              </button>
            ))}
          </div>
          <div className={styles.dangerPanelWarn} style={{ color: color.text }}>
            ...весь написанный текст исчезнет
          </div>
          <button className={styles.dangerStartBtn} onClick={startDangerSession}>
            Начать
          </button>
          <button
            className={styles.dangerCancelBtn}
            style={{ color: color.text }}
            onClick={() => setDangerPhase('off')}
          >Отмена</button>
        </div>
      )}

      {/* Danger countdown bar */}
      {(dangerPhase === 'active' || dangerPhase === 'dying') && (
        <div className={styles.dangerBarWrap}>
          <div
            className={styles.dangerBar}
            style={{
              width: `${Math.max(0, (1 - dangerInactiveFor / dangerTimeout) * 100)}%`,
              background: dangerInactiveFor / dangerTimeout < 0.5 ? '#4caf50'
                        : dangerInactiveFor / dangerTimeout < 0.8 ? '#ff9800'
                        : '#f44336',
              transition: 'width 0.08s linear, background 0.3s ease',
            }}
          />
        </div>
      )}

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
            className={`${styles.editor} ${dangerPhase === 'dying' ? styles.editorDying : ''}`}
            style={{ color: blindMode !== 'off' ? 'transparent' : color.text, caretColor: color.text }}
            contentEditable={dangerPhase !== 'dying'}
            suppressContentEditableWarning
            onInput={handleInput}
            onClick={handleTodoCbClick}
            onKeyDown={handleEditorKeyDown}
            onMouseUp={saveRange}
            onKeyUp={saveRange}
            onTouchEnd={saveRange}
            onBlur={saveRange}
            data-placeholder="Начните писать..."
          />
          {blindMode !== 'off' && (
            <div className={styles.blindReveal} style={{ color: color.text, borderTopColor: `${color.text}15` }}>
              {blindMode === 'all'
                ? <span className={styles.blindRevealHint}>текст скрыт до конца таймера</span>
                : <span className={styles.blindRevealText}>{lastVisible(note.htmlContent, blindMode) || '…'}</span>
              }
            </div>
          )}
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
