import { Link } from 'react-router-dom'
import { useUser } from '../../context/auth'
import { useData } from '../../context/data'
import { TEACHER_LESSONS } from '../../data/mock'
import { useNow } from '../../context/clock'
import { eyebrowDate } from '../../lib/format'
import { NextLessonHero, TodayTimeline } from '../../components/schedule'
import { Countdown, useNewYear } from '../../components/newyear'
import { Badge, ButtonLink, Disclaimer, IconButton, PageHeader, NewYearButton, ThemeButton } from '../../components/ui'

export function TeacherHome() {
  const now = useNow()
  const user = useUser()
  const ny = useNewYear()
  const { inquiries, newInquiries, sheets } = useData()
  const waiting = inquiries.filter((q) => q.status === 'new')

  return (
    <>
      <PageHeader
        eyebrow={eyebrowDate(now)}
        title={
          ny ? (
            <>
              С наступающим, {user.firstName} {user.patronymic}!
              <Countdown />
            </>
          ) : (
            `Добрый день, ${user.firstName} ${user.patronymic ?? ''}`.trim()
          )
        }
        actions={
          <>
            <ThemeButton />
            <NewYearButton />
            <IconButton icon="inbox" label="Обращения" to="/teacher/inquiries" dot={newInquiries > 0} />
          </>
        }
      />
      <div className="grid-home grid-home--teacher">
        <div className="stack">
          <NextLessonHero lessons={TEACHER_LESSONS} who="group" />
          <div className="quick-actions">
            <ButtonLink to="/teacher/gradebook" variant="primary" icon="table">
              Выставить оценки
            </ButtonLink>
            <ButtonLink to="/teacher/schedule" variant="surface" icon="calendar">
              Расписание на неделю
            </ButtonLink>
            <ButtonLink to="/teacher/materials" variant="surface" icon="send">
              Отправить материалы
            </ButtonLink>
          </div>
          <TodayTimeline lessons={TEACHER_LESSONS} who="group" />
        </div>

        <div className="stack">
          <section className="card card--hl">
            <div className="card__head card__head--top">
              <div>
                <h2 className="card__title card__title--lg">Обращения студентов</h2>
                <span className="small">ждут ответа</span>
              </div>
              <span className="display big-num">{waiting.length}</span>
            </div>
            <div className="stack stack--sm">
              {waiting.length === 0 && <p className="small">Все обращения разобраны 🎉</p>}
              {waiting.map((q) => (
                <Link key={q.id} to={`/teacher/inquiries?id=${q.id}`} className="hl-item">
                  <b>{q.subject}</b>
                  <span className="small">
                    {q.student} · {q.group}
                  </span>
                </Link>
              ))}
            </div>
            <ButtonLink to="/teacher/inquiries" variant="primary" iconRight="arrowRight">
              Открыть обращения
            </ButtonLink>
          </section>

          <section className="card">
            <h2 className="card__title card__title--lg">Ведомости</h2>
            <ul className="list">
              {sheets.map((s) => {
                const filled = s.students.filter((x) => x.score != null).length
                return (
                  <li key={s.id} className="list__row">
                    <Link to={`/teacher/gradebook?id=${s.id}`} className="list__link">
                      <b>
                        {s.subject} · {s.group}
                      </b>
                      <span className="small muted">
                        {s.form}
                        {s.id === 'sh1' ? ` · до ${s.deadlineLabel}` : ''}
                      </span>
                    </Link>
                    {filled === 0 ? (
                      <Badge>не начата</Badge>
                    ) : filled === s.students.length ? (
                      <Badge tone="ok">заполнена</Badge>
                    ) : (
                      <Badge tone="warn">
                        {filled} из {s.students.length}
                      </Badge>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </div>
      <Disclaimer />
    </>
  )
}
