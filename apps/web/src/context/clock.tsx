import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const Clock = createContext<Date>(new Date())

export function ClockProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const update = () => setNow(new Date())
    const timer = window.setInterval(update, 15_000)
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  return <Clock.Provider value={now}>{children}</Clock.Provider>
}

export const useNow = () => useContext(Clock)
