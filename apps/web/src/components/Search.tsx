import { useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'
import { DISCIPLINES_AUTUMN, REQUEST_TYPES, STUDENT_LESSONS } from '../data/mock'

interface Hit {
  label: string
  hint: string
  to: string
}

const INDEX: Hit[] = [
  { label: 'Расписание', hint: 'Раздел', to: '/student/schedule' },
  { label: 'Предметы', hint: 'Раздел', to: '/student/grades' },
  { label: 'Заявки и справки', hint: 'Раздел', to: '/student/requests' },
  { label: 'Уведомления', hint: 'Раздел', to: '/student/notifications' },
  { label: 'Профиль и оформление', hint: 'Раздел', to: '/student/profile' },
  ...DISCIPLINES_AUTUMN.map((d) => ({ label: d.name, hint: `${d.score} баллов · ${d.form.toLowerCase()}`, to: '/student/grades' })),
  ...Object.values(REQUEST_TYPES).map((t) => ({ label: t, hint: 'Заявка', to: '/student/requests' })),
  ...[...new Set(STUDENT_LESSONS.map((l) => l.teacher!))].map((t) => ({ label: t, hint: 'Преподаватель · расписание', to: '/student/schedule' })),
]

export function Search() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const listId = useId()

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    return INDEX.filter((h) => h.label.toLowerCase().includes(s)).slice(0, 6)
  }, [q])

  const go = (h: Hit) => {
    setQ('')
    setOpen(false)
    navigate(h.to)
  }

  return (
    <div className="search">
      <Icon name="search" size={17} className="search__icon" />
      <input
        className="search__input"
        placeholder="Поиск по деканату"
        aria-label="Поиск по деканату"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls={listId}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, hits.length - 1))
          else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
          else if (e.key === 'Enter' && hits[active]) go(hits[active])
          else if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && q.trim() && (
        <ul className="search__list" id={listId} role="listbox">
          {hits.length === 0 && <li className="search__empty">Ничего не нашлось</li>}
          {hits.map((h, i) => (
            <li key={h.label + h.hint} role="option" aria-selected={i === active}>
              <button type="button" className={`search__hit ${i === active ? 'is-active' : ''}`} onMouseDown={() => go(h)}>
                <b>{h.label}</b>
                <span>{h.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
