import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './Icon'

export interface ComboOption {
  value: string
  hint?: string
  id?: string
}

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  /** Вызывается при выборе варианта из списка (в том числе для выбора по id). */
  onPick?: (option: ComboOption) => void
  options: ComboOption[]
  placeholder?: string
  maxLength?: number
  emptyText?: string
  loading?: boolean
  inputRef?: React.Ref<HTMLInputElement>
  invalid?: boolean
}

/**
 * Поле ввода с выпадающим списком: при вводе список сужается, как поиск.
 * Можно выбрать вариант или оставить свой текст. Стрелки, Enter и Esc работают с клавиатуры.
 */
export function Combo({ label, value, onChange, onPick, options, placeholder, maxLength, emptyText, loading, inputRef, invalid }: Props) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const box = useRef<HTMLDivElement>(null)
  const q = value.trim().toLowerCase()
  const shown = (typed && q ? options.filter((o) => o.value.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)) : options).slice(0, 30)

  useEffect(() => setActive(0), [value, open])
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const pick = (o: ComboOption) => {
    onChange(o.value)
    onPick?.(o)
    setOpen(false)
    setTyped(false)
  }

  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div ref={box} className={`combo ${open ? 'is-open' : ''}`}>
        <input
          ref={inputRef}
          className={`input combo__input ${invalid ? 'input--invalid' : ''}`}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={label}
          aria-autocomplete="list"
          autoComplete="off"
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => { onChange(e.target.value); setTyped(true); setOpen(true) }}
          onFocus={() => { setTyped(false); setOpen(true) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) setOpen(true); else setActive((a) => Math.min(a + 1, shown.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
            else if (e.key === 'Enter' && open && shown[active]) { e.preventDefault(); pick(shown[active]) }
            else if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false) }
            else if (e.key === 'Tab') setOpen(false)
          }}
        />
        <button type="button" className="combo__toggle" tabIndex={-1} aria-label={`Показать варианты: ${label}`} onClick={() => { setTyped(false); setOpen((v) => !v) }}>
          <Icon name="chevronDown" size={18} />
        </button>
        {open && (
          <ul className="combo__list" id={listId} role="listbox">
            {shown.length === 0 && <li className="combo__empty">{loading ? 'Ищем…' : emptyText ?? 'Ничего не найдено — будет добавлено как новое'}</li>}
            {shown.map((o, i) => (
              <li key={(o.id ?? '') + o.value} role="option" aria-selected={i === active}>
                <button type="button" className={`combo__opt ${i === active ? 'is-active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o)} onMouseEnter={() => setActive(i)}>
                  <b>{o.value}</b>
                  {o.hint && <span>{o.hint}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
