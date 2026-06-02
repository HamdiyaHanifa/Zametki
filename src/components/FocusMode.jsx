import { useState, useEffect, useRef, useCallback } from 'react'
import { wordForm } from '../utils/wordCount'
import styles from './FocusMode.module.css'

const PRESETS = [10, 15, 25, 30, 45, 60]
const DANGER_PRESETS = [5, 10, 15, 20, 30]
const R = 50
const CIRC = 2 * Math.PI * R

export function FocusMode({ totalWords, onClose, onDangerStart, onDangerStop, dangerInactiveProgress = 0, visible = true, onShow }) {
  const [phase, setPhase] = useState('setup') // 'setup' | 'active' | 'done'
  const [duration, setDuration] = useState(25)
  const [customVal, setCustomVal] = useState('')
  const [remaining, setRemaining] = useState(0)
  const [paused, setPaused] = useState(false)
  const [startWords, setStartWords] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [stoppedEarly, setStoppedEarly] = useState(false)
  const [dangerEnabled, setDangerEnabled] = useState(false)
  const [dangerInactivitySec, setDangerInactivitySec] = useState(5)
  const [dangerFailed, setDangerFailed] = useState(false)
  const [pos, setPos] = useState({ x: null, y: null })
  const [isCollapsed, setIsCollapsed] = useState(false)

  const intervalRef = useRef(null)
  const nodeRef = useRef(null)
  const durationRef = useRef(duration)
  const dangerEnabledRef = useRef(false)
  const dangerInactivitySecRef = useRef(5)
  const onDangerStopRef = useRef(onDangerStop)
  const sessionStartTimeRef = useRef(0)

  useEffect(() => { durationRef.current = duration }, [duration])
  useEffect(() => { dangerEnabledRef.current = dangerEnabled }, [dangerEnabled])
  useEffect(() => { dangerInactivitySecRef.current = dangerInactivitySec }, [dangerInactivitySec])
  useEffect(() => { onDangerStopRef.current = onDangerStop }, [onDangerStop])

  const wordsWritten = Math.max(0, totalWords - startWords)
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const progress = duration > 0 ? 1 - remaining / (duration * 60) : 0
  const dashOffset = CIRC * (1 - progress)

  const formatElapsed = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const startSession = useCallback((min) => {
    clearInterval(intervalRef.current)
    setRemaining(min * 60)
    setStartWords(totalWords)
    setPaused(false)
    setStoppedEarly(false)
    setElapsedSec(0)
    setDangerFailed(false)
    sessionStartTimeRef.current = Date.now()
    setPhase('active')

    if (dangerEnabledRef.current) {
      onDangerStart?.(dangerInactivitySecRef.current, () => {
        // Called by FocusView when inactivity threshold exceeded
        clearInterval(intervalRef.current)
        setElapsedSec(Math.round((Date.now() - sessionStartTimeRef.current) / 1000))
        setDangerFailed(true)
        setStoppedEarly(false)
        setPhase('done')
      })
    }
  }, [totalWords, onDangerStart])

  const stopSession = useCallback(() => {
    clearInterval(intervalRef.current)
    setElapsedSec(Math.round((Date.now() - sessionStartTimeRef.current) / 1000))
    setStoppedEarly(true)
    setDangerFailed(dangerEnabledRef.current)
    setPhase('done')
    if (dangerEnabledRef.current) {
      onDangerStopRef.current?.(false) // danger mode manual stop = delete text
    }
  }, [])

  const handleClose = useCallback(() => {
    if (dangerEnabledRef.current && phase === 'active') {
      clearInterval(intervalRef.current)
      onDangerStopRef.current?.(true) // closing panel = keep text (no penalty)
    }
    onClose()
  }, [phase, onClose])

  const handleDragStart = useCallback((e) => {
    const isTouch = e.type === 'touchstart'
    if (!isTouch && e.button !== 0) return
    const node = nodeRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const cx0 = isTouch ? e.touches[0].clientX : e.clientX
    const cy0 = isTouch ? e.touches[0].clientY : e.clientY
    const ox = cx0 - rect.left
    const oy = cy0 - rect.top
    if (!isTouch) document.body.style.cursor = 'grabbing'
    const onMove = (ev) => {
      if (isTouch) ev.preventDefault()
      const cx = isTouch ? ev.touches[0].clientX : ev.clientX
      const cy = isTouch ? ev.touches[0].clientY : ev.clientY
      setPos({ x: cx - ox, y: cy - oy })
    }
    const onEnd = () => {
      if (!isTouch) document.body.style.cursor = ''
      window.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove)
      window.removeEventListener(isTouch ? 'touchend' : 'mouseup', onEnd)
    }
    window.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, isTouch ? { passive: false } : undefined)
    window.addEventListener(isTouch ? 'touchend' : 'mouseup', onEnd)
  }, [])

  const handlePanelInteract = useCallback((e) => {
    if (e.target.closest('button, input, textarea, select, label')) return
    handleDragStart(e)
  }, [handleDragStart])

  useEffect(() => {
    if (phase !== 'active' || paused) return
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current)
          setElapsedSec(durationRef.current * 60)
          setStoppedEarly(false)
          setDangerFailed(false)
          setPhase('done')
          if (dangerEnabledRef.current) {
            onDangerStopRef.current?.(true) // timer completed = save text
          }
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [phase, paused])

  useEffect(() => () => clearInterval(intervalRef.current), [])

  useEffect(() => { if (phase !== 'active') setIsCollapsed(false) }, [phase])

  const dangerBarColor = dangerInactiveProgress < 0.5 ? '#4caf50'
                        : dangerInactiveProgress < 0.8 ? '#ff9800'
                        : '#f44336'

  const posStyle = pos.x !== null
    ? { top: pos.y + 'px', left: pos.x + 'px', right: 'auto', bottom: 'auto' }
    : {}

  if (!visible && phase !== 'active') return null

  if ((!visible || isCollapsed) && phase === 'active') {
    return (
      <div
        ref={nodeRef}
        className={`${styles.miniChip} ${dangerEnabled ? styles.miniChipDanger : ''}`}
        style={posStyle}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onClick={() => { setIsCollapsed(false); onShow?.() }}
        title="Открыть таймер"
      >
        {dangerEnabled && <span className={styles.miniChipIcon}>⚡</span>}
        <span className={styles.miniChipTime}>{mm}:{ss}</span>
        <button
          className={styles.miniChipStop}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); stopSession() }}
          title="Остановить"
        >■</button>
        {dangerEnabled && (
          <div className={styles.miniChipBar}>
            <div
              className={styles.miniChipBarFill}
              style={{
                width: `${Math.max(0, (1 - dangerInactiveProgress) * 100)}%`,
                background: dangerBarColor,
                transition: 'width 0.08s linear, background 0.3s ease',
              }}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={nodeRef} className={styles.panel} style={posStyle} onMouseDown={handlePanelInteract} onTouchStart={handlePanelInteract}>
      <button className={styles.closeBtn} onClick={() => {
        if (phase === 'active') setIsCollapsed(true)
        else handleClose()
      }}>✕</button>

      {phase === 'setup' && (
        <>
          <div className={styles.title}>Режим фокуса</div>
          <div className={styles.subtitle}>Выберите время</div>
          <div className={styles.presets}>
            {PRESETS.map(m => (
              <button
                key={m}
                className={`${styles.preset} ${duration === m && !customVal ? styles.presetActive : ''}`}
                onClick={() => { setDuration(m); setCustomVal('') }}
              >
                {m}<span className={styles.presetUnit}>м</span>
              </button>
            ))}
          </div>
          <div className={styles.customRow}>
            <input
              className={styles.customInput}
              type="number"
              min={1}
              max={180}
              placeholder="Своё..."
              value={customVal}
              onChange={e => {
                setCustomVal(e.target.value)
                const n = parseInt(e.target.value, 10)
                if (n > 0) setDuration(n)
              }}
            />
            <span className={styles.customUnit}>мин</span>
          </div>

          {/* Danger mode toggle */}
          <div className={styles.dangerSection}>
            <label className={styles.dangerToggle}>
              <input
                type="checkbox"
                checked={dangerEnabled}
                onChange={e => setDangerEnabled(e.target.checked)}
                className={styles.dangerCheckbox}
              />
              <span className={styles.dangerToggleLabel}>⚡ Опасный режим</span>
            </label>
            {dangerEnabled && (
              <>
                <div className={styles.dangerHint}>
                  Текст сохранится только если таймер дойдёт до конца. Остановишься на...
                </div>
                <div className={styles.dangerTimeRow}>
                  {DANGER_PRESETS.map(s => (
                    <button
                      key={s}
                      className={`${styles.dangerTimeBtn} ${dangerInactivitySec === s ? styles.dangerTimeBtnActive : ''}`}
                      onClick={() => setDangerInactivitySec(s)}
                    >
                      {s}<span className={styles.dangerTimeBtnUnit}>с</span>
                    </button>
                  ))}
                </div>
                <div className={styles.dangerHint2}>...и текст исчезнет</div>
              </>
            )}
          </div>

          <button
            className={`${styles.startBtn} ${dangerEnabled ? styles.startBtnDanger : ''}`}
            onClick={() => startSession(duration)}
            disabled={!duration || duration < 1}
          >
            {dangerEnabled ? '⚡ Начать' : '▶ Начать'}
          </button>
        </>
      )}

      {phase === 'active' && (
        <>
          <div className={styles.title}>{paused ? 'Пауза' : (dangerEnabled ? '⚡ Опасно' : 'Фокус')}</div>
          <div className={styles.ringWrap}>
            <svg width="120" height="120" viewBox="0 0 120 120" className={styles.ring}>
              <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="8"/>
              <circle
                cx="60" cy="60" r={R}
                fill="none"
                stroke={paused ? '#C4B5E8' : dangerEnabled ? '#f44336' : '#E8A4AE'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 60 60)"
                style={{ transition: paused ? 'none' : 'stroke-dashoffset 0.95s linear' }}
              />
            </svg>
            <div className={styles.timerOverlay}>
              <span className={styles.timerDisplay}>{mm}:{ss}</span>
            </div>
          </div>
          <div className={styles.wordsBox}>
            <span className={styles.wordsNum}>{wordsWritten}</span>
            <span className={styles.wordsLabel}>{wordForm(wordsWritten)} за сессию</span>
          </div>
          {dangerEnabled && (
            <div className={styles.dangerProgressWrap}>
              <div
                className={styles.dangerProgressBar}
                style={{
                  width: `${Math.max(0, (1 - dangerInactiveProgress) * 100)}%`,
                  background: dangerBarColor,
                  transition: 'width 0.08s linear, background 0.3s ease',
                }}
              />
            </div>
          )}
          <div className={styles.controls}>
            <button className={styles.pauseBtn} onClick={() => setPaused(v => !v)}>
              {paused ? '▶' : '⏸'}
            </button>
            <button className={styles.stopBtn} onClick={stopSession}>■</button>
          </div>
        </>
      )}

      {phase === 'done' && (
        <>
          <div className={styles.doneTitle}>
            {dangerFailed ? '💀 Провалено' : stoppedEarly && dangerEnabled ? 'Остановлено' : stoppedEarly ? 'Сессия прервана' : '✓ Завершено!'}
          </div>
          {dangerFailed || (stoppedEarly && dangerEnabled) ? (
            <div className={styles.dangerFailMsg}>Написанный текст удалён</div>
          ) : null}
          <div className={styles.doneStats}>
            <div className={styles.doneStat}>
              <span className={styles.doneNum}>{wordsWritten}</span>
              <span className={styles.doneLabel}>{wordForm(wordsWritten)}</span>
            </div>
            <div className={styles.doneDivider}/>
            <div className={styles.doneStat}>
              <span className={styles.doneNum}>{formatElapsed(elapsedSec)}</span>
              <span className={styles.doneLabel}>мм:сс</span>
            </div>
          </div>
          <div className={styles.doneControls}>
            <button className={styles.startBtn} onClick={() => { setPhase('setup'); setCustomVal(''); setDangerFailed(false) }}>
              Новая сессия
            </button>
            <button className={styles.closeOutlineBtn} onClick={handleClose}>Закрыть</button>
          </div>
        </>
      )}
    </div>
  )
}
