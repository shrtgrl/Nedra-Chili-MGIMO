import type { ExamForm } from '../types'

export const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'] as const
export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const DAY_NAMES = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']

export const addDays = (d: Date, n: number) => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export const monthShort = (d: Date) => MONTHS_GEN[d.getMonth()].slice(0, 3)

/** «9 – 14 ноября» или «30 ноября – 5 декабря» */
export const weekRange = (monday: Date) => {
  const sat = addDays(monday, 5)
  return monday.getMonth() === sat.getMonth()
    ? `${monday.getDate()} – ${sat.getDate()} ${MONTHS_GEN[sat.getMonth()]}`
    : `${monday.getDate()} ${MONTHS_GEN[monday.getMonth()]} – ${sat.getDate()} ${MONTHS_GEN[sat.getMonth()]}`
}

/** «СРЕДА, 11 НОЯБРЯ · 10:20» */
export const eyebrowDate = (d: Date, withTime = true) => {
  const base = `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
  const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return withTime ? `${base} · ${t}` : base
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** «25 мин», «2 ч 40 мин» */
export const humanDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h} ч ${m} мин`
  if (h) return `${h} ч`
  return `${m} мин`
}

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}
export const pluralize = plural

export const daysLeftLabel = (days: number) => {
  if (days <= 0) return 'сегодня'
  if (days === 1) return 'завтра'
  return `через ${days} ${plural(days, 'день', 'дня', 'дней')}`
}

/** Шкала с макета ведомости: <50 — 2, 50–69 — 3, 70–84 — 4, от 85 — 5. */
export const markFor = (score: number) => (score < 50 ? 2 : score < 70 ? 3 : score < 85 ? 4 : 5)

export const gradeLabel = (score: number, form: ExamForm) =>
  form === 'Зачёт' ? (score >= 50 ? 'Зачтено' : 'Не зачтено') : String(markFor(score))

export const average = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0)

/** «11 ноября» */
export const dayMonth = (d: Date) => `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
