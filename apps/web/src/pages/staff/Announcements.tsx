import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { dataApi, staffApi, type ApiAnnouncement, type ApiGroup } from '../../lib/api'
import { load, remove as removeKey, save } from '../../lib/storage'
import { Button, PageHeader, ThemeButton } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { STOCK_COVERS, coverSrc, photoToCover } from '../../lib/covers'

interface Draft {
  audience: 'all' | 'group'
  groupId: string
  title: string
  body: string
  /** `stock:<id>`, загруженное фото (data-URL) или без обложки. */
  cover: string | null
}
const EMPTY: Draft = { audience: 'all', groupId: '', title: '', body: '', cover: null }
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const MONTHS_PREP = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре']

/** Дата и месяц по Москве, чтобы подписи не зависели от часового пояса браузера. */
const moscow = (iso: string) => {
  const p = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(new Date(iso))
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value)
  return { day: get('day'), month: get('month') - 1, year: get('year') }
}

export function StaffAnnouncementsPage() {
  const [groups, setGroups] = useState<ApiGroup[]>([])
  const [rows, setRows] = useState<ApiAnnouncement[]>([])
  const [form, setForm] = useState<Draft>(EMPTY)
  const [draft, setDraft] = useState<Draft | null>(() => { const d = load<Draft | null>('announcement-draft', null); return d ? { ...EMPTY, ...d } : null })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const reload = async () => setRows(await dataApi.announcements())
  useEffect(() => {
    void Promise.all([staffApi.groups(''), dataApi.announcements()])
      .then(([g, a]) => { setGroups(g); setRows(a) })
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить объявления'))
  }, [])

  const fileRef = useRef<HTMLInputElement>(null)
  const [coverBusy, setCoverBusy] = useState(false)
  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCoverBusy(true); setError('')
    try { set({ cover: await photoToCover(file) }) }
    catch (err) { setError(err instanceof Error ? err.message : 'Не удалось добавить фото') }
    finally { setCoverBusy(false) }
  }
  const isPhoto = !!form.cover && !form.cover.startsWith('stock:')

  const set = (patch: Partial<Draft>) => setForm((f) => ({ ...f, ...patch }))
  const groupName = (id: string) => groups.find((g) => g.id === id)?.name
  const hint = form.audience === 'all' ? 'Получат все студенты' : form.groupId ? `Получат студенты группы ${groupName(form.groupId) ?? ''}` : 'Выберите группу'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.audience === 'group' && !form.groupId) { setError('Выберите группу'); return }
    if (!form.title.trim() || !form.body.trim()) { setError('Заполните заголовок и текст'); return }
    setBusy(true); setError('')
    try {
      await dataApi.addAnnouncement(form.title.trim(), form.body.trim(), form.audience === 'group' ? form.groupId : null, form.cover)
      await reload(); setForm(EMPTY)
    } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось опубликовать объявление') }
    finally { setBusy(false) }
  }
  const saveDraft = () => {
    if (!form.title.trim() && !form.body.trim()) { setError('Нечего сохранять: заполните заголовок или текст'); return }
    setError(''); save('announcement-draft', form); setDraft(form); setForm(EMPTY)
  }
  const continueDraft = () => {
    if (!draft) return
    setForm(draft); removeKey('announcement-draft'); setDraft(null)
  }
  const del = async (id: string) => {
    setBusy(true); setError('')
    try { await dataApi.deleteAnnouncement(id); setConfirmId(null); await reload() }
    catch (err) { setError(err instanceof Error ? err.message : 'Не удалось удалить объявление') }
    finally { setBusy(false) }
  }

  const nowM = moscow(new Date().toISOString())
  const thisMonth = rows.filter((r) => { const d = moscow(r.createdAt); return d.month === nowM.month && d.year === nowM.year }).length

  return (
    <>
      <PageHeader eyebrow="Деканат" title="Объявления" actions={<ThemeButton />} />
      <div className="ann">
        <form className="ann__form" onSubmit={(e) => void submit(e)} noValidate>
          <h2 className="ann__h">Новое объявление</h2>

          <div className="ann__field">
            <span className="ann__label" id="ann-to">Кому</span>
            <div className="ann__chips" role="radiogroup" aria-labelledby="ann-to">
              {([['all', 'Всем студентам'], ['group', 'Группе']] as const).map(([v, label]) => (
                <button key={v} type="button" role="radio" aria-checked={form.audience === v} className={`ann-chip ${form.audience === v ? 'is-active' : ''}`} onClick={() => set({ audience: v })}>
                  {label}
                </button>
              ))}
            </div>
            {form.audience === 'group' && (
              <select className="input" aria-label="Группа" value={form.groupId} onChange={(e) => set({ groupId: e.target.value })}>
                <option value="">Выберите группу</option>
                {groups.map((g) => <option value={g.id} key={g.id}>{g.name}</option>)}
              </select>
            )}
            <p className="ann__hint">{hint}</p>
          </div>

          <label className="ann__field">
            <span className="ann__label">Заголовок</span>
            <input className="input" value={form.title} maxLength={200} placeholder="Перенос занятий 20 ноября" onChange={(e) => set({ title: e.target.value })} />
          </label>
          <label className="ann__field">
            <span className="ann__label">Текст</span>
            <textarea className="input textarea ann__text" value={form.body} maxLength={2000} placeholder="Что изменилось, с какого числа и что нужно сделать" onChange={(e) => set({ body: e.target.value })} />
          </label>

          <div className="ann__field" role="group" aria-labelledby="ann-cover">
            <span className="ann__label" id="ann-cover">Обложка</span>
            <div className="cover-grid">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="cover-grid__file" tabIndex={-1} aria-hidden="true" onChange={(e) => void pickFile(e)} />
              {isPhoto ? (
                <div className="cover-tile is-active cover-tile--photo">
                  <img src={coverSrc(form.cover) ?? ''} alt="Ваше фото" />
                  <span className="cover-tile__check" aria-hidden="true"><Icon name="check" size={16} /></span>
                  <button type="button" className="cover-tile__act" onClick={() => fileRef.current?.click()} disabled={coverBusy}>Заменить</button>
                </div>
              ) : (
                <button type="button" className="cover-tile cover-tile--upload" onClick={() => fileRef.current?.click()} disabled={coverBusy}>
                  <Icon name="upload" size={22} />
                  <span>{coverBusy ? 'Загружаем…' : 'Своё фото'}</span>
                </button>
              )}
              {STOCK_COVERS.map((c) => {
                const v = `stock:${c.id}`
                const on = form.cover === v
                return (
                  <button key={c.id} type="button" className={`cover-tile ${on ? 'is-active' : ''}`} aria-pressed={on} onClick={() => set({ cover: on ? null : v })}>
                    <img src={c.src} alt="" loading="lazy" />
                    <span className="cover-tile__check" aria-hidden="true"><Icon name="check" size={16} /></span>
                    <span className="sr-only">{c.label}</span>
                  </button>
                )
              })}
            </div>
            <p className="ann__hint">
              {form.cover ? 'Нажмите на выбранную обложку ещё раз, чтобы убрать её. ' : 'Без обложки покажем стандартную картинку. '}
              Своё фото уменьшим до 1200 px.
              {isPhoto && <> <button type="button" className="link-btn" onClick={() => set({ cover: null })}>Убрать фото</button></>}
            </p>
          </div>

          {error && <p role="alert" className="form-error">{error}</p>}
          <div className="ann__actions">
            <Button type="button" variant="surface" onClick={saveDraft} disabled={busy}>Сохранить черновик</Button>
            <Button type="submit" variant="hl" icon="send" disabled={busy}>Опубликовать</Button>
          </div>
        </form>

        <section className="ann__list" aria-label="Опубликованные объявления">
          <div className="ann__list-head">
            <h2 className="ann__h">Опубликованные</h2>
            {thisMonth > 0 && <span className="small muted">{thisMonth} в {MONTHS_PREP[nowM.month]}</span>}
          </div>

          {draft && (
            <div className="ann__draft">
              <span>Черновик: «{draft.title.trim() || 'без заголовка'}»</span>
              <button type="button" className="link-btn" onClick={continueDraft}>Продолжить</button>
            </div>
          )}

          {!rows.length && <p className="muted">Опубликованных объявлений пока нет.</p>}
          <ol className="ann__timeline">
            {rows.map((row, i) => {
              const d = moscow(row.createdAt)
              return (
                <li key={row.id} className={`ann-item ${i === 0 ? 'is-latest' : ''}`}>
                  <div className="ann-item__meta">
                    <time dateTime={row.createdAt}><b>{d.day}</b> {MONTHS_GEN[d.month]}</time>
                    <span className="ann-item__to">{row.groupName ? `группе ${row.groupName}` : 'всем студентам'}</span>
                  </div>
                  {coverSrc(row.cover) && <img className="ann-item__thumb" src={coverSrc(row.cover) ?? ''} alt="" loading="lazy" width="1200" height="630" />}
                  <h3 className="ann-item__title">{row.title}</h3>
                  <p className="ann-item__body">{row.body}</p>
                  <div className="ann-item__foot">
                    {confirmId === row.id ? (
                      <>
                        <span className="small">Удалить объявление?</span>
                        <button type="button" className="link-btn ann-item__danger" disabled={busy} onClick={() => void del(row.id)}>Да, удалить</button>
                        <button type="button" className="link-btn" onClick={() => setConfirmId(null)}>Отмена</button>
                      </>
                    ) : (
                      <button type="button" className="link-btn" onClick={() => setConfirmId(row.id)}>Удалить</button>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      </div>
    </>
  )
}
