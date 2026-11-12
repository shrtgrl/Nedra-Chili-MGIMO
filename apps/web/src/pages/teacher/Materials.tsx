import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Disclaimer, PageHeader, ThemeButton } from '../../components/ui'
import { Combo } from '../../components/Combo'
import { Icon } from '../../components/Icon'
import { useMaterials } from '../../context/materials'
import { useToast } from '../../context/toast'
import { dataApi, downloadFile, type ApiAssignment } from '../../lib/api'
import { ACCEPT, MAX_FILE_BYTES, fileSize, materialDate } from '../../lib/materials'
import { pluralize } from '../../lib/format'

export function TeacherMaterialsPage() {
  const { mine, loading, error: loadError, publish, remove, reload } = useMaterials()
  const toast = useToast()
  const [assignments, setAssignments] = useState<ApiAssignment[]>([])
  const [subject, setSubject] = useState('')
  const [title, setTitle] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const picker = useRef<HTMLInputElement>(null)

  useEffect(() => {
    dataApi.assignments().then(setAssignments).catch((e) => setErrors({ form: e instanceof Error ? e.message : 'Не удалось загрузить дисциплины' }))
  }, [])

  const subjects = useMemo(() => [...new Set(assignments.map((a) => a.subject))], [assignments])
  const groups = useMemo(() => assignments.filter((a) => a.subject === subject), [assignments, subject])

  const clearError = (k: string) => setErrors((e) => ({ ...e, [k]: '' }))
  const toggle = (id: string) => {
    setPicked((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]))
    clearError('groups')
  }

  const onFile = (f: File | null) => {
    if (f && (f.size === 0 || f.size > MAX_FILE_BYTES)) {
      setErrors((e) => ({ ...e, file: 'Размер файла — от 1 байта до 5 МБ' }))
      setFile(null)
      if (picker.current) picker.current.value = ''
      return
    }
    setFile(f)
    clearError('file')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    const err: Record<string, string> = {}
    if (!subjects.includes(subject)) err.subject = 'Выберите предмет из списка'
    if (!title.trim()) err.title = 'Укажите название материала'
    if (!picked.length) err.groups = 'Выберите хотя бы одну группу'
    if (!file) err.file = 'Прикрепите файл'
    if (Object.keys(err).length) { setErrors(err); return }
    setBusy(true)
    const fail = await publish(picked, title.trim(), file!)
    setBusy(false)
    if (fail) { setErrors({ form: fail }); return }
    const names = groups.filter((a) => picked.includes(a.id)).map((a) => a.group)
    toast(`Материал отправлен: ${names.join(', ')}`)
    setTitle(''); setPicked([]); setFile(null); setErrors({})
    if (picker.current) picker.current.value = ''
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
              onChange={(v) => { setSubject(v); setPicked([]); clearError('subject') }}
              options={subjects.map((s) => ({ value: s }))}
              placeholder="Выберите предмет"
              emptyText="Такого предмета у вас нет"
              invalid={!!errors.subject}
            />
            {errors.subject && <span className="field__error">{errors.subject}</span>}
            {assignments.length === 0 && !errors.form && <span className="mat-hint">За вами пока не закреплено ни одной дисциплины.</span>}
          </div>
          <label className="field">
            <span className="field__label">Название</span>
            <input className={`input ${errors.title ? 'is-invalid' : ''}`} value={title} maxLength={200} placeholder="Например, конспект лекции 5" onChange={(e) => { setTitle(e.target.value); clearError('title') }} />
            {errors.title && <span className="field__error">{errors.title}</span>}
          </label>

          <div className="field">
            <span className="field__label">Кому отправить</span>
            {subject && groups.length > 0 ? (
              <div className="chips mat-picks" role="group" aria-label="Группы">
                {groups.map((a) => (
                  <button key={a.id} type="button" className={`chip mat-pick ${picked.includes(a.id) ? 'is-picked' : ''}`} aria-pressed={picked.includes(a.id)} title={`Семестр ${a.semester}`} onClick={() => toggle(a.id)}>
                    {a.group}
                  </button>
                ))}
              </div>
            ) : (
              <span className="mat-hint">Сначала выберите предмет — здесь появятся его группы.</span>
            )}
            {errors.groups && <span className="field__error">{errors.groups}</span>}
          </div>

          <div className="field">
            <span className="field__label">Файл</span>
            {file && (
              <div className="mat-file">
                <Icon name="file" size={18} />
                <span className="mat-file__name">{file.name}</span>
                <span className="mat-file__size">{fileSize(file.size)}</span>
                <button type="button" className="mat-x" aria-label={`Убрать ${file.name}`} onClick={() => { setFile(null); if (picker.current) picker.current.value = '' }}>
                  <Icon name="x" size={16} />
                </button>
              </div>
            )}
            <label className="mat-add" hidden={!!file}>
              <Icon name="plus" size={15} /> Прикрепить файл
              <input ref={picker} type="file" accept={ACCEPT} hidden onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            </label>
            <span className="mat-hint">PDF, TXT, PNG или JPG, до 5 МБ.</span>
            {errors.file && <span className="field__error">{errors.file}</span>}
          </div>

          {errors.form && <p role="alert" className="form-error">{errors.form}</p>}
          <Button type="submit" icon="send" disabled={busy}>
            {busy ? 'Отправляем…' : picked.length ? `Отправить ${picked.length} ${pluralize(picked.length, 'группе', 'группам', 'группам')}` : 'Отправить'}
          </Button>
        </form>

        <section className="card">
          <div className="card__head">
            <h2 className="card__title card__title--lg">Отправленные</h2>
            <Badge>{mine.length}</Badge>
          </div>
          {loadError && <p role="alert" className="form-error">{loadError} <button type="button" className="link-btn" onClick={() => void reload()}>Повторить</button></p>}
          {loading && mine.length === 0 ? (
            <p className="mat-empty" role="status">Загружаем материалы…</p>
          ) : mine.length === 0 ? (
            <p className="mat-empty">Вы ещё ничего не отправляли. Материал появится у студентов выбранных групп в разделе «Предметы».</p>
          ) : (
            <ul className="mat-sent">
              {mine.map((m) => (
                <li key={m.id} className="mat-sent__item">
                  <div className="mat-sent__top">
                    <span className="eyebrow">{m.subject}</span>
                    <span className="mat-sent__date">{materialDate(m.createdAt)}</span>
                  </div>
                  <div className="mat-sent__title">{m.title}</div>
                  <div className="mat-sent__groups"><Badge outline>{m.group}</Badge></div>
                  <div className="mat-sent__meta"><span>{m.fileName} · {fileSize(m.size)}</span></div>
                  {confirmId === m.id ? (
                    <div className="mat-sent__confirm">
                      <Button size="sm" variant="surface" type="button" onClick={async () => { const f = await remove(m.id); setConfirmId(null); toast(f ?? 'Материал удалён') }}>Да, удалить</Button>
                      <Button size="sm" variant="ghost" type="button" onClick={() => setConfirmId(null)}>Отмена</Button>
                    </div>
                  ) : (
                    <div className="mat-sent__confirm">
                      <button type="button" className="mat-link" onClick={() => void downloadFile(`/api/materials/${m.id}/file`, m.fileName).catch((e) => toast(e instanceof Error ? e.message : 'Не удалось скачать'))}>Скачать</button>
                      <button type="button" className="mat-link" onClick={() => setConfirmId(m.id)}>Удалить у студентов</button>
                    </div>
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
