import type { ApiLessonKind, ApiRequestStatus, ApiStaffRequest } from './api'
import { addDays } from './format'

/** Срок обработки заявки, дней. Берётся из интерфейса студента («до 3 рабочих дней»); в API срока нет. */
export const SLA_DAYS = 3

export const TYPE_LABEL: Record<ApiStaffRequest['type'], string> = {
  study: 'Справка об обучении',
  order: 'Копия приказа',
  leave: 'Академический отпуск',
  retake: 'Пересдача экзамена',
}
export const TYPE_SHORT: Record<ApiStaffRequest['type'], string> = { study: 'Справки', order: 'Приказы', leave: 'Отпуска', retake: 'Пересдачи' }
export const TYPE_DOT: Record<ApiStaffRequest['type'], string> = { study: '#dd723c', order: '#5aa469', leave: '#a45bb4', retake: '#5b7fd1' }

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
