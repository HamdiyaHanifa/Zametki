// Pastel palette — header is slightly deeper, body is the washed-out tint
export const PALETTE = [
  { header: '#E8A4AE', body: '#FDF0F3', text: '#4a1f28' }, // розовый
  { header: '#A8C4BC', body: '#E4F2EE', text: '#1a3830' }, // шалфей
  { header: '#D8C8A0', body: '#F8F0D8', text: '#3a2c00' }, // бежевый
  { header: '#CCA8AC', body: '#F5E0E4', text: '#3a2028' }, // пыльная роза
  { header: '#C0B0CC', body: '#EDE0F8', text: '#2a1840' }, // лаванда
  { header: '#E0A878', body: '#FDDEC8', text: '#3a1a00' }, // персик
  { header: '#C0B870', body: '#F0ECC0', text: '#302800' }, // оливковый
  { header: '#A0C8B8', body: '#DCEFEA', text: '#0a3828' }, // мята
  { header: '#A0B0CC', body: '#DCE4F8', text: '#182840' }, // голубой
  { header: '#8898A8', body: '#C8D8E8', text: '#102030' }, // стальной
  { header: '#A09098', body: '#E0D4D8', text: '#302030' }, // мокко
  { header: '#D4A8B0', body: '#F8E4E8', text: '#3a1825' }, // румяный
]

// Derive header/body/text from a custom hex color and saturation (0–1)
export function paletteFromHex(hex, sat = 1) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const s = Math.max(0, Math.min(1, sat))
  const hr = Math.round(255 + (r - 255) * s)
  const hg = Math.round(255 + (g - 255) * s)
  const hb = Math.round(255 + (b - 255) * s)
  const header = `rgb(${hr}, ${hg}, ${hb})`
  const bs = s * 0.18
  const body = `rgb(${Math.round(255 + (r - 255) * bs)}, ${Math.round(255 + (g - 255) * bs)}, ${Math.round(255 + (b - 255) * bs)})`
  const lum = (hr * 299 + hg * 587 + hb * 114) / 1000
  const text = lum < 140 ? '#f0f0ee' : '#2a1818'
  return { header, body, text }
}
