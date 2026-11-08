import { useLayoutEffect, useRef } from 'react'

/**
 * Скользящая «подложка» под активным элементом группы (вкладки, сегменты, меню).
 * Контейнер — position: relative; активный элемент ищется по селектору (по умолчанию `.is-active`).
 * Положение пишется прямо в style индикатора, без лишних ререндеров.
 */
export function useIndicator<T extends HTMLElement = HTMLDivElement>(dep: unknown, selector = '.is-active') {
  const box = useRef<T>(null)
  const ind = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = box.current
    const i = ind.current
    if (!el || !i) return
    const update = () => {
      const a = el.querySelector<HTMLElement>(selector)
      if (!a) {
        i.style.opacity = '0'
        return
      }
      i.style.opacity = '1'
      i.style.width = `${a.offsetWidth}px`
      i.style.height = `${a.offsetHeight}px`
      i.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`
    }
    update()
    // первое появление — без анимации, дальше — плавно
    let raf = 0
    if (!i.dataset.ready) raf = requestAnimationFrame(() => (i.dataset.ready = '1'))
    const ro = new ResizeObserver(update)
    ro.observe(el)
    el.querySelectorAll(':scope > *').forEach((c) => ro.observe(c))
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [dep, selector])

  return { box, ind }
}
