// Сравнение местных заметок с облачными.
//
// Сравнивать через JSON.stringify нельзя: поле data в базе имеет тип jsonb,
// а Postgres переставляет ключи внутри него по-своему. Одни и те же заметки
// после поездки в облако дают другую строку — и приложение думало, что версии
// разошлись, хотя в них всё одинаковое.
//
// Поэтому считаем «отпечаток»: ключи сортируем, чтобы их порядок не влиял,
// а то, что у каждого устройства своё, в сравнение не берём.

/** Ключи холста, которые не считаются содержимым (у каждого устройства свои). */
const NOT_CONTENT = [
  'viewport', // куда прокручен и как приближён холст
]

/** Строка из значения: у объектов ключи отсортированы, поэтому их порядок не влияет. */
function stable(value) {
  if (Array.isArray(value)) {
    return '[' + value.map(stable).join(',') + ']'
  }
  if (value && typeof value === 'object') {
    const parts = Object.keys(value)
      .sort()
      .filter((k) => value[k] !== undefined)
      .map((k) => JSON.stringify(k) + ':' + stable(value[k]))
    return '{' + parts.join(',') + '}'
  }
  return JSON.stringify(value) ?? 'null'
}

/** Оставляет только то, что считается содержимым заметок. */
function content(data) {
  return {
    canvases: (data?.canvases ?? []).map((canvas) => {
      const copy = { ...canvas }
      NOT_CONTENT.forEach((key) => delete copy[key])
      return copy
    }),
    trash: data?.trash ?? [],
    // nextCanvasId не берём: это просто счётчик номеров, а не заметки
  }
}

/**
 * Отпечаток заметок. Одинаковый отпечаток = одинаковое содержимое,
 * даже если ключи лежат в другом порядке или холст прокручен иначе.
 */
export function signature(data) {
  return stable(content(data))
}

/** Сколько всего заметок — для диалога выбора версии. */
export function countNotes(data) {
  try {
    return (data?.canvases ?? []).reduce((sum, c) => sum + (c.notes?.length ?? 0), 0)
  } catch {
    return 0
  }
}

/**
 * Что делать, когда местная и облачная версии разошлись.
 *
 * markSig — отпечаток, на котором они совпали в последний раз (null, если
 * на этом устройстве сверки ещё не было).
 *
 * 'same' — содержимое одинаковое, делать нечего
 * 'push' — меняли только здесь, отправляем в облако
 * 'pull' — меняли только в облаке, забираем оттуда
 * 'ask'  — менялись обе версии (или сравнить не с чем), выбирает человек
 */
export function decideSync({ localSig, cloudSig, markSig }) {
  if (localSig === cloudSig) return 'same'
  if (!markSig) return 'ask'

  const localChanged = markSig !== localSig
  const cloudChanged = markSig !== cloudSig

  if (localChanged && !cloudChanged) return 'push'
  if (!localChanged && cloudChanged) return 'pull'
  return 'ask'
}
