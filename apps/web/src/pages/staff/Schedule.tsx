import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError, staffApi, type ApiGroup, type ApiLesson, type ApiLessonKind, type LessonInput } from '../../lib/api'
import { addDays, eyebrowDate, monthShort, WEEKDAYS } from '../../lib/format'
import { KIND_LABEL } from '../../lib/staff'
import { useNow } from '../../context/clock'
import { useToast } from '../../context/toast'
import { Badge, Button, Disclaimer, PageHeader, Segmented, ThemeButton } from '../../components/ui'
import { WeekPicker } from '../../components/WeekPicker'
import { Icon } from '../../components/Icon'

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const mondayOf = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7))
const errText = (e: unknown) => (e instanceof ApiError ? e.message : 'Что-то пошло не так. Попробуйте ещё раз.')

/* ───────────── Поиск группы ───────────── */
function GroupSearch({ selected, onPick }: { selected?: ApiGroup; onPick: (g: ApiGroup) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ApiGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    let live = true
    setLoading(true)
    const t = window.setTimeout(() => {
      staffApi.groups(q.trim()).then((g) => { if (live) { setItems(g); setFailed(null); setActive(0) } })
        .catch((e) => { if (live) setFailed(errText(e)) })
        .finally(() => { if (live) setLoading(false) })
    }, 200)
    return () => { live = false; window.clearTimeout(t) }
  }, [q, open])

  const choose = (g: ApiGroup) => { onPick(g); setQ(''); setOpen(false) }
  return (
    <div className="group-search">
      <label className="search search--group">
        <Icon name="search" size={17} className="search__icon" />
        <input
          className="search__input" role="combobox" aria-expanded={open} aria-controls={listId} aria-label="Поиск группы"
          placeholder={selected ? `Группа ${selected.name} — найти другую` : 'Найти группу: название, направление или факультет'}
          value={q} autoComplete="off"
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
            else if (e.key === 'Enter' && items[active]) { e.preventDefault(); choose(items[active]) }
            else if (e.key === 'Escape') setOpen(false)
          }}
        />
      </label>
      {open && (
        <ul className="search__list group-search__list" id={listId} role="listbox">
          {failed && <li className="search__empty">{failed}</li>}
          {!failed && !loading && items.length === 0 && <li className="search__empty">Группа не найдена</li>}
          {!failed && loading && items.length === 0 && <li className="search__empty">Ищем…</li>}
          {items.map((g, i) => (
            <li key={g.id} role="option" aria-selected={i === active}>
              <button type="button" className={`search__hit ${i === active ? 'is-active' : ''}`} onMouseDown={() => choose(g)}>
                <b>{g.name}</b>
                <span>{g.program} · {g.year} курс</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ───────────── Форма занятия ───────────── */
interface Draft { id?: string; subject: string; kind: ApiLessonKind; teacherName: string; room: string; date: string; from: string; to: string; changeNote: string }

function LessonDialog({ draft, subjects, onClose, onSave }: { draft: Draft; subjects: string[]; onClose: () => void; onSave: (d: Draft) => Promise<string | null> }) {
  const [d, setD] = useState(draft)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const first = useRef<HTMLInputElement>(null)
  const listId = useId()
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  useEffect(() => {
    first.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!d.subject.trim() || !d.teacherName.trim() || !d.room.trim()) return setError('Заполните предмет, преподавателя и аудиторию')
    if (!d.date || !d.from || !d.to) return setError('Укажите дату и время занятия')
    if (d.to <= d.from) return setError('Окончание должно быть позже начала')
    setBusy(true)
    const err = await onSave(d)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="lesson-dialog-title" onSubmit={submit} noValidate>
        <div className="dialog__head">
          <h2 id="lesson-dialog-title" className="card__title card__title--lg">{d.id ? 'Изменить занятие' : 'Новое занятие'}</h2>
          <button type="button" className="icon-btn icon-btn--sm" aria-label="Закрыть" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <label className="field">
          <span className="field__label">Предмет</span>
          <input ref={first} className="input" list={listId} value={d.subject} maxLength={120} onChange={(e) => set('subject', e.target.value)} />
          <datalist id={listId}>{subjects.map((s) => <option key={s} value={s} />)}</datalist>
        </label>
        <div className="field">
          <span className="field__label">Вид занятия</span>
          <Segmented soft label="Вид занятия" value={d.kind} onChange={(v) => set('kind', v)} options={(Object.keys(KIND_LABEL) as ApiLessonKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
        </div>
        <div className="dialog__grid">
          <label className="field"><span className="field__label">Дата</span><input className="input" type="date" value={d.date} onChange={(e) => set('date', e.target.value)} /></label>
          <label className="field"><span className="field__label">Начало</span><input className="input" type="time" value={d.from} onChange={(e) => set('from', e.target.value)} /></label>
          <label className="field"><span className="field__label">Конец</span><input className="input" type="time" value={d.to} onChange={(e) => set('to', e.target.value)} /></label>
        </div>
        <div className="dialog__grid dialog__grid--2">
          <label className="field"><span className="field__label">Преподаватель</span><input className="input" value={d.teacherName} maxLength={120} placeholder="Орлов А. В." onChange={(e) => set('teacherName', e.target.value)} /></label>
          <label className="field"><span className="field__label">Аудитория</span><input className="input" value={d.room} maxLength={40} placeholder="ауд. 305" onChange={(e) => set('room', e.target.value)} /></label>
        </div>
        <label className="field">
          <span className="field__label">Пометка для студентов (необязательно)</span>
          <input className="input" value={d.changeNote} maxLength={300} placeholder="Например: перенос с 09:00" onChange={(e) => set('changeNote', e.target.value)} />
        </label>
        {error && <p className="form-error" role="alert"><Icon name="alert" size={16} /> {error}</p>}
        <p className="small muted">Студенты группы получат уведомление об изменении.</p>
        <div className="dialog__actions">
          <Button type="button" variant="surface" onClick={onClose}>Отмена</Button>
          <Button type="submit" variant="strong" icon="check" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</Button>
        </div>
      </form>
    </div>
  )
}

/* ───────────── Страница ───────────── */
const DEFAULT_SUBJECTS = ['Макроэкономика', 'Английский язык', 'Теория вероятностей', 'История России', 'Основы вайб-кодинга', 'Проектирование интерфейсов']

export function StaffSchedulePage() {
  const now = useNow()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const groupId = params.get('group')
  const [group, setGroup] = useState<ApiGroup | undefined>()
  const [lessons, setLessons] = useState<ApiLesson[]>([])
  const [week, setWeek] = useState(() => mondayOf(new Date()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Draft | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [recent, setRecent] = useState<ApiGroup[]>([])

  const today = startOfDay(now)
  const load = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    try {
      const res = await staffApi.lessons(groupId, week, addDays(week, 7))
      setGroup(res.group)
      setLessons(res.lessons)
      setError(null)
    } catch (e) {
      setError(errText(e))
    } finally {
      setLoading(false)
    }
  }, [groupId, week])
  useEffect(() => { void load() }, [load])

  // пока группа не выбрана — показываем несколько групп, чтобы можно было начать без ввода
  useEffect(() => { if (!groupId) staffApi.groups('').then((g) => setRecent(g.slice(0, 8))).catch(() => setRecent([])) }, [groupId])

  const subjects = useMemo(() => [...new Set([...lessons.map((l) => l.subject), ...DEFAULT_SUBJECTS])], [lessons])
  const days = useMemo(() => {
    const hasSunday = lessons.some((l) => new Date(l.startsAt).getDay() === 0)
    return Array.from({ length: hasSunday ? 7 : 6 }, (_, i) => addDays(week, i))
  }, [lessons, week])
  const byDay = (d: Date) => lessons.filter((l) => ymd(new Date(l.startsAt)) === ymd(d)).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))

  const toInput = (d: Draft): LessonInput => ({
    subject: d.subject.trim(), kind: d.kind, teacherName: d.teacherName.trim(), room: d.room.trim(),
    startsAt: new Date(`${d.date}T${d.from}`).toISOString(), endsAt: new Date(`${d.date}T${d.to}`).toISOString(),
    changeNote: d.changeNote.trim() || null,
  })
  const save = async (d: Draft) => {
    if (!group) return 'Группа не выбрана'
    try {
      if (d.id) await staffApi.updateLesson(d.id, toInput(d))
      else await staffApi.addLesson(group.id, toInput(d))
      setDialog(null)
      toast(d.id ? 'Занятие обновлено' : 'Занятие добавлено')
      await load()
      return null
    } catch (e) {
      return errText(e)
    }
  }
  const remove = async (l: ApiLesson) => {
    try {
      await staffApi.deleteLesson(l.id)
      setConfirmId(null)
      toast('Занятие удалено')
      await load()
    } catch (e) {
      toast(errText(e))
    }
  }
  const blank = (date: Date): Draft => ({ subject: '', kind: 'lecture', teacherName: '', room: '', date: ymd(date), from: '09:00', to: '10:30', changeNote: '' })
  const edit = (l: ApiLesson): Draft => ({ id: l.id, subject: l.subject, kind: l.kind, teacherName: l.teacherName, room: l.room, date: ymd(new Date(l.startsAt)), from: hhmm(l.startsAt), to: hhmm(l.endsAt), changeNote: l.changeNote ?? '' })
  const pickGroup = (g: ApiGroup) => { setGroup(g); setLessons([]); setParams({ group: g.id }, { replace: true }) }

  return (
    <>
      <PageHeader eyebrow={eyebrowDate(now, false)} title="Расписание групп" actions={<ThemeButton />} />
      <GroupSearch selected={group} onPick={pickGroup} />

      {!groupId && (
        <section className="card staff-empty">
          <h2 className="card__title card__title--lg">Выберите группу</h2>
          <p className="muted">Введите название группы, направление или факультет — и откроется её расписание, которое можно изменять.</p>
          {recent.length > 0 && (
            <ul className="group-grid">
              {recent.map((g) => (
                <li key={g.id}>
                  <button type="button" className="group-card" onClick={() => pickGroup(g)}>
                    <b>{g.name}</b>
                    <span className="small muted">{g.program} · {g.year} курс</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {groupId && (
        <>
          <div className="sched-toolbar staff-toolbar">
            <WeekPicker
              monday={week} today={now}
              onPrev={() => setWeek((w) => addDays(w, -7))} onNext={() => setWeek((w) => addDays(w, 7))}
              onPick={(mon) => setWeek(mon)}
            />
            <div className="staff-toolbar__group">
              {group && <Badge tone="hl">{group.name}</Badge>}
              {group && <span className="small muted">{group.program} · {group.year} курс</span>}
            </div>
            <Button variant="strong" icon="plus" onClick={() => setDialog(blank(ymd(today) >= ymd(week) && ymd(today) < ymd(addDays(week, 6)) ? today : week))}>Добавить занятие</Button>
          </div>

          {error && <p className="form-error" role="alert"><Icon name="alert" size={16} /> {error} <button type="button" className="link-btn" onClick={() => void load()}>Повторить</button></p>}

          <div className={`week week--staff ${loading ? 'is-loading' : ''}`} aria-busy={loading}>
            {days.map((date) => {
              const list = byDay(date)
              const isToday = ymd(date) === ymd(today)
              return (
                <section key={ymd(date)} className={`week__col ${isToday ? 'is-today' : ''}`} aria-label={WEEKDAYS[(date.getDay() + 6) % 7]}>
                  <header className="week__head">
                    <h2>{WEEKDAYS[(date.getDay() + 6) % 7] ?? 'Воскресенье'}</h2>
                    <span className={isToday ? 'week__date is-today' : 'week__date'}>{date.getDate()} {monthShort(date)}</span>
                  </header>
                  {list.length === 0 && <p className="week__empty">Занятий нет</p>}
                  {list.map((l) => (
                    <article key={l.id} className={`lesson lesson--edit ${l.changeNote ? 'lesson--moved' : ''}`}>
                      <div className="lesson__time">{hhmm(l.startsAt)} – {hhmm(l.endsAt)}</div>
                      <div className="lesson__title">{l.subject}</div>
                      <div className="lesson__meta">{KIND_LABEL[l.kind as ApiLessonKind]} · {l.room}</div>
                      <div className="lesson__meta">{l.teacherName}</div>
                      {l.changeNote && <span className="lesson__moved">{l.changeNote}</span>}
                      <div className="lesson__tools">
                        <button type="button" className="tool-btn" onClick={() => setDialog(edit(l))}>Изменить</button>
                        {confirmId === l.id ? (
                          <>
                            <button type="button" className="tool-btn tool-btn--danger" onClick={() => void remove(l)}>Удалить?</button>
                            <button type="button" className="tool-btn" onClick={() => setConfirmId(null)}>Нет</button>
                          </>
                        ) : (
                          <button type="button" className="tool-btn tool-btn--danger" onClick={() => setConfirmId(l.id)}>Удалить</button>
                        )}
                      </div>
                    </article>
                  ))}
                  <button type="button" className="week__add" onClick={() => setDialog(blank(date))}><Icon name="plus" size={15} /> Добавить</button>
                </section>
              )
            })}
          </div>
        </>
      )}
      {dialog && <LessonDialog draft={dialog} subjects={subjects} onClose={() => setDialog(null)} onSave={save} />}
      <Disclaimer />
    </>
  )
}
