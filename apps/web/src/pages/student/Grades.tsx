import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/data'
import { average, gradeLabel } from '../../lib/format'
import { SubjectMaterials, openSubject } from './SubjectMaterials'
import { useMaterials } from '../../context/materials'
import { Badge, Button, Disclaimer, IconButton, PageHeader, Ring, ScoreBar, Segmented, ThemeButton } from '../../components/ui'

export function GradesPage() {
  const { unreadCount, grades } = useData()
  const navigate = useNavigate()
  const { forMe } = useMaterials()
  const [selectedTerm,setTerm]=useState('')
  const semesters=[...new Set(grades.map(g=>g.semester))].sort((a,b)=>b-a)
  const term=selectedTerm||String(semesters[0]??1)
  const all=grades.filter(g=>String(g.semester)===term)
  const list=all.filter((g):g is typeof g & {score:number}=>g.score!==null)
  const subjectCell = (name: string) => {
    const n = forMe.filter((m) => m.subject === name).length
    return n > 0 ? (
      <a className="subject-link" href="#materials" title="К материалам по предмету" onClick={(e) => { e.preventDefault(); openSubject(name) }}>
        {name}
        <span className="subject-link__n">{n}</span>
      </a>
    ) : (
      name
    )
  }
  const avg = average(list.map((d) => d.score))
  const admitted = list.filter((d) => d.score >= 50).length
  const exams = all.filter((d) => d.form === 'Экзамен').length
  const credits = all.length - exams
  const weakest = [...list].sort((a, b) => a.score - b.score)[0]

  return (
    <>
      <PageHeader
        eyebrow={`Семестр ${term}`}
        title="Предметы"
        actions={
          <>
            <ThemeButton />
            <IconButton icon="bell" label="Уведомления" to="/student/notifications" dot={unreadCount > 0} />
          </>
        }
      />
      <div className="grid-side">
        <div className="stack">
        <section className="card">
          <div className="card__head">
            <h2 className="card__title card__title--lg">Дисциплины</h2>
            <Segmented
              label="Семестр"
              value={term}
              onChange={setTerm}
              options={semesters.map(s=>({value:String(s),label:`Семестр ${s}`}))}
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
                {all.length===0 && <tr><td colSpan={5}>Дисциплин пока нет.</td></tr>}
                {all.filter(g=>g.score===null).map(g=><tr key={g.id}><td className="strong">{subjectCell(g.name)}</td><td>{g.form}</td><td colSpan={3}>Балл не выставлен</td></tr>)}
                {list.map((d) => {
                  const g = gradeLabel(d.score, d.form)
                  const warn = d.id === weakest?.id
                  return (
                    <tr key={d.id}>
                      <td className="strong">
                        {subjectCell(d.name)}
                      </td>
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
        <SubjectMaterials subjects={[...new Set(grades.map((g) => g.name))]} />
        </div>

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
                  {admitted}/{all.length}
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

          {weakest && <section className="card card--hl">
            <h2 className="card__title card__title--lg">Обратите внимание</h2>
            <p>
              «{weakest.name}» — {weakest.score} баллов: {weakest.score >= 50 ? (weakest.form === 'Зачёт' ? 'зачёт есть' : 'допуск есть') : 'допуска пока нет'}, но это самый низкий результат семестра.
            </p>
          </section>}

          <section className="card">
            <h2 className="card__title card__title--lg">Баллы отображаются неверно?</h2>
            <p className="muted">Обратитесь к преподавателю дисциплины.</p>
            <Button variant="surface" icon="file" onClick={() => navigate('/student/inquiries')}>
              Написать преподавателю
            </Button>
          </section>
        </div>
      </div>
      <Disclaimer />
    </>
  )
}
