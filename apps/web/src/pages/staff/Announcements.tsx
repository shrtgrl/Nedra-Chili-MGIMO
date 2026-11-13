import { useEffect, useState, type FormEvent } from 'react'
import { dataApi, staffApi, type ApiAnnouncement, type ApiGroup } from '../../lib/api'
import { Button, PageHeader, ThemeButton } from '../../components/ui'

export function StaffAnnouncementsPage() {
  const [groups, setGroups] = useState<ApiGroup[]>([])
  const [rows, setRows] = useState<ApiAnnouncement[]>([])
  const [groupId, setGroupId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const reload = async () => setRows(await dataApi.announcements())
  useEffect(() => {
    void Promise.all([staffApi.groups(''), dataApi.announcements()]).then(([g, a]) => { setGroups(g); setRows(a) })
      .catch(e => setError(e instanceof Error ? e.message : 'Не удалось загрузить объявления'))
  }, [])
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) { setError('Заполните заголовок и текст'); return }
    setBusy(true); setError('')
    try {
      await dataApi.addAnnouncement(title.trim(), body.trim(), groupId || null)
      await reload(); setTitle(''); setBody('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось опубликовать объявление') }
    finally { setBusy(false) }
  }
  const remove = async (id: string) => {
    setBusy(true); setError('')
    try { await dataApi.deleteAnnouncement(id); await reload() }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось удалить объявление') }
    finally { setBusy(false) }
  }
  return <>
    <PageHeader eyebrow="Деканат" title="Объявления" actions={<ThemeButton />} />
    <div className="grid-half">
      <form className="card stack" onSubmit={e => void submit(e)}>
        <h2 className="card__title card__title--lg">Новое объявление</h2>
        <label className="field">Кому
          <select className="input" value={groupId} onChange={e => setGroupId(e.target.value)}>
            <option value="">Всем студентам</option>
            {groups.map(g => <option value={g.id} key={g.id}>{g.name}</option>)}
          </select>
        </label>
        <label className="field">Заголовок<input className="input" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} /></label>
        <label className="field">Текст<textarea className="input textarea" value={body} maxLength={2000} onChange={e => setBody(e.target.value)} /></label>
        {error && <p role="alert" className="form-error">{error}</p>}
        <Button type="submit" disabled={busy}>Опубликовать</Button>
      </form>
      <section className="card">
        <h2 className="card__title card__title--lg">Опубликованные объявления</h2>
        {!rows.length && <p className="muted small">Объявлений пока нет.</p>}
        <ul className="list">{rows.map(row => <li key={row.id} className="list__row">
          <div><b>{row.title}</b><span className="small muted">{row.groupName ?? 'Всем студентам'} · {new Date(row.createdAt).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' })}</span><p>{row.body}</p></div>
          <Button type="button" disabled={busy} onClick={() => void remove(row.id)}>Удалить</Button>
        </li>)}</ul>
      </section>
    </div>
  </>
}
