import type { Material, MaterialFile } from '../types'

export const fileSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} КБ` : `${(n / 1024 / 1024).toFixed(1)} МБ`)

export function readFile(file: File): Promise<MaterialFile> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve({ name: file.name, size: file.size, type: file.type, dataUrl: String(r.result) })
    r.onerror = () => reject(new Error('Не удалось прочитать файл'))
    r.readAsDataURL(file)
  })
}

/** Добавляет https://, если пользователь ввёл адрес без протокола. Возвращает null, если это не ссылка. */
export function normalizeUrl(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    const u = new URL(withProto)
    return u.hostname.includes('.') ? u.toString() : null
  } catch {
    return null
  }
}

export const linkLabel = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export const materialDate = (m: Material) => {
  const d = new Date(m.createdAt)
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  return `${d.getDate()} ${months[d.getMonth()]}`
}
