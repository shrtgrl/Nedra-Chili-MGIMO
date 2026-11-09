import { useId, type CSSProperties } from 'react'

/*
  Нарядная ёлка (SVG 120×170): ярусы, гирлянда-огоньки по диагонали, шары, звезда с искрами, кадка.
  Огоньки вспыхивают по очереди (бегущая волна), звезда мягко пульсирует.
*/

const TIERS = [
  { top: 24, bottom: 62, half: 21 },
  { top: 40, bottom: 92, half: 32 },
  { top: 58, bottom: 122, half: 43 },
  { top: 78, bottom: 152, half: 54 },
]
const CX = 60
const BALL_COLORS = ['#d8364b', '#f6f2e8', '#7f9cf0', '#f2c14e']

function tierPath(t: (typeof TIERS)[number]) {
  const n = Math.max(3, Math.round(t.half / 9))
  const w = (t.half * 2) / n
  let d = `M${CX} ${t.top} L${CX - t.half} ${t.bottom}`
  for (let i = 0; i < n; i++) {
    const x0 = CX - t.half + w * i
    d += ` Q${x0 + w / 2} ${t.bottom + 7} ${x0 + w} ${t.bottom}`
  }
  return `${d} Z`
}

/** Полуширина силуэта ёлки на высоте y (для размещения огоньков внутри). */
function halfAt(y: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const t = TIERS[i]
    if (y >= t.top && y <= t.bottom) return ((y - t.top) / (t.bottom - t.top)) * t.half
  }
  return 0
}

// диагональные нити огоньков: от левого края яруса вверх-вправо
const LIGHTS: { x: number; y: number }[] = []
for (const t of TIERS) {
  const y0 = t.bottom - 6
  const y1 = t.top + (t.bottom - t.top) * 0.45
  const steps = Math.round(t.half / 5.5)
  for (let i = 0; i <= steps; i++) {
    const k = i / steps
    const y = y0 + (y1 - y0) * k
    const hw = halfAt(y) - 3
    const x = CX - hw + 2 * hw * k
    LIGHTS.push({ x, y })
  }
}

const BALLS = TIERS.flatMap((t, ti) => {
  const y = t.bottom - 4
  return [-0.55, 0.15, 0.7].slice(0, ti === 0 ? 2 : 3).map((k, i) => ({ x: CX + t.half * k, y: y - (i % 2) * 9, c: BALL_COLORS[(ti + i) % BALL_COLORS.length] }))
})

function starPath(cx: number, cy: number, r: number) {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    d += `${i ? 'L' : 'M'}${cx + Math.cos(a) * rr} ${cy + Math.sin(a) * rr}`
  }
  return `${d}Z`
}

const sparkle = (x: number, y: number, s: number) => `M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s}Z`

export function Tree({ height = 170, delay = 0, gifts = true }: { height?: number; delay?: number; gifts?: boolean }) {
  const id = useId().replace(/:/g, '')
  const width = (height * 120) / 170
  return (
    <svg className="tree" width={width} height={height} viewBox="0 0 120 170" aria-hidden="true">
      <defs>
        <linearGradient id={`g${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0.5" stopColor="#2f7f57" />
          <stop offset="0.5" stopColor="#266b49" />
        </linearGradient>
      </defs>

      {/* ствол и кадка */}
      <rect x={55} y={150} width={10} height={8} fill="#6b4a2e" />
      <path d="M44 155 H76 L72 168 H48 Z" fill="#b51f38" />
      <rect x={44} y={155} width={32} height={3.5} fill="#f4efe4" opacity={0.9} />
      <circle cx={60} cy={162} r={2.4} fill="#f4efe4" />

      {/* ярусы */}
      {TIERS.map((t, i) => (
        <path key={i} d={tierPath(t)} fill={`url(#g${id})`} />
      ))}

      {/* гирлянда-нить */}
      <g className="tree__lights">
        {LIGHTS.map((l, i) => (
          <g key={i} className="tl" style={{ '--d': `${delay + i * 0.11}s` } as CSSProperties}>
            <circle className="tl__halo" cx={l.x} cy={l.y} r={3.6} />
            <circle className="tl__core" cx={l.x} cy={l.y} r={1.25} />
          </g>
        ))}
      </g>

      {/* шары */}
      {BALLS.map((b, i) => (
        <g key={i}>
          <circle cx={b.x} cy={b.y} r={3.4} fill={b.c} />
          <circle cx={b.x - 1.1} cy={b.y - 1.1} r={1} fill="#fff" opacity={0.6} />
        </g>
      ))}

      {/* звезда и искры */}
      <g className="tree__star" style={{ '--d': `${delay}s` } as CSSProperties}>
        <circle className="tree__star-halo" cx={CX} cy={17} r={12} />
        <path d={starPath(CX, 17, 10)} fill="#f6c143" stroke="#e3a92a" strokeWidth={0.8} strokeLinejoin="round" />
      </g>
      <path className="sparkle" style={{ animationDelay: `${delay + 0.4}s` }} d={sparkle(41, 12, 5)} fill="#f6c143" />
      <path className="sparkle" style={{ animationDelay: `${delay + 1.1}s` }} d={sparkle(79, 9, 4)} fill="#f6c143" />
      <path className="sparkle" style={{ animationDelay: `${delay + 1.8}s` }} d={sparkle(76, 27, 3)} fill="#f6c143" />

      {gifts && (
        <g>
          <Gift x={10} y={152} w={17} h={16} c="#b51f38" r="#f2c14e" />
          <Gift x={93} y={148} w={15} h={20} c="#f2c14e" r="#b51f38" />
          <Gift x={27} y={159} w={10} h={9} c="#8fa7f5" r="#f6f2e8" />
        </g>
      )}
    </svg>
  )
}

function Gift({ x, y, w, h, c, r }: { x: number; y: number; w: number; h: number; c: string; r: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={1} fill={c} />
      <rect x={x + w / 2 - 1.5} y={y} width={3} height={h} fill={r} />
      <rect x={x} y={y + 3} width={w} height={2.4} fill={r} opacity={0.9} />
      <path d={`M${x + w / 2} ${y} q-5 -6 -6 -1 q3 2 6 1 q5 -6 6 -1 q-3 2 -6 1`} fill="none" stroke={r} strokeWidth={1.4} />
    </g>
  )
}

/** Блёклая ёлка-силуэт для дальнего плана. */
export function TreeSilhouette({ height = 90, className = '' }: { height?: number; className?: string }) {
  return (
    <svg className={`tree-sil ${className}`} width={(height * 60) / 90} height={height} viewBox="0 0 60 90" aria-hidden="true">
      <path d="M30 0 L44 26 H38 L50 50 H42 L56 78 H4 L18 50 H10 L22 26 H16 Z" fill="currentColor" />
      <path d="M30 0 L37 13 H23 Z M30 26 L39 40 H21 Z M30 50 L41 66 H19 Z" fill="#fff" opacity={0.55} />
      <rect x={27} y={78} width={6} height={12} fill="currentColor" />
    </svg>
  )
}
