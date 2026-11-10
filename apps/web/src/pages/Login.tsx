import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo-full.webp'
import logoGold from '../assets/logo-gold.webp'
import { useAuth } from '../context/auth'
import { useSettings } from '../context/settings'
import { Button, Segmented, ThemeIcon } from '../components/ui'
import { Icon } from '../components/Icon'
import { Garland, Snowflake, Tree, TreeSilhouette, useNewYear } from '../components/newyear'
import type { Role } from '../types'

const DEMO: Record<Role, string> = {
  student: 'student@edu.mukpid.ru',
  teacher: 'teacher@mukpid.ru',
}

export function LoginPage() {
  const { login } = useAuth()
  const { theme, toggleTheme } = useSettings()
  const navigate = useNavigate()
  const ny = useNewYear()

  // страница входа статична: прокрутку документа выключаем, пока она открыта
  useEffect(() => {
    document.documentElement.classList.add('lock-scroll')
    return () => document.documentElement.classList.remove('lock-scroll')
  }, [])
  const [role, setRole] = useState<Role>('student')
  const [email, setEmail] = useState(DEMO.student)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const switchRole = (r: Role) => {
    setRole(r)
    if (Object.values(DEMO).includes(email)) setEmail(DEMO[r])
    setError(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const err = await login(email, password, role)
    setBusy(false)
    if (err) setError(err)
    else navigate(role === 'student' ? '/student' : '/teacher', { replace: true })
  }

  return (
    <div className="login">
      <section className={`login__promo ${ny ? 'login__promo--ny' : ''}`} aria-label="О сервисе">
        {ny && (
          <>
            <Garland className="login__garland" spacing={96} />
            <Snowflake size={46} className="promo-flake promo-flake--1" />
            <Snowflake size={170} className="promo-flake promo-flake--2" />
            <Snowflake size={90} className="promo-flake promo-flake--3" />
            <div className="promo-forest" aria-hidden="true">
              {Array.from({ length: 16 }, (_, i) => (
                <TreeSilhouette key={i} height={60 + ((i * 41) % 70)} />
              ))}
            </div>
          </>
        )}
        <div className="login__promo-top">
          <span className="login__wordmark">МУКПиД</span>
          <span className="eyebrow">Онлайн деканат</span>
        </div>
        <div className="login__promo-body">
          <img src={ny ? logoGold : logo} alt="Герб МУКПиД им. Дженны Ортеги" className="login__logo" />
          {ny ? (
            <>
              <h2 className="display login__headline">С Новым годом, МУКПиД!</h2>
              <p className="login__lead">Каникулы — с 31 декабря по 11 января. Зимняя сессия начинается 12 января: расписание и баллы уже здесь.</p>
            </>
          ) : (
            <>
              <h2 className="display login__headline">Вся учёба — в одном окне</h2>
              <p className="login__lead">Расписание, баллы, справки и обращения к преподавателям. Для студентов и преподавателей.</p>
            </>
          )}
        </div>
        <ul className="login__pills" aria-label="Разделы">
          <li>Расписание</li>
          <li>Успеваемость</li>
          <li>Заявки и справки</li>
          <li>Обращения</li>
        </ul>
      </section>

      <section className={`login__form-wrap ${ny ? 'login__form-wrap--ny' : ''}`}>
        {ny && (
          <div className="login__trees" aria-hidden="true">
            <Tree height={160} delay={0.2} />
            <Tree height={180} delay={0.9} />
          </div>
        )}
        <button type="button" className="login__theme" onClick={toggleTheme} aria-label={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}>
          <ThemeIcon size={17} />
          <span className="login__theme-label">{theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}</span>
        </button>

        <form className="login__form" onSubmit={submit} noValidate>
          <div className="eyebrow">Добро пожаловать</div>
          <h1 className="display login__title">Вход</h1>
          <p className="muted">Используйте учебную почту и пароль от личного кабинета.</p>

          <Segmented
            label="Роль"
            className="login__roles"
            value={role}
            onChange={switchRole}
            options={[
              { value: 'student', label: 'Студент' },
              { value: 'teacher', label: 'Преподаватель' },
            ]}
          />

          <label className="field">
            <span className="field__label">Логин</span>
            <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <div className="field">
            <div className="field__row">
              <label className="field__label" htmlFor="pwd">
                Пароль
              </label>
              <button type="button" className="link-btn" onClick={() => setForgot((v) => !v)}>
                Забыли пароль?
              </button>
            </div>
            <div className="input-wrap">
              <input
                id="pwd"
                className="input input--with-btn"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="input-btn"
                aria-label={showPwd ? 'Скрыть пароль' : 'Показать пароль'}
                aria-pressed={showPwd}
                aria-controls="pwd"
                title={showPwd ? 'Скрыть пароль' : 'Показать пароль'}
                onClick={() => setShowPwd((v) => !v)}
              >
                <span className={`eye-toggle ${showPwd ? 'is-shown' : ''}`}>
                  <Icon name="eye" size={20} className="eye-toggle__open" />
                  <Icon name="eyeOff" size={20} className="eye-toggle__closed" />
                </span>
              </button>
            </div>
            {forgot && <p className="field__hint">Для демонстрационного аккаунта используйте пароль, заданный при заполнении базы.</p>}
          </div>

          {error && (
            <p className="form-error" role="alert">
              <Icon name="alert" size={16} /> {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" block iconRight="arrowRight" disabled={busy}>
            {busy ? 'Входим…' : 'Войти'}
          </Button>

          <div className="login__demo">
            <b>Тестовые аккаунты</b>
            <span>
              student@edu.mukpid.ru · teacher@mukpid.ru — пароли задаются при заполнении базы
            </span>
          </div>
          <p className="login__note">Концепт для конкурса «Вайб-кодинг». Не является официальным сервисом вуза. Все данные вымышлены.</p>
        </form>
      </section>
    </div>
  )
}
