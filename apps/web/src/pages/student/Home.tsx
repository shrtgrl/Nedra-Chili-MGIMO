import { Link } from 'react-router-dom'
import { useUser } from '../../context/auth'
import { useData } from '../../context/data'
import { ANNOUNCEMENTS, DEADLINES, DISCIPLINES_AUTUMN, REQUEST_STAGES, REQUEST_TYPES, STUDENT_LESSONS } from '../../data/mock'
import { useNow } from '../../context/clock'
import { average, daysLeftLabel, eyebrowDate } from '../../lib/format'
import { NextLessonHero, TodayTimeline } from '../../components/schedule'
import { todayLessons } from '../../lib/lessons'
import { Search } from '../../components/Search'
import { Badge, ButtonLink, Disclaimer, IconButton, PageHeader, Ring, Stages, NewYearButton, ThemeButton } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { Countdown, useNewYear } from '../../components/newyear'

const daysUntil = (iso: string, now: Date) => {
  const d = new Date(iso)
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

export function StudentHome() {
  const now = useNow()
  const user = useUser()
  const ny = useNewYear()
  const { requests, unreadCount } = useData()
  const avg = average(DISCIPLINES_AUTUMN.map((d) => d.score))
  const weakest = [...DISCIPLINES_AUTUMN].sort((a, b) => a.score - b.score)[0]
  const inWork = requests.filter((r) => r.stage < 2).length
  const todayList = todayLessons(STUDENT_LESSONS, now).filter((l) => l.status !== 'cancelled')
  const todayCount = todayList.length
  const lastEnd = todayList.at(-1)?.end
  const working = requests.filter((r) => r.stage < 2)
  const workTitle = working.length ? working.map((r) => REQUEST_TYPES[r.type]).join(', ') : null
  const upcomingDeadlines = DEADLINES.filter((d) => new Date(d.date).getTime() >= now.getTime())

  return (
    <>
      <PageHeader
        eyebrow={eyebrowDate(now)}
        title={
          ny ? (
            <>
              С наступающим, {user.firstName}!
              <Countdown />
            </>
          ) : (
            <>
              <span className="only-desktop">Добрый день, {user.firstName}</span>
              <span className="only-mobile">Привет, {user.firstName}</span>
            </>
          )
        }
        actions={
          <>
            <Search />
            <ThemeButton />
            <NewYearButton />
            <IconButton icon="bell" label="Уведомления" to="/student/notifications" dot={unreadCount > 0} />
          </>
        }
      />

      <div className="grid-home">
        <div className="stack">
          <div className="only-desktop">
            <NextLessonHero lessons={STUDENT_LESSONS} who="teacher" scheduleLink="/student/schedule" />
          </div>
          <div className="only-mobile">
            <NextLessonHero lessons={STUDENT_LESSONS} who="teacher" compact />
          </div>

          <section className="card card--hl status-card only-desktop">
            <Ring value={avg} size={108} />
            <div>
              <h2 className="card__title">Как у меня дела</h2>
              <p className="small">
                Хороший темп. Подтяните «{weakest.name}» — <b>{weakest.score}</b> баллов, это самый низкий результат.
              </p>
              <Link to="/student/grades" className="link">
                Все предметы <Icon name="arrowRight" size={14} />
              </Link>
            </div>
          </section>

          <div className="stats stats--2 only-desktop">
            <Link to="/student/schedule" className="stat stat--row">
              <span className="stat__icon">
                <Icon name="calendar" size={22} />
              </span>
              <span className="stat__body">
                <span className="stat__label">Занятий сегодня</span>
                <span className="stat__value display">{todayCount}</span>
                <span className="stat__hint">{lastEnd ? `последнее до ${lastEnd}` : 'сегодня свободно'}</span>
              </span>
              <Icon name="arrowRight" size={20} className="stat__arrow" />
            </Link>
            <Link to="/student/requests" className="stat stat--row">
              <span className="stat__icon">
                <Icon name="doc" size={22} />
              </span>
              <span className="stat__body">
                <span className="stat__label">Заявок в работе</span>
                <span className="stat__value display">{inWork}</span>
                <span className="stat__hint">{workTitle ?? 'всё готово'}</span>
              </span>
              <Icon name="arrowRight" size={20} className="stat__arrow" />
            </Link>
          </div>

          <div className="stats stats--2 only-mobile">
            <div className="stat stat--hl stat--ring">
              <span className="stat__label">Средний балл</span>
              <Ring value={avg} size={84} stroke={9} />
              <Link to="/student/grades" className="link">
                Все предметы <Icon name="arrowRight" size={14} />
              </Link>
            </div>
            <Link to="/student/notifications" className="stat">
              <span className="stat__label">Дедлайн</span>
              <b className="stat__text">{upcomingDeadlines[0]?.title ?? 'Ближайших нет'}</b>
              {upcomingDeadlines[0] && <span className="stat__danger">{upcomingDeadlines[0].dateLabel} 2026</span>}
            </Link>
          </div>

          <TodayTimeline lessons={STUDENT_LESSONS} who="teacher" />
        </div>

        <div className="stack">
          <section className="card">
            <h2 className="card__title">Ближайшие дедлайны</h2>
            <ul className="list">
              {upcomingDeadlines.length === 0 && <li className="small muted">Ближайших дедлайнов нет.</li>}
              {upcomingDeadlines.map((d) => {
                const n = daysUntil(d.date, now)
                return (
                  <li key={d.id} className="list__row">
                    <div>
                      <b>{d.title}</b>
                      <span className="small muted">{d.dateLabel} 2026</span>
                    </div>
                    <Badge tone={n <= 1 ? 'danger' : n <= 3 ? 'warn' : 'neutral'}>{daysLeftLabel(n)}</Badge>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="card">
            <h2 className="card__title">Объявления деканата</h2>
            <ul className="announcements">
              {ANNOUNCEMENTS.map((a) => (
                <li key={a.id}>
                  <b>{a.title}</b>
                  <span className="small muted">{a.text}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <div className="card__head">
              <h2 className="card__title">Мои заявки</h2>
              <ButtonLink to="/student/requests" variant="primary" icon="plus" size="sm">
                Новая
              </ButtonLink>
            </div>
            {requests.length === 0 && <p className="muted small">Заявок пока нет.</p>}
            <div className="stack stack--sm">
              {requests.slice(0, 3).map((r) => (
                <Link to="/student/requests" key={r.id} className="mini-req">
                  <div className="mini-req__head">
                    <b>{REQUEST_TYPES[r.type]}</b>
                    <Badge tone={r.stage >= 2 ? 'ok' : 'neutral'}>{REQUEST_STAGES[r.stage]}</Badge>
                  </div>
                  {!r.teacher && <Stages stages={REQUEST_STAGES} current={r.stage} showLabels={false} />}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
      <Disclaimer />
    </>
  )
}
