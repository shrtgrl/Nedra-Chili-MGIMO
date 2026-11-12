import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '../../context/data'
import { useToast } from '../../context/toast'
import type { InquiryStatus } from '../../types'
import { Avatar, Badge, Button, Disclaimer, PageHeader, Segmented, ThemeButton, type Tone } from '../../components/ui'

const STATUS: Record<InquiryStatus, { label: string; tone: Tone }> = {
  new: { label: 'Новое', tone: 'warn' },
  progress: { label: 'В работе', tone: 'neutral' },
  closed: { label: 'Закрыто', tone: 'ok' },
}

export function InquiriesPage() {
  const { inquiries, newInquiries, setInquiryStatus, replyInquiry } = useData()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const selected = inquiries.find((q) => q.id === params.get('id')) ?? inquiries[0]
  const [reply, setReply] = useState('')

  const [busy,setBusy]=useState(false)
  const send = async () => {
    if (!reply.trim() || !selected || busy || selected.status==='closed') return
    setBusy(true)
    if(await replyInquiry(selected.id, reply.trim())) {setReply('');toast(`Ответ отправлен: ${selected.student}`)}
    setBusy(false)
  }

  if (!selected) return <><PageHeader eyebrow="Личный кабинет" title="Обращения студентов"/><p className="card">Обращений пока нет.</p></>

  return (
    <>
      <PageHeader eyebrow={`Новых: ${newInquiries} · всего ${inquiries.length}`} title="Обращения студентов" actions={<ThemeButton />} />
      <div className="grid-inbox">
        <section className="card">
          <h2 className="card__title card__title--lg">Входящие</h2>
          <ul className="inbox" role="listbox" aria-label="Обращения">
            {inquiries.map((q) => (
              <li key={q.id} role="option" aria-selected={q.id === selected.id}>
                <button type="button" className={`inbox__item ${q.id === selected.id ? 'is-active' : ''}`} disabled={busy} onClick={() => {setParams({ id: q.id });setReply('')}}>
                  <span className="inbox__head">
                    <b>{q.student}</b>
                    <Badge tone={STATUS[q.status].tone}>{STATUS[q.status].label}</Badge>
                  </span>
                  <span className="inbox__subject">{q.subject}</span>
                  <span className="small muted">Группа {q.group}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card thread" aria-live="polite">
          <div className="card__head card__head--top">
            <div>
              <h2 className="card__title card__title--lg">{selected.subject}</h2>
              <span className="muted">
                {selected.student} · группа {selected.group}
              </span>
            </div>
            <Badge tone={STATUS[selected.status].tone}>{STATUS[selected.status].label}</Badge>
          </div>

          <div className="msg">
            <Avatar initials={selected.initials} size={44} tone="neutral" />
            <p className="msg__bubble">{selected.message}</p>
          </div>
          {selected.replies.map((r, i) => (
            <div key={i} className="msg msg--mine">
              <p className="msg__bubble">{r}</p>
            </div>
          ))}

          <div className="field">
            <span className="field__label">Статус</span>
            <Segmented
              soft
              label="Статус"
              value={selected.status === 'closed' ? 'closed' : 'progress'}
              onChange={async(v) => {if(busy)return;setBusy(true);await setInquiryStatus(selected.id, v);setBusy(false)}}
              options={[
                { value: 'progress', label: 'В работе' },
                { value: 'closed', label: 'Закрыто' },
              ]}
            />
          </div>

          <label className="field">
            <span className="field__label">Ответ студенту</span>
            <textarea
              className="input textarea"
              rows={4}
              maxLength={5000}
              disabled={busy || selected.status==='closed'}
              placeholder="Напишите ответ"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
              }}
            />
          </label>
          <div className="thread__actions">
            <Button variant="primary" icon="check" onClick={send} disabled={!reply.trim() || busy || selected.status==='closed'}>
              Отправить ответ
            </Button>
          </div>
        </section>
      </div>
      <Disclaimer />
    </>
  )
}
