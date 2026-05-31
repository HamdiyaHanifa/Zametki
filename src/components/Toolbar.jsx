import styles from './Toolbar.module.css'

export function Toolbar({ onAdd }) {
  return (
    <div className={styles.toolbar}>
      <span className={styles.logo}>📝 Заметки</span>
      <button className={styles.addBtn} onClick={onAdd} title="Новая заметка">
        + Новая заметка
      </button>
    </div>
  )
}
