import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { useMaterials } from '../../context/materials'
import { downloadFile } from '../../lib/api'
import { fileSize } from '../../lib/materials'
import { pluralize } from '../../lib/format'

export const subjectAnchor = (name: string) => `subject-${name.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-')}`

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

/** Раскрыть раздел предмета и прокрутить к нему (вызывается из таблицы оценок). */
export function openSubject(name: string) {
  window.dispatchEvent(new CustomEvent('open-subject', { detail: name }))
  requestAnimationFrame(() => document.getElementById(subjectAnchor(name))?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

/** Материалы от преподавателей, сгруппированные по предметам. Предметы текущего семестра идут первыми. */
export function SubjectMaterials({ subjects }: { subjects: string[] }) {
  const { forMe, isRead, markRead, loading, error, reload } = useMaterials()
  const [problem, setProblem] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [closed, setClosed] = useState<string[]>([])
  const [finding, setFinding] = useState(false)
  const findRef = useRef<HTMLInputElement>(null)
  const q = query.trim().toLowerCase()

  useEffect(() => {
    const on = (e: Event) => setClosed((c) => c.filter((x) => x !== (e as CustomEvent<string>).detail))
    window.addEventListener('open-subject', on)
    return () => window.removeEventListener('open-subject', on)
  }, [])

  const shown = useMemo(
    () =>
      q
        ? forMe.filter((m) =>
            [m.subject, m.title, m.fileName].join(' ').toLowerCase().includes(q),
          )
        : forMe,
    [forMe, q],
  )

  const known = subjects.map((s) => s.toLowerCase())
  const names = [...new Set(shown.map((m) => m.subject))].sort((a, b) => {
    const ia = known.indexOf(a.toLowerCase())
    const ib = known.indexOf(b.toLowerCase())
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'ru')
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  return (
    <section className="card" id="materials">
      <div className="card__head">
        <h2 className="card__title card__title--lg">Материалы</h2>
        <div className="mat-tools">
          {forMe.length > 0 && (
            <div className={`mat-find ${finding || q ? 'is-open' : ''}`}>
              <button
                type="button"
                className="mat-find__btn"
                aria-label={finding || q ? 'Закрыть поиск' : 'Искать по материалам'}
                aria-expanded={finding || q ? true : false}
                onClick={() => {
                  if (finding || q) { setQuery(''); setFinding(false) } else { setFinding(true); setTimeout(() => findRef.current?.focus(), 60) }
                }}
              >
                <Icon name={finding || q ? 'x' : 'search'} size={17} />
              </button>
              <input
                ref={findRef}
                className="mat-find__input"
                type="search"
                value={query}
                tabIndex={finding || q ? 0 : -1}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => { if (!query.trim()) setFinding(false) }}
                onKeyDown={(e) => { if (e.key === 'Escape') { setQuery(''); setFinding(false); e.currentTarget.blur() } }}
                placeholder="Поиск по материалам"
                aria-label="Поиск по материалам"
              />
            </div>
          )}
          {forMe.length > 0 && <Badge>{forMe.length}</Badge>}
        </div>
      </div>
      {error && <p role="alert" className="form-error">{error} <button type="button" className="link-btn" onClick={() => void reload()}>Повторить</button></p>}
      {problem && <p role="alert" className="form-error">{problem}</p>}
      {loading && forMe.length === 0 ? (
        <p className="mat-empty" role="status">Загружаем материалы…</p>
      ) : forMe.length > 0 && names.length === 0 ? (
        <p className="mat-empty">По запросу «{query.trim()}» ничего не нашлось.</p>
      ) : names.length === 0 ? (
        <p className="mat-empty">Преподаватели пока ничего не присылали. Новые материалы появятся здесь, сгруппированные по предметам.</p>
      ) : (
        <div className="mat-groups">
          {names.map((name) => {
            const items = shown.filter((m) => m.subject === name)
            const fresh = items.filter((m) => !isRead(m.id)).length
            const open = !!q || !closed.includes(name)
            const panel = `${subjectAnchor(name)}-panel`
            return (
              <div key={name} className={`mat-group ${open ? 'is-open' : ''}`} id={subjectAnchor(name)}>
                <button type="button" className="mat-group__head" aria-expanded={open} aria-controls={panel} onClick={() => setClosed((c) => (c.includes(name) ? c.filter((x) => x !== name) : [...c, name]))}>
                  <span className="mat-group__text">
                    <span className="mat-group__title">{name}</span>
                    <span className="mat-group__count">
                      {items.length} {pluralize(items.length, 'материал', 'материала', 'материалов')}
                      {fresh > 0 && ` · ${fresh} ${pluralize(fresh, 'новый', 'новых', 'новых')}`}
                    </span>
                  </span>
                  <span className="mat-group__chev" aria-hidden="true">
                    <Icon name="chevronDown" size={18} />
                  </span>
                </button>
                <div id={panel} className="mat-group__panel" inert={!open} aria-hidden={!open}>
                <ul className="mat-list">
                  {items.map((m) => {
                    const read = isRead(m.id)
                    return (
                      <li key={m.id} className={`mat-item ${read ? '' : 'is-new'}`}>
                        <time className="mat-date" dateTime={m.createdAt}>
                          <b>{new Date(m.createdAt).getDate()}</b>
                          <span>{MONTHS[new Date(m.createdAt).getMonth()]}</span>
                        </time>
                        <div className="mat-item__body">
                          <div className="mat-item__top">
                            <b className="mat-item__title">{m.title}</b>
                            {!read && <Badge tone="hl">Новое</Badge>}
                          </div>
                          <div className="mat-item__meta">{m.fileName} · {fileSize(m.size)}</div>
                          <div className="mat-item__files">
                            <button
                              type="button"
                              className="mat-chip"
                              onClick={() => {
                                markRead(m.id)
                                setProblem(null)
                                void downloadFile(`/api/materials/${m.id}/file`, m.fileName).catch((e) => setProblem(e instanceof Error ? e.message : 'Не удалось скачать файл'))
                              }}
                            >
                              <Icon name="download" size={14} /> Скачать
                            </button>
                            {!read && (
                              <button type="button" className="mat-read" onClick={() => markRead(m.id)}>
                                <Icon name="check" size={14} /> Прочитано
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
