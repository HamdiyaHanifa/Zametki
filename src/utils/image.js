// Картинка хранится внутри заметки текстом (data URL). Поэтому фото с телефона
// на 4 МБ раздувает и локальную копию в браузере (там предел ~5 МБ на весь сайт),
// и то, что уезжает в облако одним куском при каждой правке.
//
// Перед сохранением уменьшаем картинку: по длинной стороне не больше MAX_SIDE.
// Фото становится примерно в десять-двадцать раз легче, а на экране заметки
// разницы не видно.

const MAX_SIDE = 1600
const JPEG_QUALITY = 0.82

// Меньше этого размера не трогаем — смысла нет.
const SKIP_UNDER = 200 * 1024

/**
 * Читает файл картинки и отдаёт уменьшенный data URL.
 * Если уменьшить не удалось — отдаёт файл как есть, чтобы картинка не пропала.
 */
export function fileToSmallDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Это не картинка'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось прочитать файл'))
    reader.onload = () => {
      const original = String(reader.result)

      // GIF пережимать нельзя — потеряется анимация. SVG и так лёгкий.
      if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
        resolve(original)
        return
      }

      const img = new Image()
      // Не смогли разобрать картинку — пусть лучше будет тяжёлая, чем никакая.
      img.onerror = () => resolve(original)
      img.onload = () => {
        const longest = Math.max(img.width, img.height)
        const scale = longest > MAX_SIDE ? MAX_SIDE / longest : 1

        if (scale === 1 && original.length < SKIP_UNDER) {
          resolve(original)
          return
        }

        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(original)
          return
        }
        ctx.drawImage(img, 0, 0, w, h)

        // У PNG и WebP бывает прозрачность, а у JPEG её не бывает — она стала бы
        // чёрной. Поэтому такие картинки оставляем в PNG, а фотографии жмём в JPEG.
        const keepsAlpha = file.type === 'image/png' || file.type === 'image/webp'
        const small = keepsAlpha
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', JPEG_QUALITY)

        // Бывает, что «уменьшенная» версия оказывается тяжелее (мелкие PNG).
        resolve(small.length < original.length ? small : original)
      }
      img.src = original
    }
    reader.readAsDataURL(file)
  })
}
