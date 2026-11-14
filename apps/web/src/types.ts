export type Role = 'student' | 'teacher' | 'staff'
export type Theme = 'light' | 'dark'
export type Variant = 'fog' | 'graphite' | 'newyear'

export interface User {
  id: string
  role: Role
  email: string
  firstName: string
  lastName: string
  patronymic?: string
  initials: string
  group?: string
  department: string
  title: string // «Студентка · группа ИМО-21»
}

export type LessonKind = 'Лекция' | 'Семинар' | 'Практика'

export interface Lesson {
  id: string
  date?: string // дата МСК YYYY-MM-DD
  day: number // 0 = понедельник … 5 = суббота
  start: string // «10:45»
  end: string
  subject: string
  kind: LessonKind
  room: string // «ауд. 305» или «спортзал»
  teacher?: string
  group?: string
  status?: 'moved' | 'cancelled'
  movedFrom?: string // «09:00 · ауд. 112»
}

export type ExamForm = 'Экзамен' | 'Зачёт'

import type { RequestTypeId } from './data/mock'
export type RequestType = RequestTypeId
export type RequestStage = 0 | 1 | 2 | 3 // Принята, В работе, Готова, Выдана
export type Delivery = 'pdf' | 'office'

export interface StudentRequest {
  id: string
  type: RequestType
  purpose: string
  comment: string
  delivery: Delivery
  createdLabel: string
  status: 'submitted'|'in_progress'|'ready'|'issued'|'cancelled'|'rejected'
  rejectionReason?: string | null
  stage: RequestStage
}

export type NoticeIcon = 'alert' | 'calendar' | 'doc' | 'bell' | 'inbox'

export interface Notice {
  id: string
  icon: NoticeIcon
  title: string
  text: string
  time: string
  unread: boolean
  accent?: boolean
  /** тип события — для перехода к нужному разделу */
  kind?: string
}

export interface NotifyPrefs {
  deadlines: boolean
  schedule: boolean
  news: boolean
}

export type InquiryStatus = 'new' | 'progress' | 'closed'

export interface Inquiry {
  id: string
  student: string
  initials: string
  group: string
  subject: string
  message: string
  status: InquiryStatus
  replies: string[]
  assignmentId?: string
}

export interface SheetStudent {
  id: string
  name: string
  score: number | null
}

export interface GradeSheet {
  version: number
  semester: number
  deadline?: string | null
  id: string
  subject: string
  group: string
  form: ExamForm
  deadlineLabel: string
  students: SheetStudent[]
}
