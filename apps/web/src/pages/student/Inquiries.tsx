import { useEffect, useState, type FormEvent } from 'react';
import { useData } from '../../context/data';
import { dataApi, type ApiAssignment } from '../../lib/api';
import { Badge, Button, PageHeader, ThemeButton } from '../../components/ui';
const status = { new: 'Новое', progress: 'В работе', closed: 'Закрыто' };
export function StudentInquiriesPage() {
    const { inquiries, reload } = useData();
    const [teachers, setTeachers] = useState<ApiAssignment[]>([]), [assignmentId, setAssignment] = useState(''), [subject, setSubject] = useState(''), [text, setText] = useState('');
    const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
    useEffect(() => { let live = true; dataApi.inquiryTeachers().then(rows => { if (live)
        setTeachers(rows); }).catch(e => { if (live)
        setError(e.message); }); return () => { live = false; }; }, []);
    const submit = async (e: FormEvent) => { e.preventDefault(); if (busy)
        return; setBusy(true); setError(null); try {
        await dataApi.addInquiry(assignmentId || teachers[0]?.id, subject, text);
        setSubject('');
        setText('');
        await reload();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось отправить');
    }
    finally {
        setBusy(false);
    } };
    return <><PageHeader title="Обращения преподавателям" eyebrow="Вопросы и ответы" actions={<ThemeButton />}/>{error && <p role="alert" className="form-error">{error}</p>}
    <div className="grid-half"><form className="card stack" onSubmit={submit}><h2 className="card__title">Новое обращение</h2>
      <label className="field">Преподаватель и дисциплина<select required className="input" value={assignmentId || teachers[0]?.id || ''} onChange={e => setAssignment(e.target.value)}>{teachers.map(a => <option key={a.id} value={a.id}>{a.teacher} · {a.subject} · семестр {a.semester}</option>)}</select></label>
      {!teachers.length && <p className="muted">Для вашей группы пока нет назначенных преподавателей.</p>}
      <label className="field">Тема<input required className="input" maxLength={200} value={subject} onChange={e => setSubject(e.target.value)}/></label>
      <label className="field">Сообщение<textarea required className="input textarea" rows={5} maxLength={5000} value={text} onChange={e => setText(e.target.value)}/></label>
      <Button type="submit" disabled={busy || !teachers.length}>{busy ? 'Отправляем…' : 'Отправить'}</Button>
    </form><section className="card stack"><h2 className="card__title">Мои обращения</h2>{!inquiries.length && <p className="muted">Обращений пока нет.</p>}{inquiries.map(q => <article className="req" key={q.id}><div className="req__head"><h3>{q.subject}</h3><Badge>{status[q.status]}</Badge></div><p style={{ whiteSpace: 'pre-wrap' }}>{q.message}</p>{q.replies.map((r, i) => <blockquote key={i} style={{ whiteSpace: 'pre-wrap' }} className="req__comment">{r}</blockquote>)}<p className="small muted">Чтобы продолжить обсуждение, создайте новое обращение.</p></article>)}</section></div>
  </>;
}
