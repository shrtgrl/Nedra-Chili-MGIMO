import type { ApiLessonKind, ApiRequestStatus, ApiStaffRequest } from './api'
import { addDays } from './format'
import { REQUEST_CATALOG, REQUEST_TYPES } from '../data/mock'

/** Срок обработки заявки, дней. Берётся из интерфейса студента («до 3 рабочих дней»); в API срока нет. */
export const SLA_DAYS = 3

export const TYPE_LABEL: Record<ApiStaffRequest['type'], string> = REQUEST_TYPES
/** Короткие подписи для фильтров: по виду заявки, ключи — все типы. */
export const TYPE_SHORT: Record<ApiStaffRequest['type'], string> = Object.fromEntries(Object.keys(REQUEST_TYPES).map((t) => [t, REQUEST_TYPES[t as ApiStaffRequest['type']]])) as Record<ApiStaffRequest['type'], string>
const GROUP_DOT = ['#dd723c', '#5b7fd1', '#5aa469']
export const TYPE_DOT: Record<ApiStaffRequest['type'], string> = Object.fromEntries([
  ...REQUEST_CATALOG.flatMap((g, gi) => g.items.map((i) => [i.type, GROUP_DOT[gi]] as const)),
  ['other', '#a45bb4'],
]) as Record<ApiStaffRequest['type'], string>

export const STATUS_LABEL: Record<ApiRequestStatus, string> = {
  submitted: 'Новая', in_progress: 'В работе', ready: 'Готова', issued: 'Выдана', rejected: 'Отклонена', cancelled: 'Отменена',
}
export const STAGES = ['Получена', 'В работе', 'Готова', 'Выдана'] as const
export const stageOf = (s: ApiRequestStatus) => (s === 'submitted' ? 0 : s === 'in_progress' ? 1 : s === 'ready' ? 2 : s === 'issued' ? 3 : 0)

export const isActive = (r: ApiStaffRequest) => r.status === 'submitted' || r.status === 'in_progress'
export const dueDate = (r: ApiStaffRequest) => addDays(new Date(r.createdAt), SLA_DAYS)
export const shortNumber = (r: ApiStaffRequest) => r.id.slice(0, 4).toUpperCase()

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
/** Сколько полных дней просрочки (0 — срок сегодня, <0 — ещё есть время). */
export const overdueDays = (r: ApiStaffRequest, now: Date) => Math.round((startOfDay(now).getTime() - startOfDay(dueDate(r)).getTime()) / 86_400_000)
export const isOverdue = (r: ApiStaffRequest, now: Date) => isActive(r) && overdueDays(r, now) > 0

/** Сначала срочные (просроченные и старые), затем готовые, затем закрытые, включая отменённые. */
export function sortQueue(list: ApiStaffRequest[]) {
  const rank = (r: ApiStaffRequest) => (isActive(r) ? 0 : r.status === 'ready' ? 1 : 2)
  return list
    .sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? +new Date(a.createdAt) - +new Date(b.createdAt) : +new Date(b.updatedAt) - +new Date(a.updatedAt)))
}

export const KIND_LABEL: Record<ApiLessonKind, string> = { lecture: 'Лекция', seminar: 'Семинар', practice: 'Практика' }
