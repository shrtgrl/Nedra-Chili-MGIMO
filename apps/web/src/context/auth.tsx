import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '../types'
import { ApiError, authApi, type ApiProfile } from '../lib/api'

interface Auth {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<string | null>
}

const Ctx = createContext<Auth | null>(null)

/**
 * Разбор полного имени. В базе встречаются оба порядка:
 * «Фамилия Имя Отчество» (если третье слово — отчество) и «Имя Фамилия …».
 * Пометки в скобках вроде «(демо)» отбрасываем.
 */
function splitName(fullName: string) {
  const words = fullName.replace(/\(.*?\)/g, ' ').trim().split(/\s+/).filter(Boolean)
  const isPatronymic = (w = '') => /(вич|вна|ична|инична|оглы|кызы)$/i.test(w)
  if (words.length >= 3 && isPatronymic(words[2])) {
    const [lastName, firstName, ...rest] = words
    return { lastName, firstName, rest }
  }
  const [firstName = '', lastName = '', ...rest] = words
  return { firstName, lastName, rest }
}

function toUser(profile: ApiProfile): User {
  const { firstName, lastName, rest } = splitName(profile.fullName)
  const group = profile.groupName ?? undefined
  return {
    id: profile.id, role: profile.role, email: profile.email,
    firstName, lastName, patronymic: rest.join(' ') || undefined,
    initials: `${lastName[0] ?? ''}${firstName[0] ?? ''}`,
    group,
    department: profile.role === 'teacher' ? profile.department ?? profile.faculty ?? '' : profile.faculty ?? '',
    title: profile.role === 'student' ? `Студент · группа ${group ?? '—'}`
      : profile.role === 'staff' ? 'Сотрудник деканата'
      : `Преподаватель · ${profile.department ?? 'кафедра не указана'}`,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    authApi.me().then(profile => { if (active) setUser(toUser(profile)) })
      .catch(() => { if (active) setUser(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  // Роль определяет сервер по аккаунту: пользователь её не выбирает.
  const login: Auth['login'] = async (email, password) => {
    try {
      await authApi.login(email.trim(), password)
      const profile = await authApi.me()
      setUser(toUser(profile))
      return null
    } catch (error) {
      return error instanceof ApiError ? error.message : 'Не удалось войти. Попробуйте ещё раз.'
    }
  }

  const logout: Auth['logout'] = async () => {
    try {
      await authApi.logout()
      setUser(null)
      return null
    } catch (error) {
      return error instanceof ApiError ? error.message : 'Не удалось выйти. Попробуйте ещё раз.'
    }
  }

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth вне AuthProvider')
  return v
}

export function useUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('Пользователь не авторизован')
  return user
}
