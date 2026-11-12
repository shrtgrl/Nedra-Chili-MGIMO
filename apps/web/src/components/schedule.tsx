import { useEffect, useState } from 'react'
import type { Lesson } from '../types'
import { DEMO_WEEK_MONDAY } from '../data/mock'
import { nextLesson, nowMinutes, todayIndex, todayLessons } from '../lib/lessons'
import { useNow } from '../context/clock'
import { addDays, humanDuration, monthShort, pluralize, toMinutes, WEEKDAYS, WEEKDAYS_SHORT } from '../lib/format'
import { Badge, ButtonLink, Segmented } from './ui'
import { useIndicator } from '../lib/useIndicator'
import { Garland, Ornaments, Snowflake, useNewYear } from './newyear'
import { Icon } from './Icon'
import { FitText } from './FitText'
import { WeekPicker } from './WeekPicker'

const kindTone = (k: Lesson['kind']) => (k === 'Лекция' ? 'accent' : 'neutral')

const subline = (l: Lesson, who: 'teacher' | 'group') => (who === 'teacher' ? l.teacher : `Группа ${l.group}`)

/* ── Hero «Следующее занятие» ──────────────────── */
export function NextLessonHero({ lessons, who, scheduleLink, compact }: { lessons: Lesson[]; who: 'teacher' | 'group'; scheduleLink?: string; compact?: boolean }) {
  const now = useNow()
  const m = nowMinutes(now)
  // сначала — пара, которая идёт прямо сейчас, иначе — ближайшая следующая
  const current = todayLessons(lessons, now).find((x) => x.status !== 'cancelled' && toMinutes(x.start) <= m && m < toMinutes(x.end))
  const l = current ?? nextLesson(lessons, now)
  const ny = useNewYear()
  const decor = ny && (
    <>
      <Garland className="hero__garland" spacing={compact ? 70 : 64} />
      {!compact && <Ornaments />}
      <Snowflake size={compact ? 84 : 104} className="hero__flake" />
    </>
  )
  if (!l)
    return (
      <section className={`hero ${compact ? 'hero--compact' : ''} ${ny ? 'hero--ny' : ''}`}>
        {decor}
        <div className="eyebrow">Сегодня</div>
        <div className="hero__title hero__title--empty">Занятий больше нет</div>
        <div className="hero__meta">Расписание на неделю — в разделе «Расписание»</div>
      </section>
    )
  const left = toMinutes(l.end) - m
  const until = toMinutes(l.start) - m
  const progress = current ? (m - toMinutes(l.start)) / (toMinutes(l.end) - toMinutes(l.start)) : 0
  return (
    <section className={`hero ${compact ? 'hero--compact' : ''} ${ny ? 'hero--ny' : ''} ${current ? 'hero--now' : ''}`} aria-label={current ? 'Текущее занятие' : 'Следующее занятие'}>
      {decor}
      <div className="eyebrow">
        {current ? (
          <span className="hero__live">
            <span className="now-dot" aria-hidden="true" />
            Идёт сейчас · ещё {humanDuration(left)}
          </span>
        ) : compact ? (
          `Через ${humanDuration(until)}`
        ) : (
          `Следующее занятие · через ${humanDuration(until)}`
        )}
      </div>
      <FitText className="hero__subject display" max={58} min={24} lines={2}>{l.subject}</FitText>
      <div className="hero__when">
        <span className="hero__time display">{l.start}</span>
        <span className="hero__end">– {l.end}</span>
      </div>
      <div className="hero__meta">
        {l.kind} · {who === 'group' ? `группа ${l.group} · ${l.room}` : `${l.room} · ${l.teacher}`}
      </div>
      {current && (
        <span className="hero__progress" role="progressbar" aria-label="Прошло времени" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <span style={{ width: `${progress * 100}%` }} />
        </span>
      )}
      {l.status === 'moved' && (
        <span className="pill-warn">
          {!compact && <Icon name="alert" size={15} />}
          Перенос: было {l.movedFrom}
        </span>
      )}
      {scheduleLink && (
        <div className="hero__actions">
          <ButtonLink to={scheduleLink} variant="hl" icon="calendar" size="sm">
            Всё расписание
          </ButtonLink>
        </div>
      )}
    </section>
  )
}

/* ── «Сегодня» — таймлайн ──────────────────────── */
export function TodayTimeline({ lessons, who }: { lessons: Lesson[]; who: 'teacher' | 'group' }) {
  const now = useNow()
  const list = todayLessons(lessons, now)
  const next = nextLesson(lessons, now)
  const lastEnd = list.length ? list[list.length - 1].end : ''
  return (
    <section className="card">
      <div className="card__head">
        <h2 className="card__title">Сегодня</h2>
        <span className="small muted">
          {list.length} {pluralize(list.length, 'занятие', 'занятия', 'занятий')}
          {who === 'teacher' && lastEnd ? ` · до ${lastEnd}` : ''}
        </span>
      </div>
      {list.length === 0 && <p className="muted">Сегодня занятий нет.</p>}
      <ol className="timeline">
        {list.map((l) => {
          const past = toMinutes(l.end) <= nowMinutes(now)
          const ongoing = !past && l.status !== 'cancelled' && toMinutes(l.start) <= nowMinutes(now)
          const isNext = next?.id === l.id
          return (
            <li key={l.id} className={`timeline__row ${past ? 'is-past' : ''} ${ongoing ? 'is-now' : ''} ${isNext ? 'is-next' : ''}`} aria-current={ongoing ? 'time' : undefined}>
              <div className="timeline__time">
                <b>{l.start}</b>
                <span>{l.end}</span>
              </div>
              <span className="timeline__dot" aria-hidden="true" />
              <div className="timeline__body">
                <div className="timeline__title">
                  <span className={l.status === 'cancelled' ? 'strike' : ''}>{l.subject}</span>
                  <Badge tone={isNext ? 'accent' : kindTone(l.kind)}>{l.kind}</Badge>
                  {l.status === 'moved' && <Badge tone="warn">Перенос</Badge>}
                  {l.status === 'cancelled' && <Badge tone="danger">Отменено</Badge>}
                  {ongoing && (
                    <span className="now-badge">
                      <span className="now-dot" aria-hidden="true" />
                      Сейчас
                    </span>
                  )}
                </div>
                <div className="timeline__meta">
                  {subline(l, who)} · {l.room}
                  {past ? ' · прошло' : ongoing ? ` · ещё ${humanDuration(toMinutes(l.end) - nowMinutes(now))}` : ''}
                  {l.status === 'moved' ? ` · было ${l.movedFrom?.replace(' · ', ', ')}` : ''}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/* ── Недельное расписание ──────────────────────── */
/** Доля прошедшего времени для идущей сейчас пары, иначе undefined. */
function liveProgress(l: Lesson, now: Date) {
  if (l.status === 'cancelled') return undefined
  const m = nowMinutes(now)
  const s = toMinutes(l.start)
  const e = toMinutes(l.end)
  return m >= s && m < e ? (m - s) / (e - s) : undefined
}

function LessonCard({ l, who, progress }: { l: Lesson; who: 'teacher' | 'group'; progress?: number }) {
  const live = progress != null
  return (
    <article className={`lesson ${l.status ? `lesson--${l.status}` : ''} ${live ? 'lesson--now' : ''}`} aria-current={live ? 'time' : undefined}>
      {live && (
        <span className="now-badge">
          <span className="now-dot" aria-hidden="true" />
          Идёт сейчас
        </span>
      )}
      <div className="lesson__time">
        {l.start} – {l.end}
      </div>
      <FitText className={`lesson__title ${l.status === 'cancelled' ? 'strike' : ''}`} max={17} min={12} lines={2} grouped>{l.subject}</FitText>
      <div className="lesson__meta">
        {l.kind} · {l.room}
      </div>
      <div className="lesson__meta">{subline(l, who)}</div>
      {l.status === 'cancelled' && (
        <Badge tone="danger" outline>
          Отменено
        </Badge>
      )}
      {l.status === 'moved' && (
        <span className="lesson__moved">Перенос: было {l.movedFrom}</span>
      )}
      {live && (
        <span className="lesson__progress" role="progressbar" aria-label="Прошло времени" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <span style={{ width: `${progress * 100}%` }} />
        </span>
      )}
    </article>
  )
}

/* ── Недельная сетка: строки — пары, столбцы — дни ──────── */
const KIND_SHORT: Record<Lesson['kind'], string> = { Лекция: 'ЛК', Семинар: 'С', Практика: 'ПР' }
const KIND_CLASS: Record<Lesson['kind'], string> = { Лекция: 'lec', Семинар: 'sem', Практика: 'pra' }

function GridCell({ l, who, progress }: { l: Lesson; who: 'teacher' | 'group'; progress?: number }) {
  const live = progress != null
  return (
    <article className={`tt-lesson ${l.status ? `tt-lesson--${l.status}` : ''} ${live ? 'is-live' : ''}`} aria-current={live ? 'time' : undefined}>
      <span className={`tt-badge tt-k--${KIND_CLASS[l.kind]}`} title={l.kind} aria-label={l.kind}>{KIND_SHORT[l.kind]}</span>
      <div className={`tt-lesson__title ${l.status === 'cancelled' ? 'strike' : ''}`}>{l.subject}</div>
      <div className="tt-lesson__meta">{l.room}</div>
      <div className="tt-lesson__meta">{subline(l, who)}</div>
      {l.status === 'cancelled' && <span className="tt-tag tt-tag--danger">Отменено</span>}
      {l.status === 'moved' && <span className="tt-tag tt-tag--warn">Было {l.movedFrom}</span>}
      {live && (
        <>
          <span className="tt-tag tt-tag--live">
            <span className="now-dot" aria-hidden="true" />
            Идёт сейчас
          </span>
          <span className="tt-lesson__progress" role="progressbar" aria-label="Прошло времени" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <span style={{ width: `${progress * 100}%` }} />
          </span>
        </>
      )}
    </article>
  )
}

function WeekGrid({ byDay, monday, today, week, who, now }: { byDay: Lesson[][]; monday: Date; today: number; week: number; who: 'teacher' | 'group'; now: Date }) {
  const slots = new Map<string, string>()
  byDay.flat().forEach((l) => { if (!slots.has(l.start)) slots.set(l.start, l.end) })
  const rows = [...slots.entries()].sort((a, b) => toMinutes(a[0]) - toMinutes(b[0]))
  const m = nowMinutes(now)
  return (
    <div className="tt-wrap" data-fit-group>
      <table className="tt">
        <thead>
          <tr>
            <td className="tt__corner" />
            {WEEKDAYS.map((name, i) => {
              const date = addDays(monday, i)
              const isToday = week === 0 && i === today
              return (
                <th key={name} scope="col" className={`tt__day ${isToday ? 'is-today' : ''}`} aria-label={`${name}, ${date.getDate()} ${monthShort(date)}`}>
                  <span className="tt__dow">{WEEKDAYS_SHORT[i]}</span>
                  <b className="tt__num">{date.getDate()}</b>
                  <span className="tt__mon">{monthShort(date)}</span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="tt__empty" colSpan={7}>На этой неделе занятий нет</td>
            </tr>
          )}
          {rows.map(([start, end]) => {
            const rowNow = week === 0 && m >= toMinutes(start) && m < toMinutes(end)
            return (
              <tr key={start}>
                <th scope="row" className={`tt__time ${rowNow ? 'is-now' : ''}`}>
                  <b>{start}</b>
                  <span>{end}</span>
                </th>
                {WEEKDAYS.map((_, i) => {
                  const here = byDay[i].filter((l) => l.start === start)
                  const isToday = week === 0 && i === today
                  return (
                    <td key={i} className={`tt__cell ${isToday ? 'is-today' : ''}`}>
                      {here.length > 0 && (
                        <div className="tt__stack">
                          {here.map((l) => (
                            <GridCell key={l.id} l={l} who={who} progress={isToday ? liveProgress(l, now) : undefined} />
                          ))}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <ul className="tt-key" aria-label="Обозначения">
        <li><b className="tt-k--lec">ЛК</b> лекция</li>
        <li><b className="tt-k--sem">С</b> семинар</li>
        <li><b className="tt-k--pra">ПР</b> практика</li>
      </ul>
    </div>
  )
}

export function WeekSchedule({ lessons, who }: { lessons: Lesson[]; who: 'teacher' | 'group' }) {
  const now = useNow()
  const today = todayIndex(now)
  const currentMonday = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -today)
  const [week, setWeek] = useState(0)
  const [mode, setMode] = useState<'day' | 'week'>(() => (window.matchMedia?.('(max-width: 760px)').matches ? 'day' : 'week'))
  const [day, setDay] = useState(today)
  useEffect(() => { if (week === 0) setDay(today) }, [today, week])
  const monday = addDays(currentMonday, week * 7)
  const dayInd = useIndicator<HTMLDivElement>(`${day}-${mode}`)

  // Переносы и отмены есть только на текущей неделе — на остальных показываем базовое расписание.
  const weekLessons = monday.getTime() === DEMO_WEEK_MONDAY.getTime() ? lessons : lessons.map((l) => ({ ...l, status: undefined, movedFrom: undefined }))
  const byDay = WEEKDAYS.map((_, i) => weekLessons.filter((l) => l.day === i).sort((a, b) => toMinutes(a.start) - toMinutes(b.start)))
  const visibleDays = [day]

  return (
    <>
      <div className="sched-toolbar">
        <WeekPicker
          monday={monday}
          today={now}
          onPrev={() => setWeek((w) => w - 1)}
          onNext={() => setWeek((w) => w + 1)}
          onPick={(mon, weekday) => {
            setWeek(Math.round((mon.getTime() - currentMonday.getTime()) / (7 * 86_400_000)))
            setDay(weekday)
          }}
        />
        <div className="legend" aria-hidden="true">
          <span className="legend__item legend__item--warn">Перенос</span>
          <span className="legend__item legend__item--danger">Отмена</span>
        </div>
        <Segmented
          label="Режим"
          soft
          value={mode}
          onChange={setMode}
          options={[
            { value: 'day', label: 'День' },
            { value: 'week', label: 'Неделя' },
          ]}
        />
      </div>

      {mode === 'day' && (
        <div ref={dayInd.box} className="day-picker" role="tablist" aria-label="День недели">
          <span ref={dayInd.ind} className="day-picker__ind" aria-hidden="true" />
          {WEEKDAYS_SHORT.map((d, i) => {
            const date = addDays(monday, i)
            return (
              <button key={d} role="tab" aria-selected={day === i} type="button" className={`day-picker__btn ${day === i ? 'is-active' : ''} ${week === 0 && i === today ? 'is-today' : ''}`} onClick={() => setDay(i)}>
                <span>{d}</span>
                <b>{date.getDate()}</b>
              </button>
            )
          })}
        </div>
      )}

      {mode === 'week' ? (
        <WeekGrid byDay={byDay} monday={monday} today={today} week={week} who={who} now={now} />
      ) : (
      <div className={`week ${mode === 'day' ? 'week--day' : ''}`} data-fit-group>
        {visibleDays.map((i) => {
          const date = addDays(monday, i)
          const isToday = week === 0 && i === today
          return (
            <section key={i} className={`week__col ${isToday ? 'is-today' : ''}`} aria-label={WEEKDAYS[i]}>
              <header className="week__head">
                <h2>{WEEKDAYS[i]}</h2>
                <span className={isToday ? 'week__date is-today' : 'week__date'}>
                  {date.getDate()} {monthShort(date)}
                </span>
              </header>
              {byDay[i].length === 0 && <p className="week__empty">Занятий нет</p>}
              {byDay[i].map((l) => (
                <LessonCard key={l.id} l={l} who={who} progress={isToday ? liveProgress(l, now) : undefined} />
              ))}
            </section>
          )
        })}
      </div>
      )}
    </>
  )
}
