import { useCallback, useEffect, useRef, useState } from 'react'

const KEY = 'sidebar-rail'
const PEEK_DELAY = 550 // сколько держать курсор на полоске, чтобы меню раскрылось поверх страницы
const PEEK_LEAVE = 250 // задержка перед тем, как раскрытое меню снова станет полоской
const MOVE_MS = 380

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Состояние бокового меню на компьютере.
 * pinned — меню закреплено полоской; peek — временно раскрыто поверх страницы (долгое наведение);
 * rail — итог: показывать полоску. Клик по пустому месту переключает pinned, долгое наведение включает peek.
 */
export function useSidebarRail() {
  const [pinned, setPinned] = useState(read)
  const [peek, setPeek] = useState(false)
  const [moving, setMoving] = useState(false)
  const pinnedRef = useRef(pinned)
  const peekRef = useRef(false)
  const hoverT = useRef<number>(0)
  const leaveT = useRef<number>(0)
  const moveT = useRef<number>(0)

  const settle = useCallback(() => {
    setMoving(true)
    window.clearTimeout(moveT.current)
    moveT.current = window.setTimeout(() => setMoving(false), MOVE_MS)
  }, [])

  const setPeekState = useCallback(
    (v: boolean) => {
      peekRef.current = v
      setPeek(v)
      settle()
    },
    [settle],
  )

  const pin = useCallback(
    (next?: boolean) => {
      window.clearTimeout(hoverT.current)
      window.clearTimeout(leaveT.current)
      const value = next ?? !pinnedRef.current
      pinnedRef.current = value
      peekRef.current = false
      setPeek(false)
      setPinned(value)
      settle()
      try {
        localStorage.setItem(KEY, value ? '1' : '0')
      } catch {
        /* приватный режим — просто не запоминаем */
      }
    },
    [settle],
  )

  const onEnter = useCallback(() => {
    window.clearTimeout(leaveT.current)
    if (!pinnedRef.current || peekRef.current) return
    if (!window.matchMedia('(hover: hover)').matches) return
    window.clearTimeout(hoverT.current)
    hoverT.current = window.setTimeout(() => setPeekState(true), PEEK_DELAY)
  }, [setPeekState])

  const onLeave = useCallback(() => {
    window.clearTimeout(hoverT.current)
    if (!peekRef.current) return
    window.clearTimeout(leaveT.current)
    leaveT.current = window.setTimeout(() => setPeekState(false), PEEK_LEAVE)
  }, [setPeekState])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && peekRef.current) return setPeekState(false)
      if (e.key !== '[' || e.ctrlKey || e.metaKey || e.altKey) return
      const t = document.activeElement
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      pin()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(hoverT.current)
      window.clearTimeout(leaveT.current)
      window.clearTimeout(moveT.current)
    }
  }, [pin, setPeekState])

  return { pinned, peek: pinned && peek, rail: pinned && !peek, moving, pin, onEnter, onLeave }
}
