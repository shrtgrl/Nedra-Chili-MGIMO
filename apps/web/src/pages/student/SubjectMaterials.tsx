import { Badge, Button } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { useMaterials } from '../../context/materials'
import { fileSize, linkLabel, materialDate } from '../../lib/materials'
import { pluralize } from '../../lib/format'

export const subjectAnchor = (name: string) => `subject-${name.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-')}`

/** Материалы от преподавателей, сгруппированные по предметам. Предметы текущего семестра идут первыми. */
export function SubjectMaterials({ subjects }: { subjects: string[] }) {
  const { forMe, isRead, markRead } = useMaterials()

  const known = subjects.map((s) => s.toLowerCase())
  const names = [...new Set(forMe.map((m) => m.subject))].sort((a, b) => {
    const ia = known.indexOf(a.toLowerCase())
    const ib = known.indexOf(b.toLowerCase())
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'ru')
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  return (
    <section className="card" id="materials">
      <div className="card__head">
        <h2 className="card__title card__title--lg">Материалы</h2>
        {forMe.length > 0 && <Badge>{forMe.length}</Badge>}
      </div>
      {names.length === 0 ? (
        <p className="mat-empty">Преподаватели пока ничего не присылали. Новые материалы появятся здесь, сгруппированные по предметам.</p>
      ) : (
        <div className="mat-groups">
          {names.map((name) => {
            const items = forMe.filter((m) => m.subject === name)
            const fresh = items.filter((m) => !isRead(m.id)).length
            return (
              <div key={name} className="mat-group" id={subjectAnchor(name)}>
                <div className="mat-group__head">
                  <h3 className="mat-group__title">{name}</h3>
                  <span className="mat-group__count">
                    {items.length} {pluralize(items.length, 'материал', 'материала', 'материалов')}
                    {fresh > 0 && ` · ${fresh} ${pluralize(fresh, 'новый', 'новых', 'новых')}`}
                  </span>
                </div>
                <ul className="mat-list">
                  {items.map((m) => {
                    const read = isRead(m.id)
                    return (
                      <li key={m.id} className={`mat-item ${read ? '' : 'is-new'}`}>
                        <div className="mat-item__top">
                          <b className="mat-item__title">{m.title}</b>
                          {!read && <Badge tone="hl">Новое</Badge>}
                        </div>
                        <div className="mat-item__meta">{m.teacherName} · {materialDate(m)}</div>
                        {m.description && <p className="mat-item__text">{m.description}</p>}
                        {(m.links.length > 0 || m.files.length > 0) && (
                          <div className="mat-item__files">
                            {m.links.map((l) => (
                              <a key={l.url} className="mat-chip" href={l.url} target="_blank" rel="noopener noreferrer" onClick={() => markRead(m.id)}>
                                <Icon name="arrowRight" size={14} /> {linkLabel(l.url)}
                              </a>
                            ))}
                            {m.files.map((f) => (
                              <a key={f.name} className="mat-chip" href={f.dataUrl} download={f.name} onClick={() => markRead(m.id)}>
                                <Icon name="download" size={14} /> {f.name} <span className="mat-chip__size">{fileSize(f.size)}</span>
                              </a>
                            ))}
                          </div>
                        )}
                        {!read && (
                          <Button size="sm" variant="ghost" type="button" onClick={() => markRead(m.id)}>
                            Отметить прочитанным
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
