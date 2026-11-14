import type { ApiAnnouncement } from './api'

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
/** День и месяц по Москве: `{ day: 12, month: 'ноября' }`. */
export const dateParts = (iso: string) => {
  const p = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'numeric' }).formatToParts(new Date(iso))
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value)
  return { day: get('day'), month: MONTHS[get('month') - 1] }
}
export const dateLabel = (iso: string) => {
  const d = dateParts(iso)
  return `${d.day} ${d.month}`
}
export const audience = (a: ApiAnnouncement) => (a.groupName ? `для группы ${a.groupName}` : 'для всех студентов')
/** Минуты чтения при ~180 словах в минуту, не меньше одной. */
export const readMinutes = (a: ApiAnnouncement) => Math.max(1, Math.round(`${a.title} ${a.body}`.split(/\s+/).length / 180))
