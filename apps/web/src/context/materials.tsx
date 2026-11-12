import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dataApi, type ApiMaterial } from '../lib/api'
import { load, save } from '../lib/storage'
import { toBase64 } from '../lib/materials'
import { useAuth } from './auth'

/*
  Учебные материалы: файлы, которые преподаватель прикрепляет к своей дисциплине и группе.
  Список приходит с сервера (студент видит файлы своей группы, преподаватель — свои).
  Отметки «прочитано» хранятся только в этом браузере.
*/
interface Ctx {
  /** Материалы для текущего студента. */
  forMe: ApiMaterial[]
  /** Материалы, добавленные текущим преподавателем. */
  mine: ApiMaterial[]
  loading: boolean
  error: string | null
  unread: number
  isRead: (id: string) => boolean
  markRead: (id: string) => void
  reload: () => Promise<void>
  /** Загружает файл в каждую выбранную связку «дисциплина + группа». Возвращает текст ошибки или null. */
  publish: (assignmentIds: string[], title: string, file: File) => Promise<string | null>
  remove: (id: string) => Promise<string | null>
}

const C = createContext<Ctx | null>(null)
const msg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

export function MaterialsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const enabled = !!user && (user.role === 'student' || user.role === 'teacher')
  const [rows, setRows] = useState<ApiMaterial[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const readKey = user ? `${user.id}:materials-read` : null
  const [read, setRead] = useState<string[]>(() => (readKey ? load<string[]>(readKey, []) : []))

  useEffect(() => {
    setRead(readKey ? load<string[]>(readKey, []) : [])
  }, [readKey])

  const reload = useCallback(async () => {
    if (!enabled) { setRows([]); return }
    setLoading(true)
    try {
      setRows(await dataApi.materials())
      setError(null)
    } catch (e) {
      setError(msg(e, 'Не удалось загрузить материалы'))
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => { void reload() }, [reload, user?.id])

  const publish = useCallback(
    async (assignmentIds: string[], title: string, file: File) => {
      try {
        const contentBase64 = await toBase64(file)
        for (const assignmentId of assignmentIds) {
          await dataApi.uploadMaterial({ assignmentId, title, fileName: file.name, contentBase64 })
        }
        await reload()
        return null
      } catch (e) {
        await reload()
        return msg(e, 'Не удалось загрузить файл')
      }
    },
    [reload],
  )

  const remove = useCallback(
    async (id: string) => {
      try {
        await dataApi.deleteMaterial(id)
        await reload()
        return null
      } catch (e) {
        return msg(e, 'Не удалось удалить')
      }
    },
    [reload],
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
    const sorted = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const forMe = user?.role === 'student' ? sorted : []
    const mine = user?.role === 'teacher' ? sorted : []
    return { forMe, mine, loading, error, unread: forMe.filter((m) => !read.includes(m.id)).length, isRead: (id) => read.includes(id), markRead, reload, publish, remove }
  }, [rows, user, loading, error, read, markRead, reload, publish, remove])

  return <C.Provider value={value}>{children}</C.Provider>
}

export function useMaterials() {
  const v = useContext(C)
  if (!v) throw new Error('useMaterials вне MaterialsProvider')
  return v
}
