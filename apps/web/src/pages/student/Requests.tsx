import { dataApi, downloadFile, type ApiAssignment } from '../../lib/api'
import { STATUS_LABEL } from '../../lib/staff'
import { useEffect, useState, type FormEvent } from 'react'
import { useIndicator } from '../../lib/useIndicator'
import { useSmoothHeight } from '../../lib/useSmoothHeight'
import { useData } from '../../context/data'
import { useToast } from '../../context/toast'
import { REQUEST_STAGES, REQUEST_TYPES } from '../../data/mock'
import type { Delivery, RequestType } from '../../types'
import { Badge, Button, Disclaimer, IconButton, PageHeader, Segmented, Stages, ThemeButton } from '../../components/ui'
import { RequestTypePicker } from '../../components/RequestTypePicker'
import { Link } from 'react-router-dom'

type Filter = 'all' | 'work' | 'ready'
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
      setError(type === 'other' ? 'Коротко напишите, что нужно' : 'Укажите цель — например, «по месту требования»')
      return
    }
    if (type === 'other' && !comment.trim()) return setCommentError('Опишите, что нужно, — иначе деканат не поймёт обращение')
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
  const swapRef = useSmoothHeight(target)
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
      <div className="grid-half grid-half--req">
        <form className="card" onSubmit={submit} noValidate>
          <h2 key={target} className="card__title card__title--lg title-swap">{target === 'dean' ? 'Новая заявка' : 'Обращение к преподавателю'}</h2>
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
          <div ref={swapRef} className="form-swap-wrap">
          <div key={target} className="form-swap">
          {target === 'dean' && (
          <div className="field">
            <span className="field__label" id="req-type-label">Что нужно оформить</span>
            <RequestTypePicker value={type} onChange={setType} labelId="req-type-label" />
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
              placeholder={target === 'teacher' ? 'Например, вопрос по контрольной' : type === 'retake' ? 'Дисциплина, например «Теория вероятностей»' : type === 'other' ? 'Коротко: что нужно' : 'Например, для предоставления по месту требования'}
              maxLength={target === 'teacher' ? 200 : 500}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              aria-invalid={!!error}
            />
            {error && <span className="field__error">{error}</span>}
          </label>

          <label className="field">
            <span className="field__label">{target === 'teacher' ? 'Сообщение' : type === 'other' ? 'Опишите обращение' : <>Комментарий <span className="field__opt">— необязательно</span></>}</span>
            <textarea className={`input textarea ${commentError ? 'is-invalid' : ''}`} placeholder={target === 'teacher' ? 'Опишите вопрос или просьбу' : 'Дополнительные сведения'} rows={4} maxLength={target === 'teacher' ? 5000 : 2000} value={comment} onChange={(e) => { setComment(e.target.value); setCommentError('') }} />
            {commentError && <span className="field__error">{commentError}</span>}
          </label>

          {target === 'dean' && (
          <div className="field">
            <span className="field__label" id="req-delivery-label">Как получить</span>
            <Segmented
              soft
             
              className="seg--wide"
              label="Как получить"
              value={delivery}
              onChange={setDelivery}
              options={[
                { value: 'pdf', label: 'PDF' },
                { value: 'office', label: 'Бумажная' },
              ]}
            />
            <span className="small muted">{delivery === 'pdf' ? 'Файл появится в личном кабинете.' : 'Заберёте в деканате.'}</span>
          </div>
          )}
          </div>
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
