import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './Icon'
import { addDays, weekRange } from '../lib/format'

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const mondayOf = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7))
const sameDay = (a: Date, b: Date) => a.getTime() === startOfDay(b).getTime()

/** Недели (по 7 дней с понедельника), которые покрывают месяц. */
function monthWeeks(year: number, month: number) {
  const first = new Date(year, month, 1)
  let mon = mondayOf(first)
  const weeks: Date[] = []
  do {
    weeks.push(mon)
    mon = addDays(mon, 7)
  } while (mon.getMonth() === month)
  return weeks
}

interface Props {
  monday: Date // выбранная неделя
  today: Date
  onPick: (monday: Date, weekday: number) => void
  onPrev: () => void
  onNext: () => void
}

/**
 * Переключатель недель: стрелки по бокам, а по нажатию на даты — календарь месяца.
 * Неделя подсвечивается целиком, выбранная — акцентом, сегодняшний день обведён.
 */
export function WeekPicker({ monday, today, onPick, onPrev, onNext }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => ({ y: monday.getFullYear(), m: monday.getMonth() }))
  const [slide, setSlide] = useState<'l' | 'r' | null>(null)
  const [labelDir, setLabelDir] = useState<'l' | 'r' | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const popId = useId()

  // при открытии показываем месяц выбранной недели (по четвергу — как в ISO)
  const openPicker = () => {
    const thu = addDays(monday, 3)
    setView({ y: thu.getFullYear(), m: thu.getMonth() })
    setSlide(null)
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const shiftMonth = (d: -1 | 1) => {
    setSlide(d < 0 ? 'r' : 'l')
    setView(({ y, m }) => {
      const n = new Date(y, m + d, 1)
      return { y: n.getFullYear(), m: n.getMonth() }
    })
  }

  const go = (fn: () => void, dir: 'l' | 'r') => {
    setLabelDir(dir)
    fn()
  }

  const pick = (mon: Date, weekday: number) => {
    setLabelDir(mon < monday ? 'r' : mon > monday ? 'l' : null)
    onPick(mon, weekday)
    setOpen(false)
  }

  const todayMon = mondayOf(today)
  const weeks = monthWeeks(view.y, view.m)

  return (
    <div className={`week-nav ${open ? 'is-open' : ''}`} ref={root}>
      <button type="button" className="week-nav__btn" aria-label="Предыдущая неделя" onClick={() => go(onPrev, 'r')}>
        <Icon name="chevronLeft" />
      </button>
      <button type="button" className="week-nav__label" aria-haspopup="dialog" aria-expanded={open} aria-controls={popId} onClick={openPicker}>
        <span key={monday.getTime()} className={`week-nav__text ${labelDir ? `slide-in-${labelDir}` : ''}`}>
          {weekRange(monday)}
        </span>
        <Icon name="chevronDown" size={16} className="week-nav__caret" />
      </button>
      <button type="button" className="week-nav__btn" aria-label="Следующая неделя" onClick={() => go(onNext, 'l')}>
        <Icon name="chevronRight" />
      </button>

      <div id={popId} role="dialog" aria-label="Выбор недели" className="wp" data-open={open || undefined} inert={!open}>
        <div className="wp__head">
          <button type="button" className="wp__nav" aria-label="Предыдущий месяц" onClick={() => shiftMonth(-1)}>
            <Icon name="chevronLeft" size={18} />
          </button>
          <span key={`${view.y}-${view.m}`} className={`wp__title ${slide ? `fade-${slide}` : ''}`}>
            {MONTHS[view.m]} {view.y}
          </span>
          <button type="button" className="wp__nav" aria-label="Следующий месяц" onClick={() => shiftMonth(1)}>
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
        <div className="wp__dow" aria-hidden="true">
          {DOW.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div key={`${view.y}-${view.m}`} className={`wp__grid ${slide ? `slide-in-${slide}` : ''}`}>
          {weeks.map((mon) => {
            const selected = mon.getTime() === monday.getTime()
            const current = mon.getTime() === todayMon.getTime()
            return (
              <div key={mon.getTime()} className={`wp__week ${selected ? 'is-selected' : ''} ${current ? 'is-current' : ''}`}>
                {DOW.map((_, i) => {
                  const d = addDays(mon, i)
                  const out = d.getMonth() !== view.m
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`wp__day ${out ? 'is-out' : ''} ${sameDay(d, today) ? 'is-today' : ''} ${i > 5 ? 'is-sun' : ''}`}
                      aria-label={`${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()} — неделя ${weekRange(mon)}`}
                      onClick={() => pick(mon, Math.min(i, 5))}
                    >
                      {d.getDate()}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
        <div className="wp__foot">
          <button type="button" className="wp__today" onClick={() => pick(todayMon, Math.min((today.getDay() + 6) % 7, 5))}>
            Текущая неделя
          </button>
        </div>
      </div>
    </div>
  )
}
