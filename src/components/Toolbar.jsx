import { useRef, useState, useEffect } from 'react'
import { noteWordCount, wordForm } from '../utils/wordCount'
import styles from './Toolbar.module.css'

export function Toolbar({ onAdd, onAddProfile, onUploadImage, scale, onExport, onImport, onTogglePanel, noteCount, totalWords, notes, onResetAllWordCounts, onResetNoteWordCount, onToggleFocus, focusActive, onHome, canvasName }) {
  const fileRef = useRef(null)
  const importRef = useRef(null)
  const panelRef = useRef(null)

  const [showWordPanel, setShowWordPanel] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

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
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowWordPanel(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [showWordPanel])

  return (
    <div className={styles.toolbar}>
      <button className={styles.backBtn} onClick={onHome} title="Все холсты">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className={styles.canvasName}>{canvasName}</span>
      </button>
      <span className={styles.scale}>{Math.round(scale * 100)}%</span>
      {totalWords > 0 && (
        <span className={styles.totalWordsWrap}>
          <span className={styles.totalWords}>{totalWords} {wordForm(totalWords)}</span>
          <button
            className={styles.resetAllBtn}
            onClick={onResetAllWordCounts}
            title="Обнулить счётчик слов на всём холсте"
          >↺</button>
        </span>
      )}
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
      <button className={styles.iconBtn} onClick={onExport} title="Сохранить в файл">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 10V2M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
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
