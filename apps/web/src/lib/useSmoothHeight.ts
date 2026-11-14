import { useEffect, useLayoutEffect, useRef } from 'react'

/* Плавно меняет высоту обёртки, когда внутри заменился блок (например, форма «В деканат / Преподавателю»).
   Обёртка получает ref; внутри неё должен быть один корневой элемент, который меняется по ключу. */
export function useSmoothHeight(dep: unknown) {
  const wrap = useRef<HTMLDivElement>(null)
  const prev = useRef<number | null>(null)
  const busy = useRef(false)

  useEffect(() => {
    const inner = wrap.current?.firstElementChild
    if (!inner || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      if (!busy.current) prev.current = (inner as HTMLElement).offsetHeight
    })
    ro.observe(inner)
    return () => ro.disconnect()
  }, [dep])

  useLayoutEffect(() => {
    const el = wrap.current
    const inner = el?.firstElementChild as HTMLElement | null | undefined
    if (!el || !inner) return
    const next = inner.offsetHeight
    const from = prev.current
    prev.current = next
    if (from === null || from === next || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    busy.current = true
    el.style.height = `${from}px`
    el.style.overflow = 'hidden'
    void el.offsetHeight
    el.style.transition = 'height 0.32s cubic-bezier(0.2, 0.8, 0.3, 1)'
    el.style.height = `${next}px`
    const done = () => {
      el.style.height = ''
      el.style.overflow = ''
      el.style.transition = ''
      busy.current = false
      el.removeEventListener('transitionend', done)
    }
    el.addEventListener('transitionend', done)
    const t = window.setTimeout(done, 450)
    return () => window.clearTimeout(t)
  }, [dep])

  return wrap
}
