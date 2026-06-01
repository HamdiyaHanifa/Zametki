import { useRef } from 'react'
import styles from './Toolbar.module.css'

export function Toolbar({ onAdd, onUploadImage, scale, onExport, onImport }) {
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
      <span className={styles.logo}>📝 Заметки</span>
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
      <button className={styles.photoBtn} onClick={() => fileRef.current?.click()} title="Добавить фото">
        📷 Фото
      </button>
      <button className={styles.addBtn} onClick={onAdd} title="Новая заметка">
        + Заметка
      </button>
    </div>
  )
}
