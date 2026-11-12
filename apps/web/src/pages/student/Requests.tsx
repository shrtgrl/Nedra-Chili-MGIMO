import { dataApi, downloadFile, type ApiAssignment } from '../../lib/api'
import { STATUS_LABEL } from '../../lib/staff'
import { useEffect, useState, type FormEvent } from 'react'
import { useIndicator } from '../../lib/useIndicator'
import { useData } from '../../context/data'
import { useToast } from '../../context/toast'
import { DEAN_REQUEST_TYPES, REQUEST_STAGES, REQUEST_TYPES } from '../../data/mock'
import type { Delivery, RequestType } from '../../types'
import { Badge, Button, Disclaimer, IconButton, PageHeader, Segmented, Stages, ThemeButton } from '../../components/ui'
import { Icon, type IconName } from '../../components/Icon'
import { Link } from 'react-router-dom'

type Filter = 'all' | 'work' | 'ready'
const TYPE_ICON: Record<RequestType, IconName> = { study: 'doc', order: 'clipboard', leave: 'pause', retake: 'refresh' }
type Target = 'dean' | 'teacher'

export function RequestsPage() {
  const { requests, addRequest, cancelRequest, unreadCount, reload } = useData()
  const toast = useToast()
  const [type, setType] = useState<RequestType>('study')
  const [purpose, setPurpose] = useState('')
  const [comment, setComment] = useState('')
  const [delivery, setDelivery] = useState<Delivery>('pdf')
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState('')
  const [target, setTarget] = useState<Target>('dean')
  const [teacher, setTeacher] = useState('')
  const [teachers, setTeachers] = useState<ApiAssignment[]>([])
  const [teacherError, setTeacherError] = useState('')
  const [commentError, setCommentError] = useState('')
  useEffect(() => { let live = true; dataApi.inquiryTeachers().then(rows => { if (live) setTeachers(rows) }).catch(e => { if (live) setTeacherError(e instanceof Error ? e.message : 'Не удалось загрузить преподавателей') }); return () => { live = false } }, [])

  const switchTarget = (t: Target) => {
    setTarget(t)
    setError('')
    setTeacherError('')
    setCommentError('')
  }

  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (target === 'teacher') {
      if (!teacher) return setTeacherError('Выберите дисциплину и преподавателя из списка')
      if (!purpose.trim()) return setError('Укажите тему обращения')
      if (!comment.trim()) return setCommentError('Напишите сообщение преподавателю')
      setBusy(true)
      try {
        await dataApi.addInquiry(teacher, purpose.trim(), comment.trim())
        await reload()
        setPurpose('')
        setComment('')
        setTeacher('')
        setError('')
        toast('Обращение отправлено преподавателю')
      } catch (e) { setCommentError(e instanceof Error ? e.message : 'Не удалось отправить обращение') }
      finally { setBusy(false) }
      return
    }
    if (!purpose.trim()) {
      setError('Укажите цель — например, «по месту требования»')
      return
    }
    setBusy(true)
    const ok = await addRequest({ type, purpose: purpose.trim(), comment: comment.trim(), delivery })
    setBusy(false)
    if (!ok) return
    setPurpose('')
    setComment('')
    setError('')
    toast(`Заявка «${REQUEST_TYPES[type]}» отправлена`)
  }

  const chipsInd = useIndicator<HTMLDivElement>(filter)
  const shown = requests.filter((r) => (filter === 'all' ? true : filter === 'work' ? ['submitted','in_progress'].includes(r.status) : ['ready','issued'].includes(r.status)))

  return (
    <>
      <PageHeader
        eyebrow="Подача и история заявок"
        title="Заявки и справки"
        actions={
          <>
            <ThemeButton />
            <IconButton icon="bell" label="Уведомления" to="/student/notifications" dot={unreadCount > 0} />
          </>
        }
      />
      <div className="grid-half">
        <form className="card" onSubmit={submit} noValidate>
          <h2 className="card__title card__title--lg">{target === 'dean' ? 'Новая заявка' : 'Обращение к преподавателю'}</h2>
          <Segmented
            soft
            className="seg--wide"
            label="Кому"
            value={target}
            onChange={switchTarget}
            options={[
              { value: 'dean', label: 'В деканат' },
              { value: 'teacher', label: 'Преподавателю' },
            ]}
          />
          <div key={target} className="form-swap">
          {target === 'dean' && (
          <div className="field">
            <span className="field__label" id="req-type-label">Что нужно</span>
            <div className="type-grid" role="radiogroup" aria-labelledby="req-type-label">
              {DEAN_REQUEST_TYPES.map((t) => (
                <button key={t} type="button" role="radio" aria-checked={type === t} className={`type-card ${type === t ? 'is-active' : ''}`} onClick={() => setType(t)}>
                  <span className="type-card__icon">
                    <Icon name={TYPE_ICON[t]} size={20} />
                  </span>
                  {type === t && <span className="type-card__check" aria-hidden="true"><Icon name="check" size={14} /></span>}
                  {REQUEST_TYPES[t]}
                </button>
              ))}
            </div>
            <select className="input type-select" aria-labelledby="req-type-label" value={type} onChange={(e) => setType(e.target.value as RequestType)}>
              {DEAN_REQUEST_TYPES.map((t) => <option key={t} value={t}>{REQUEST_TYPES[t]}</option>)}
            </select>
          </div>
          )}

          {target === 'teacher' && (
            <div className="field">
              <label className="field__label" htmlFor="inquiry-assignment">Преподаватель и дисциплина</label>
              <select id="inquiry-assignment" className="input" value={teacher} onChange={e => { setTeacher(e.target.value); setTeacherError('') }}>
                <option value="">Выберите назначение</option>
                {teachers.map(a => <option key={a.id} value={a.id}>{a.teacher} · {a.subject} · семестр {a.semester}</option>)}
              </select>
              {!teachers.length && <span className="small muted">Для вашей группы пока нет назначенных преподавателей.</span>}
              {teacherError && <span className="field__error">{teacherError}</span>}
            </div>
          )}

          <label className="field">
            <span className="field__label">{target === 'teacher' ? 'Тема' : 'Цель'}</span>
            <input
              className={`input ${error ? 'is-invalid' : ''}`}
              placeholder={target === 'teacher' ? 'Например, вопрос по контрольной' : type === 'retake' ? 'Дисциплина, например «Теория вероятностей»' : 'Например, для предоставления по месту требования'}
              maxLength={target === 'teacher' ? 200 : 500}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              aria-invalid={!!error}
            />
            {error && <span className="field__error">{error}</span>}
          </label>

          <label className="field">
            <span className="field__label">{target === 'teacher' ? 'Сообщение' : <>Комментарий <span className="field__opt">— необязательно</span></>}</span>
            <textarea className={`input textarea ${commentError ? 'is-invalid' : ''}`} placeholder={target === 'teacher' ? 'Опишите вопрос или просьбу' : 'Дополнительные сведения'} rows={4} maxLength={target === 'teacher' ? 5000 : 2000} value={comment} onChange={(e) => { setComment(e.target.value); setCommentError('') }} />
            {commentError && <span className="field__error">{commentError}</span>}
          </label>

          {target === 'dean' && (
          <div className="field">
            <span className="field__label" id="req-delivery-label">Как получить</span>
            <div className="radio-cards" role="radiogroup" aria-labelledby="req-delivery-label">
              {([['pdf', 'PDF', 'в личном кабинете'], ['office', 'Бумажная', 'в деканате']] as [Delivery, string, string][]).map(([v, title, hint]) => (
                <button key={v} type="button" role="radio" aria-checked={delivery === v} className={`radio-card ${delivery === v ? 'is-active' : ''}`} onClick={() => setDelivery(v)}>
                  <span className="radio-card__dot" aria-hidden="true" />
                  <span><b>{title}</b><small>{hint}</small></span>
                </button>
              ))}
            </div>
          </div>
          )}
          </div>

          <Button disabled={busy} type="submit" variant="primary" size="lg" block>
            {target === 'teacher' ? 'Отправить обращение' : 'Отправить заявку'}
          </Button>
        </form>

        <section className="card">
          <div className="card__head card__head--wrap">
            <h2 className="card__title card__title--lg">Мои заявки</h2>
            <div ref={chipsInd.box} className="chips" role="radiogroup" aria-label="Фильтр">
              <span ref={chipsInd.ind} className="chips__ind" aria-hidden="true" />
              {(
                [
                  ['all', `Все · ${requests.length}`],
                  ['work', 'В работе'],
                  ['ready', 'Готовы'],
                ] as [Filter, string][]
              ).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={filter === v} className={`chip ${filter === v ? 'is-active' : ''}`} onClick={() => setFilter(v)}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <Link to="/student/inquiries" className="link">Мои обращения к преподавателям</Link>
          {shown.length === 0 && <p className="muted">Здесь пока пусто.</p>}
          <div className="stack">
            {shown.map((r) => (
              <article key={r.id} className="req">
                <div className="req__head">
                  <h3>{REQUEST_TYPES[r.type]}</h3>
                  <Badge tone={r.stage >= 2 ? 'ok' : 'neutral'}>{STATUS_LABEL[r.status]}</Badge>
                </div>
                <p className="small muted">
                  {r.purpose} · подана {r.createdLabel} · {r.delivery === 'pdf' ? 'PDF' : 'в деканате'}
                </p>
                {!['cancelled','rejected'].includes(r.status) && <Stages stages={REQUEST_STAGES} current={r.stage} />}
                {r.rejectionReason && <p role="alert">Причина отказа: {r.rejectionReason}</p>}
                {r.comment && <blockquote className="req__comment">«{r.comment}»</blockquote>}
                <div className="req__actions">
                  {['ready','issued'].includes(r.status) && r.delivery === 'pdf' && (
                    <Button variant="primary" icon="download" onClick={() => void downloadFile(`/api/requests/${r.id}/pdf`, `request-${r.id}.pdf`).catch(e => toast(e.message))}>
                      Скачать PDF
                    </Button>
                  )}
                  {['submitted','in_progress'].includes(r.status) && <Button
                    disabled={busy}
                    variant="danger"
                    onClick={async () => {
                      setBusy(true)
                      if (await cancelRequest(r.id)) toast('Заявка отменена')
                      setBusy(false)
                    }}
                  >
                    Отменить заявку
                  </Button>}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
      <Disclaimer />
    </>
  )
}
