import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, staffApi, type ApiStaffRequest } from '../lib/api'

interface Staff {
  requests: ApiStaffRequest[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  /** Перевод заявки на следующий статус; возвращает текст ошибки или null. */
  advance: (id: string, status: 'in_progress' | 'ready' | 'issued') => Promise<string | null>
  newCount: number
}

const Ctx = createContext<Staff | null>(null)

export function StaffProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<ApiStaffRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setRequests(await staffApi.requests())
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось загрузить заявки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
    // очередь живая: обновляем при возвращении на вкладку и раз в минуту
    const onFocus = () => void reload()
    const timer = window.setInterval(onFocus, 60_000)
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [reload])

  const advance: Staff['advance'] = useCallback(async (id, status) => {
    try {
      const updated = await staffApi.setStatus(id, status)
      setRequests((xs) => xs.map((r) => (r.id === id ? { ...r, ...updated } : r)))
      return null
    } catch (e) {
      void reload()
      return e instanceof ApiError ? e.message : 'Не удалось изменить статус'
    }
  }, [reload])

  const value = useMemo<Staff>(
    () => ({ requests, loading, error, reload, advance, newCount: requests.filter((r) => r.status === 'submitted').length }),
    [requests, loading, error, reload, advance],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStaffOptional = () => useContext(Ctx)
export function useStaff() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStaff вне StaffProvider')
  return v
}
