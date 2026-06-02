export function countWords(html) {
  if (!html) return 0
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim()
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

export function wordForm(n) {
  const last2 = n % 100
  const last1 = n % 10
  if (last2 >= 11 && last2 <= 14) return 'слов'
  if (last1 === 1) return 'слово'
  if (last1 >= 2 && last1 <= 4) return 'слова'
  return 'слов'
}
