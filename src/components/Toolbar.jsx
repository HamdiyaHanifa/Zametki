import styles from './Toolbar.module.css'

export function Toolbar({ onAdd, scale }) {
  return (
    <div className={styles.toolbar}>
      <span className={styles.logo}>📝 Заметки</span>
      <span className={styles.scale}>{Math.round(scale * 100)}%</span>
      <button className={styles.addBtn} onClick={onAdd} title="Новая заметка">
        + Новая заметка
      </button>
    </div>
  )
}
