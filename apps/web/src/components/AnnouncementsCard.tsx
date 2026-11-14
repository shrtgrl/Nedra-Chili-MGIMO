import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { ApiAnnouncement } from '../lib/api'
import { load, save } from '../lib/storage'
import { pluralize } from '../lib/format'
import { audience, dateLabel } from '../lib/news'
import { NewsModal } from './NewsModal'
import { Icon } from './Icon'

/** Длительность выхода предыдущего слайда и входа нового (мс) — совпадает с CSS. */
const LEAVE_MS = 150
const ENTER_MS = 460
/** Сколько объявлений крутится по очереди. Остальные — в списке «Все». */
const ROTATION_MAX = 6
/** Время показа: больше текста — дольше (6–12 секунд). */
const showMs = (a: ApiAnnouncement) => Math.min(12000, Math.max(6000, 5000 + (a.title.length + a.body.length) * 35))

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return reduced
}
const useTabHidden = () => {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  useEffect(() => {
    const on = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  return hidden
}

/**
 * Карточка «Объявления деканата»: актуальные объявления сменяют друг друга сами.
 * Крутятся непрочитанные (если их нет — последние); смена останавливается при наведении,
 * фокусе, раскрытом тексте, в фоновой вкладке и по кнопке «Пауза». При «уменьшении движения» автосмены нет.
 * Прочитанное хранится в браузере (на сервере пока нет отметок о прочтении).
 */
export function AnnouncementsCard({ items, userId, error }: { items: ApiAnnouncement[]; userId: string; error?: string }) {
  const key = `announcements-read:${userId}`
  const [read, setRead] = useState<string[]>(() => load<string[]>(key, []))
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [modalId, setModalId] = useState<string | null>(null)
  const [view, setView] = useState<'one' | 'all'>('one')
  const [leaving, setLeaving] = useState<{ a: ApiAnnouncement; read: boolean } | null>(null)
  const [entering, setEntering] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const reduced = useReducedMotion()
  const hidden = useTabHidden()
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
  const rotation = (unread.length ? unread : items).slice(0, ROTATION_MAX)
  const current = items.find((a) => a.id === currentId) ?? rotation[0]
  const idx = current ? rotation.findIndex((a) => a.id === current.id) : -1
  const nextInRotation = current && rotation.length > 1 ? rotation[(idx + 1) % rotation.length] : undefined
  const unreadElsewhere = current ? unread.filter((a) => a.id !== current.id).length : 0

  const autoplay = !reduced && rotation.length > 1 && view === 'one'
  const paused = userPaused || hovered || focused || !!modalId || hidden || !!leaving

  const flash = (ms: number, set: (v: boolean) => void) => {
    set(true)
    timers.current.push(window.setTimeout(() => set(false), ms))
  }
  /** Плавная смена: предыдущее объявление уходит (150 мс), новое появляется по частям. */
  const swapTo = (id: string) => {
    if (current) setLeaving({ a: current, read: isRead(current.id) })
    setCurrentId(id)
    setView('one')
    setEntering(true)
    timers.current.push(window.setTimeout(() => setLeaving(null), LEAVE_MS), window.setTimeout(() => setEntering(false), ENTER_MS))
  }
  const advance = () => { if (nextInRotation) swapTo(nextInRotation.id) }
  /** Ручной переход «Ещё N непрочитанных»: показанное считается прочитанным. */
  const next = () => {
    if (!current || !nextInRotation) return
    markRead(current.id)
    swapTo(nextInRotation.id)
  }
  /** Закрепляем показанное объявление: пока окно листают, карточка под ним не должна «прыгать». */
  const openFull = () => { if (!current) return; setCurrentId(current.id); setModalId(current.id) }
  const toggleAll = () => {
    flash(ENTER_MS, setEntering)
    setView((v) => (v === 'all' ? 'one' : 'all'))
  }
  const pick = (id: string) => {
    setCurrentId(id)
    setView('one')
    flash(ENTER_MS, setEntering)
  }

  const slide = (a: ApiAnnouncement, opts: { read: boolean; leaving?: boolean }) => (
    <div className={`ann-slide ${opts.leaving ? 'is-leaving' : entering ? 'is-entering' : ''}`} key={`${a.id}${opts.leaving ? '-out' : ''}`} aria-hidden={opts.leaving || undefined} {...(opts.leaving ? { inert: true } : {})}>
      <p className="ann-card__meta ann-c" style={{ ['--i' as string]: 0 }}>
        <time dateTime={a.createdAt}>{dateLabel(a.createdAt)}</time>
        <span className={opts.read ? 'ann-card__to' : 'ann-card__to ann-card__to--new'}> · {opts.read ? '' : 'новое, '}{audience(a)}</span>
      </p>
      <h3 className="ann-card__title ann-c" style={{ ['--i' as string]: 1 }}>{a.title}</h3>
      <p className="ann-card__body ann-c" style={{ ['--i' as string]: 2 }}>{a.body}</p>
      <div className="ann-c" style={{ ['--i' as string]: 3 }}>
        <button type="button" className="ann-card__more" onClick={openFull} aria-haspopup="dialog" tabIndex={opts.leaving ? -1 : 0}>
          Читать полностью
        </button>
      </div>
    </div>
  )

  return (
    <section
      className="card ann-card"
      aria-label="Объявления деканата"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false) }}
    >
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
          <div className="ann-stage" aria-live={autoplay && !paused ? 'off' : 'polite'}>
            {leaving && slide(leaving.a, { read: leaving.read, leaving: true })}
            {slide(current, { read: isRead(current.id) })}
          </div>
          <div className="ann-card__foot">
            {nextInRotation ? (
              <button type="button" className="ann-card__next" onClick={next}>
                <span>
                  {unreadElsewhere > 0
                    ? <>Ещё <b className="ann-card__count">{unreadElsewhere}</b> {pluralize(unreadElsewhere, 'непрочитанное', 'непрочитанных', 'непрочитанных')}</>
                    : 'Следующее объявление'}
                </span>
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

            {rotation.length > 1 && (
              <div className="ann-dots" role="group" aria-label="Выбор объявления">
                {rotation.map((a, i) => {
                  const active = a.id === current.id
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={`ann-dot ${active ? 'is-active' : ''} ${i < idx ? 'is-past' : ''}`}
                      aria-label={`Объявление ${i + 1} из ${rotation.length}: ${a.title}`}
                      aria-current={active || undefined}
                      onClick={() => !active && swapTo(a.id)}
                    >
                      <span className="ann-dot__bar" aria-hidden="true">
                        {active && autoplay && (
                          <i
                            key={current.id}
                            className="ann-dot__fill"
                            style={{ ['--dur' as string]: `${showMs(current)}ms`, animationPlayState: paused ? 'paused' : 'running' } as CSSProperties}
                            onAnimationEnd={advance}
                          />
                        )}
                      </span>
                    </button>
                  )
                })}
                {autoplay && (
                  <button
                    type="button"
                    className="ann-dots__pause"
                    aria-pressed={userPaused}
                    aria-label={userPaused ? 'Возобновить смену объявлений' : 'Остановить смену объявлений'}
                    onClick={() => setUserPaused((v) => !v)}
                  >
                    <Icon name={userPaused ? 'play' : 'pauseBars'} size={18} />
                  </button>
                )}
              </div>
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
      {modalId && <NewsModal items={items} startId={modalId} onClose={() => setModalId(null)} onSeen={markRead} />}
    </section>
  )
}
