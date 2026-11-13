import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApiAnnouncement } from '../lib/api'
import { load, save } from '../lib/storage'
import { pluralize } from '../lib/format'
import { Icon } from './Icon'

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const dateLabel = (iso: string) => {
  const p = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'numeric' }).formatToParts(new Date(iso))
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value)
  return `${get('day')} ${MONTHS[get('month') - 1]}`
}
const audience = (a: ApiAnnouncement) => (a.groupName ? `для группы ${a.groupName}` : 'для всех студентов')

/** Длительность выхода предыдущего слайда (мс) — совпадает с CSS. */
const LEAVE_MS = 150
const ENTER_MS = 460

/**
 * Карточка «Объявления деканата»: показывает одно объявление, непрочитанные сменяют друг друга.
 * Прочитанное хранится в браузере (на сервере пока нет отметок о прочтении).
 */
export function AnnouncementsCard({ items, userId, error }: { items: ApiAnnouncement[]; userId: string; error?: string }) {
  const key = `announcements-read:${userId}`
  const [read, setRead] = useState<string[]>(() => load<string[]>(key, []))
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState<'one' | 'all'>('one')
  const [leaving, setLeaving] = useState<{ a: ApiAnnouncement; read: boolean; expanded: boolean } | null>(null)
  const [entering, setEntering] = useState(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const isRead = (id: string) => read.includes(id)
  const markRead = useCallback((id: string) => {
    setRead((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      save(key, next)
      return next
    })
  }, [key])

  const unread = items.filter((a) => !read.includes(a.id))
  const current = items.find((a) => a.id === currentId) ?? unread[0] ?? items[0]
  const others = current ? unread.filter((a) => a.id !== current.id) : []

  /** Плавная смена: предыдущее объявление уходит (150 мс), новое появляется по частям. */
  const swapTo = (id: string | null) => {
    if (current) setLeaving({ a: current, read: isRead(current.id), expanded })
    setCurrentId(id)
    setExpanded(false)
    setView('one')
    setEntering(true)
    timers.current.push(window.setTimeout(() => setLeaving(null), LEAVE_MS), window.setTimeout(() => setEntering(false), ENTER_MS))
  }
  const next = () => {
    if (!current || !others[0]) return
    markRead(current.id)
    swapTo(others[0].id)
  }
  const openFull = () => {
    if (!current) return
    setExpanded((v) => !v)
    markRead(current.id)
  }
  const toggleAll = () => {
    setEntering(true)
    setView((v) => (v === 'all' ? 'one' : 'all'))
    timers.current.push(window.setTimeout(() => setEntering(false), ENTER_MS))
  }
  const pick = (id: string) => {
    setCurrentId(id)
    setExpanded(false)
    setView('one')
    setEntering(true)
    timers.current.push(window.setTimeout(() => setEntering(false), ENTER_MS))
  }

  const slide = (a: ApiAnnouncement, opts: { read: boolean; expanded: boolean; leaving?: boolean }) => (
    <div className={`ann-slide ${opts.leaving ? 'is-leaving' : entering ? 'is-entering' : ''}`} key={`${a.id}${opts.leaving ? '-out' : ''}`} aria-hidden={opts.leaving || undefined} {...(opts.leaving ? { inert: true } : {})}>
      <p className="ann-card__meta ann-c" style={{ ['--i' as string]: 0 }}>
        <time dateTime={a.createdAt}>{dateLabel(a.createdAt)}</time>
        <span className={opts.read ? 'ann-card__to' : 'ann-card__to ann-card__to--new'}> · {opts.read ? '' : 'новое, '}{audience(a)}</span>
      </p>
      <h3 className="ann-card__title ann-c" style={{ ['--i' as string]: 1 }}>{a.title}</h3>
      <p className={`ann-card__body ann-c ${opts.expanded ? 'is-open' : ''}`} style={{ ['--i' as string]: 2 }}>{a.body}</p>
      <div className="ann-c" style={{ ['--i' as string]: 3 }}>
        <button type="button" className="ann-card__more" onClick={openFull} aria-expanded={opts.expanded} tabIndex={opts.leaving ? -1 : 0}>
          {opts.expanded ? 'Свернуть' : 'Читать полностью'}
        </button>
      </div>
    </div>
  )

  return (
    <section className="card ann-card" aria-label="Объявления деканата">
      <div className="ann-card__head">
        <h2 className="card__title">Объявления деканата</h2>
        {items.length > 1 && (
          <button type="button" className="ann-card__all" onClick={toggleAll}>
            {view === 'all' ? 'Назад' : 'Все'}
          </button>
        )}
      </div>

      {error && <p role="alert" className="form-error">{error}</p>}
      {!error && !items.length && <p className="muted small">Объявлений пока нет.</p>}

      {current && view === 'one' && (
        <>
          <div className="ann-stage" aria-live="polite">
            {leaving && slide(leaving.a, { read: leaving.read, expanded: leaving.expanded, leaving: true })}
            {slide(current, { read: isRead(current.id), expanded })}
          </div>
          <div className="ann-card__foot">
            {others.length > 0 ? (
              <button type="button" className="ann-card__next" onClick={next}>
                <span>Ещё <b className="ann-card__count">{others.length}</b> {pluralize(others.length, 'непрочитанное', 'непрочитанных', 'непрочитанных')}</span>
                <Icon name="chevronRight" size={20} />
              </button>
            ) : !isRead(current.id) ? (
              <button type="button" className="ann-card__next" onClick={() => markRead(current.id)}>
                <span>Отметить прочитанным</span>
                <Icon name="check" size={20} />
              </button>
            ) : (
              <p className="ann-card__done"><Icon name="check" size={18} /> Все прочитано</p>
            )}
          </div>
        </>
      )}

      {current && view === 'all' && (
        <ul className={`ann-list ${entering ? 'is-entering' : ''}`}>
          {items.map((a, i) => (
            <li key={a.id} className="ann-c" style={{ ['--i' as string]: Math.min(i, 5) }}>
              <button type="button" className="ann-list__row" onClick={() => pick(a.id)}>
                <span className={`ann-list__dot ${isRead(a.id) ? '' : 'is-new'}`} aria-label={isRead(a.id) ? undefined : 'Новое'} />
                <span className="ann-list__text">
                  <b>{a.title}</b>
                  <span className="small muted">{dateLabel(a.createdAt)} · {audience(a)}</span>
                </span>
                <Icon name="chevronRight" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
