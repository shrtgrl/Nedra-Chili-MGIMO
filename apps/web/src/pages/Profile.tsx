import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useUser } from '../context/auth'
import { useData } from '../context/data'
import { useSettings } from '../context/settings'
import { useToast } from '../context/toast'
import type { Theme, Variant } from '../types'
import { Icon } from '../components/Icon'
import { Avatar, Button, Disclaimer, IconButton, PageHeader, Toggle } from '../components/ui'

// Цвета для мини-превью (совпадают с tokens.css)
const PREVIEW: Record<Variant, Record<Theme, { bg: string; side: string; card: string; hero?: string }>> = {
  newyear: {
    light: { bg: '#f7f3e9', side: '#1d4c3a', card: '#ffffff', hero: '#a51d34' },
    dark: { bg: '#0c1525', side: '#1d4c3a', card: '#142137', hero: '#8f1a2e' },
  },
  fog: {
    light: { bg: '#f5f4ef', side: '#c3cbd8', card: '#ffffff' },
    dark: { bg: '#101116', side: '#afb8c9', card: '#191c25' },
  },
  graphite: {
    light: { bg: '#f5f4ef', side: '#495468', card: '#ffffff' },
    dark: { bg: '#101116', side: '#353c4e', card: '#191c25' },
  },
}

function Preview({ variant, theme }: { variant: Variant; theme: Theme }) {
  const c = PREVIEW[variant][theme]
  return (
    <span className="preview" style={{ background: c.bg }} aria-hidden="true">
      <span className="preview__side" style={{ background: c.side }} />
      <span className="preview__main">
        <span className="preview__hero" style={{ background: c.hero ?? c.side }} />
        <span className="preview__row">
          <span style={{ background: c.card }} />
          <span style={{ background: '#eff0a4' }} />
        </span>
      </span>
    </span>
  )
}

export function ProfilePage() {
  const user = useUser()
  const { logout } = useAuth()
  const { theme, setTheme, variant, setVariant } = useSettings()
  const { prefs, setPref, unreadCount, newInquiries } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const isStudent = user.role === 'student'
  const isStaff = user.role === 'staff'
  const [appearanceOpen, setAppearanceOpen] = useState(false)

  const rows: [string, string][] = isStaff
    ? [
        ['Подразделение', user.department],
        ['Почта', user.email],
        ['Роль', 'Сотрудник деканата'],
      ]
    : isStudent
    ? [
        ['Подразделение', user.department],
        ['Группа', user.group ?? '—'],
        ['Почта', user.email],
        ['Роль', 'Студент'],
      ]
    : [
        ['Подразделение', user.department],
        ['Почта', user.email],
        ['Роль', 'Преподаватель'],
      ]

  return (
    <>
      <PageHeader
        eyebrow="Личный кабинет"
        title="Профиль"
        actions={
          <IconButton
            icon={isStudent ? 'bell' : 'inbox'}
            label={isStudent ? 'Уведомления' : isStaff ? 'Задачи' : 'Обращения'}
            to={isStudent ? '/student/notifications' : isStaff ? '/staff' : '/teacher/inquiries'}
            dot={isStudent ? unreadCount > 0 : isStaff ? false : newInquiries > 0}
          />
        }
      />
      <div className="grid-profile">
        <section className="card card--flush">
          <div className="profile-head">
            <Avatar initials={user.initials} size={100} tone="accent" />
            <div>
              <h2 className="display profile-head__name">
                {user.lastName} {user.firstName}
                {user.patronymic ? ` ${user.patronymic}` : ''}
              </h2>
              <p>{user.title}</p>
            </div>
          </div>
          <dl className="props">
            {rows.map(([k, v]) => (
              <div key={k} className="props__row">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="stack">
          <section className={`card collapse ${appearanceOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="collapse__head"
              aria-expanded={appearanceOpen}
              aria-controls="appearance-panel"
              onClick={() => setAppearanceOpen((v) => !v)}
            >
              <span>
                <span className="card__title card__title--lg">Оформление</span>
                <span className="collapse__summary">
                  {theme === 'light' ? 'Светлая' : 'Тёмная'} · {variant === 'fog' ? 'Туман' : variant === 'graphite' ? 'Графитово-синий' : 'Новогодняя'}
                </span>
              </span>
              <Icon name="chevronDown" size={22} className="collapse__chevron" />
            </button>
            <div id="appearance-panel" className="collapse__panel" inert={!appearanceOpen} aria-hidden={!appearanceOpen}>
              <div className="collapse__inner">
            <div className="theme-grid" role="radiogroup" aria-label="Тема">
              {(['light', 'dark'] as Theme[]).map((t) => (
                <button key={t} type="button" role="radio" aria-checked={theme === t} className={`theme-opt ${theme === t ? 'is-active' : ''}`} onClick={() => setTheme(t)}>
                  <Preview variant={variant} theme={t} />
                  <span>{t === 'light' ? 'Светлая' : 'Тёмная'}</span>
                </button>
              ))}
            </div>

            <h3 className="subhead">Цветовой вариант</h3>
            <div className="theme-grid theme-grid--3" role="radiogroup" aria-label="Цветовой вариант">
              {(['fog', 'graphite', 'newyear'] as Variant[]).map((v) => (
                <button key={v} type="button" role="radio" aria-checked={variant === v} className={`theme-opt ${variant === v ? 'is-active' : ''}`} onClick={() => setVariant(v)}>
                  <Preview variant={v} theme={theme} />
                  <span className="theme-opt__label">
                    <span className="theme-opt__name">{v === 'fog' ? 'Туман' : v === 'graphite' ? 'Графитово-синий' : 'Новогодняя'}</span>
                    {v === 'fog' && <small className="theme-opt__tag">основной</small>}
                  </span>
                </button>
              ))}
            </div>
              </div>
            </div>
          </section>

          {!isStaff && <section className="card prefs">
            <h2 className="card__title card__title--lg">Настройки уведомлений</h2>
            {isStudent ? (
              <>
                <Toggle label="Дедлайны" checked={prefs.deadlines} onChange={(v) => setPref('deadlines', v)} />
                <Toggle label="Изменения в расписании" checked={prefs.schedule} onChange={(v) => setPref('schedule', v)} />
                <Toggle label="Новости деканата" checked={prefs.news} onChange={(v) => setPref('news', v)} />
              </>
            ) : (
              <>
                <Toggle label="Дедлайны" checked={prefs.deadlines} onChange={(v) => setPref('deadlines', v)} />
                <Toggle label="Изменения в расписании" checked={prefs.schedule} onChange={(v) => setPref('schedule', v)} />
                <Toggle label="Новости деканата" checked={prefs.news} onChange={(v) => setPref('news', v)} />
              </>
            )}
          </section>}

          <Button
            variant="danger"
            size="lg"
            block
            icon="logout"
            onClick={() => {
              void logout().then((error) => {
                if (error) toast(error)
                else navigate('/login', { replace: true })
              })
            }}
          >
            Выйти из кабинета
          </Button>

        </div>
      </div>
      <Disclaimer />
    </>
  )
}
