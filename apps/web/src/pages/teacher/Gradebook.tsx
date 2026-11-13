import { useNow } from '../../context/clock'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData } from '../../context/data'
import { useToast } from '../../context/toast'
import { markFor, pluralize } from '../../lib/format'
import type { GradeSheet } from '../../types'
import { Badge, Button, Disclaimer, PageHeader, ThemeButton } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { Combo, type ComboOption } from '../../components/Combo'

export function GradebookPage() {
  const { sheets } = useData()
  const [params] = useSearchParams()
  const activeId = params.get('id') ?? sheets[0]?.id
  const source = sheets.find((s) => s.id === activeId) ?? sheets[0]
  if (!source) return <><PageHeader eyebrow="Личный кабинет" title="Ведомость"/><p className="card">Нет назначенных ведомостей.</p></>
  // key сбрасывает черновик при переключении ведомости
  return <SheetEditor key={source.id} source={source} />
}

function SheetEditor({ source }: { source: GradeSheet }) {
  const now = useNow()
  const { sheets, saveSheet, inquiries } = useData()
  const toast = useToast()
  const [, setParams] = useSearchParams()
  const sheetOptions: ComboOption[] = sheets.map((x) => ({ id: x.id, value: `${x.subject} · ${x.group} · ${x.form.toLowerCase()}` }))
  const [sheetText, setSheetText] = useState(() => sheetOptions.find((o) => o.id === source.id)?.value ?? '')

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

  const [busy,setBusy]=useState(false)
  const [baseVersion,setBaseVersion]=useState(source.version)
  const save = async () => {
    if (hasErrors) {
      toast('Исправьте баллы: допустимы целые числа от 0 до 100')
      return
    }
    const next: GradeSheet = { ...source, students: source.students.map((s) => ({ ...s, score: parsed[s.id] as number | null })) }
    setBusy(true)
    if(await saveSheet({...next,version:baseVersion})) {setBaseVersion(baseVersion+1);toast('Ведомость сохранена')}
    setBusy(false)
  }

  return (
    <>
      <PageHeader
        eyebrow={`Семестр ${source.semester} · ${source.deadline ? `До ${source.deadlineLabel}` : 'Срок не задан'}`}
        title="Ведомость"
        actions={
          <>
            <ThemeButton />
          </>
        }
      />

      {source.version!==baseVersion && <p role="alert">Данные ведомости изменились. <button className="link-btn" onClick={()=>{setDraft(Object.fromEntries(source.students.map(s=>[s.id,s.score===null?'':String(s.score)])));setBaseVersion(source.version)}}>Загрузить актуальные баллы (заменить черновик)</button></p>}
      {sheets.length > 1 && (
        <div className="sheet-pick">
          <Combo
            label="Ведомость"
            value={sheetText}
            onChange={setSheetText}
            onPick={(o) => o.id && setParams({ id: o.id })}
            options={sheetOptions}
            placeholder="Найдите предмет или группу"
            emptyText="Такой ведомости нет"
            invalid={!sheetOptions.some((o) => o.value === sheetText)}
          />
        </div>
      )}

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
                          disabled={busy}
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
          <div className="sheet-foot">
            <Button variant="primary" icon="check" onClick={save} disabled={!dirty || busy || !!(source.deadline && new Date(source.deadline)<now)}>
              Сохранить
            </Button>
          </div>
        </section>

        <div className="stack">
          <section className="card card--accent">
            <h2 className="card__title card__title--lg">Прогресс</h2>
            <p className="progress-num">
              <b className="display">{filled}</b> из {total} {pluralize(total, 'студента', 'студентов', 'студентов')}
            </p>
            <div className="progress-line">
              <span style={{ width: `${(total ? filled / total : 0) * 100}%` }} />
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
