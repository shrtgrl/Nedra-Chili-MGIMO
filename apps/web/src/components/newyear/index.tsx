import { useSettings } from '../../context/settings'
import { useNow } from '../../context/clock'
import { pluralize } from '../../lib/format'
import { Tree, TreeSilhouette } from './Tree'

export { Snow } from './Snow'
export { Garland, Ornaments, Snowflake } from './Garland'
export { Tree, TreeSilhouette } from './Tree'

export const useNewYear = () => useSettings().variant === 'newyear'

export function newYearCountdown(now: Date) {
  const ny = new Date(now.getFullYear() + 1, 0, 1)
  const days = Math.ceil((ny.getTime() - now.getTime()) / 86_400_000)
  return `До Нового года — ${days} ${pluralize(days, 'день', 'дня', 'дней')}`
}

/** Ряд нарядных ёлок с подарками на снегу — внизу страницы. */
export function Forest() {
  const trees = [
    { h: 150, d: 0 },
    { h: 196, d: 0.5 },
    { h: 128, d: 1.1 },
    { h: 178, d: 0.3 },
    { h: 150, d: 0.8 },
    { h: 124, d: 1.4 },
  ]
  return (
    <div className="forest" aria-hidden="true">
      <div className="forest__back">
        {Array.from({ length: 22 }, (_, i) => (
          <TreeSilhouette key={i} height={50 + ((i * 37) % 45)} />
        ))}
      </div>
      <div className="forest__row">
        {trees.map((t, i) => (
          <div key={i} className={`forest__tree ${i > 3 ? 'forest__tree--wide' : ''}`}>
            <Tree height={t.h} delay={t.d} />
          </div>
        ))}
      </div>
      <div className="forest__ground" />
    </div>
  )
}

/** Маленькая пара ёлочек рядом с плашкой отсчёта. */
export function TwinTrees() {
  return (
    <span className="twin-trees" aria-hidden="true">
      <Tree height={26} gifts={false} delay={0.2} />
      <Tree height={34} gifts={false} delay={0.9} />
    </span>
  )
}

export function Countdown() {
  const now = useNow()
  return (
    <span className="ny-countdown">
      <span className="ny-chip">
        <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
          <path d="M6 0 L10 6 H8 L11 11 H1 L4 6 H2 Z" fill="#f2c14e" />
          <rect x="5" y="11" width="2" height="3" fill="#f2c14e" />
        </svg>
        {newYearCountdown(now)}
      </span>
      <TwinTrees />
    </span>
  )
}
