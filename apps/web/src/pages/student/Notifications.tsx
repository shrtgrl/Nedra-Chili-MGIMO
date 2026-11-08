import { useData } from '../../context/data'
import type { NoticeIcon } from '../../types'
import type { IconName } from '../../components/Icon'
import { Icon } from '../../components/Icon'
import { Badge, Button, Disclaimer, PageHeader, ThemeButton, Toggle } from '../../components/ui'

const ICONS: Record<NoticeIcon, IconName> = { alert: 'alert', calendar: 'calendar', doc: 'doc', bell: 'bell' }

export function NotificationsPage() {
  const { notices, unreadCount, markRead, markAllRead, prefs, setPref } = useData()
  return (
    <>
      <PageHeader
        eyebrow={`Непрочитанных: ${unreadCount}`}
        title="Уведомления"
        actions={
          <>
            <ThemeButton />
            <Button variant="primary" onClick={markAllRead} disabled={unreadCount === 0}>
              Прочитать все
            </Button>
          </>
        }
      />
      <div className="grid-side grid-side--wide">
        <section className="card">
          <ul className="notices">
            {notices.map((n) => (
              <li key={n.id} className={`notice ${n.unread ? 'is-unread' : ''}`}>
                <span className={`notice__icon ${n.unread ? 'is-hl' : ''}`}>
                  <Icon name={ICONS[n.icon]} size={20} />
                </span>
                <div className="notice__body">
                  <h3>
                    {n.title} {n.unread && <Badge tone="orange">новое</Badge>}
                  </h3>
                  <p>{n.text}</p>
                  <span className="small muted">{n.time}</span>
                </div>
                {n.unread && (
                  <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>
                    Прочитано
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="card prefs">
          <h2 className="card__title card__title--lg">Что присылать</h2>
          <Toggle label="Дедлайны" checked={prefs.deadlines} onChange={(v) => setPref('deadlines', v)} />
          <Toggle label="Изменения в расписании" checked={prefs.schedule} onChange={(v) => setPref('schedule', v)} />
          <Toggle label="Новости деканата" checked={prefs.news} onChange={(v) => setPref('news', v)} />
          <p className="small muted">Уведомления приходят на учебную почту и в этот раздел.</p>
        </section>
      </div>
      <Disclaimer />
    </>
  )
}
