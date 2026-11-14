import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { REQUEST_CATALOG, REQUEST_HINTS, REQUEST_ICONS, REQUEST_OTHER, REQUEST_TYPES } from '../data/mock'
import { pluralize } from '../lib/format'
import type { RequestType } from '../types'
import { Icon } from './Icon'

/**
 * Выпадающий выбор вида заявки: поиск, группы, пояснения. Стрелки, Home/End, Enter и Esc работают с клавиатуры.
 * Фокус при открытии переходит в поиск, при закрытии возвращается на кнопку.
 */
export function RequestTypePicker({ value, onChange, labelId }: { value: RequestType; onChange: (t: RequestType) => void; labelId: string }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState<RequestType>(value)
  const uid = useId()
  const box = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const match = (i: { label: string; hint: string }) => !needle || i.label.toLowerCase().includes(needle) || i.hint.toLowerCase().includes(needle)
    return REQUEST_CATALOG.map((g) => ({ title: g.title, items: g.items.filter(match) as readonly { type: RequestType; label: string; hint: string }[] })).filter((g) => g.items.length)
  }, [q])
  const otherShown = !q.trim() || REQUEST_OTHER.label.toLowerCase().includes(q.trim().toLowerCase()) || REQUEST_OTHER.hint.toLowerCase().includes(q.trim().toLowerCase()) || 'другое'.includes(q.trim().toLowerCase())
  const flat: RequestType[] = [...groups.flatMap((g) => g.items.map((i) => i.type)), ...(otherShown ? [REQUEST_OTHER.type] : [])]
  const total = REQUEST_CATALOG.reduce((n, g) => n + g.items.length, 0)
  const optId = (t: string) => `${uid}-${t}`

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  useEffect(() => { if (open) { search.current?.focus(); document.getElementById(optId(active))?.scrollIntoView({ block: 'nearest' }) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (open && !flat.includes(active) && flat[0]) setActive(flat[0]) }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  const openList = () => { setQ(''); setActive(value); setOpen(true) }
  const closeList = (back = true) => { setOpen(false); if (back) trigger.current?.focus() }
  const pick = (t: RequestType) => { onChange(t); closeList() }
  const move = (to: number) => {
    const next = flat[Math.max(0, Math.min(flat.length - 1, to))]
    if (!next) return
    setActive(next)
    requestAnimationFrame(() => document.getElementById(optId(next))?.scrollIntoView({ block: 'nearest' }))
  }
  const onKey = (e: React.KeyboardEvent) => {
    const i = flat.indexOf(active)
    if (e.key === 'ArrowDown') { e.preventDefault(); move(i + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(i - 1) }
    else if (e.key === 'Home') { e.preventDefault(); move(0) }
    else if (e.key === 'End') { e.preventDefault(); move(flat.length - 1) }
    else if (e.key === 'Enter') { e.preventDefault(); if (flat.includes(active)) pick(active) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeList() }
    else if (e.key === 'Tab') closeList(false)
  }

  return (
    <div ref={box} className={`tp ${open ? 'is-open' : ''}`}>
      <button
        ref={trigger}
        type="button"
        className="tp__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${uid}-list`}
        aria-labelledby={`${labelId} ${uid}-cur`}
        onClick={() => (open ? closeList(false) : openList())}
        onKeyDown={(e) => { if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !open) { e.preventDefault(); openList() } }}
      >
        <span className="tp__icon"><Icon name={REQUEST_ICONS[value]} size={22} /></span>
        <span className="tp__text" id={`${uid}-cur`}>
          <b>{REQUEST_TYPES[value]}</b>
          <small>{REQUEST_HINTS[value]}</small>
        </span>
        <Icon name="chevronDown" size={20} className="tp__chev" />
      </button>

      {open && (
        <div className="tp__pop" onKeyDown={onKey}>
          <label className="tp__search">
            <Icon name="search" size={18} />
            <input
              ref={search}
              type="search"
              role="combobox"
              aria-expanded="true"
              aria-controls={`${uid}-list`}
              aria-activedescendant={flat.includes(active) ? optId(active) : undefined}
              aria-label="Поиск вида заявки"
              placeholder="Найти: справка, приказ, отпуск…"
              autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <div ref={listRef} className="tp__list" id={`${uid}-list`} role="listbox" aria-label="Виды заявок">
            {groups.map((g) => (
              <div key={g.title} role="group" aria-label={g.title}>
                <p className="tp__group" aria-hidden="true"><span>{g.title}</span><span>{g.items.length}</span></p>
                {g.items.map((i) => (
                  <div
                    key={i.type}
                    id={optId(i.type)}
                    role="option"
                    aria-selected={i.type === value}
                    className={`tp__opt ${i.type === value ? 'is-selected' : ''} ${i.type === active ? 'is-active' : ''}`}
                    onPointerMove={() => i.type !== active && setActive(i.type)}
                    onClick={() => pick(i.type)}
                  >
                    <span className="tp__icon tp__icon--sm"><Icon name={REQUEST_ICONS[i.type]} size={20} /></span>
                    <span className="tp__text"><b>{i.label}</b><small>{i.hint}</small></span>
                  </div>
                ))}
              </div>
            ))}
            {otherShown && (
              <div className="tp__other">
                <div
                  id={optId(REQUEST_OTHER.type)}
                  role="option"
                  aria-selected={value === REQUEST_OTHER.type}
                  className={`tp__opt ${value === REQUEST_OTHER.type ? 'is-selected' : ''} ${active === REQUEST_OTHER.type ? 'is-active' : ''}`}
                  onPointerMove={() => active !== REQUEST_OTHER.type && setActive(REQUEST_OTHER.type)}
                  onClick={() => pick(REQUEST_OTHER.type)}
                >
                  <span className="tp__icon tp__icon--sm tp__icon--dashed"><Icon name={REQUEST_OTHER.icon} size={20} /></span>
                  <span className="tp__text"><b>{REQUEST_OTHER.label}</b><small>{REQUEST_OTHER.hint}</small></span>
                </div>
              </div>
            )}
            {!flat.length && <p className="tp__empty">Ничего не нашлось. Попробуйте другое слово.</p>}
          </div>
          <p className="tp__keys" aria-hidden="true">
            <span><kbd>↑</kbd><kbd>↓</kbd> выбрать</span>
            <span><kbd>Enter</kbd> подтвердить</span>
            <span><kbd>Esc</kbd> закрыть</span>
          </p>
        </div>
      )}
      <p className="tp__count">{total + 1} {pluralize(total + 1, 'вид', 'вида', 'видов')} {pluralize(total + 1, 'заявки', 'заявок', 'заявок')}. Не нашли нужную — выберите «Иное обращение».</p>
    </div>
  )
}
