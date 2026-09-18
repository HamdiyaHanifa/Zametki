// Темы оформления.
//
// Тема меняет вид приложения: главный экран (шапку, карточки холстов, рисунки),
// шрифты и главную кнопку в панели. Цвета самих заметок тема не трогает —
// у каждой заметки свой цвет, который выбрали для неё.
//
// Выбор хранится на этом устройстве (localStorage), в облако не уходит.
//
// Все пары «текст на фоне» проверены на читаемость: не меньше 4.5 к 1
// (для крупного заголовка — не меньше 3 к 1).

const STORAGE_KEY = 'zametki_theme'
export const DEFAULT_THEME = 'groove'

const FONT_UI = "'Onest', 'Segoe UI', system-ui, sans-serif"
const FONT_TITLE = "'Unbounded', 'Segoe UI', system-ui, sans-serif"
const FONT_NOTE = "'M PLUS Rounded 1c', 'Segoe UI', system-ui, sans-serif"
const FONT_SYSTEM = "'Segoe UI', system-ui, sans-serif"

// decor — что нарисовать на главном экране:
//   hero:    'band' — цветная шапка со скруглённым низом, 'open' — без шапки
//   pattern: 'waves' | 'clouds' | 'sparkles' | 'none' — узор в шапке
//   sun:     солнышко в углу
//   doodles: рисунки на карточках холстов (по кругу из art.doodles)
export const THEMES = [
  {
    id: 'groove',
    name: 'Грув',
    decor: { hero: 'band', pattern: 'waves', sun: true, doodles: true },
    art: {
      wave: '#4A6CF0',
      sparkles: ['#FFF4DE', '#FFC21A', '#FF7AB6'],
      squiggle: '#F0452B',
      doodles: [
        { kind: 'burst', color: '#FFC21A' },
        { kind: 'daisy', petal: '#FFFFFF', center: '#F0452B' },
        { kind: 'egg' },
      ],
    },
    vars: {
      '--app-bg': '#FFF4DE', '--app-ink': '#1F1A3D', '--app-muted': '#5A5470',
      '--hero-bg': '#2B50E0', '--hero-ink': '#FFF4DE',
      '--hero-btn-bg': '#FFF4DE', '--hero-btn-ink': '#1F1A3D',
      '--card-0-bg': '#D8341C', '--card-0-ink': '#FFFFFF', '--card-0-btn': 'rgba(255, 255, 255, 0.22)',
      '--card-1-bg': '#FFC21A', '--card-1-ink': '#1F1A3D', '--card-1-btn': 'rgba(31, 26, 61, 0.10)',
      '--card-2-bg': '#FF7AB6', '--card-2-ink': '#1F1A3D', '--card-2-btn': 'rgba(31, 26, 61, 0.10)',
      '--new-line': '#2B50E0', '--new-ink': '#2B50E0', '--new-circle-bg': '#2B50E0', '--new-circle-ink': '#FFF4DE',
      '--surface-bg': '#F6E4BE', '--surface-ink': '#1F1A3D', '--surface-muted': '#5A5470',
      '--accent': '#2B50E0', '--accent-ink': '#FFFFFF',
      '--font-ui': FONT_UI, '--font-title': FONT_TITLE, '--font-note': FONT_NOTE,
    },
  },
  {
    id: 'sky',
    name: 'Небо',
    decor: { hero: 'open', pattern: 'clouds', sun: true, doodles: true },
    art: {
      cloud: '#FFF4DE',
      sparkles: ['#FFC21A', '#FFF4DE', '#FF7AB6'],
      squiggle: '#FFC21A',
      doodles: [
        { kind: 'burst', color: '#F0452B' },
        { kind: 'daisy', petal: '#FF7AB6', center: '#FFC21A' },
        { kind: 'berry' },
      ],
    },
    vars: {
      '--app-bg': '#3D63E8', '--app-ink': '#FFF4DE', '--app-muted': '#FFF4DE',
      '--hero-bg': 'transparent', '--hero-ink': '#FFF4DE',
      '--hero-btn-bg': '#FFF4DE', '--hero-btn-ink': '#1F1A3D',
      '--card-0-bg': '#FFF4DE', '--card-0-ink': '#1F1A3D', '--card-0-btn': 'rgba(31, 26, 61, 0.08)',
      '--card-1-bg': '#FFF4DE', '--card-1-ink': '#1F1A3D', '--card-1-btn': 'rgba(31, 26, 61, 0.08)',
      '--card-2-bg': '#FFF4DE', '--card-2-ink': '#1F1A3D', '--card-2-btn': 'rgba(31, 26, 61, 0.08)',
      '--new-line': '#FFF4DE', '--new-ink': '#FFF4DE', '--new-circle-bg': '#FFF4DE', '--new-circle-ink': '#2B50E0',
      '--surface-bg': '#2B50E0', '--surface-ink': '#FFF4DE', '--surface-muted': '#FFF4DE',
      '--accent': '#2B50E0', '--accent-ink': '#FFFFFF',
      '--font-ui': FONT_UI, '--font-title': FONT_TITLE, '--font-note': FONT_NOTE,
    },
  },
  {
    id: 'lemonade',
    name: 'Лимонад',
    decor: { hero: 'band', pattern: 'sparkles', sun: true, doodles: true },
    art: {
      sparkles: ['#FFCA27', '#D2E660', '#FFCCEA'],
      squiggle: '#D14700',
      doodles: [
        { kind: 'daisy', petal: '#FFFFFF', center: '#D14700' },
        { kind: 'burst', color: '#D14700' },
        { kind: 'egg' },
      ],
    },
    vars: {
      '--app-bg': '#FFF6E3', '--app-ink': '#3A2A14', '--app-muted': '#6B5A3C',
      '--hero-bg': '#D14700', '--hero-ink': '#FFFFFF',
      '--hero-btn-bg': '#FFF6E3', '--hero-btn-ink': '#3A2A14',
      '--card-0-bg': '#FFCA27', '--card-0-ink': '#4A2E00', '--card-0-btn': 'rgba(74, 46, 0, 0.10)',
      '--card-1-bg': '#D2E660', '--card-1-ink': '#2A3A00', '--card-1-btn': 'rgba(42, 58, 0, 0.10)',
      '--card-2-bg': '#FFCCEA', '--card-2-ink': '#4A1030', '--card-2-btn': 'rgba(74, 16, 48, 0.10)',
      '--new-line': '#B83E00', '--new-ink': '#B83E00', '--new-circle-bg': '#D14700', '--new-circle-ink': '#FFFFFF',
      '--surface-bg': '#F6E6C4', '--surface-ink': '#3A2A14', '--surface-muted': '#6B5A3C',
      '--accent': '#D14700', '--accent-ink': '#FFFFFF',
      '--font-ui': FONT_UI, '--font-title': FONT_TITLE, '--font-note': FONT_NOTE,
    },
  },
  {
    id: 'pink',
    name: 'Розовый лимонад',
    decor: { hero: 'band', pattern: 'sparkles', sun: false, doodles: true },
    art: {
      sparkles: ['#EDE986', '#FFFFFF', '#E7BEF8'],
      squiggle: '#E02F2E',
      doodles: [
        { kind: 'burst', color: '#F3619C' },
        { kind: 'daisy', petal: '#FFFFFF', center: '#F3619C' },
        { kind: 'egg' },
      ],
    },
    vars: {
      '--app-bg': '#FFF1F6', '--app-ink': '#40122A', '--app-muted': '#6B4050',
      '--hero-bg': '#F3619C', '--hero-ink': '#4A0B27',
      '--hero-btn-bg': '#FFF1F6', '--hero-btn-ink': '#40122A',
      '--card-0-bg': '#EDE986', '--card-0-ink': '#3A3600', '--card-0-btn': 'rgba(58, 54, 0, 0.10)',
      '--card-1-bg': '#E7BEF8', '--card-1-ink': '#3A1050', '--card-1-btn': 'rgba(58, 16, 80, 0.10)',
      '--card-2-bg': '#F3619C', '--card-2-ink': '#4A0B27', '--card-2-btn': 'rgba(74, 11, 39, 0.12)',
      '--new-line': '#B8245F', '--new-ink': '#B8245F', '--new-circle-bg': '#F3619C', '--new-circle-ink': '#4A0B27',
      '--surface-bg': '#FBDDE9', '--surface-ink': '#40122A', '--surface-muted': '#6B4050',
      '--accent': '#F3619C', '--accent-ink': '#4A0B27',
      '--font-ui': FONT_UI, '--font-title': FONT_TITLE, '--font-note': FONT_NOTE,
    },
  },
  {
    id: 'violet',
    name: 'Фиалка и лайм',
    decor: { hero: 'band', pattern: 'sparkles', sun: false, doodles: true },
    art: {
      sparkles: ['#DBFA40', '#FFFFFF', '#B494F8'],
      squiggle: '#7C43F0',
      doodles: [
        { kind: 'burst', color: '#DBFA40' },
        { kind: 'daisy', petal: '#FFFFFF', center: '#7C43F0' },
        { kind: 'berry' },
      ],
    },
    vars: {
      '--app-bg': '#F5F1FF', '--app-ink': '#2A1050', '--app-muted': '#5C4A7A',
      '--hero-bg': '#7C43F0', '--hero-ink': '#FFFFFF',
      '--hero-btn-bg': '#DBFA40', '--hero-btn-ink': '#2A1050',
      '--card-0-bg': '#B494F8', '--card-0-ink': '#2A1050', '--card-0-btn': 'rgba(42, 16, 80, 0.12)',
      '--card-1-bg': '#DBFA40', '--card-1-ink': '#2A3A00', '--card-1-btn': 'rgba(42, 58, 0, 0.10)',
      '--card-2-bg': '#FFFFFF', '--card-2-ink': '#2A1050', '--card-2-btn': 'rgba(42, 16, 80, 0.08)',
      '--new-line': '#7C43F0', '--new-ink': '#6A30E0', '--new-circle-bg': '#7C43F0', '--new-circle-ink': '#FFFFFF',
      '--surface-bg': '#E9E1FF', '--surface-ink': '#2A1050', '--surface-muted': '#5C4A7A',
      '--accent': '#7C43F0', '--accent-ink': '#FFFFFF',
      '--font-ui': FONT_UI, '--font-title': FONT_TITLE, '--font-note': FONT_NOTE,
    },
  },
  {
    id: 'zefir',
    name: 'Зефир',
    decor: { hero: 'band', pattern: 'sparkles', sun: false, doodles: true },
    art: {
      sparkles: ['#FFFFFF', '#C3B3E0', '#FDF0F5'],
      squiggle: '#C3B3E0',
      doodles: [
        { kind: 'daisy', petal: '#FFFFFF', center: '#C3B3E0' },
        { kind: 'burst', color: '#FFFFFF' },
        { kind: 'daisy', petal: '#EDB1C4', center: '#FFFFFF' },
      ],
    },
    vars: {
      '--app-bg': '#F6F0F5', '--app-ink': '#3D2233', '--app-muted': '#6C5766',
      '--hero-bg': '#EDB1C4', '--hero-ink': '#4A1F33',
      '--hero-btn-bg': '#FFFBFD', '--hero-btn-ink': '#3D2233',
      '--card-0-bg': '#EDB1C4', '--card-0-ink': '#4A1F33', '--card-0-btn': 'rgba(74, 31, 51, 0.10)',
      '--card-1-bg': '#C3B3E0', '--card-1-ink': '#2B1A47', '--card-1-btn': 'rgba(43, 26, 71, 0.10)',
      '--card-2-bg': '#FFFFFF', '--card-2-ink': '#3D2233', '--card-2-btn': 'rgba(61, 34, 51, 0.07)',
      '--new-line': '#A0507A', '--new-ink': '#8E4068', '--new-circle-bg': '#EDB1C4', '--new-circle-ink': '#4A1F33',
      '--surface-bg': '#EDE1EA', '--surface-ink': '#3D2233', '--surface-muted': '#6C5766',
      '--accent': '#EDB1C4', '--accent-ink': '#4A1F33',
      '--font-ui': FONT_UI, '--font-title': FONT_TITLE, '--font-note': FONT_NOTE,
    },
  },
  {
    id: 'mint',
    name: 'Мята',
    decor: { hero: 'band', pattern: 'sparkles', sun: false, doodles: true },
    art: {
      sparkles: ['#FFFFFF', '#B7C4E8', '#E4F4EF'],
      squiggle: '#2F7A62',
      doodles: [
        { kind: 'daisy', petal: '#FFFFFF', center: '#B7C4E8' },
        { kind: 'burst', color: '#FFFFFF' },
        { kind: 'berry' },
      ],
    },
    vars: {
      '--app-bg': '#EEF3F0', '--app-ink': '#1E3A31', '--app-muted': '#55635C',
      '--hero-bg': '#9FCFBE', '--hero-ink': '#113A2D',
      '--hero-btn-bg': '#FAFEFB', '--hero-btn-ink': '#1E3A31',
      '--card-0-bg': '#9FCFBE', '--card-0-ink': '#113A2D', '--card-0-btn': 'rgba(17, 58, 45, 0.10)',
      '--card-1-bg': '#B7C4E8', '--card-1-ink': '#1A2A4A', '--card-1-btn': 'rgba(26, 42, 74, 0.10)',
      '--card-2-bg': '#FFFFFF', '--card-2-ink': '#1E3A31', '--card-2-btn': 'rgba(30, 58, 49, 0.07)',
      '--new-line': '#2F7A62', '--new-ink': '#246650', '--new-circle-bg': '#9FCFBE', '--new-circle-ink': '#113A2D',
      '--surface-bg': '#DCE8E2', '--surface-ink': '#1E3A31', '--surface-muted': '#55635C',
      '--accent': '#9FCFBE', '--accent-ink': '#113A2D',
      '--font-ui': FONT_UI, '--font-title': FONT_TITLE, '--font-note': FONT_NOTE,
    },
  },
  {
    id: 'calm',
    name: 'Спокойная',
    decor: { hero: 'open', pattern: 'none', sun: false, doodles: false },
    art: { sparkles: [], squiggle: '#C9BFB6', doodles: [] },
    vars: {
      '--app-bg': '#F0ECE8', '--app-ink': '#2A1F1F', '--app-muted': '#6B5F57',
      '--hero-bg': 'transparent', '--hero-ink': '#2A1F1F',
      '--hero-btn-bg': '#E3DDD7', '--hero-btn-ink': '#3A2828',
      '--card-0-bg': '#FFFAF6', '--card-0-ink': '#2A1F1F', '--card-0-btn': 'rgba(0, 0, 0, 0.05)',
      '--card-1-bg': '#FFFAF6', '--card-1-ink': '#2A1F1F', '--card-1-btn': 'rgba(0, 0, 0, 0.05)',
      '--card-2-bg': '#FFFAF6', '--card-2-ink': '#2A1F1F', '--card-2-btn': 'rgba(0, 0, 0, 0.05)',
      '--new-line': '#A89C92', '--new-ink': '#6B5F57', '--new-circle-bg': '#E3DDD7', '--new-circle-ink': '#3A2828',
      '--surface-bg': '#E6E1DC', '--surface-ink': '#3A2828', '--surface-muted': '#6B5F57',
      '--accent': '#E8A4AE', '--accent-ink': '#4A1F28',
      '--font-ui': FONT_SYSTEM, '--font-title': FONT_SYSTEM, '--font-note': FONT_NOTE,
    },
  },
]

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME)
}

/** Кладёт цвета и шрифты темы в CSS-переменные на <html>. */
export function applyTheme(id) {
  const theme = getTheme(id)
  const root = document.documentElement
  Object.entries(theme.vars).forEach(([name, value]) => root.style.setProperty(name, value))
  root.dataset.theme = theme.id
  return theme
}

export function loadThemeId() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return THEMES.some((t) => t.id === saved) ? saved : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function saveThemeId(id) {
  try { localStorage.setItem(STORAGE_KEY, id) } catch { /* storage full */ }
}
