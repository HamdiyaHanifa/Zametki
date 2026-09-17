// Чистка HTML от вредного кода.
//
// Зачем: текст заметки хранится как HTML и потом кладётся обратно в редактор.
// Если вставить в заметку кусок чужого сайта, вместе с оформлением может приехать
// чужой код — например <img src=x onerror="..."> или ссылка javascript:. Браузер
// такое исполняет, и чужой код получает доступ к нашей сессии Supabase.
// DOMPurify убирает опасное и оставляет оформление.

import DOMPurify from 'dompurify'

// Теги, которые редактор создаёт сам (жирный, списки, заголовки, картинки).
const ALLOWED_TAGS = [
  'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del',
  'h1', 'h2', 'h3', 'div', 'p', 'br', 'span', 'font',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'sub', 'sup',
  'img', 'a', 'hr',
]

// Атрибуты оформления. Обработчиков событий (onerror, onclick и прочих) здесь нет,
// поэтому DOMPurify их выкинет.
const ALLOWED_ATTR = [
  'style', 'color', 'size', 'face', 'align',
  'src', 'alt', 'title', 'width', 'height',
  'href', 'target', 'rel',
]

const CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: true, // заметки пользуются data-freeimg, data-todo, data-checked
}

// Внешние ссылки открываем в новой вкладке и без доступа к нашей странице.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

/** Убирает из HTML всё опасное, оставляя оформление. */
export function cleanHtml(html) {
  return DOMPurify.sanitize(html || '', CONFIG)
}

/**
 * Вставка (Ctrl+V) с чисткой.
 * Возвращает true, если вставку обработали сами; false — пусть вставляет браузер
 * (обычный текст без HTML опасности не несёт).
 */
export function handleHtmlPaste(e, editorEl) {
  if (!editorEl) return false
  // Вставка мимо редактора (например, в поле заголовка) — не наше дело.
  if (!(e.target instanceof Node) || !editorEl.contains(e.target)) return false

  const html = e.clipboardData?.getData('text/html')
  if (!html) return false

  e.preventDefault()
  document.execCommand('insertHTML', false, cleanHtml(html))
  editorEl.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}
