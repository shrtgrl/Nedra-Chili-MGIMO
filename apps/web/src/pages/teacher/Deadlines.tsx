import { useEffect, useState, type FormEvent } from 'react'
import { dataApi, type ApiAssignment, type ApiDeadline } from '../../lib/api'
import { Button, PageHeader, ThemeButton } from '../../components/ui'

const dateLabel = (value: string) => new Date(value).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function TeacherDeadlinesPage() {
  const [assignments, setAssignments] = useState<ApiAssignment[]>([])
  const [rows, setRows] = useState<ApiDeadline[]>([])
  const [assignmentId, setAssignmentId] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const reload = async () => setRows(await dataApi.deadlines())
  useEffect(() => {
    void Promise.all([dataApi.assignments(), dataApi.deadlines()]).then(([a, d]) => { setAssignments(a); setRows(d) }).catch(e => setError(e instanceof Error ? e.message : 'Не удалось загрузить дедлайны'))
  }, [])
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!assignmentId || !title.trim() || !date) { setError('Укажите дисциплину, группу, название и срок'); return }
    setBusy(true); setError('')
    try {
      await dataApi.addDeadline(assignmentId, title.trim(), `${date}:00+03:00`)
      await reload(); setTitle(''); setDate('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось создать дедлайн') }
    finally { setBusy(false) }
  }
  const remove = async (id: string) => {
    setBusy(true); setError('')
    try { await dataApi.deleteDeadline(id); await reload() }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось удалить дедлайн') }
    finally { setBusy(false) }
  }
  return <>
    <PageHeader eyebrow="Учебные сроки" title="Дедлайны" actions={<ThemeButton />} />
    <div className="grid-half">
      <form className="card stack" onSubmit={e => void submit(e)}>
        <h2 className="card__title card__title--lg">Новый дедлайн</h2>
        <label className="field">Дисциплина и группа
          <select className="input" value={assignmentId} onChange={e => setAssignmentId(e.target.value)}>
            <option value="">Выберите назначение</option>
            {assignments.map(a => <option key={a.id} value={a.id}>{a.subject} · {a.group}</option>)}
          </select>
        </label>
        <label className="field">Название задания<input className="input" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} placeholder="Например, сдать эссе" /></label>
        <label className="field">Срок (МСК)<input className="input" type="datetime-local" value={date} onChange={e => setDate(e.target.value)} /></label>
        {error && <p role="alert" className="form-error">{error}</p>}
        <Button type="submit" disabled={busy || !assignments.length}>Опубликовать</Button>
      </form>
      <section className="card">
        <h2 className="card__title card__title--lg">Опубликованные сроки</h2>
        {!rows.length && <p className="muted small">Дедлайнов пока нет.</p>}
        <ul className="list">{rows.map(row => <li className="list__row" key={row.id}>
          <div><b>{row.title}</b><span className="small muted">{row.subject} · {row.group} · {dateLabel(row.dueAt)} МСК</span></div>
          <Button type="button" disabled={busy} onClick={() => void remove(row.id)}>Удалить</Button>
        </li>)}</ul>
      </section>
    </div>
  </>
}
