import { useState } from 'react'
import type { Lesson } from '../types'
import { BASE_MONDAY } from '../data/mock'
import { nextLesson, NOW_MIN, TODAY_INDEX, todayLessons } from '../lib/lessons'
import { addDays, humanDuration, monthShort, pluralize, toMinutes, weekRange, WEEKDAYS, WEEKDAYS_SHORT } from '../lib/format'
import { Badge, ButtonLink, Segmented } from './ui'
import { useIndicator } from '../lib/useIndicator'
import { Garland, Ornaments, Snowflake, useNewYear } from './newyear'
import { Icon } from './Icon'

const kindTone = (k: Lesson['kind']) => (k === 'Лекция' ? 'accent' : 'neutral')

const subline = (l: Lesson, who: 'teacher' | 'group') => (who === 'teacher' ? l.teacher : `Группа ${l.group}`)

/* ── Hero «Следующее занятие» ──────────────────── */
export function NextLessonHero({ lessons, who, scheduleLink, compact }: { lessons: Lesson[]; who: 'teacher' | 'group'; scheduleLink?: string; compact?: boolean }) {
  const l = nextLesson(lessons)
  const ny = useNewYear()
  if (!l)
    return (
      <section className="hero">
        <div className="eyebrow">Сегодня</div>
        <div className="hero__time display">—</div>
        <div className="hero__title">Занятий больше нет</div>
      </section>
    )
  const until = toMinutes(l.start) - NOW_MIN
  return (
    <section className={`hero ${compact ? 'hero--compact' : ''} ${ny ? 'hero--ny' : ''}`} aria-label="Следующее занятие">
      {ny && (
        <>
          <Garland className="hero__garland" spacing={compact ? 70 : 64} />
          {!compact && <Ornaments />}
          <Snowflake size={compact ? 84 : 104} className="hero__flake" />
        </>
      )}
      <div className="eyebrow">{compact ? `Через ${humanDuration(until)}` : `Следующее занятие · через ${humanDuration(until)}`}</div>
      <div className="hero__time display">{l.start}</div>
      <div className="hero__title">{l.subject}</div>
      <div className="hero__meta">
        {l.kind} · {who === 'group' ? `группа ${l.group} · ${l.room}` : `${l.room} · ${l.teacher}`}
      </div>
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
  const list = todayLessons(lessons)
  const next = nextLesson(lessons)
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
          const past = toMinutes(l.end) <= NOW_MIN
          const ongoing = !past && toMinutes(l.start) <= NOW_MIN
          const isNext = next?.id === l.id
          return (
            <li key={l.id} className={`timeline__row ${past || ongoing ? 'is-past' : ''} ${isNext ? 'is-next' : ''}`}>
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
                </div>
                <div className="timeline__meta">
                  {subline(l, who)} · {l.room}
                  {past ? ' · прошло' : ongoing ? ' · идёт сейчас' : ''}
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
function LessonCard({ l, who }: { l: Lesson; who: 'teacher' | 'group' }) {
  return (
    <article className={`lesson ${l.status ? `lesson--${l.status}` : ''}`}>
      <div className="lesson__time">
        {l.start} – {l.end}
      </div>
      <div className={`lesson__title ${l.status === 'cancelled' ? 'strike' : ''}`}>{l.subject}</div>
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
    </article>
  )
}

export function WeekSchedule({ lessons, who }: { lessons: Lesson[]; who: 'teacher' | 'group' }) {
  const [week, setWeek] = useState(0)
  const [mode, setMode] = useState<'day' | 'week'>(() => (window.matchMedia?.('(max-width: 760px)').matches ? 'day' : 'week'))
  const [day, setDay] = useState(TODAY_INDEX)
  const monday = addDays(BASE_MONDAY, week * 7)
  const dayInd = useIndicator<HTMLDivElement>(`${day}-${mode}`)

  // Переносы и отмены есть только на текущей неделе — на остальных показываем базовое расписание.
  const weekLessons = week === 0 ? lessons : lessons.map((l) => ({ ...l, status: undefined, movedFrom: undefined }))
  const byDay = WEEKDAYS.map((_, i) => weekLessons.filter((l) => l.day === i).sort((a, b) => toMinutes(a.start) - toMinutes(b.start)))
  const visibleDays = mode === 'week' ? WEEKDAYS.map((_, i) => i) : [day]

  return (
    <>
      <div className="sched-toolbar">
        <div className="week-nav">
          <button type="button" className="week-nav__btn" aria-label="Предыдущая неделя" onClick={() => setWeek((w) => w - 1)}>
            <Icon name="chevronLeft" />
          </button>
          <span className="week-nav__label">{weekRange(monday)}</span>
          <button type="button" className="week-nav__btn" aria-label="Следующая неделя" onClick={() => setWeek((w) => w + 1)}>
            <Icon name="chevronRight" />
          </button>
        </div>
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
              <button key={d} role="tab" aria-selected={day === i} type="button" className={`day-picker__btn ${day === i ? 'is-active' : ''} ${week === 0 && i === TODAY_INDEX ? 'is-today' : ''}`} onClick={() => setDay(i)}>
                <span>{d}</span>
                <b>{date.getDate()}</b>
              </button>
            )
          })}
        </div>
      )}

      <div className={`week ${mode === 'day' ? 'week--day' : ''}`}>
        {visibleDays.map((i) => {
          const date = addDays(monday, i)
          const isToday = week === 0 && i === TODAY_INDEX
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
                <LessonCard key={l.id} l={l} who={who} />
              ))}
            </section>
          )
        })}
      </div>
    </>
  )
}
