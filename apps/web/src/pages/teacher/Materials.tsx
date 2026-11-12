import { useRef, useState } from 'react'
import { Badge, Button, Disclaimer, PageHeader, ThemeButton } from '../../components/ui'
import { Combo } from '../../components/Combo'
import { Icon } from '../../components/Icon'
import { TEACHER_GROUPS, TEACHER_SUBJECTS } from '../../data/mock'
import { MAX_FILE_BYTES, MAX_FILES, MAX_LINKS, useMaterials } from '../../context/materials'
import { useToast } from '../../context/toast'
import { fileSize, linkLabel, materialDate, normalizeUrl, readFile } from '../../lib/materials'
import { pluralize } from '../../lib/format'
import type { MaterialFile } from '../../types'

export function TeacherMaterialsPage() {
  const { mine, publish, remove } = useMaterials()
  const toast = useToast()
  const [subject, setSubject] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [groups, setGroups] = useState<string[]>([])
  const [links, setLinks] = useState<string[]>([''])
  const [files, setFiles] = useState<MaterialFile[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const picker = useRef<HTMLInputElement>(null)

  const clearError = (k: string) => setErrors((e) => ({ ...e, [k]: '' }))
  const toggleGroup = (g: string) => {
    setGroups((xs) => (xs.includes(g) ? xs.filter((x) => x !== g) : [...xs, g]))
    clearError('groups')
  }

  const onFiles = async (list: FileList | null) => {
    if (!list) return
    const next = [...files]
    let problem = ''
    for (const f of Array.from(list)) {
      if (next.length >= MAX_FILES) { problem = `Можно прикрепить не больше ${MAX_FILES} файлов`; break }
      if (f.size > MAX_FILE_BYTES) { problem = `Файл «${f.name}» больше 1 МБ — в демо-версии такие не принимаются`; continue }
      try { next.push(await readFile(f)) } catch { problem = `Не удалось прочитать «${f.name}»` }
    }
    setFiles(next)
    setErrors((e) => ({ ...e, files: problem }))
    if (picker.current) picker.current.value = ''
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const err: Record<string, string> = {}
    if (!subject.trim()) err.subject = 'Укажите предмет'
    if (!title.trim()) err.title = 'Укажите название материала'
    if (!groups.length) err.groups = 'Выберите хотя бы одну группу'
    const cleanLinks: { url: string }[] = []
    links.forEach((l, i) => {
      if (!l.trim()) return
      const url = normalizeUrl(l)
      if (url) cleanLinks.push({ url })
      else err[`link${i}`] = 'Похоже, это не ссылка'
    })
    if (!description.trim() && !cleanLinks.length && !files.length) err.title = err.title || 'Добавьте описание, ссылку или файл'
    if (Object.keys(err).length) { setErrors(err); return }
    const fail = publish({ subject: subject.trim(), title: title.trim(), description: description.trim(), groups, links: cleanLinks, files })
    if (fail) { setErrors({ files: fail }); return }
    toast(`Материал отправлен: ${groups.join(', ')}`)
    setTitle(''); setDescription(''); setLinks(['']); setFiles([]); setErrors({})
  }

  return (
    <>
      <PageHeader eyebrow="Рассылка группам" title="Материалы" actions={<ThemeButton />} />
      <div className="grid-side grid-side--wide">
        <form className="card mat-form" onSubmit={submit} noValidate>
          <h2 className="card__title card__title--lg">Новый материал</h2>
          <div className="field">
            <Combo
              label="Предмет"
              value={subject}
              onChange={(v) => { setSubject(v); clearError('subject') }}
              options={TEACHER_SUBJECTS.map((s) => ({ value: s }))}
              placeholder="Выберите или введите"
              invalid={!!errors.subject}
            />
            {errors.subject && <span className="field__error">{errors.subject}</span>}
          </div>
          <label className="field">
            <span className="field__label">Название</span>
            <input className={`input ${errors.title ? 'is-invalid' : ''}`} value={title} maxLength={120} placeholder="Например, конспект лекции 5" onChange={(e) => { setTitle(e.target.value); clearError('title') }} />
            {errors.title && <span className="field__error">{errors.title}</span>}
          </label>
          <label className="field">
            <span className="field__label">Описание</span>
            <textarea className="input textarea" rows={3} maxLength={600} value={description} placeholder="Что прочитать, к какому сроку" onChange={(e) => setDescription(e.target.value)} />
          </label>

          <div className="field">
            <span className="field__label">Кому отправить</span>
            <div className="chips mat-picks" role="group" aria-label="Группы">
              {TEACHER_GROUPS.map((g) => (
                <button key={g.name} type="button" className={`chip mat-pick ${groups.includes(g.name) ? "is-picked" : ""}`} aria-pressed={groups.includes(g.name)} title={g.hint} onClick={() => toggleGroup(g.name)}>
                  {g.name}
                </button>
              ))}
            </div>
            {errors.groups && <span className="field__error">{errors.groups}</span>}
          </div>

          <div className="field">
            <span className="field__label">Ссылки</span>
            {links.map((l, i) => (
              <div key={i} className="mat-row">
                <input className={`input ${errors[`link${i}`] ? 'is-invalid' : ''}`} value={l} placeholder="https://…" aria-label={`Ссылка ${i + 1}`} onChange={(e) => { setLinks((xs) => xs.map((x, j) => (j === i ? e.target.value : x))); clearError(`link${i}`) }} />
                {links.length > 1 && (
                  <button type="button" className="mat-x" aria-label="Убрать ссылку" onClick={() => setLinks((xs) => xs.filter((_, j) => j !== i))}>
                    <Icon name="x" size={16} />
                  </button>
                )}
                {errors[`link${i}`] && <span className="field__error">{errors[`link${i}`]}</span>}
              </div>
            ))}
            {links.length < MAX_LINKS && (
              <button type="button" className="mat-add" onClick={() => setLinks((xs) => [...xs, ''])}>
                <Icon name="plus" size={15} /> Ещё ссылка
              </button>
            )}
          </div>

          <div className="field">
            <span className="field__label">Файлы</span>
            {files.map((f, i) => (
              <div key={f.name + i} className="mat-file">
                <Icon name="file" size={18} />
                <span className="mat-file__name">{f.name}</span>
                <span className="mat-file__size">{fileSize(f.size)}</span>
                <button type="button" className="mat-x" aria-label={`Убрать ${f.name}`} onClick={() => setFiles((xs) => xs.filter((_, j) => j !== i))}>
                  <Icon name="x" size={16} />
                </button>
              </div>
            ))}
            {files.length < MAX_FILES && (
              <label className="mat-add">
                <Icon name="plus" size={15} /> Прикрепить файл
                <input ref={picker} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
              </label>
            )}
            <span className="mat-hint">До {MAX_FILES} файлов, каждый до 1 МБ. В демо файлы хранятся в браузере.</span>
            {errors.files && <span className="field__error">{errors.files}</span>}
          </div>

          <Button type="submit" icon="send" disabled={false}>
            {groups.length ? `Отправить ${groups.length} ${pluralize(groups.length, 'группе', 'группам', 'группам')}` : 'Отправить'}
          </Button>
        </form>

        <section className="card">
          <div className="card__head">
            <h2 className="card__title card__title--lg">Отправленные</h2>
            <Badge>{mine.length}</Badge>
          </div>
          {mine.length === 0 ? (
            <p className="mat-empty">Вы ещё ничего не отправляли. Материал появится у студентов выбранных групп в разделе «Предметы».</p>
          ) : (
            <ul className="mat-sent">
              {mine.map((m) => (
                <li key={m.id} className="mat-sent__item">
                  <div className="mat-sent__top">
                    <span className="eyebrow">{m.subject}</span>
                    <span className="mat-sent__date">{materialDate(m)}</span>
                  </div>
                  <div className="mat-sent__title">{m.title}</div>
                  <div className="mat-sent__groups">
                    {m.groups.map((g) => <Badge key={g} outline>{g}</Badge>)}
                  </div>
                  <div className="mat-sent__meta">
                    {m.files.length > 0 && <span>{m.files.length} {pluralize(m.files.length, 'файл', 'файла', 'файлов')}</span>}
                    {m.links.map((l) => <span key={l.url}>{linkLabel(l.url)}</span>)}
                  </div>
                  {confirmId === m.id ? (
                    <div className="mat-sent__confirm">
                      <Button size="sm" variant="surface" type="button" onClick={() => { remove(m.id); setConfirmId(null); toast('Материал удалён') }}>Да, удалить</Button>
                      <Button size="sm" variant="ghost" type="button" onClick={() => setConfirmId(null)}>Отмена</Button>
                    </div>
                  ) : (
                    <button type="button" className="mat-link" onClick={() => setConfirmId(m.id)}>Удалить у студентов</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <Disclaimer />
    </>
  )
}
