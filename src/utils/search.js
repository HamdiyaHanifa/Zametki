// Поиск по всем холстам сразу.
//
// Ищем в названиях холстов, заголовках заметок, тексте заметок и в полях анкет.
// На каждую заметку — не больше одной строчки в результатах, иначе список
// превращается в кашу.

const MAX_RESULTS = 60
const BEFORE = 30   // сколько букв показать до найденного
const AFTER = 70    // и сколько после

/**
 * HTML заметки → обычный текст.
 *
 * Здесь можно не чистить HTML: div нигде не вставляется в страницу, а из него
 * читается только текст. Браузер в таком оторванном div даже картинки не грузит,
 * поэтому ловушки вроде onerror сработать не могут.
 */
function plainText(html) {
  // Перед концом строки списка, абзаца и переносом ставим пробел, иначе
  // «купить хлеб» и «полить цветы» склеятся в «хлебполить».
  const spaced = (html || '').replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/blockquote)\b/gi, ' <$1')
  const div = document.createElement('div')
  div.innerHTML = spaced
  return (div.textContent || '').replace(/\s+/g, ' ').trim()
}

/** Текст заметки, по которому ищем: анкета — это поля, обычная заметка — её текст. */
function noteText(note) {
  if (note.noteType === 'profile') {
    const fields = (note.fields ?? [])
      .filter((f) => f.value?.trim())
      .map((f) => `${f.label}: ${f.value}`)
      .join('; ')
    return [fields, note.description ?? ''].filter(Boolean).join(' ')
  }
  return plainText(note.htmlContent)
}

/** Кусочек текста вокруг найденного — для показа в списке. */
function cut(text, at, length) {
  const start = Math.max(0, at - BEFORE)
  const end = Math.min(text.length, at + length + AFTER)
  return {
    before: (start > 0 ? '…' : '') + text.slice(start, at),
    match: text.slice(at, at + length),
    after: text.slice(at + length, end) + (end < text.length ? '…' : ''),
  }
}

/**
 * Поиск по всем холстам.
 *
 * Возвращает { items, truncated }:
 *   items     — найденное, по порядку холстов
 *   truncated — true, если нашлось больше, чем показываем
 *
 * Каждая находка: { key, canvasId, canvasName, noteId, title, where, before, match, after }
 * where: 'canvas' — совпало название холста, 'title' — заголовок, 'text' — текст заметки.
 */
export function searchAll(canvases, query) {
  const q = query.trim().toLowerCase()
  if (!q) return { items: [], truncated: false }

  const items = []
  let truncated = false

  for (const canvas of canvases ?? []) {
    const canvasName = canvas.name ?? 'Холст'

    // Совпало название холста — отдельной строчкой, чтобы можно было туда прыгнуть
    const nameAt = canvasName.toLowerCase().indexOf(q)
    if (nameAt !== -1) {
      items.push({
        key: `canvas-${canvas.id}`,
        canvasId: canvas.id, canvasName,
        noteId: null, title: canvasName, where: 'canvas',
        ...cut(canvasName, nameAt, q.length),
      })
    }

    for (const note of canvas.notes ?? []) {
      if (items.length >= MAX_RESULTS) { truncated = true; break }

      const title = (note.title ?? '').trim()
      const text = noteText(note)

      const titleAt = title.toLowerCase().indexOf(q)
      const textAt = text.toLowerCase().indexOf(q)
      if (titleAt === -1 && textAt === -1) continue

      // Совпал заголовок — показываем его, а рядом начало текста для узнавания
      const found = titleAt !== -1
        ? { where: 'title', ...cut(title, titleAt, q.length) }
        : { where: 'text', ...cut(text, textAt, q.length) }

      items.push({
        key: `note-${canvas.id}-${note.id}`,
        canvasId: canvas.id, canvasName,
        noteId: note.id,
        title: title || (note.noteType === 'profile' ? 'Анкета' : 'Без заголовка'),
        ...found,
      })
    }

    if (truncated) break
  }

  return { items, truncated }
}
