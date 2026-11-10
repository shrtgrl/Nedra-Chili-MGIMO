import type { ApiLessonKind } from './api'

/** Разбор CSV (запятая, точка с запятой или табуляция; кавычки; BOM; Excel-кодировка windows-1251). */
export function decodeCsv(buf: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '')
  } catch {
    return new TextDecoder('windows-1251').decode(buf)
  }
}

export function parseCsv(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] ?? ''
  const delim = [';', '\t', ','].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0]
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === delim) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((x) => x.trim())) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim())) rows.push(row)
  return rows.map((r) => r.map((x) => x.trim()))
}

export interface CsvLesson {
  line: number
  date: string // yyyy-mm-dd
  from: string
  to: string
  subject: string
  kind: ApiLessonKind
  teacherName: string
  room: string
  changeNote: string
  error?: string
}

const COLUMNS = ['date', 'from', 'to', 'subject', 'kind', 'teacherName', 'room', 'changeNote'] as const
type Col = (typeof COLUMNS)[number]
const HEADER_NAMES: Record<Col, string[]> = {
  date: ['дата', 'date', 'день'],
  from: ['начало', 'start', 'from', 'с'],
  to: ['конец', 'окончание', 'end', 'to', 'по'],
  subject: ['предмет', 'дисциплина', 'subject'],
  kind: ['вид', 'тип', 'kind', 'type'],
  teacherName: ['преподаватель', 'препод', 'teacher'],
  room: ['аудитория', 'ауд', 'room'],
  changeNote: ['пометка', 'комментарий', 'note', 'примечание'],
}

export const CSV_TEMPLATE =
  '﻿дата;начало;конец;предмет;вид;преподаватель;аудитория;пометка\r\n' +
  '16.11.2026;09:00;10:30;Макроэкономика;лекция;Орлов А. В.;ауд. 214;\r\n' +
  '16.11.2026;10:45;12:15;Английский язык;практика;Белова Е. Н.;ауд. 108;Перенос с 09:00\r\n'

const pad = (n: number) => String(n).padStart(2, '0')
function parseDate(s: string): string | null {
  let y: number, m: number, d: number
  let mt = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})$/)
  if (mt) { d = +mt[1]; m = +mt[2]; y = +mt[3]; if (y < 100) y += 2000 }
  else if ((mt = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) { y = +mt[1]; m = +mt[2]; d = +mt[3] }
  else return null
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null
}
function parseTime(s: string): string | null {
  const mt = s.match(/^(\d{1,2})[:.](\d{2})$/)
  return mt && +mt[1] < 24 && +mt[2] < 60 ? `${pad(+mt[1])}:${mt[2]}` : null
}
function parseKind(s: string): ApiLessonKind | null {
  const v = s.toLowerCase()
  if (!v) return 'lecture'
  if (/^(лек|lect)/.test(v)) return 'lecture'
  if (/^(сем|semi)/.test(v)) return 'seminar'
  if (/^(прак|prac)/.test(v)) return 'practice'
  return null
}

/** Строки CSV → занятия с проверкой каждой строки. Заголовок необязателен: без него порядок колонок как в шаблоне. */
export function toLessons(rows: string[][]): { lessons: CsvLesson[]; header: boolean } {
  const lower = (rows[0] ?? []).map((x) => x.toLowerCase())
  const found = new Map<Col, number>()
  for (const col of COLUMNS) {
    const i = lower.findIndex((h) => HEADER_NAMES[col].includes(h))
    if (i >= 0) found.set(col, i)
  }
  const header = found.size >= 3
  const index = (col: Col) => (header ? found.get(col) ?? -1 : COLUMNS.indexOf(col))
  const get = (r: string[], col: Col) => (index(col) >= 0 ? r[index(col)] ?? '' : '')
  const body = header ? rows.slice(1) : rows
  const lessons = body.map((r, n): CsvLesson => {
    const date = parseDate(get(r, 'date'))
    const from = parseTime(get(r, 'from'))
    const to = parseTime(get(r, 'to'))
    const kind = parseKind(get(r, 'kind'))
    const subject = get(r, 'subject'), teacherName = get(r, 'teacherName'), room = get(r, 'room'), changeNote = get(r, 'changeNote')
    const error =
      !date ? 'неверная дата (нужно дд.мм.гггг)'
      : !from || !to ? 'неверное время (нужно чч:мм)'
      : to <= from ? 'конец раньше начала'
      : !subject ? 'не указан предмет'
      : subject.length > 120 ? 'предмет длиннее 120 символов'
      : !kind ? 'вид: лекция, семинар или практика'
      : !teacherName ? 'не указан преподаватель'
      : !room ? 'не указана аудитория'
      : teacherName.length > 120 || room.length > 40 || changeNote.length > 300 ? 'слишком длинное значение'
      : undefined
    return { line: n + 1 + (header ? 1 : 0), date: date ?? '', from: from ?? get(r, 'from'), to: to ?? get(r, 'to'), subject, kind: kind ?? 'lecture', teacherName, room, changeNote, error }
  })
  return { lessons, header }
}
