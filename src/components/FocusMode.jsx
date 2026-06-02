import { useState, useEffect, useRef, useCallback } from 'react'
import { wordForm } from '../utils/wordCount'
import styles from './FocusMode.module.css'

const PRESETS = [10, 15, 25, 30, 45, 60]
const R = 50
const CIRC = 2 * Math.PI * R

export function FocusMode({ totalWords, onClose }) {
  const [phase, setPhase] = useState('setup') // 'setup' | 'active' | 'done'
  const [duration, setDuration] = useState(25)
  const [customVal, setCustomVal] = useState('')
  const [remaining, setRemaining] = useState(0)
  const [paused, setPaused] = useState(false)
  const [startWords, setStartWords] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [stoppedEarly, setStoppedEarly] = useState(false)
  const intervalRef = useRef(null)
  const durationRef = useRef(duration)

  useEffect(() => { durationRef.current = duration }, [duration])

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
    setPhase('active')
  }, [totalWords])

  const stopSession = useCallback(() => {
    clearInterval(intervalRef.current)
    setElapsedSec(durationRef.current * 60 - remaining)
    setStoppedEarly(true)
    setPhase('done')
  }, [remaining])

  useEffect(() => {
    if (phase !== 'active' || paused) return
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current)
          setElapsedSec(durationRef.current * 60)
          setStoppedEarly(false)
          setPhase('done')
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [phase, paused])

  useEffect(() => () => clearInterval(intervalRef.current), [])

  return (
    <div className={styles.panel}>
      <button className={styles.closeBtn} onClick={onClose}>✕</button>

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
          <button
            className={styles.startBtn}
            onClick={() => startSession(duration)}
            disabled={!duration || duration < 1}
          >
            ▶ Начать
          </button>
        </>
      )}

      {phase === 'active' && (
        <>
          <div className={styles.title}>{paused ? 'Пауза' : 'Фокус'}</div>
          <div className={styles.ringWrap}>
            <svg width="120" height="120" viewBox="0 0 120 120" className={styles.ring}>
              <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="8"/>
              <circle
                cx="60" cy="60" r={R}
                fill="none"
                stroke={paused ? '#C4B5E8' : '#E8A4AE'}
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
            {stoppedEarly ? 'Сессия прервана' : 'Время вышло!'}
          </div>
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
            <button className={styles.startBtn} onClick={() => { setPhase('setup'); setCustomVal('') }}>
              Новая сессия
            </button>
            <button className={styles.closeOutlineBtn} onClick={onClose}>Закрыть</button>
          </div>
        </>
      )}
    </div>
  )
}
