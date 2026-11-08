import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Icon } from '../components/Icon'

const Ctx = createContext<(msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([])
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random()
    setItems((xs) => [...xs, { id, msg }])
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 2800)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="toast">
            <Icon name="check" size={16} />
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
