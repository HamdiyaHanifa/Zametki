import { useEffect } from 'react'
import { THEMES } from '../themes'
import styles from './ThemePicker.module.css'

/**
 * Выбор темы оформления. Тема применяется сразу при нажатии —
 * так видно, как она выглядит, ещё до закрытия окошка.
 */
export function ThemePicker({ currentId, onPick, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-picker-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <h2 id="theme-picker-title" className={styles.title}>Тема оформления</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.grid}>
          {THEMES.map((t) => {
            const v = t.vars
            const heroBg = v['--hero-bg'] === 'transparent' ? v['--app-bg'] : v['--hero-bg']
            const active = t.id === currentId
            return (
              <button
                key={t.id}
                type="button"
                className={`${styles.option} ${active ? styles.optionActive : ''}`}
                aria-pressed={active}
                onClick={() => onPick(t.id)}
              >
                {/* Маленький главный экран в цветах темы */}
                <span className={styles.preview} style={{ background: v['--app-bg'] }}>
                  <span className={styles.previewHero} style={{ background: heroBg }}>
                    <span className={styles.previewTitle} style={{ background: v['--hero-ink'] }} />
                  </span>
                  <span className={styles.previewCards}>
                    <span style={{ background: v['--card-0-bg'] }} />
                    <span style={{ background: v['--card-1-bg'] }} />
                    <span style={{ background: v['--card-2-bg'] }} />
                  </span>
                </span>
                <span className={styles.name}>
                  {t.name}
                  {active && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <p className={styles.hint}>Тема запоминается на этом устройстве. Цвета заметок она не меняет.</p>
      </div>
    </div>
  )
}
