import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { REQUEST_CATALOG, REQUEST_TYPES } from '../data/mock'
import { pluralize } from '../lib/format'
import type { RequestType } from '../types'
import { Icon, type IconName } from './Icon'

const TYPE_ICON: Record<RequestType, IconName> = { study: 'doc', order: 'clipboard', leave: 'pause', retake: 'refresh' }

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
    return REQUEST_CATALOG.map((g) => ({
      ...g,
      items: g.items.filter((i) => !needle || REQUEST_TYPES[i.type].toLowerCase().includes(needle) || i.hint.toLowerCase().includes(needle)),
    })).filter((g) => g.items.length)
  }, [q])
  const flat = groups.flatMap((g) => g.items.map((i) => i.type))
  const total = REQUEST_CATALOG.reduce((n, g) => n + g.items.length, 0)
  const current = REQUEST_CATALOG.flatMap((g) => g.items).find((i) => i.type === value)!
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
        <span className="tp__icon"><Icon name={TYPE_ICON[value]} size={22} /></span>
        <span className="tp__text" id={`${uid}-cur`}>
          <b>{REQUEST_TYPES[value]}</b>
          <small>{current.hint}</small>
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
                    <span className="tp__icon tp__icon--sm"><Icon name={TYPE_ICON[i.type]} size={20} /></span>
                    <span className="tp__text"><b>{REQUEST_TYPES[i.type]}</b><small>{i.hint}</small></span>
                    {i.type === value && <Icon name="check" size={20} className="tp__ok" />}
                  </div>
                ))}
              </div>
            ))}
            {!groups.length && <p className="tp__empty">Ничего не нашлось. Попробуйте другое слово.</p>}
          </div>
          <p className="tp__keys" aria-hidden="true">
            <span><kbd>↑</kbd><kbd>↓</kbd> выбрать</span>
            <span><kbd>Enter</kbd> подтвердить</span>
            <span><kbd>Esc</kbd> закрыть</span>
          </p>
        </div>
      )}
      <p className="tp__count">{total} {pluralize(total, 'вид', 'вида', 'видов')} {pluralize(total, 'заявки', 'заявок', 'заявок')}.</p>
    </div>
  )
}
