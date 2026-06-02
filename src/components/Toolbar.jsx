import { useRef } from 'react'
import styles from './Toolbar.module.css'

export function Toolbar({ onAdd, onAddProfile, onUploadImage, scale, onExport, onImport, onTogglePanel, noteCount, onHome, canvasName }) {
  const fileRef = useRef(null)
  const importRef = useRef(null)

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

  return (
    <div className={styles.toolbar}>
      <button className={styles.backBtn} onClick={onHome} title="Все холсты">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className={styles.canvasName}>{canvasName}</span>
      </button>
      <span className={styles.scale}>{Math.round(scale * 100)}%</span>
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
