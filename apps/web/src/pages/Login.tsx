import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo-full.webp'
import { useAuth } from '../context/auth'
import { useSettings } from '../context/settings'
import { Button, Segmented, ThemeIcon } from '../components/ui'
import { Icon } from '../components/Icon'
import type { Role } from '../types'

const DEMO: Record<Role, string> = {
  student: 'student@mukpid.example',
  teacher: 'teacher@mukpid.example',
}

export function LoginPage() {
  const { login } = useAuth()
  const { theme, toggleTheme } = useSettings()
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('student')
  const [email, setEmail] = useState(DEMO.student)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [forgot, setForgot] = useState(false)

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
      <section className="login__promo" aria-label="О сервисе">
        <div className="login__promo-top">
          <span className="login__wordmark">МУКПиД</span>
          <span className="eyebrow">Онлайн деканат</span>
        </div>
        <div className="login__promo-body">
          <img src={logo} alt="Герб МУКПиД им. Дженны Ортеги" className="login__logo" />
          <h2 className="display login__headline">Вся учёба — в одном окне</h2>
          <p className="login__lead">Расписание, баллы, справки и обращения к преподавателям. Для студентов и преподавателей.</p>
        </div>
        <ul className="login__pills">
          <li>Расписание</li>
          <li>Успеваемость</li>
          <li>Заявки и справки</li>
          <li>Обращения</li>
        </ul>
      </section>

      <section className="login__form-wrap">
        <button type="button" className="login__theme" onClick={toggleTheme}>
          <ThemeIcon size={17} />
          {theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
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
            <input id="pwd" className="input" type="password" autoComplete="current-password" placeholder="•••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {forgot && <p className="field__hint">Восстановление пароля — через учебный офис деканата, ауд. 101. В демо пароль: demo123.</p>}
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
              student@mukpid.example · teacher@mukpid.example — пароль demo123
            </span>
          </div>
          <p className="login__note">Концепт для конкурса «Вайб-кодинг». Не является официальным сервисом вуза. Все данные вымышлены.</p>
        </form>
      </section>
    </div>
  )
}
