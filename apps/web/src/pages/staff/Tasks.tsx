import { DocumentActions } from './DocumentActions'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStaff } from '../../context/staff'
import { useNow } from '../../context/clock'
import { useToast } from '../../context/toast'
import { staffApi, type ApiStaffRequest } from '../../lib/api'
import { eyebrowDate, pluralize } from '../../lib/format'
import { useIndicator } from '../../lib/useIndicator'
import { STAGES, STATUS_LABEL, TYPE_DOT, TYPE_LABEL, TYPE_SHORT, isActive, isOverdue, overdueDays, shortNumber, sortQueue, stageOf, dueDate } from '../../lib/staff'
import { Avatar, Badge, Button, Disclaimer, PageHeader, Stages, ThemeButton, type Tone } from '../../components/ui'
import { Icon } from '../../components/Icon'

type Filter = 'all' | ApiStaffRequest['type']
type StatusFilter = 'active' | 'all' | 'overdue' | 'done' | ApiStaffRequest['status']
const STATUS_FILTERS: [StatusFilter, string][] = [['active', 'Активные'], ['submitted', 'Новые'], ['in_progress', 'В работе'], ['overdue', 'Просрочены'], ['ready', 'Готовы'], ['issued', 'Выданы'], ['rejected', 'Отклонены'], ['all', 'Все']]
const TONE: Record<ApiStaffRequest['status'], Tone> = { submitted: 'warn', in_progress: 'accent', ready: 'ok', issued: 'neutral', rejected: 'danger', cancelled: 'neutral' }

const dayMonth = (iso: string | Date) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
const initialsOf = (fullName: string) => fullName.replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('')

function dueLabel(r: ApiStaffRequest, now: Date) {
  if (!isActive(r)) return r.status === 'ready' ? 'ждёт выдачи' : r.status==='issued'?`выдана ${dayMonth(r.updatedAt)}`:STATUS_LABEL[r.status]
  const late = overdueDays(r, now)
  if (late > 0) return `просрочено на ${late} ${pluralize(late, 'день', 'дня', 'дней')}`
  return late === 0 ? 'сегодня' : `до ${dayMonth(dueDate(r))}`
}

export function StaffTasksPage() {
  const { requests, loading, error, reload, advance } = useStaff()
  const now = useNow()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('all')
  const [status, setStatus] = useState<StatusFilter>('active')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const detailRef = useRef<HTMLElement>(null)
  const statusChips = useIndicator<HTMLDivElement>(status)

  const queue = useMemo(() => sortQueue([...requests]), [requests])
  const stats = useMemo(() => {
    const week = now.getTime() - 7 * 86_400_000
    return {
      fresh: requests.filter((r) => r.status === 'submitted').length,
      work: requests.filter((r) => r.status === 'in_progress').length,
      late: requests.filter((r) => isOverdue(r, now)).length,
      done: requests.filter((r) => (r.status === 'ready' || r.status === 'issued') && new Date(r.updatedAt).getTime() >= week).length,
    }
  }, [requests, now])

  const matchStatus = (r: ApiStaffRequest, st: StatusFilter) =>
    st === 'all' ? true : st === 'active' ? r.status === 'submitted' || r.status === 'in_progress' : st === 'overdue' ? isOverdue(r, now) : st === 'done' ? r.status === 'ready' || r.status === 'issued' : r.status === st
  const q = query.trim().toLowerCase()
  const shown = queue.filter((r) => (filter === 'all' || r.type === filter) && matchStatus(r, status) && (!q || `${r.fullName} ${r.groupName ?? ''} ${shortNumber(r)} ${TYPE_LABEL[r.type]}`.toLowerCase().includes(q)))
  const selected = queue.find((r) => r.id === params.get('id')) ?? shown[0]
  const count = (f: Filter) => queue.filter((r) => (f === 'all' || r.type === f) && matchStatus(r, status)).length
  const countStatus = (st: StatusFilter) => queue.filter((r) => (filter === 'all' || r.type === filter) && matchStatus(r, st)).length

  // на узком экране карточка заявки открывается под списком — прокручиваем к ней
  const pick = (id: string) => {
    setParams({ id }, { replace: true })
    if (window.matchMedia('(max-width: 1100px)').matches) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  useEffect(() => { if (!params.get('id') && selected) setParams({ id: selected.id }, { replace: true }) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const move = async (r: ApiStaffRequest, status: 'in_progress' | 'ready' | 'issued', done: string) => {
    setBusy(true)
    const err = await advance(r.id, status)
    setBusy(false)
    toast(err ?? done)
  }

  return (
    <>
      <PageHeader
        eyebrow={eyebrowDate(now)}
        title="Задачи деканата"
        actions={
          <>
            <label className="search search--staff">
              <Icon name="search" size={17} className="search__icon" />
              <input className="search__input" placeholder="Студент, группа или номер" aria-label="Поиск по заявкам" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <ThemeButton />
          </>
        }
      />

      <div className="stats stats--4">
        <button type="button" className="stat stat--hl stat--btn" aria-pressed={status === 'submitted'} onClick={() => setStatus('submitted')}><span className="stat__label">Новые</span><b className="stat__value display">{stats.fresh}</b><span className="stat__hint-text">ждут, пока их возьмут</span></button>
        <button type="button" className="stat stat--btn" aria-pressed={status === 'in_progress'} onClick={() => setStatus('in_progress')}><span className="stat__label">В работе</span><b className="stat__value display">{stats.work}</b><span className="stat__hint-text">у вас на руках</span></button>
        <button type="button" className={`stat stat--btn ${stats.late ? 'stat--danger' : ''}`} aria-pressed={status === 'overdue'} onClick={() => setStatus('overdue')}><span className="stat__label">Более 3 дней</span><b className="stat__value display">{stats.late}</b><span className="stat__hint-text">{stats.late ? 'нажмите, чтобы показать' : 'всё в срок'}</span></button>
        <button type="button" className="stat stat--btn" aria-pressed={status === 'done'} onClick={() => setStatus('done')}><span className="stat__label">Готово за неделю</span><b className="stat__value display">{stats.done}</b><span className="stat__hint-text">за последние 7 дней</span></button>
      </div>

      <div className="staff-bar">
        <div ref={statusChips.box} className="chips staff-chips" role="radiogroup" aria-label="Статус заявки">
          <span ref={statusChips.ind} className="chips__ind" aria-hidden="true" />
          {STATUS_FILTERS.filter(([st]) => st === 'all' || st === 'active' || st === status || (st !== 'overdue' && countStatus(st) > 0)).map(([st, label]) => (
            <button key={st} type="button" role="radio" aria-checked={status === st} className={`chip ${status === st ? 'is-active' : ''}`} onClick={() => setStatus(st)}>
              {label} <span className="chip__count">{countStatus(st)}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          <Icon name="alert" size={16} /> {error} <button type="button" className="link-btn" onClick={() => void reload()}>Повторить</button>
        </p>
      )}

      <div className="grid-inbox grid-queue">
        <section className="card" aria-label="Очередь заявок">
          <div className="card__head">
            <div>
              <h2 className="card__title card__title--lg">Очередь <span className="small muted">· {shown.length}</span></h2>
              <span className="small muted">сначала срочные</span>
            </div>
            <label className="staff-type">
              <span className="sr-only">Тип заявки</span>
              <select className="input staff-type__select" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
                <option value="all">Все типы · {count('all')}</option>
                {(Object.keys(TYPE_SHORT) as ApiStaffRequest['type'][]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]} · {count(t)}</option>)}
              </select>
            </label>

          </div>
          {loading && <p className="muted">Загружаем заявки…</p>}
          {!loading && shown.length === 0 && <p className="muted queue-empty">{queue.length ? 'Здесь пусто. Выберите другой статус или тип, либо очистите поиск.' : 'Заявок пока нет.'}</p>}
          <ul className="inbox queue queue--scroll" role="listbox" aria-label="Заявки">
            {shown.map((r) => {
              const late = isOverdue(r, now)
              return (
                <li key={r.id} role="option" aria-selected={r.id === selected?.id}>
                  <button type="button" className={`inbox__item queue__item ${r.id === selected?.id ? 'is-active' : ''} ${!isActive(r) ? 'is-done' : ''}`} onClick={() => pick(r.id)}>
                    <span className="inbox__head">
                      <span className="queue__type"><i style={{ background: TYPE_DOT[r.type] }} />{TYPE_LABEL[r.type]} · № {shortNumber(r)}</span>
                      <Badge tone={TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    </span>
                    <span className="inbox__subject queue__subject">{r.purpose || TYPE_LABEL[r.type]}</span>
                    <span className="queue__foot">
                      <span className="small muted">{r.fullName.replace(/\(.*?\)/g, '').trim()}{r.groupName ? ` · ${r.groupName}` : ''}</span>
                      <span className={`queue__due ${late ? 'is-late' : ''}`}>{dueLabel(r, now)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section ref={detailRef} className="card card--flush request-detail" aria-live="polite" aria-label="Заявка">
          {selected ? (
            <>
              <div className="request-detail__top">
                <div className="request-detail__row">
                  <span className="eyebrow">Заявка · № {shortNumber(selected)}</span>
                  <Badge tone={TONE[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
                </div>
                <h2 className="display request-detail__title">{TYPE_LABEL[selected.type]}</h2>
                <div className="request-detail__chips">
                  <span className="pill">{selected.fullName.replace(/\(.*?\)/g, '').trim()} · студент</span>
                  <span className="pill">Поступила {dayMonth(selected.createdAt)}</span>
                  <span className={`pill ${isOverdue(selected, now) ? 'pill--danger' : ''}`}>Ориентир: {dueLabel(selected, now)}</span>
                </div>
              </div>
              <div className="request-detail__body">
                <Stages stages={STAGES} current={stageOf(selected.status)} />
                <div className="msg">
                  <Avatar initials={initialsOf(selected.fullName)} size={40} tone="neutral" />
                  <p className="msg__bubble">
                    <b>Цель:</b> {selected.purpose || '—'}
                    {selected.comment && (<><br /><b>Комментарий:</b> {selected.comment}</>)}
                  </p>
                </div>
                <div className="info-tiles">
                  <div><span>Группа</span><b>{selected.groupName ?? '—'}</b></div>
                  <div><span>Получение</span><b>{selected.delivery === 'pdf' ? 'Электронно (PDF)' : 'В деканате'}</b></div>
                  <div><span>Обновлена</span><b>{dayMonth(selected.updatedAt)}</b></div>
                </div>
                <div className="request-detail__actions">
                  {selected.status === 'submitted' && (
                    <>
                      <Button variant="strong" icon="check" disabled={busy} onClick={() => void move(selected, 'in_progress', 'Заявка взята в работу')}>Взять в работу</Button>
                      {selected.type!=='study' && <Button variant="surface" disabled={busy} onClick={() => void move(selected, 'ready', 'Заявка готова, студент уведомлён')}>Сразу готова</Button>}
                    </>
                  )}
                  {selected.status === 'in_progress' && selected.type!=='study' && (
                    <Button variant="strong" icon="check" disabled={busy} onClick={() => void move(selected, 'ready', 'Заявка готова, студент уведомлён')}>Отметить готовой</Button>
                  )}
                  {selected.status === 'ready' && (
                    <Button variant="strong" icon="check" disabled={busy} onClick={() => void move(selected, 'issued', 'Заявка выдана')}>Отметить выданной</Button>
                  )}
                  {(selected.status === 'ready' || selected.status === 'issued') && (
                    <a className="btn btn--surface btn--md" href={staffApi.pdfUrl(selected.id)} download>
                      <Icon name="download" size={18} /> Скачать PDF
                    </a>
                  )}
                </div>
                <DocumentActions key={selected.id} row={selected} reload={reload}/>
                {(selected.status === 'rejected') && <p className="muted small">Заявка отклонена — действий не требуется.</p>}
              </div>
            </>
          ) : (
            <p className="muted request-detail__empty">Выберите заявку в очереди.</p>
          )}
        </section>
      </div>
      <Disclaimer />
    </>
  )
}
