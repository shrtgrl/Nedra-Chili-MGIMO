import { useState, type FormEvent } from 'react'
import { useIndicator } from '../../lib/useIndicator'
import { useData } from '../../context/data'
import { useToast } from '../../context/toast'
import { DEAN_REQUEST_TYPES, REQUEST_STAGES, REQUEST_TYPES, STUDENT_TEACHERS } from '../../data/mock'
import type { Delivery, RequestType } from '../../types'
import { Badge, Button, Disclaimer, IconButton, PageHeader, Segmented, Stages, ThemeButton } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { Combo } from '../../components/Combo'

type Filter = 'all' | 'work' | 'ready'
type Target = 'dean' | 'teacher'

export function RequestsPage() {
  const { requests, addRequest, cancelRequest, unreadCount } = useData()
  const toast = useToast()
  const [type, setType] = useState<RequestType>('study')
  const [purpose, setPurpose] = useState('')
  const [comment, setComment] = useState('')
  const [delivery, setDelivery] = useState<Delivery>('pdf')
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState('')
  const [target, setTarget] = useState<Target>('dean')
  const [teacher, setTeacher] = useState('')
  const [teacherError, setTeacherError] = useState('')
  const [commentError, setCommentError] = useState('')

  const switchTarget = (t: Target) => {
    setTarget(t)
    setError('')
    setTeacherError('')
    setCommentError('')
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (target === 'teacher') {
      const found = STUDENT_TEACHERS.find((t) => t.name.toLowerCase() === teacher.trim().toLowerCase())
      if (!found) return setTeacherError('Выберите преподавателя из списка')
      if (!purpose.trim()) return setError('Укажите тему обращения')
      if (!comment.trim()) return setCommentError('Напишите сообщение преподавателю')
      addRequest({ type: 'inquiry', teacher: found.name, purpose: purpose.trim(), comment: comment.trim(), delivery: 'pdf' })
      setPurpose('')
      setComment('')
      setTeacher('')
      setError('')
      toast(`Обращение отправлено: ${found.name}`)
      return
    }
    if (!purpose.trim()) {
      setError('Укажите цель — например, «по месту требования»')
      return
    }
    addRequest({ type, purpose: purpose.trim(), comment: comment.trim(), delivery })
    setPurpose('')
    setComment('')
    setError('')
    toast(`Заявка «${REQUEST_TYPES[type]}» отправлена`)
  }

  const chipsInd = useIndicator<HTMLDivElement>(filter)
  const shown = requests.filter((r) => (filter === 'all' ? true : filter === 'work' ? r.stage < 2 : r.stage >= 2))

  return (
    <>
      <PageHeader
        eyebrow="Срок исполнения — до 3 рабочих дней"
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
          <div className="type-grid" role="radiogroup" aria-label="Тип заявки">
            {DEAN_REQUEST_TYPES.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={type === t} className={`type-card ${type === t ? 'is-active' : ''}`} onClick={() => setType(t)}>
                <span className="type-card__icon">
                  <Icon name="file" size={18} />
                </span>
                {REQUEST_TYPES[t]}
              </button>
            ))}
          </div>
          )}

          {target === 'teacher' && (
            <div className="field">
              <Combo
                label="Преподаватель"
                value={teacher}
                onChange={(v) => { setTeacher(v); setTeacherError('') }}
                options={STUDENT_TEACHERS.map((t) => ({ value: t.name, hint: t.subjects }))}
                placeholder="Начните вводить фамилию"
                emptyText="Такого преподавателя нет в вашем списке"
                invalid={!!teacherError}
              />
              {teacherError && <span className="field__error">{teacherError}</span>}
            </div>
          )}

          <label className="field">
            <span className="field__label">{target === 'teacher' ? 'Тема' : 'Цель'}</span>
            <input
              className={`input ${error ? 'is-invalid' : ''}`}
              placeholder={target === 'teacher' ? 'Например, вопрос по контрольной' : type === 'retake' ? 'Дисциплина, например «Теория вероятностей»' : 'Например, для предоставления по месту требования'}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              aria-invalid={!!error}
            />
            {error && <span className="field__error">{error}</span>}
          </label>

          <label className="field">
            <span className="field__label">{target === 'teacher' ? 'Сообщение' : 'Комментарий'}</span>
            <textarea className={`input textarea ${commentError ? 'is-invalid' : ''}`} placeholder={target === 'teacher' ? 'Опишите вопрос или просьбу' : 'Дополнительные сведения'} rows={4} value={comment} onChange={(e) => { setComment(e.target.value); setCommentError('') }} />
            {commentError && <span className="field__error">{commentError}</span>}
          </label>

          {target === 'dean' && (
          <div className="field">
            <span className="field__label">Способ получения</span>
            <Segmented
              soft
              className="seg--wide"
              label="Способ получения"
              value={delivery}
              onChange={setDelivery}
              options={[
                { value: 'pdf', label: 'Электронно (PDF)' },
                { value: 'office', label: 'В деканате' },
              ]}
            />
          </div>
          )}
          </div>

          <Button type="submit" variant="primary" size="lg" block icon="check">
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

          {shown.length === 0 && <p className="muted">Здесь пока пусто.</p>}
          <div className="stack">
            {shown.map((r) => (
              <article key={r.id} className="req">
                <div className="req__head">
                  <h3>{REQUEST_TYPES[r.type]}</h3>
                  <Badge tone={r.stage >= 2 ? 'ok' : 'neutral'}>{r.teacher ? 'Отправлено' : REQUEST_STAGES[r.stage]}</Badge>
                </div>
                <p className="small muted">
                  {r.teacher
                    ? `${r.teacher} · ${r.purpose} · отправлено ${r.createdLabel}`
                    : `${r.purpose} · подана ${r.createdLabel} · ${r.delivery === 'pdf' ? 'PDF' : 'в деканате'}`}
                </p>
                {!r.teacher && <Stages stages={REQUEST_STAGES} current={r.stage} />}
                {r.comment && <blockquote className="req__comment">«{r.comment}»</blockquote>}
                <div className="req__actions">
                  {!r.teacher && r.stage >= 2 && r.delivery === 'pdf' && (
                    <Button variant="primary" icon="download" onClick={() => toast('Демо: в настоящем сервисе здесь скачается PDF')}>
                      Скачать PDF
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    onClick={() => {
                      cancelRequest(r.id)
                      toast(r.teacher ? 'Обращение отозвано' : 'Заявка отменена')
                    }}
                  >
                    {r.teacher ? 'Отозвать обращение' : 'Отменить заявку'}
                  </Button>
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
