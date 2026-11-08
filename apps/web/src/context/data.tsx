import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { GradeSheet, Inquiry, InquiryStatus, Notice, NotifyPrefs, StudentRequest } from '../types'
import { DEMO_NOW, INITIAL_INQUIRIES, INITIAL_NOTICES, INITIAL_REQUESTS, INITIAL_SHEETS } from '../data/mock'
import { load, save } from '../lib/storage'
import { dayMonth } from '../lib/format'

/*
  Клиентское «хранилище» демо-данных. В реальном проекте здесь будут запросы к API
  деканата; интерфейс контекста при этом можно оставить прежним.
*/
interface Data {
  requests: StudentRequest[]
  addRequest: (r: Omit<StudentRequest, 'id' | 'stage' | 'createdLabel'>) => void
  cancelRequest: (id: string) => void

  notices: Notice[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void

  prefs: NotifyPrefs
  setPref: (k: keyof NotifyPrefs, v: boolean) => void

  inquiries: Inquiry[]
  newInquiries: number
  setInquiryStatus: (id: string, s: InquiryStatus) => void
  replyInquiry: (id: string, text: string) => void

  sheets: GradeSheet[]
  saveSheet: (sheet: GradeSheet) => void

  resetDemo: () => void
}

const Ctx = createContext<Data | null>(null)

function usePersisted<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => load(key, initial))
  useEffect(() => save(key, v), [key, v])
  return [v, setV] as const
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = usePersisted('requests', INITIAL_REQUESTS)
  const [notices, setNotices] = usePersisted('notices', INITIAL_NOTICES)
  const [prefs, setPrefs] = usePersisted<NotifyPrefs>('prefs', { deadlines: true, schedule: true, news: false })
  const [inquiries, setInquiries] = usePersisted('inquiries', INITIAL_INQUIRIES)
  const [sheets, setSheets] = usePersisted('sheets', INITIAL_SHEETS)

  const value = useMemo<Data>(() => {
    const createdLabel = dayMonth(DEMO_NOW)
    return {
      requests,
      addRequest: (r) =>
        setRequests((xs) => [{ ...r, id: `r${Date.now()}`, stage: 0, createdLabel }, ...xs]),
      cancelRequest: (id) => setRequests((xs) => xs.filter((x) => x.id !== id)),

      notices,
      unreadCount: notices.filter((n) => n.unread).length,
      markRead: (id) => setNotices((xs) => xs.map((n) => (n.id === id ? { ...n, unread: false } : n))),
      markAllRead: () => setNotices((xs) => xs.map((n) => ({ ...n, unread: false }))),

      prefs,
      setPref: (k, v) => setPrefs((p) => ({ ...p, [k]: v })),

      inquiries,
      newInquiries: inquiries.filter((q) => q.status === 'new').length,
      setInquiryStatus: (id, s) => setInquiries((xs) => xs.map((q) => (q.id === id ? { ...q, status: s } : q))),
      replyInquiry: (id, text) =>
        setInquiries((xs) =>
          xs.map((q) => (q.id === id ? { ...q, replies: [...q.replies, text], status: q.status === 'new' ? 'progress' : q.status } : q)),
        ),

      sheets,
      saveSheet: (sheet) => setSheets((xs) => xs.map((s) => (s.id === sheet.id ? sheet : s))),

      resetDemo: () => {
        setRequests(INITIAL_REQUESTS)
        setNotices(INITIAL_NOTICES)
        setPrefs({ deadlines: true, schedule: true, news: false })
        setInquiries(INITIAL_INQUIRIES)
        setSheets(INITIAL_SHEETS)
      },
    }
  }, [requests, notices, prefs, inquiries, sheets, setRequests, setNotices, setPrefs, setInquiries, setSheets])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useData вне DataProvider')
  return v
}
