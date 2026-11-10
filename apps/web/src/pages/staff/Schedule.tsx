import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError, staffApi, type ApiGroup, type ApiLesson, type ApiLessonKind, type LessonInput } from '../../lib/api'
import { addDays, eyebrowDate, monthShort, pluralize, WEEKDAYS } from '../../lib/format'
import { KIND_LABEL } from '../../lib/staff'
import { useNow } from '../../context/clock'
import { useToast } from '../../context/toast'
import { Badge, Button, Disclaimer, PageHeader, Segmented, ThemeButton } from '../../components/ui'
import { Combo, type ComboOption } from '../../components/Combo'
import { CsvImportDialog } from './CsvImport'
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
interface Draft {
  id?: string
  groupId: string
  groupName: string
  subject: string
  kind: ApiLessonKind
  teacherName: string
  room: string
  date: string
  from: string
  to: string
  changeNote: string
  repeat: boolean // новое занятие: повторять каждую неделю
  until: string // …до этой даты включительно
  following: boolean // изменение: применить и ко всем следующим повторениям
}
interface Sources { subjects: string[]; teachers: string[]; rooms: string[] }
type Progress = (done: number, total: number) => void

const MAX_WEEKS = 40
/** Конец семестра, до которого по умолчанию повторяется постоянное занятие. */
function semesterEnd(date: string) {
  const d = new Date(`${date}T12:00`)
  const y = d.getFullYear(), m = d.getMonth()
  const end = m >= 8 ? new Date(y, 11, 25) : m >= 1 && m <= 5 ? new Date(y, 5, 30) : addDays(d, 56)
  return ymd(end >= d ? end : addDays(d, 56))
}
function weeklyDates(date: string, until: string) {
  const out: string[] = []
  for (let d = new Date(`${date}T12:00`); ymd(d) <= until && out.length < MAX_WEEKS; d = addDays(d, 7)) out.push(ymd(d))
  return out
}

function GroupField({ draft, onPick, invalid }: { draft: Draft; onPick: (g: ApiGroup) => void; invalid: boolean }) {
  const [text, setText] = useState(draft.groupName)
  const [items, setItems] = useState<ApiGroup[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let live = true
    setLoading(true)
    const t = window.setTimeout(() => {
      staffApi.groups(text.trim()).then((g) => { if (live) setItems(g) }).catch(() => { if (live) setItems([]) }).finally(() => { if (live) setLoading(false) })
    }, 180)
    return () => { live = false; window.clearTimeout(t) }
  }, [text])
  const options: ComboOption[] = items.map((g) => ({ id: g.id, value: g.name, hint: `${g.program} · ${g.year} курс` }))
  return (
    <Combo
      label="Группа" value={text} invalid={invalid} loading={loading} options={options} maxLength={60} placeholder="Начните вводить название группы"
      emptyText="Такой группы нет"
      onChange={(v) => { setText(v); const exact = items.find((g) => g.name === v); if (exact) onPick(exact); else onPick({ id: '', name: v, faculty: '', program: '', year: 0 }) }}
      onPick={(o) => { const g = items.find((x) => x.id === o.id); if (g) onPick(g) }}
    />
  )
}

function LessonDialog({ draft, sources, onClose, onSave }: { draft: Draft; sources: Sources; onClose: () => void; onSave: (d: Draft, progress: Progress) => Promise<string | null> }) {
  const [d, setD] = useState(draft)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [untilTouched, setUntilTouched] = useState(false)
  const first = useRef<HTMLInputElement>(null)
  const isNew = !d.id
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const count = d.repeat ? weeklyDates(d.date, d.until).length : 1

  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => { first.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (isNew && !d.groupId) return setError('Выберите группу из списка')
    if (!d.subject.trim() || !d.teacherName.trim() || !d.room.trim()) return setError('Заполните предмет, преподавателя и аудиторию')
    if (!d.date || !d.from || !d.to) return setError('Укажите дату и время занятия')
    if (d.to <= d.from) return setError('Окончание должно быть позже начала')
    if (isNew && d.repeat && (!d.until || d.until < d.date)) return setError('Дата окончания повторов должна быть не раньше даты занятия')
    setBusy('Сохраняем…')
    const err = await onSave(d, (done, total) => total > 1 && setBusy(`Сохраняем ${done} из ${total}…`))
    setBusy(null)
    if (err) setError(err)
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="lesson-dialog-title" onSubmit={submit} noValidate>
        <div className="dialog__head">
          <h2 id="lesson-dialog-title" className="card__title card__title--lg">{d.id ? 'Изменить занятие' : 'Новое занятие'}</h2>
          <button type="button" className="icon-btn icon-btn--sm" aria-label="Закрыть" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        {isNew ? (
          <GroupField draft={draft} invalid={!d.groupId && !!error} onPick={(g) => setD((x) => ({ ...x, groupId: g.id, groupName: g.name }))} />
        ) : (
          <p className="small muted">Группа {d.groupName}</p>
        )}
        <Combo label="Предмет" inputRef={first} value={d.subject} maxLength={120} placeholder="Начните вводить название" options={sources.subjects.map((v) => ({ value: v }))} onChange={(v) => set('subject', v)} />
        <div className="field">
          <span className="field__label">Вид занятия</span>
          <Segmented soft label="Вид занятия" value={d.kind} onChange={(v) => set('kind', v)} options={(Object.keys(KIND_LABEL) as ApiLessonKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
        </div>
        <div className="dialog__grid">
          <label className="field">
            <span className="field__label">Дата</span>
            <input className="input" type="date" value={d.date} onChange={(e) => { set('date', e.target.value); if (!untilTouched && e.target.value) set('until', semesterEnd(e.target.value)) }} />
          </label>
          <label className="field"><span className="field__label">Начало</span><input className="input" type="time" value={d.from} onChange={(e) => set('from', e.target.value)} /></label>
          <label className="field"><span className="field__label">Конец</span><input className="input" type="time" value={d.to} onChange={(e) => set('to', e.target.value)} /></label>
        </div>
        <div className="dialog__grid dialog__grid--2">
          <Combo label="Преподаватель" value={d.teacherName} maxLength={120} placeholder="Орлов А. В." options={sources.teachers.map((v) => ({ value: v }))} onChange={(v) => set('teacherName', v)} />
          <Combo label="Аудитория" value={d.room} maxLength={40} placeholder="ауд. 305" options={sources.rooms.map((v) => ({ value: v }))} onChange={(v) => set('room', v)} />
        </div>
        <label className="field">
          <span className="field__label">Пометка для студентов (необязательно)</span>
          <input className="input" value={d.changeNote} maxLength={300} placeholder="Например: перенос с 09:00" onChange={(e) => set('changeNote', e.target.value)} />
        </label>

        {isNew ? (
          <div className="repeat-box">
            <label className="check">
              <input type="checkbox" checked={d.repeat} onChange={(e) => set('repeat', e.target.checked)} />
              <span className="check__box" aria-hidden="true"><Icon name="check" size={14} /></span>
              <span><b>Сделать постоянным</b><small>повторять каждую неделю в это же время</small></span>
            </label>
            <div className="repeat-box__until" data-open={d.repeat} inert={!d.repeat}>
              <div>
                <label className="field">
                  <span className="field__label">Повторять до</span>
                  <input className="input" type="date" value={d.until} min={d.date} onChange={(e) => { setUntilTouched(true); set('until', e.target.value) }} />
                </label>
                <p className="small muted">Будет создано {count} {pluralize(count, 'занятие', 'занятия', 'занятий')}{d.repeat && count >= MAX_WEEKS ? ` (не больше ${MAX_WEEKS})` : ''}. Если время уже занято, это занятие пропустим.</p>
              </div>
            </div>
          </div>
        ) : (
          <label className="check">
            <input type="checkbox" checked={d.following} onChange={(e) => set('following', e.target.checked)} />
            <span className="check__box" aria-hidden="true"><Icon name="check" size={14} /></span>
            <span><b>Применить ко всем следующим повторениям</b><small>такие же занятия группы в ближайшие месяцы (то же время, преподаватель и аудитория)</small></span>
          </label>
        )}

        {error && <p className="form-error" role="alert"><Icon name="alert" size={16} /> {error}</p>}
        <p className="small muted">Студенты группы получат уведомление об изменении.</p>
        <div className="dialog__actions">
          <Button type="button" variant="surface" onClick={onClose} disabled={!!busy}>Отмена</Button>
          <Button type="submit" variant="strong" icon="check" disabled={!!busy}>{busy ?? 'Сохранить'}</Button>
        </div>
      </form>
    </div>
  )
}

/* ───────────── Страница ───────────── */
const DEFAULT_SUBJECTS = ['Макроэкономика', 'Английский язык', 'Теория вероятностей', 'История России', 'Основы вайб-кодинга', 'Проектирование интерфейсов', 'Физическая культура']
const DEFAULT_TEACHERS = ['Орлов А. В.', 'Белова Е. Н.', 'Смирнов Д. А.', 'Громова Т. И.', 'Крылов П. С.', 'Дымов И. Р.']
const DEFAULT_ROOMS = ['ауд. 108', 'ауд. 117', 'ауд. 201', 'ауд. 203', 'ауд. 210', 'ауд. 214', 'ауд. 305', 'спортзал']
const uniq = (xs: string[]) => [...new Set(xs)]
const sortedBy = (xs: string[]) => [...xs].sort((a, b) => a.localeCompare(b, 'ru'))

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
  const [csv, setCsv] = useState(false)
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

  const sources = useMemo<Sources>(() => ({
    subjects: sortedBy(uniq([...lessons.map((l) => l.subject), ...DEFAULT_SUBJECTS])),
    teachers: sortedBy(uniq([...lessons.map((l) => l.teacherName), ...DEFAULT_TEACHERS])),
    rooms: sortedBy(uniq([...lessons.map((l) => l.room), ...DEFAULT_ROOMS])),
  }), [lessons])
  const days = useMemo(() => {
    const hasSunday = lessons.some((l) => new Date(l.startsAt).getDay() === 0)
    return Array.from({ length: hasSunday ? 7 : 6 }, (_, i) => addDays(week, i))
  }, [lessons, week])
  const byDay = (d: Date) => lessons.filter((l) => ymd(new Date(l.startsAt)) === ymd(d)).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))

  const toInput = (d: Draft, date = d.date): LessonInput => ({
    subject: d.subject.trim(), kind: d.kind, teacherName: d.teacherName.trim(), room: d.room.trim(),
    startsAt: new Date(`${date}T${d.from}`).toISOString(), endsAt: new Date(`${date}T${d.to}`).toISOString(),
    changeNote: d.changeNote.trim() || null,
  })

  /** Повторения занятия: те же предмет, вид, преподаватель, аудитория, день недели и время — от этого занятия и позже. */
  const findSeries = async (l: ApiLesson) => {
    const sameSlot = (x: ApiLesson) =>
      x.subject === l.subject && x.kind === l.kind && x.teacherName === l.teacherName && x.room === l.room &&
      new Date(x.startsAt).getDay() === new Date(l.startsAt).getDay() && hhmm(x.startsAt) === hhmm(l.startsAt) && hhmm(x.endsAt) === hhmm(l.endsAt)
    const found = new Map<string, ApiLesson>([[l.id, l]])
    let from = new Date(l.startsAt)
    for (let i = 0; i < 4; i++) { // окна по 60 дней, до ~8 месяцев вперёд
      const to = addDays(from, 60)
      const res = await staffApi.lessons(l.groupId, from, to)
      res.lessons.filter((x) => sameSlot(x) && new Date(x.startsAt) >= new Date(l.startsAt)).forEach((x) => found.set(x.id, x))
      from = to
    }
    return [...found.values()].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
  }

  const save = async (d: Draft, progress: Progress) => {
    let ok = 0, skipped = 0
    try {
      if (!d.id) {
        const dates = d.repeat ? weeklyDates(d.date, d.until) : [d.date]
        for (const [i, date] of dates.entries()) {
          progress(i + 1, dates.length)
          try { await staffApi.addLesson(d.groupId, toInput(d, date)); ok++ } catch (e) { if (e instanceof ApiError && e.status === 409) skipped++; else throw e }
        }
        if (ok === 0) return dates.length > 1 ? 'Во все эти даты у группы уже есть занятия' : 'В это время у группы уже есть занятие'
        toast(`Добавлено: ${ok} ${pluralize(ok, 'занятие', 'занятия', 'занятий')}${skipped ? `, пропущено из-за пересечений: ${skipped}` : ''}${d.groupId !== groupId ? ` · группа ${d.groupName}` : ''}`)
      } else {
        const orig = lessons.find((l) => l.id === d.id)
        if (d.following && orig) {
          const series = await findSeries(orig)
          const shift = Math.round((+new Date(`${d.date}T12:00`) - +new Date(`${ymd(new Date(orig.startsAt))}T12:00`)) / 86_400_000)
          for (const [i, l] of series.entries()) {
            progress(i + 1, series.length)
            const date = ymd(addDays(new Date(l.startsAt), shift))
            try { await staffApi.updateLesson(l.id, toInput(d, date)); ok++ } catch (e) { if (e instanceof ApiError && e.status === 409) skipped++; else throw e }
          }
          toast(`Изменено: ${ok} ${pluralize(ok, 'занятие', 'занятия', 'занятий')}${skipped ? `, не изменено из-за пересечений: ${skipped}` : ''}`)
        } else {
          await staffApi.updateLesson(d.id, toInput(d))
          toast('Занятие обновлено')
        }
      }
      setDialog(null)
      return null
    } catch (e) {
      return `${ok ? `Сохранено до ошибки: ${ok}. ` : ''}${errText(e)}`
    } finally {
      await load()
    }
  }

  const remove = async (l: ApiLesson, following: boolean) => {
    try {
      const list = following ? await findSeries(l) : [l]
      for (const x of list) await staffApi.deleteLesson(x.id)
      setConfirmId(null)
      toast(list.length > 1 ? `Удалено занятий: ${list.length}` : 'Занятие удалено')
    } catch (e) {
      toast(errText(e))
    } finally {
      await load()
    }
  }

  const blank = (date: Date): Draft => ({
    groupId: group?.id ?? groupId ?? '', groupName: group?.name ?? '', subject: '', kind: 'lecture', teacherName: '', room: '', date: ymd(date), from: '09:00', to: '10:30',
    changeNote: '', repeat: true, until: semesterEnd(ymd(date)), following: false,
  })
  const edit = (l: ApiLesson): Draft => ({
    id: l.id, groupId: l.groupId, groupName: group?.name ?? '', subject: l.subject, kind: l.kind, teacherName: l.teacherName, room: l.room,
    date: ymd(new Date(l.startsAt)), from: hhmm(l.startsAt), to: hhmm(l.endsAt), changeNote: l.changeNote ?? '', repeat: false, until: '', following: false,
  })
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
            <Button variant="surface" icon="file" disabled={!group} onClick={() => setCsv(true)}>Загрузить CSV</Button>
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
                        {confirmId === l.id ? (
                          <>
                            <button type="button" className="tool-btn tool-btn--danger" onClick={() => void remove(l, false)}>Только это</button>
                            <button type="button" className="tool-btn tool-btn--danger" onClick={() => void remove(l, true)}>Это и следующие</button>
                            <button type="button" className="tool-btn" onClick={() => setConfirmId(null)}>Отмена</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="tool-btn" onClick={() => setDialog(edit(l))}>Изменить</button>
                            <button type="button" className="tool-btn tool-btn--danger" onClick={() => setConfirmId(l.id)}>Удалить</button>
                          </>
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
      {dialog && <LessonDialog draft={dialog} sources={sources} onClose={() => setDialog(null)} onSave={save} />}
      {csv && group && (
        <CsvImportDialog
          group={group}
          onClose={() => setCsv(false)}
          onDone={(r) => { if (r.added) toast(`Из CSV добавлено: ${r.added} ${pluralize(r.added, 'занятие', 'занятия', 'занятий')}`); void load() }}
        />
      )}
      <Disclaimer />
    </>
  )
}
