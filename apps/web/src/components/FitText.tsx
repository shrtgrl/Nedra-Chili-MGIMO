import { useLayoutEffect, useRef, type ElementType, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  /** Наибольший размер шрифта, px. Дальше текст уменьшается, пока не поместится. */
  max: number
  /** Наименьший размер шрифта, px. */
  min: number
  /** Сколько строк допустимо (слова не переносятся посередине). */
  lines?: number
  /** Все заголовки внутри ближайшего [data-fit-group] получают один размер — наименьший из нужных (ровная сетка карточек). */
  grouped?: boolean
  as?: ElementType
}

/** Общий размер группы = наименьший из «собственных» размеров её заголовков. */
function regroup(group: HTMLElement | null) {
  if (!group) return
  const sizes = [...group.querySelectorAll<HTMLElement>('.fit-text[data-fit-own]')].map((e) => Number(e.dataset.fitOwn))
  if (sizes.length) group.style.setProperty('--fit-size', `${Math.min(...sizes)}px`)
}

/**
 * Текст, размер которого подстраивается под ширину блока: слова целиком, без переноса по буквам,
 * не больше `lines` строк. Подгоняется заново при изменении размера блока и после загрузки шрифтов.
 */
export function FitText({ children, className = '', max, min, lines = 2, grouped = false, as: Tag = 'div' }: Props) {
  const ref = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const group = grouped ? el.closest<HTMLElement>('[data-fit-group]') : null
    let frame = 0
    const fit = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!el.clientWidth) return
        let size = max
        el.style.fontSize = `${size}px`
        const fits = () => {
          const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || size * 1.1
          return el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= lineHeight * lines + 2
        }
        // от большего к меньшему шагами по 1px; диапазон небольшой, поэтому дёшево
        while (size > min && !fits()) {
          size -= 1
          el.style.fontSize = `${size}px`
        }
        if (grouped) {
          el.dataset.fitOwn = String(size)
          regroup(group)
          el.style.fontSize = `var(--fit-size, ${size}px)`
        }
      })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    void document.fonts?.ready.then(fit)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      if (group) { delete el.dataset.fitOwn; requestAnimationFrame(() => regroup(group)) }
    }
  }, [max, min, lines, grouped, children])

  return <Tag ref={ref} className={`fit-text ${className}`}>{children}</Tag>
}
