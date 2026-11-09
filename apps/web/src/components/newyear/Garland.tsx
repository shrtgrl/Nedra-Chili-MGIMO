import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

/** Цвета лампочек — как на макете: золото, клюква, мята, голубой. */
export const BULB_COLORS = ['#f6c143', '#e2435a', '#7fd1b4', '#8fa7f5'] as const

/**
 * Гирлянда-провод с лампочками, которые по очереди вспыхивают.
 * Ширина подстраивается под контейнер: число провисов считается из ширины.
 */
export function Garland({ spacing = 92, className = '', wire = 'rgba(255,255,255,0.75)' }: { spacing?: number; className?: string; wire?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = Math.max(2, Math.round(w / spacing))
  const seg = w / n
  const sag = 16
  let d = `M0 3`
  for (let i = 0; i < n; i++) d += ` Q${seg * i + seg / 2} ${3 + sag * 2} ${seg * (i + 1)} 3`
  const period = Math.max(1.6, n * 0.32) // одна «волна» огней проходит всю гирлянду

  return (
    <div ref={ref} className={`garland ${className}`} aria-hidden="true">
      {w > 0 && (
        <svg width={w} height={44} viewBox={`0 0 ${w} 44`}>
          <path d={d} fill="none" stroke={wire} strokeWidth={1.4} />
          {Array.from({ length: n }, (_, i) => {
            const x = seg * i + seg / 2
            const y = 3 + sag // середина провиса
            const c = BULB_COLORS[i % BULB_COLORS.length]
            return (
              <g key={i} transform={`translate(${x} ${y})`} className="bulb" style={{ '--d': `${i * 0.32}s`, '--p': `${period}s`, color: c } as CSSProperties}>
                <circle className="bulb__halo" cx={0} cy={11} r={11} fill="currentColor" />
                <rect x={-3} y={-1} width={6} height={5} rx={1.2} fill="#d9d4c4" />
                <path d="M0 3 C5.5 3 6.5 10 5 14.5 C3.8 18 -3.8 18 -5 14.5 C-6.5 10 -5.5 3 0 3 Z" fill="currentColor" className="bulb__glass" />
                <ellipse cx={-1.8} cy={8.5} rx={1.3} ry={2.4} fill="#fff" opacity={0.55} />
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}

/** Шары, свисающие на нитках (правый край hero). */
export function Ornaments() {
  const balls = [
    { x: 6, len: 34, r: 9, c: '#f6c143' },
    { x: 28, len: 56, r: 9, c: '#ffffff' },
    { x: 50, len: 22, r: 8, c: '#2f8f5b' },
    { x: 72, len: 44, r: 10, c: '#f6c143' },
  ]
  return (
    <svg className="ornaments" width={84} height={80} viewBox="0 0 84 80" aria-hidden="true">
      {balls.map((b, i) => (
        <g key={i} className="ornament" style={{ transformOrigin: `${b.x}px 0px`, animationDelay: `${i * -0.7}s` }}>
          <line x1={b.x} y1={0} x2={b.x} y2={b.len} stroke="rgba(255,255,255,0.55)" strokeWidth={1} />
          <rect x={b.x - 2.5} y={b.len - 1} width={5} height={4} rx={1} fill="#d9c27a" />
          <circle cx={b.x} cy={b.len + b.r + 2} r={b.r} fill={b.c} />
          <ellipse cx={b.x - b.r / 3} cy={b.len + b.r - 1} rx={b.r / 3.5} ry={b.r / 2.4} fill="#fff" opacity={0.45} />
        </g>
      ))}
    </svg>
  )
}

/** Декоративная снежинка (контур), как на макете. */
export function Snowflake({ size = 80, className = '' }: { size?: number; className?: string }) {
  // луч с двумя парами «веточек», направленных наружу
  const arm = (
    <>
      <line x1={0} y1={0} x2={0} y2={-46} />
      <line x1={0} y1={-18} x2={-11} y2={-29} />
      <line x1={0} y1={-18} x2={11} y2={-29} />
      <line x1={0} y1={-32} x2={-8} y2={-40} />
      <line x1={0} y1={-32} x2={8} y2={-40} />
    </>
  )
  return (
    <svg className={`snowflake ${className}`} width={size} height={size} viewBox="-50 -50 100 100" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          {arm}
        </g>
      ))}
    </svg>
  )
}
