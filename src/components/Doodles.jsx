// Рисунки для главного экрана. Нарисованы кодом (SVG), а не картинками:
// не грузятся отдельно, не размываются и перекрашиваются под тему.
// Все они только украшают, поэтому скрыты от экранного диктора (aria-hidden).

const YELLOW = '#FFC21A'
const INK = '#1F1A3D'

export function Sparkle({ size = 20, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z" fill={color} />
    </svg>
  )
}

// Звезда-взрыв: лучи по кругу, чередуются длинные и короткие
const BURST_POINTS = Array.from({ length: 18 }, (_, i) => {
  const r = i % 2 === 0 ? 48 : 22
  const a = (Math.PI * i) / 9 - Math.PI / 2
  return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`
}).join(' ')

export function Burst({ size = 90, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <polygon points={BURST_POINTS} fill={color} stroke={color} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  )
}

export function Daisy({ size = 90, petal, center }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <ellipse key={a} cx="50" cy="23" rx="12" ry="21" fill={petal} transform={`rotate(${a} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="14" fill={center} />
    </svg>
  )
}

export function Egg({ size = 90 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 6C73 4 94 20 91 43C97 67 78 94 53 91C28 97 5 78 10 54C3 29 26 8 50 6Z" fill="#FFFDF6" />
      <circle cx="51" cy="50" r="18" fill={YELLOW} />
      <path d="M43 44a10 10 0 019-8" stroke="#FFFFFF" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function Berry({ size = 90 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="52" r="40" fill="#2B50E0" />
      <circle cx="50" cy="52" r="40" fill="none" stroke="#1B38B0" strokeWidth="4" />
      <path d="M50 30l4 9 9-2-6 7 6 7-9-2-4 9-4-9-9 2 6-7-6-7 9 2z" fill="#1B38B0" />
      <path d="M28 60a22 22 0 0010 12" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function Sun({ size = 90 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => (
        <line key={a} x1="50" y1="6" x2="50" y2="18" stroke={YELLOW} strokeWidth="7"
          strokeLinecap="round" transform={`rotate(${a} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="26" fill={YELLOW} />
      <circle cx="42" cy="46" r="3.6" fill={INK} />
      <circle cx="58" cy="46" r="3.6" fill={INK} />
      <path d="M40 57q10 9 20 0" stroke={INK} strokeWidth="3.6" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function Cloud({ width = 120, color }) {
  return (
    <svg width={width} height={width / 2} viewBox="0 0 120 60" aria-hidden="true">
      <g fill={color}>
        <ellipse cx="60" cy="42" rx="52" ry="16" />
        <circle cx="38" cy="32" r="18" />
        <circle cx="64" cy="24" r="23" />
        <circle cx="90" cy="34" r="15" />
      </g>
    </svg>
  )
}

/** Волнистые полосы во всю ширину родителя. */
export function Waves({ color, className }) {
  const rows = Array.from({ length: 9 }, (_, i) => 10 + i * 32)
  return (
    <svg className={className} viewBox="0 0 400 290" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {rows.map((y) => (
        <path key={y}
          d={`M-20 ${y} C30 ${y - 15} 70 ${y + 15} 120 ${y} S210 ${y - 15} 260 ${y} S350 ${y + 15} 420 ${y}`}
          stroke={color} strokeWidth="12" fill="none" strokeLinecap="round" />
      ))}
    </svg>
  )
}

export function Squiggle({ width = 84, color }) {
  return (
    <svg width={width} height="20" viewBox="0 0 84 20" aria-hidden="true">
      <path d="M2 10 Q 12 0 22 10 T 42 10 T 62 10 T 82 10" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** Рисунок для карточки холста по описанию из темы: { kind, color, petal, center }. */
export function Doodle({ spec, size = 92 }) {
  if (!spec) return null
  switch (spec.kind) {
    case 'burst': return <Burst size={size} color={spec.color} />
    case 'daisy': return <Daisy size={size} petal={spec.petal} center={spec.center} />
    case 'egg':   return <Egg size={size} />
    case 'berry': return <Berry size={size} />
    default:      return null
  }
}
