import { useRef } from 'react'
import styles from './Toolbar.module.css'

export function Toolbar({ onAdd, onUploadImage, scale }) {
  const fileRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) onUploadImage(file)
    e.target.value = ''
  }

  return (
    <div className={styles.toolbar}>
      <span className={styles.logo}>📝 Заметки</span>
      <span className={styles.scale}>{Math.round(scale * 100)}%</span>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className={styles.fileInput}
        onChange={handleFileChange}
      />
      <button className={styles.photoBtn} onClick={() => fileRef.current?.click()} title="Добавить фото">
        📷 Фото
      </button>
      <button className={styles.addBtn} onClick={onAdd} title="Новая заметка">
        + Заметка
      </button>
    </div>
  )
}
