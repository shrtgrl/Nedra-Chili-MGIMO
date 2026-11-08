import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Role, User } from '../types'
import { DEMO_PASSWORD, USERS } from '../data/mock'
import { load, remove, save } from '../lib/storage'

interface Auth {
  user: User | null
  /** Возвращает текст ошибки или null при успехе. */
  login: (email: string, password: string, role: Role) => Promise<string | null>
  logout: () => void
}

const Ctx = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => load<string | null>('user', null))
  const user = USERS.find((u) => u.id === userId) ?? null

  const value = useMemo<Auth>(
    () => ({
      user,
      async login(email, password, role) {
        // Имитация запроса к API
        await new Promise((r) => setTimeout(r, 450))
        const u = USERS.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
        if (!u || password !== DEMO_PASSWORD) return 'Неверная почта или пароль'
        if (u.role !== role)
          return role === 'student'
            ? 'Это аккаунт преподавателя — переключитесь на вкладку «Преподаватель»'
            : 'Это аккаунт студента — переключитесь на вкладку «Студент»'
        setUserId(u.id)
        save('user', u.id)
        return null
      },
      logout() {
        setUserId(null)
        remove('user')
      },
    }),
    [user],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
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
