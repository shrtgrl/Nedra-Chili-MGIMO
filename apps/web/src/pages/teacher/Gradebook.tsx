import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData } from '../../context/data'
import { useToast } from '../../context/toast'
import { markFor, pluralize } from '../../lib/format'
import type { GradeSheet } from '../../types'
import { Badge, Button, Disclaimer, PageHeader, ThemeButton } from '../../components/ui'
import { Icon } from '../../components/Icon'

export function GradebookPage() {
  const { sheets } = useData()
  const [params] = useSearchParams()
  const activeId = params.get('id') ?? sheets[0].id
  const source = sheets.find((s) => s.id === activeId) ?? sheets[0]
  // key сбрасывает черновик при переключении ведомости
  return <SheetEditor key={source.id} source={source} />
}

function SheetEditor({ source }: { source: GradeSheet }) {
  const { sheets, saveSheet, inquiries } = useData()
  const toast = useToast()
  const [, setParams] = useSearchParams()

  // Черновик: значения полей как строки, чтобы можно было стирать и вводить.
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(source.students.map((s) => [s.id, s.score == null ? '' : String(s.score)])),
  )

  const parsed = useMemo(() => {
    const out: Record<string, number | null | 'bad'> = {}
    for (const st of source.students) {
      const raw = (draft[st.id] ?? '').trim()
      if (raw === '') out[st.id] = null
      else {
        const n = Number(raw)
        out[st.id] = Number.isInteger(n) && n >= 0 && n <= 100 ? n : 'bad'
      }
    }
    return out
  }, [draft, source])

  const filled = Object.values(parsed).filter((v) => typeof v === 'number').length
  const hasErrors = Object.values(parsed).includes('bad')
  const dirty = source.students.some((s) => (parsed[s.id] === 'bad' ? true : parsed[s.id] !== s.score))
  const total = source.students.length
  const waiting = inquiries.filter((q) => q.status === 'new')

  const save = () => {
    if (hasErrors) {
      toast('Исправьте баллы: допустимы целые числа от 0 до 100')
      return
    }
    const next: GradeSheet = { ...source, students: source.students.map((s) => ({ ...s, score: parsed[s.id] as number | null })) }
    saveSheet(next)
    toast('Ведомость сохранена')
  }

  return (
    <>
      <PageHeader
        eyebrow={`Открыта до ${source.deadlineLabel}`}
        title="Ведомость"
        actions={
          <>
            <ThemeButton />
            <Button variant="primary" icon="check" onClick={save} disabled={!dirty}>
              Сохранить
            </Button>
          </>
        }
      />

      <div className="sheet-tabs" role="tablist" aria-label="Ведомости">
        {sheets.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={s.id === source.id} className={`sheet-tab ${s.id === source.id ? 'is-active' : ''}`} onClick={() => setParams({ id: s.id })}>
            <b>{s.subject}</b>
            <span>
              {s.group} · {s.form.toLowerCase()}
            </span>
          </button>
        ))}
      </div>

      <div className="grid-side">
        <section className="card">
          <div className="card__head">
            <h2 className="card__title card__title--lg">
              {source.subject} · группа {source.group}
            </h2>
            <span className="small muted">
              Заполнено {filled} из {total}
            </span>
          </div>
          <div className="table-wrap">
            <table className="table sheet-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Студент</th>
                  <th>Баллы</th>
                  <th className="ta-r">
                    Оценка ·<br />
                    {source.form.toLowerCase()}
                  </th>
                </tr>
              </thead>
              <tbody>
                {source.students.map((st, i) => {
                  const v = parsed[st.id]
                  const mark = typeof v === 'number' ? markFor(v) : null
                  return (
                    <tr key={st.id}>
                      <td className="muted">{i + 1}</td>
                      <td>{st.name}</td>
                      <td>
                        <input
                          className={`input score-input ${v === 'bad' ? 'is-invalid' : ''}`}
                          inputMode="numeric"
                          placeholder="0–100"
                          aria-label={`Баллы: ${st.name}`}
                          aria-invalid={v === 'bad'}
                          value={draft[st.id] ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, [st.id]: e.target.value.replace(/[^\d]/g, '').slice(0, 3) }))}
                        />
                      </td>
                      <td className="ta-r">
                        {mark == null ? (
                          <span className="muted">–</span>
                        ) : source.form === 'Зачёт' ? (
                          <Badge tone={mark >= 3 ? 'hl' : 'danger'}>{mark >= 3 ? 'Зачтено' : 'Не зачтено'}</Badge>
                        ) : (
                          <Badge tone={mark === 5 ? 'hl' : mark === 2 ? 'danger' : 'neutral'}>{mark}</Badge>
                        )}
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
            <h2 className="card__title card__title--lg">Прогресс</h2>
            <p className="progress-num">
              <b className="display">{filled}</b> из {total} {pluralize(total, 'студента', 'студентов', 'студентов')}
            </p>
            <div className="progress-line">
              <span style={{ width: `${(filled / total) * 100}%` }} />
            </div>
            <p className="small on-accent-2">Шкала: менее 50 — «2», 50–69 — «3», 70–84 — «4», от 85 — «5».</p>
          </section>

          <section className="card">
            <h2 className="card__title card__title--lg">Обращения студентов</h2>
            <p className="muted">
              {waiting.length
                ? `${waiting.length} ${pluralize(waiting.length, 'новое ждёт', 'новых ждут', 'новых ждут')} ответа: ${waiting.map((q) => q.student).join(', ')}.`
                : 'Новых обращений нет.'}
            </p>
            <Link to="/teacher/inquiries" className="link">
              Открыть обращения <Icon name="arrowRight" size={14} />
            </Link>
          </section>
        </div>
      </div>
      <Disclaimer />
    </>
  )
}
