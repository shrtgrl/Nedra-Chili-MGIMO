import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/data'
import { DISCIPLINES_AUTUMN, DISCIPLINES_SPRING } from '../../data/mock'
import { average, gradeLabel } from '../../lib/format'
import { Badge, Button, Disclaimer, IconButton, PageHeader, Ring, ScoreBar, Segmented, ThemeButton } from '../../components/ui'

export function GradesPage() {
  const { unreadCount } = useData()
  const navigate = useNavigate()
  const [term, setTerm] = useState<'autumn' | 'spring'>('autumn')
  const list = term === 'autumn' ? DISCIPLINES_AUTUMN : DISCIPLINES_SPRING
  const avg = average(list.map((d) => d.score))
  const admitted = list.filter((d) => d.score >= 50).length
  const exams = list.filter((d) => d.form === 'Экзамен').length
  const credits = list.length - exams
  const weakest = [...list].sort((a, b) => a.score - b.score)[0]

  return (
    <>
      <PageHeader
        eyebrow={term === 'autumn' ? 'Осенний семестр 2026' : 'Весенний семестр 2026'}
        title="Успеваемость"
        actions={
          <>
            <ThemeButton />
            <IconButton icon="bell" label="Уведомления" to="/student/notifications" dot={unreadCount > 0} />
          </>
        }
      />
      <div className="grid-side">
        <section className="card">
          <div className="card__head">
            <h2 className="card__title card__title--lg">Дисциплины</h2>
            <Segmented
              label="Семестр"
              value={term}
              onChange={setTerm}
              options={[
                { value: 'autumn', label: 'Осень' },
                { value: 'spring', label: 'Весна' },
              ]}
            />
          </div>
          <div className="table-wrap">
            <table className="table grades-table">
              <thead>
                <tr>
                  <th>Дисциплина</th>
                  <th>Форма</th>
                  <th colSpan={2}>Баллы</th>
                  <th className="ta-r">Оценка</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => {
                  const g = gradeLabel(d.score, d.form)
                  const warn = d.id === weakest.id
                  return (
                    <tr key={d.id}>
                      <td className="strong">{d.name}</td>
                      <td className="muted">{d.form}</td>
                      <td className="grades-table__bar">
                        <ScoreBar value={d.score} warn={warn} />
                      </td>
                      <td className="num">{d.score}</td>
                      <td className="ta-r">
                        <Badge tone={g === 'Зачтено' || g === '5' ? 'hl' : g === '2' || g === 'Не зачтено' ? 'danger' : 'neutral'}>{g}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="stack">
          <section className="card card--accent">
            <div className="avg-card">
              <Ring value={avg} size={136} stroke={13} onAccent />
              <div>
                <h2 className="card__title card__title--lg">Средний балл</h2>
                <p className="small on-accent-2">Для допуска к сессии нужно не менее 50 баллов по каждой дисциплине.</p>
              </div>
            </div>
            <div className="tiles">
              <div className="tile">
                <b className="display tile__value tile__value--hl">
                  {admitted}/{list.length}
                </b>
                <span>допуск</span>
              </div>
              <div className="tile">
                <b className="display tile__value">{exams}</b>
                <span>экзамена</span>
              </div>
              <div className="tile">
                <b className="display tile__value">{credits}</b>
                <span>зачёта</span>
              </div>
            </div>
          </section>

          <section className="card card--hl">
            <h2 className="card__title card__title--lg">Обратите внимание</h2>
            <p>
              «{weakest.name}» — {weakest.score} баллов: {weakest.score >= 50 ? (weakest.form === 'Зачёт' ? 'зачёт есть' : 'допуск есть') : 'допуска пока нет'}, но это самый низкий результат семестра.
              {term === 'autumn' && ' Эссе — 20 ноября 2026 года.'}
            </p>
          </section>

          <section className="card">
            <h2 className="card__title card__title--lg">Баллы отображаются неверно?</h2>
            <p className="muted">Создайте заявку — деканат проверит данные в течение 3 рабочих дней.</p>
            <Button variant="surface" icon="file" onClick={() => navigate('/student/requests')}>
              Создать заявку
            </Button>
          </section>
        </div>
      </div>
      <Disclaimer />
    </>
  )
}
