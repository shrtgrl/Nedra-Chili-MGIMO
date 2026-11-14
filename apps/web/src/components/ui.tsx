import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import emblem from '../assets/emblem.png'
import { Icon, type IconName } from './Icon'
import { useSettings } from '../context/settings'
import { useIndicator } from '../lib/useIndicator'

/* ── Логотип ───────────────────────────────────── */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <img src={emblem} alt="" className="brand__emblem" width={44} height={38} />
      <div>
        <div className="brand__name">МУКПиД</div>
        {!compact && <div className="brand__sub">Онлайн деканат</div>}
      </div>
    </div>
  )
}

/* ── Кнопки ────────────────────────────────────── */
type BtnVariant = 'primary' | 'accent' | 'hl' | 'ghost' | 'surface' | 'danger' | 'strong'
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  icon?: IconName
  iconRight?: IconName
  block?: boolean
  size?: 'sm' | 'md' | 'lg'
}
export function Button({ variant = 'accent', icon, iconRight, block, size = 'md', className = '', children, ...rest }: BtnProps) {
  return (
    <button className={`btn btn--${variant} btn--${size} ${block ? 'btn--block' : ''} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 15 : 18} />}
    </button>
  )
}

export function ButtonLink({ to, variant = 'accent', icon, iconRight, children, size = 'md' }: { to: string; variant?: BtnVariant; icon?: IconName; iconRight?: IconName; children: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Link to={to} className={`btn btn--${variant} btn--${size}`}>
      {icon && <Icon name={icon} size={18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={18} />}
    </Link>
  )
}

export function IconButton({ icon, label, dot, onClick, to }: { icon: IconName; label: string; dot?: boolean; onClick?: () => void; to?: string }) {
  const inner = (
    <>
      <Icon name={icon} size={19} />
      {dot && <span className="icon-btn__dot" />}
    </>
  )
  return to ? (
    <Link to={to} className="icon-btn" aria-label={label} title={label}>
      {inner}
    </Link>
  ) : (
    <button type="button" className="icon-btn" aria-label={label} title={label} onClick={onClick}>
      {inner}
    </button>
  )
}

/** Солнце и луна в одной кнопке: при смене темы одно уходит с поворотом, другое выходит. */
export function ThemeIcon({ size = 19 }: { size?: number }) {
  const { theme } = useSettings()
  return (
    <span className={`theme-icon theme-icon--${theme}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon name="moon" size={size} className="theme-icon__moon" />
      <Icon name="sun" size={size} className="theme-icon__sun" />
    </span>
  )
}

/** Кнопка-ёлочка: включает новогоднее оформление (в самой новогодней теме не показывается). */
export function NewYearButton() {
  const { variant, setVariant } = useSettings()
  if (variant === 'newyear') return null
  return (
    <button type="button" className="icon-btn ny-btn" aria-label="Новогоднее оформление" title="Новогоднее оформление" onClick={() => setVariant('newyear')}>
      <svg width="22" height="24" viewBox="0 0 22 24" aria-hidden="true" className="ny-btn__tree">
        <path className="ny-btn__star" d="M11 0.6l1.15 2.35 2.6.38-1.88 1.83.44 2.58L11 6.52 8.69 7.74l.44-2.58L7.25 3.33l2.6-.38z" />
        <path className="ny-btn__body" d="M11 6.5 15.6 12.4h-2.3l4 5.1h-2.6l3.8 4.2H3.5l3.8-4.2H4.7l4-5.1H6.4z" />
        <rect className="ny-btn__trunk" x="9.6" y="21.6" width="2.8" height="2.2" rx="0.5" />
        <circle className="ny-btn__light" cx="9.4" cy="11.6" r="0.95" style={{ animationDelay: '0s' }} />
        <circle className="ny-btn__light" cx="13" cy="15.6" r="0.95" style={{ animationDelay: '0.35s' }} />
        <circle className="ny-btn__light" cx="8.4" cy="18.9" r="0.95" style={{ animationDelay: '0.7s' }} />
        <circle className="ny-btn__light" cx="14.6" cy="19.6" r="0.95" style={{ animationDelay: '1.05s' }} />
      </svg>
    </button>
  )
}

export function ThemeButton() {
  const { theme, toggleTheme } = useSettings()
  const label = theme === 'light' ? 'Тёмная тема' : 'Светлая тема'
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
    >
      <ThemeIcon />
    </button>
  )
}

/* ── Сегментированный переключатель ───────────── */
interface SegOption<T extends string> {
  value: T
  label: ReactNode
}
export function Segmented<T extends string>({ options, value, onChange, label, soft, check = true, className = '' }: { options: SegOption<T>[]; value: T; onChange: (v: T) => void; label: string; soft?: boolean; check?: boolean; className?: string }) {
  const { box, ind } = useIndicator<HTMLDivElement>(value)
  return (
    <div ref={box} className={`seg ${soft ? 'seg--soft' : ''} ${check ? 'seg--check' : ''} ${className}`} role="radiogroup" aria-label={label}>
      <span ref={ind} className="seg__ind" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={`seg__btn ${o.value === value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {check && o.value === value && <Icon name="check" size={16} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── Тумблер ───────────────────────────────────── */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`toggle ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}>
        <span className="toggle__knob" />
      </button>
    </label>
  )
}

/* ── Бейджи ────────────────────────────────────── */
export type Tone = 'neutral' | 'warn' | 'danger' | 'ok' | 'hl' | 'accent' | 'orange'
export function Badge({ tone = 'neutral', children, outline }: { tone?: Tone; children: ReactNode; outline?: boolean }) {
  return <span className={`badge badge--${tone} ${outline ? 'badge--outline' : ''}`}>{children}</span>
}

/* ── Кольцо прогресса ─────────────────────────── */
export function Ring({ value, max = 100, size = 104, stroke = 11, onAccent }: { value: number; max?: number; size?: number; stroke?: number; onAccent?: boolean }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value / max))
  return (
    <div className={`ring ${onAccent ? 'ring--accent' : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="ring__track" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring__bar"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="ring__value" style={{ fontSize: size * 0.28 }}>
        {value}
      </span>
    </div>
  )
}

/* ── Полоса баллов ─────────────────────────────── */
export function ScoreBar({ value, warn }: { value: number; warn?: boolean }) {
  return (
    <div className="scorebar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label="Баллы">
      <div className={`scorebar__fill ${warn ? 'is-warn' : ''}`} style={{ width: `${value}%` }} />
    </div>
  )
}

/* ── Ступени заявки ────────────────────────────── */
export function Stages({ stages, current, showLabels = true }: { stages: readonly string[]; current: number; showLabels?: boolean }) {
  return (
    <div className="stages" aria-label={`Статус: ${stages[current]}`}>
      {stages.map((s, i) => (
        <div key={s} className={`stages__step ${i <= current ? 'is-done' : ''}`}>
          <span className="stages__bar" />
          {showLabels && <span className="stages__label">{s}</span>}
        </div>
      ))}
    </div>
  )
}

/* ── Шапка страницы ────────────────────────────── */
export function PageHeader({ eyebrow, title, actions }: { eyebrow: ReactNode; title: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="display page-head__title">{title}</h1>
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </header>
  )
}

export function Card({ children, className = '', as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' | 'aside' }) {
  return <As className={`card ${className}`}>{children}</As>
}

export function Avatar({ initials, size = 40, tone = 'hl' }: { initials: string; size?: number; tone?: 'hl' | 'accent' | 'neutral' }) {
  return (
    <span className={`avatar avatar--${tone}`} style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">
      {initials}
    </span>
  )
}

export function Disclaimer() {
  return <p className="disclaimer">Концепт для конкурса «Вайб-кодинг» · не официальный сервис вуза · все данные вымышлены</p>
}
