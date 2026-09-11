import { useState } from 'react'
import styles from './CloudBar.module.css'

// Подпись всегда начинается со слова «Облако» — так плашку легче найти глазами.
const LABELS = {
  'signed-out': 'Облако: не вошли',
  loading: 'Облако: проверяю…',
  saving: 'Облако: сохраняю…',
  saved: 'Облако: сохранено',
  conflict: 'Облако: выбери версию',
  error: 'Облако: ошибка',
}

const DOTS = {
  saved: styles.dotSaved,
  saving: styles.dotSaving,
  error: styles.dotError,
  conflict: styles.dotError,
}

function when(iso) {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
}

export function CloudBar({ cloud }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sendErr, setSendErr] = useState(null)

  // Облако не настроено — не показываем ничего
  if (!cloud.enabled) return null

  const { status, session, conflict } = cloud

  const handleSignIn = async (e) => {
    e.preventDefault()
    setSendErr(null)
    const { error } = await cloud.signIn(email.trim())
    if (error) setSendErr(error)
    else setSent(true)
  }

  return (
    <>
      <button
        className={`${styles.chip} ${status === 'signed-out' ? styles.chipAttention : ''}`}
        onClick={() => setOpen(true)}
      >
        <span className={`${styles.dot} ${DOTS[status] ?? ''}`} />
        {LABELS[status] ?? 'Облако'}
      </button>

      {/* Разошлись версии — выбирает человек, само ничего не затрётся */}
      {conflict && (
        <div className={styles.backdrop}>
          <div className={styles.dialog}>
            <h2 className={styles.title}>Какую версию оставить?</h2>
            <p className={styles.text}>
              В облаке лежат заметки от {when(conflict.cloudAt)} — {conflict.cloudNotes} шт.
              На этом устройстве — {conflict.localNotes} шт. Они различаются.
            </p>
            <div className={styles.row}>
              <button className={`${styles.btn} ${styles.btnMain}`} onClick={() => cloud.resolveConflict('cloud')}>
                Взять из облака
              </button>
              <button className={styles.btn} onClick={() => cloud.resolveConflict('local')}>
                Оставить эти и отправить
              </button>
            </div>
          </div>
        </div>
      )}

      {open && !conflict && (
        <div className={styles.backdrop} onClick={() => setOpen(false)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            {session ? (
              <>
                <h2 className={styles.title}>Облако включено</h2>
                <p className={styles.text}>
                  Вы вошли как {session.user.email}. Заметки сохраняются автоматически.
                  Откройте это же приложение на другом устройстве и войдите под той же почтой —
                  заметки появятся там.
                </p>
                {cloud.error && <p className={styles.err}>{cloud.error}</p>}
                <div className={styles.row}>
                  <button className={`${styles.btn} ${styles.btnMain}`} onClick={() => { cloud.saveNow(); setOpen(false) }}>
                    Сохранить сейчас
                  </button>
                  <button className={styles.btn} onClick={() => { cloud.signOut(); setOpen(false) }}>
                    Выйти
                  </button>
                </div>
              </>
            ) : sent ? (
              <>
                <h2 className={styles.title}>Письмо отправлено</h2>
                <p className={styles.text}>
                  Откройте письмо на {email} и нажмите ссылку — на этом же устройстве,
                  где открыто приложение. Если писем несколько, годится только самое новое.
                </p>
                <div className={styles.row}>
                  <button className={styles.btn} onClick={() => { setSent(false); setOpen(false) }}>Закрыть</button>
                </div>
              </>
            ) : (
              <>
                <h2 className={styles.title}>Вход в облако</h2>
                <p className={styles.text}>
                  Введите почту — придёт ссылка для входа. Пароль придумывать не надо.
                  Нажимайте кнопку один раз: новое письмо отменяет ссылку из предыдущего.
                </p>
                <form onSubmit={handleSignIn}>
                  <input
                    className={styles.input}
                    type="email"
                    required
                    placeholder="почта@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {sendErr && <p className={styles.err}>{sendErr}</p>}
                  <div className={styles.row}>
                    <button className={`${styles.btn} ${styles.btnMain}`} type="submit">Прислать ссылку</button>
                    <button className={styles.btn} type="button" onClick={() => setOpen(false)}>Отмена</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
