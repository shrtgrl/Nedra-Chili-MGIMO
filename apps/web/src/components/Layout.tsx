import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useIndicator } from '../lib/useIndicator'
import { Icon, type IconName } from './Icon'
import { Avatar, Brand, IconButton, NewYearButton, ThemeButton } from './ui'
import { useUser } from '../context/auth'
import { useData } from '../context/data'
import { useStaffOptional } from '../context/staff'
import { useMaterials } from '../context/materials'
import { Forest, Garland, Snowflake, useNewYear } from './newyear'

interface NavItem {
  to: string
  label: string
  icon: IconName
  badge?: number
  end?: boolean
}

function useNav(): NavItem[] {
  const user = useUser()
  const { requests, unreadCount, newInquiries } = useData()
  const staff = useStaffOptional()
  const { unread: unreadMaterials } = useMaterials()
  if (user.role === 'staff') {
    return [
      { to: '/staff', label: 'Задачи', icon: 'inbox', badge: staff?.newCount, end: true },
      { to: '/staff/schedule', label: 'Расписание групп', icon: 'calendar' },
      { to: '/staff/announcements', label: 'Объявления', icon: 'bell' },
    ]
  }
  if (user.role === 'student') {
    return [
      { to: '/student', label: 'Главная', icon: 'home', end: true },
      { to: '/student/schedule', label: 'Расписание', icon: 'calendar' },
      { to: '/student/grades', label: 'Предметы', icon: 'chart', badge: unreadMaterials },
      { to: '/student/requests', label: 'Заявки', icon: 'doc', badge: requests.filter((r) => ['submitted','in_progress'].includes(r.status)).length },
      { to: '/student/inquiries', label: 'Обращения', icon: 'inbox' },
      { to: '/student/notifications', label: 'Уведомления', icon: 'bell', badge: unreadCount },
    ]
  }
  return [
    { to: '/teacher', label: 'Главная', icon: 'home', end: true },
    { to: '/teacher/schedule', label: 'Расписание', icon: 'calendar' },
    { to: '/teacher/gradebook', label: 'Ведомость', icon: 'table' },
    { to: '/teacher/materials', label: 'Материалы', icon: 'book' },
    { to: '/teacher/deadlines', label: 'Дедлайны', icon: 'calendar' },
    { to: '/teacher/inquiries', label: 'Обращения', icon: 'inbox', badge: newInquiries },
    { to: '/teacher/notifications', label: 'Уведомления', icon: 'bell', badge: unreadCount },
  ]
}

function SidebarCard() {
  const user = useUser()
  const { sheets } = useData()
  if (user.role === 'student') return <Link to="/student/grades" className="side-card"><div className="eyebrow">Учебные материалы</div><div className="side-card__title">Файлы ваших дисциплин</div></Link>
  if (user.role === 'staff') return null
  const s = sheets[0]
  if (!s) return null
  return (
    <Link to="/teacher/gradebook" className="side-card">
      <div className="eyebrow">Ведомость</div>
      <div className="side-card__title">
        {s.subject} · {s.group}
      </div>
      <div className="side-card__meta">Открыта до {s.deadlineLabel}</div>
    </Link>
  )
}

function Sidebar() {
  const user = useUser()
  const nav = useNav()
  const profile = `/${user.role}/profile`
  const { pathname } = useLocation()
  const { box, ind } = useIndicator<HTMLElement>(pathname)
  const ny = useNewYear()
  return (
    <aside className="sidebar" aria-label="Основная навигация">
      {ny && (
        <>
          <Garland className="sidebar__garland" spacing={52} />
          <Snowflake size={96} className="sidebar__flake sidebar__flake--1" />
          <Snowflake size={44} className="sidebar__flake sidebar__flake--2" />
        </>
      )}
      <Link to={`/${user.role}`} className="sidebar__brand">
        <Brand />
      </Link>
      <nav ref={box} className="sidebar__nav">
        <span ref={ind} className="nav-ind" aria-hidden="true" />
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}>
            <Icon name={n.icon} size={19} />
            <span>{n.label}</span>
            {!!n.badge && (
              <span className="nav-item__badge" aria-label={`${n.badge} новых`}>
                {n.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__bottom">
        <SidebarCard />
        <NavLink to={profile} className={({ isActive }) => `side-user ${isActive ? 'is-active' : ''}`}>
          <Avatar initials={user.initials} size={42} />
          <span>
            <span className="side-user__name">
              {user.lastName} {user.firstName}
            </span>
            <span className="side-user__meta">{user.role === 'student' ? `${user.group} · Студент` : user.role === 'staff' ? 'Сотрудник деканата' : 'Преподаватель'}</span>
          </span>
        </NavLink>
      </div>
    </aside>
  )
}

function MobileBar() {
  const user = useUser()
  const { unreadCount } = useData()
  const staff = useStaffOptional()
  const isStaff = user.role === 'staff'
  const { pathname } = useLocation()
  const isHome = pathname === '/student' || pathname === '/teacher'
  return (
    <header className="mobile-bar">
      <Link to={`/${user.role}`} aria-label="На главную">
        <Brand compact />
      </Link>
      <div className="mobile-bar__actions">
        <ThemeButton />
        {isHome && <NewYearButton />}
        <IconButton
          icon={isStaff ? 'inbox' : 'bell'}
          label={isStaff ? 'Задачи' : 'Уведомления'}
          to={isStaff ? '/staff' : `/${user.role}/notifications`}
          dot={isStaff ? !!staff?.newCount : unreadCount > 0}
        />
        <Link to={`/${user.role}/profile`} aria-label="Профиль">
          <Avatar initials={user.initials} size={44} />
        </Link>
      </div>
    </header>
  )
}

/* Нижнее меню на телефоне: 4 главных раздела, остальное — под «Ещё».
   У активного пункта рядом с иконкой появляется подпись. */
function BottomNav() {
  const user = useUser()
  const nav = useNav()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const primary = nav.length > 5 || user.role === 'teacher' ? nav.slice(0, 4) : nav
  const extra: NavItem[] = [...nav.slice(primary.length), { to: `/${user.role}/profile`, label: 'Профиль', icon: 'user' }]
  const hasMore = primary.length < nav.length || user.role !== 'staff'
  const extraActive = extra.find((n) => pathname === n.to || pathname.startsWith(n.to + '/'))
  const extraBadge = extra.some((n) => (n.badge ?? 0) > 0)

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {open && <button type="button" className="more-backdrop" aria-label="Закрыть меню" onClick={() => setOpen(false)} />}
      {open && (
        <div className="more-sheet" id="more-sheet" role="menu" aria-label="Ещё разделы">
          {extra.map((n) => (
            <NavLink key={n.to} to={n.to} role="menuitem" className={({ isActive }) => `more-sheet__item ${isActive ? 'is-active' : ''}`}>
              <Icon name={n.icon} size={20} />
              <span>{n.label}</span>
              {!!n.badge && <span className="more-sheet__badge">{n.badge}</span>}
            </NavLink>
          ))}
        </div>
      )}
      <nav className="bottom-nav" aria-label="Навигация">
        {primary.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`} aria-label={n.label}>
            <span className="bottom-nav__icon">
              <Icon name={n.icon} size={22} />
              {!!n.badge && <i className="bottom-nav__dot" aria-hidden="true" />}
            </span>
            <span className="bottom-nav__label">{n.label}</span>
          </NavLink>
        ))}
        {hasMore && (
          <button
            type="button"
            className={`bottom-nav__item ${extraActive && !open ? 'is-active' : ''} ${open ? 'is-open' : ''}`}
            aria-label="Ещё"
            aria-expanded={open}
            aria-controls="more-sheet"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="bottom-nav__icon">
              <Icon name={open ? 'x' : extraActive ? extraActive.icon : 'more'} size={22} />
              {extraBadge && !open && <i className="bottom-nav__dot" aria-hidden="true" />}
            </span>
            <span className="bottom-nav__label">{extraActive ? extraActive.label : 'Ещё'}</span>
          </button>
        )}
      </nav>
    </>
  )
}

function ForestSlot() {
  return useNewYear() ? <Forest /> : null
}

export function AppLayout() {
  const { loading, error, reload } = useData()
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div className="app">
      <Sidebar />
      <div className="app__main">
        <MobileBar />
        <main className="content" id="main">
          {loading && <p role="status">Загружаем данные…</p>}
          {error && <p className="form-error" role="alert">{error} <button className="link-btn" onClick={() => void reload()}>Повторить</button></p>}
          <Outlet />
        </main>
        <ForestSlot />
      </div>
      <BottomNav />
    </div>
  )
}
