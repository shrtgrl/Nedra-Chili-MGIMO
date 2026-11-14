import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApiAnnouncement } from '../lib/api'
import { coverSrc } from '../lib/covers'
import { dateParts, readMinutes } from '../lib/news'
import { Icon } from './Icon'

/** Запасная обложка, когда её не выбрали: график и солнце в цветах темы. */
function DefaultCover() {
  return (
    <svg className="news-modal__art" viewBox="0 0 880 366" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <g className="news-art__dots">
        {Array.from({ length: 27 }, (_, i) => <circle key={i} cx={470 + (i % 9) * 24} cy={270 + Math.floor(i / 9) * 19} r="2" />)}
      </g>
      <circle className="news-art__ring" cx="660" cy="128" r="104" />
      <circle className="news-art__ring" cx="660" cy="128" r="80" />
      <circle className="news-art__sun" cx="660" cy="128" r="50" />
      {[[56, 130], [124, 190], [192, 250], [260, 160], [328, 220]].map(([x, h], i) => (
        <rect key={x} className={i % 2 ? 'news-art__bar news-art__bar--b' : 'news-art__bar'} x={x} y={366 - h} width="56" height={h} rx="12" />
      ))}
      <path className="news-art__line" d="M24 300 C110 250 170 196 250 202 C330 208 380 160 470 116 C540 84 590 150 680 160 C760 170 820 140 860 122" />
      <circle className="news-art__node" cx="250" cy="202" r="9" />
      <circle className="news-art__node" cx="470" cy="116" r="9" />
    </svg>
  )
}

/**
 * Полное объявление в модальном окне: обложка, дата, заголовок, текст и листание.
 * Нативный <dialog>: фон неактивен, Esc закрывает, фокус возвращается на кнопку, открывшую окно.
 */
export function NewsModal({ items, startId, onClose, onSeen }: { items: ApiAnnouncement[]; startId: string; onClose: () => void; onSeen: (id: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [id, setId] = useState(startId)
  const idx = Math.max(0, items.findIndex((a) => a.id === id))
  const a = items[idx]
  const src = coverSrc(a?.cover)
  const [pos, setPos] = useState<'next' | 'prev'>('next')

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])
  useEffect(() => { if (a) onSeen(a.id) }, [a, onSeen])

  const go = useCallback((delta: number) => {
    if (items.length < 2) return
    setPos(delta > 0 ? 'next' : 'prev')
    setId(items[(idx + delta + items.length) % items.length].id)
  }, [items, idx])

  if (!a) return null
  const d = dateParts(a.createdAt)
  const to = a.groupName ? `Группа ${a.groupName}` : 'Всем студентам'
  const mins = readMinutes(a)

  return (
    <dialog
      ref={ref}
      className="news-modal"
      aria-labelledby="news-modal-title"
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) ref.current?.close() }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
      }}
    >
      <article className="news-modal__card">
        <div className="news-modal__cover">
          {src ? <img key={a.id} className={`news-modal__img is-${pos}`} src={src} alt="" width="1200" height="630" /> : <DefaultCover />}
          <button type="button" className="news-modal__close" onClick={() => ref.current?.close()} aria-label="Закрыть">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className={`news-modal__body is-${pos}`} key={a.id}>
          <p className="news-modal__meta nm-c" style={{ ['--i' as string]: 0 }}>
            <span className="news-modal__tag">{to}</span>
            <time dateTime={a.createdAt}><b>{d.day}</b> {d.month}</time>
            <span className="news-modal__read">{mins} мин чтения</span>
          </p>
          <h2 id="news-modal-title" className="news-modal__title nm-c" style={{ ['--i' as string]: 1 }}>{a.title}</h2>
          <p className="news-modal__text nm-c" style={{ ['--i' as string]: 2 }}>{a.body}</p>
        </div>

        <div className="news-modal__foot">
          <button type="button" className="btn btn--strong btn--md" onClick={() => ref.current?.close()}>
            <Icon name="check" size={18} /> Понятно
          </button>
          <p className="news-modal__note">Опубликовано деканатом{items.length > 1 ? ` · ${idx + 1} из ${items.length}` : ''}</p>
          {items.length > 1 && (
            <div className="news-modal__nav">
              <button type="button" className="news-modal__arrow" onClick={() => go(-1)} aria-label="Предыдущее объявление"><Icon name="chevronLeft" size={20} /></button>
              <button type="button" className="news-modal__arrow" onClick={() => go(1)} aria-label="Следующее объявление"><Icon name="chevronRight" size={20} /></button>
            </div>
          )}
        </div>
      </article>
    </dialog>
  )
}
