import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Material } from '../types'
import { INITIAL_MATERIALS } from '../data/mock'
import { load, save } from '../lib/storage'
import { useAuth } from './auth'

/*
  Материалы, которые преподаватели рассылают группам.
  Хранилище общее для всех пользователей этого браузера (а не отдельное на пользователя),
  поэтому в демо материал, отправленный преподавателем, сразу виден студентам этой группы.
  В боевой версии здесь будут запросы к API, интерфейс контекста можно оставить прежним.
*/
export const MAX_FILE_BYTES = 1024 * 1024
export const MAX_FILES = 3
export const MAX_LINKS = 5

export type MaterialInput = Omit<Material, 'id' | 'createdAt' | 'authorId' | 'teacherName'>

interface Ctx {
  materials: Material[]
  /** Материалы для текущего студента (по его группе). */
  forMe: Material[]
  /** Материалы, отправленные текущим преподавателем. */
  mine: Material[]
  unread: number
  isRead: (id: string) => boolean
  markRead: (id: string) => void
  /** Возвращает текст ошибки или null, если всё получилось. */
  publish: (input: MaterialInput) => string | null
  remove: (id: string) => void
}

const C = createContext<Ctx | null>(null)
const KEY = 'materials'

function shortName(u: { lastName: string; firstName: string; patronymic?: string }) {
  const f = u.firstName ? `${u.firstName[0]}.` : ''
  const p = u.patronymic ? ` ${u.patronymic[0]}.` : ''
  return `${u.lastName} ${f}${p}`.trim()
}

function persist(items: Material[]): boolean {
  try {
    localStorage.setItem('mukpid:' + KEY, JSON.stringify(items))
    return true
  } catch {
    return false
  }
}

export function MaterialsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [materials, setMaterials] = useState<Material[]>(() => load<Material[]>(KEY, INITIAL_MATERIALS))
  const readKey = user ? `${user.id}:materials-read` : null
  const [read, setRead] = useState<string[]>(() => (readKey ? load<string[]>(readKey, []) : []))

  useEffect(() => {
    setRead(readKey ? load<string[]>(readKey, []) : [])
  }, [readKey])

  // Синхронизация между вкладками: преподаватель в одной, студент в другой.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'mukpid:' + KEY) setMaterials(load<Material[]>(KEY, INITIAL_MATERIALS))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const publish = useCallback(
    (input: MaterialInput) => {
      if (!user) return 'Войдите в систему'
      const item: Material = {
        ...input,
        id: `m-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        authorId: user.id,
        teacherName: shortName(user),
      }
      const next = [item, ...materials]
      if (!persist(next)) return 'Не удалось сохранить: в браузере не хватает места. Уберите файлы или сделайте их меньше.'
      setMaterials(next)
      return null
    },
    [user, materials],
  )

  const remove = useCallback(
    (id: string) => {
      const next = materials.filter((m) => m.id !== id)
      persist(next)
      setMaterials(next)
    },
    [materials],
  )

  const markRead = useCallback(
    (id: string) => {
      if (!readKey) return
      setRead((r) => {
        if (r.includes(id)) return r
        const next = [...r, id]
        save(readKey, next)
        return next
      })
    },
    [readKey],
  )

  const value = useMemo<Ctx>(() => {
    const sorted = [...materials].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const forMe = user?.role === 'student' && user.group ? sorted.filter((m) => m.groups.includes(user.group!)) : []
    const mine = user?.role === 'teacher' ? sorted.filter((m) => m.authorId === user.id) : []
    return {
      materials: sorted,
      forMe,
      mine,
      unread: forMe.filter((m) => !read.includes(m.id)).length,
      isRead: (id) => read.includes(id),
      markRead,
      publish,
      remove,
    }
  }, [materials, user, read, markRead, publish, remove])

  return <C.Provider value={value}>{children}</C.Provider>
}

export function useMaterials() {
  const v = useContext(C)
  if (!v) throw new Error('useMaterials вне MaterialsProvider')
  return v
}
