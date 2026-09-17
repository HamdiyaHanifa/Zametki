# CHANGELOG — Zametki

Этот файл описывает всё что было сделано в облачных сессиях Claude Code.
Локальная сессия может читать его как контекст, не требуя объяснений от пользователя.

---

## Текущее состояние (сентябрь 2026)

**Стек:** React 18 + Vite 6, CSS Modules, GitHub Pages  
**Репозиторий:** https://github.com/HamdiyaHanifa/Zametki  
**Сайт:** https://hamdiyahanifa.github.io/Zametki/  
**Основная ветка:** `main`  
**localStorage ключ:** `zametki_v2`

---

## Что реализовано

### 1. Два режима счётчика слов
- **"Живой"** — показывает актуальное количество слов (уменьшается при удалении)
- **"Накоп."** — накопительный, только растёт (учитывает всё написанное)
- Переключатель в тулбаре
- Хранится в `canvas.wordCountMode` и `canvas.cumulativeWords`
- Реализовано в `Note.jsx`, `ProfileNote.jsx`, `App.jsx`, `Toolbar.jsx`

### 2. Цвет холста с насыщенностью
- Выбор из 12 пресетов + произвольный цвет (color wheel)
- Насыщенность (не прозрачность!) через слайдер
- Используется `mixWithWhite(hex, t)` в `App.jsx` — математически смешивает с белым, **не** `rgba()` (rgba давало чёрный при низкой прозрачности)
- Хранится в `canvas.bgColor` и `canvas.bgOpacity`
- Тёмные фоны автоматически меняют цвет точечной сетки на белый (`data-dark="true"`)

### 3. Фото на фоне холста
- Загрузка из галереи через `<input type="file">`
- Слайдер насыщенности фото
- Хранится в `canvas.bgImage` (base64) и `canvas.bgImageOpacity`
- DOM-порядок слоёв: `bgImageLayer` → `bgDots` → `world`

### 4. Произвольный цвет заметок и анкет
- Радужный кружок в пикере цвета открывает нативный color picker
- **Важно:** `input[type="color"]` с `display:none` не работает! Используется паттерн overlay:
  ```jsx
  <label style={{ position: 'relative', overflow: 'hidden' }}>
    <input type="color" style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%' }} />
  </label>
  ```
- Слайдер насыщенности появляется при выборе кастомного цвета
- `paletteFromHex(hex, sat)` в `src/palette.js` — вычисляет header/body/text
- Хранится в `note.customColor` и `note.customColorSat`
- Применяется в `Note.jsx`, `ProfileNote.jsx`, **и** `FocusView.jsx`

### 5. Сжатие изображений перед сохранением
- `src/utils/image.js` — утилита `fileToSmallDataUrl(file, maxSide, quality)`
- Результат: 3MB → ~440KB, PNG с прозрачностью сохраняется
- Подключено в 7 местах: `App.jsx`, `FocusView.jsx`, `FloatingNote.jsx`, `FormatBar.jsx`, `ProfileNote.jsx`, `Toolbar.jsx`

### 6. Supabase — облачная синхронизация
- `src/cloud/` — вся логика облака
- Авторизация через email/пароль (Supabase Auth)
- Автосинхронизация заметок при изменениях
- Ключи передаются через переменные окружения: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- В GitHub: Settings → Secrets → Actions — там нужно добавить эти два секрета
- Без секретов приложение работает в режиме localStorage (без облака)

### 7. GitHub Pages деплой
- `vite.config.js`: `base: '/Zametki/'` — обязательно для subdirectory
- `.github/workflows/deploy.yml` — автосборка и деплой при пуше в `main`
- В настройках репо: Settings → Pages → Source → **GitHub Actions**

---

## Ключевые технические решения

| Проблема | Решение |
|----------|---------|
| `rgba()` давал чёрный при низкой прозрачности | `mixWithWhite(hex, t)` — интерполяция между цветом и белым |
| `input[type="color"]` с `display:none` не открывается | Overlay pattern: `opacity:0; position:absolute; inset:0` внутри `<label>` |
| Точечная сетка поверх фото не работала | Вынесена из CSS `background-image` в отдельный `<div className={styles.bgDots}>` |
| FocusView не показывал кастомный цвет | Добавлен `paletteFromHex` в `FocusView.jsx` строка 45–47 |

---

## Структура хранилища (localStorage `zametki_v2`)

```js
{
  canvases: [{
    id, name, notes, order, nextNoteId,
    viewport: { x, y, scale },
    wordGoal, cumulativeWords, wordCountMode,
    bgColor, bgOpacity, bgImage, bgImageOpacity
  }],
  nextCanvasId,
  trash: [{ note | canvas, deletedAt }]
}
```

Каждая заметка (`note`):
```js
{
  id, title, htmlContent, imageUrl, freeImages,
  x, y, width, height, colorIndex, minimized,
  customColor, customColorSat,      // кастомный цвет
  wordCountOffset,                  // для сброса счётчика
  noteType,                         // 'profile' или undefined
  fields, description,              // для анкет
  tag                               // тег из TAGS_MAP
}
```

---

## Что может потребовать внимания

- **Supabase секреты** — нужно добавить в GitHub Secrets чтобы облако работало на продакшене
- **Лимит Firestore/Supabase** — base64 изображения большие, сжатие уже подключено
- **ПЛАН.md** в корне репо — там список предложений по улучшению от Gemini с оценками
