import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import type { Theme, Variant } from '../types'
import { load, save } from '../lib/storage'

interface Settings {
  theme: Theme
  variant: Variant
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  setVariant: (v: Variant) => void
}

const Ctx = createContext<Settings | null>(null)

const systemTheme = (): Theme => {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => load<Theme>('theme', systemTheme()))
  // «Туман» — основной вариант оформления
  const [variant, setVariant] = useState<Variant>(() => load<Variant>('variant', 'fog'))

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.variant = variant
    save('theme', theme)
    save('variant', variant)
  }, [theme, variant])

  const value = useMemo<Settings>(
    () => ({
      theme,
      variant,
      setTheme,
      setVariant,
      toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
    }),
    [theme, variant],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSettings() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSettings вне SettingsProvider')
  return v
}
