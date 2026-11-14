import campus from '../assets/covers/campus.webp'
import graduation from '../assets/covers/graduation.webp'
import library from '../assets/covers/library.webp'
import lecture from '../assets/covers/lecture.webp'
import schedule from '../assets/covers/schedule.webp'
import languages from '../assets/covers/languages.webp'

/** Стоковые обложки новостей. В базе хранится `stock:<id>`, порядок совпадает с API. */
export const STOCK_COVERS = [
  { id: 'campus', label: 'Здание университета', src: campus },
  { id: 'graduation', label: 'Выпускники', src: graduation },
  { id: 'library', label: 'Библиотека', src: library },
  { id: 'lecture', label: 'Лекция и статистика', src: lecture },
  { id: 'schedule', label: 'Расписание и задания', src: schedule },
  { id: 'languages', label: 'Иностранные языки', src: languages },
] as const

/** Адрес картинки для поля `cover` (стоковая, загруженное фото или нет обложки). */
export const coverSrc = (cover: string | null | undefined): string | null => {
  if (!cover) return null
  if (cover.startsWith('stock:')) return STOCK_COVERS.find((c) => `stock:${c.id}` === cover)?.src ?? null
  return cover.startsWith('data:image/') ? cover : null
}

const MAX_SIDE = 1200
const MAX_INPUT = 12 * 1024 * 1024

/** Фото с компьютера → уменьшенный JPEG (до 1200 px по ширине) в виде data-URL. */
export async function photoToCover(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Выберите файл с картинкой (JPEG, PNG или WebP)')
  if (file.size > MAX_INPUT) throw new Error('Файл больше 12 МБ — выберите картинку поменьше')
  const bmp = await createImageBitmap(file).catch(() => { throw new Error('Не удалось открыть картинку') })
  const k = Math.min(1, MAX_SIDE / bmp.width)
  const w = Math.round(bmp.width * k)
  const h = Math.round(bmp.height * k)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Не удалось обработать картинку')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  for (const q of [0.82, 0.7, 0.55]) {
    const url = canvas.toDataURL('image/jpeg', q)
    if (url.length <= 650_000) return url
  }
  throw new Error('Фото слишком тяжёлое — выберите другое')
}
