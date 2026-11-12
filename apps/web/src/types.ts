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

export interface Deadline {
  id: string
  title: string
  date: string // ISO
  dateLabel: string
}

export type ExamForm = 'Экзамен' | 'Зачёт'

export interface Discipline {
  id: string
  name: string
  form: ExamForm
  score: number
}

export type RequestType = 'study' | 'order' | 'leave' | 'retake' | 'inquiry'
export type RequestStage = 0 | 1 | 2 | 3 // Принята, В работе, Готова, Выдана
export type Delivery = 'pdf' | 'office'

export interface StudentRequest {
  id: string
  type: RequestType
  purpose: string
  comment: string
  delivery: Delivery
  createdLabel: string
  stage: RequestStage
  /** Если задан — это обращение к преподавателю (purpose — тема, comment — сообщение), а не заявка в деканат. */
  teacher?: string
}

export type NoticeIcon = 'alert' | 'calendar' | 'doc' | 'bell'

export interface Notice {
  id: string
  icon: NoticeIcon
  title: string
  text: string
  time: string
  unread: boolean
  accent?: boolean
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
}

export interface SheetStudent {
  id: string
  name: string
  score: number | null
}

export interface GradeSheet {
  id: string
  subject: string
  group: string
  form: ExamForm
  deadlineLabel: string
  students: SheetStudent[]
}

export interface MaterialLink {
  url: string
}
export interface MaterialFile {
  name: string
  size: number
  type: string
  /** Содержимое файла (data URL). В демо хранится в браузере; в боевой версии это будет ссылка на файл на сервере. */
  dataUrl: string
}
/** Учебный материал, который преподаватель рассылает группам. */
export interface Material {
  id: string
  subject: string
  title: string
  description: string
  groups: string[]
  authorId: string
  teacherName: string
  createdAt: string // ISO
  links: MaterialLink[]
  files: MaterialFile[]
}
