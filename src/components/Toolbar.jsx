import { useRef, useState, useEffect } from 'react'
import { noteWordCount, wordForm } from '../utils/wordCount'
import { TAGS } from '../utils/tags'
import styles from './Toolbar.module.css'

export function Toolbar({ onAdd, onAddProfile, onUploadImage, scale, onExport, onImport, onTogglePanel, noteCount, totalWords, notes, onResetAllWordCounts, onResetNoteWordCount, onToggleFocus, focusActive, onHome, canvasName, exportTagCounts = {}, wordGoal = 0, onSetWordGoal }) {
  const fileRef = useRef(null)
  const importRef = useRef(null)
  const panelRef = useRef(null)
  const exportMenuRef = useRef(null)
  const goalInputRef = useRef(null)

  const [showWordPanel, setShowWordPanel] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showGoalInput, setShowGoalInput] = useState(false)
  const [goalDraft, setGoalDraft] = useState('')

  const goalReached = wordGoal > 0 && totalWords >= wordGoal
  const goalProgress = wordGoal > 0 ? Math.min(1, totalWords / wordGoal) : 0

  const commitGoal = () => {
    const n = parseInt(goalDraft, 10)
    onSetWordGoal?.(n > 0 ? n : 0)
    setShowGoalInput(false)
  }

  useEffect(() => {
    if (!showGoalInput) return
    const onDown = (e) => {
      if (!goalInputRef.current?.contains(e.target)) setShowGoalInput(false)
    }
    const id = setTimeout(() => document.addEventListener('pointerdown', onDown), 0)
    return () => { clearTimeout(id); document.removeEventListener('pointerdown', onDown) }
  }, [showGoalInput])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) onUploadImage(file)
    e.target.value = ''
  }

  const handleImportChange = (e) => {
    const file = e.target.files[0]
    if (file) onImport(file)
    e.target.value = ''
  }

  const toggleNote = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(notes.map(n => n.id)))
  const clearAll = () => setSelectedIds(new Set())

  const selectedWords = [...selectedIds].reduce((sum, id) => {
    const n = notes.find(x => x.id === id)
    return sum + (n ? noteWordCount(n) : 0)
  }, 0)

  useEffect(() => {
    if (!showWordPanel) return
    const onPointerDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowWordPanel(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [showWordPanel])

  useEffect(() => {
    if (!showExportMenu) return
    const onPointerDown = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setShowExportMenu(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [showExportMenu])

  return (
    <div className={styles.toolbar}>
      <button className={styles.backBtn} onClick={onHome} title="Все холсты">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className={styles.canvasName}>{canvasName}</span>
      </button>
      <span className={styles.scale}>{Math.round(scale * 100)}%</span>
      <div className={styles.goalSection}>
        {(totalWords > 0 || wordGoal > 0) && (
          <span className={`${styles.totalWords} ${goalReached ? styles.totalWordsGoal : ''}`}>
            {totalWords} {wordForm(totalWords)}
            {wordGoal > 0 && (
              <span className={styles.goalFraction}> / {wordGoal}</span>
            )}
            {goalReached && <span className={styles.goalCheck}> ✓</span>}
          </span>
        )}
        {wordGoal > 0 && !goalReached && (
          <div className={styles.goalBar}>
            <div className={styles.goalBarFill} style={{ width: `${goalProgress * 100}%` }} />
          </div>
        )}
        {totalWords > 0 && (
          <button className={styles.resetAllBtn} onClick={onResetAllWordCounts} title="Обнулить счётчик слов">↺</button>
        )}
        {showGoalInput ? (
          <div className={styles.goalInputWrap} ref={goalInputRef}>
            <input
              type="number"
              min="1"
              className={styles.goalInput}
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitGoal(); if (e.key === 'Escape') setShowGoalInput(false) }}
              placeholder="1000"
              autoFocus
            />
            <button className={styles.goalConfirmBtn} onClick={commitGoal}>✓</button>
            {wordGoal > 0 && (
              <button className={styles.goalRemoveBtn} onClick={() => { onSetWordGoal?.(0); setShowGoalInput(false) }}>✕</button>
            )}
          </div>
        ) : (
          <button
            className={`${styles.goalToggleBtn} ${wordGoal > 0 ? styles.goalToggleBtnActive : ''}`}
            onClick={() => { setGoalDraft(wordGoal > 0 ? String(wordGoal) : ''); setShowGoalInput(true) }}
            title={wordGoal > 0 ? 'Изменить цель слов' : 'Установить цель слов'}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="7" cy="7" r="1" fill="currentColor"/>
            </svg>
          </button>
        )}
      </div>
      <div className={styles.wordBtnWrap} ref={panelRef}>
        <button
          className={styles.iconBtn}
          style={showWordPanel ? { background: 'rgba(0,0,0,0.14)' } : undefined}
          onClick={() => setShowWordPanel(v => !v)}
          title="Подсчёт слов по заметкам"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9.5 11.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {showWordPanel && (
          <div className={styles.wordPanel}>
            <div className={styles.wordPanelHeader}>
              <span>Слова по заметкам</span>
              <div className={styles.wordPanelActions}>
                <button className={styles.wordPanelActionBtn} onClick={selectAll}>Все</button>
                <button className={styles.wordPanelActionBtn} onClick={clearAll}>Сброс</button>
                <button
                  className={styles.wordPanelActionBtn}
                  onClick={onResetAllWordCounts}
                  title="Обнулить счётчик для всех заметок"
                >↺ Обнулить</button>
                <button className={styles.wordPanelActionBtn} onClick={() => setShowWordPanel(false)}>✕</button>
              </div>
            </div>
            <div className={styles.wordPanelList}>
              {notes.length === 0 && (
                <div className={styles.wordPanelEmpty}>Нет заметок</div>
              )}
              {notes.map(note => {
                const wc = noteWordCount(note)
                const checked = selectedIds.has(note.id)
                const isProfile = note.noteType === 'profile'
                const isImg = !isProfile && Boolean(note.imageUrl)
                return (
                  <label key={note.id} className={`${styles.wordPanelItem} ${checked ? styles.wordPanelItemChecked : ''}`}>
                    <input
                      type="checkbox"
                      className={styles.wordPanelCheck}
                      checked={checked}
                      onChange={() => toggleNote(note.id)}
                    />
                    <span className={styles.wordPanelTitle}>{note.title || 'Без названия'}</span>
                    {isProfile && <span className={styles.wordPanelBadge}>анкета</span>}
                    {isImg && <span className={styles.wordPanelBadge}>фото</span>}
                    <span className={styles.wordPanelWc}>{wc > 0 ? `${wc} ${wordForm(wc)}` : '—'}</span>
                    <button
                      className={styles.wordPanelResetBtn}
                      onClick={(e) => { e.preventDefault(); onResetNoteWordCount?.(note.id) }}
                      title="Обнулить счётчик этой заметки"
                    >↺</button>
                  </label>
                )
              })}
            </div>
            {selectedIds.size > 0 && (
              <div className={styles.wordPanelTotal}>
                {selectedWords} {wordForm(selectedWords)} · {selectedIds.size} {selectedIds.size === 1 ? 'заметка' : selectedIds.size < 5 ? 'заметки' : 'заметок'}
              </div>
            )}
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className={styles.fileInput} onChange={handleFileChange} />
      <input ref={importRef} type="file" accept=".json" className={styles.fileInput} onChange={handleImportChange} />
      <button className={styles.iconBtn} onClick={() => importRef.current?.click()} title="Открыть файл заметок">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 2v8M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className={styles.exportWrap} ref={exportMenuRef}>
        <button
          className={`${styles.iconBtn} ${showExportMenu ? styles.iconBtnActive : ''}`}
          onClick={() => setShowExportMenu(v => !v)}
          title="Сохранить в файл"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 10V2M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {showExportMenu && (
          <div className={styles.exportMenu}>
            <div className={styles.exportMenuTitle}>Экспорт</div>
            <button
              className={styles.exportMenuItem}
              onClick={() => { onExport(null, 'txt'); setShowExportMenu(false) }}
            >
              Все заметки
            </button>
            {TAGS.filter(tag => exportTagCounts[tag.id]).length > 0 && (
              <div className={styles.exportMenuDivider} />
            )}
            {TAGS.filter(tag => exportTagCounts[tag.id]).map(tag => (
              <button
                key={tag.id}
                className={styles.exportMenuItem}
                onClick={() => { onExport(tag.id, 'txt'); setShowExportMenu(false) }}
              >
                <span className={styles.exportMenuDot} style={{ background: tag.color }} />
                {tag.label}
                <span className={styles.exportMenuCount}>{exportTagCounts[tag.id]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button className={styles.panelBtn} onClick={onTogglePanel} title="Список заметок">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <rect x="1" y="2" width="13" height="2.5" rx="1.2" fill="currentColor"/>
          <rect x="1" y="6.25" width="13" height="2.5" rx="1.2" fill="currentColor"/>
          <rect x="1" y="10.5" width="13" height="2.5" rx="1.2" fill="currentColor"/>
        </svg>
        {noteCount > 0 && <span className={styles.badge}>{noteCount}</span>}
      </button>
      <button
        className={`${styles.focusBtn} ${focusActive ? styles.focusBtnActive : ''}`}
        onClick={onToggleFocus}
        title="Режим фокуса"
      >
        ⏱ Фокус
      </button>
      <button className={styles.photoBtn} onClick={() => fileRef.current?.click()} title="Добавить фото">
        📷 Фото
      </button>
      <button className={styles.profileBtn} onClick={onAddProfile} title="Анкета персонажа">
        👤 Анкета
      </button>
      <button className={styles.addBtn} onClick={onAdd} title="Новая заметка">
        + Заметка
      </button>
    </div>
  )
}
