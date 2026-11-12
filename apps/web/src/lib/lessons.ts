import type { Lesson } from '../types'
import { toMinutes } from './format'
import { moscowCivil, moscowTime, moscowYmd } from './useSchedule'
export const todayIndex=(now:Date)=>(moscowCivil(now).getDay()+6)%7
export const nowMinutes=(now:Date)=>toMinutes(moscowTime(now))
export function lessonsForDate(all:Lesson[],now:Date){return all.filter(l=>l.date===moscowYmd(now))}
export function todayLessons(all:Lesson[],now:Date){return lessonsForDate(all,now).sort((a,b)=>toMinutes(a.start)-toMinutes(b.start))}
export function nextLesson(all:Lesson[],now:Date){return todayLessons(all,now).find(l=>l.status!=='cancelled'&&toMinutes(l.start)>=nowMinutes(now))}
