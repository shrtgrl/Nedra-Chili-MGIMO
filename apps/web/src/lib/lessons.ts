import type { Lesson } from '../types'
import { toMinutes } from './format'
import { DEMO_WEEK_MONDAY } from '../data/mock'

export const todayIndex = (now: Date) => (now.getDay() + 6) % 7 // 0 = пн
export const nowMinutes = (now: Date) => now.getHours() * 60 + now.getMinutes()

export function lessonsForDate(all: Lesson[], now: Date) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - todayIndex(now))
  return monday.getTime() === DEMO_WEEK_MONDAY.getTime()
    ? all
    : all.map((lesson) => ({ ...lesson, status: undefined, movedFrom: undefined }))
}

export function todayLessons(all: Lesson[], now: Date) {
  return lessonsForDate(all, now).filter((l) => l.day === todayIndex(now)).sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
}

export function nextLesson(all: Lesson[], now: Date) {
  return todayLessons(all, now).find((l) => l.status !== 'cancelled' && toMinutes(l.start) >= nowMinutes(now))
}

