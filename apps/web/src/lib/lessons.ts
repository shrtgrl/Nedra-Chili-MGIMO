import type { Lesson } from '../types'
import { DEMO_NOW } from '../data/mock'
import { toMinutes } from './format'

export const TODAY_INDEX = (DEMO_NOW.getDay() + 6) % 7 // 0 = пн
export const NOW_MIN = DEMO_NOW.getHours() * 60 + DEMO_NOW.getMinutes()

export function todayLessons(all: Lesson[]) {
  return all.filter((l) => l.day === TODAY_INDEX).sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
}

export function nextLesson(all: Lesson[]) {
  return todayLessons(all).find((l) => l.status !== 'cancelled' && toMinutes(l.start) >= NOW_MIN)
}

