import { useState } from 'react';
import { downloadFile, staffApi, type ApiStaffRequest } from '../../lib/api';
import { Button } from '../../components/ui';
export function DocumentActions({ row, reload }: {
    row: ApiStaffRequest;
    reload: () => Promise<void>;
}) {
    const [verified, setVerified] = useState(false), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
    const run = async (fn: () => Promise<unknown>) => { setBusy(true); setError(null); try {
        await fn();
        await reload();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось выполнить действие');
    }
    finally {
        setBusy(false);
    } };
    if (!['submitted', 'in_progress'].includes(row.status))
        return row.rejectionReason ? <p>Причина отказа: {row.rejectionReason}</p> : null;
    return <div className="stack">
    {error && <p className="form-error" role="alert">{error}</p>}
    {row.type === 'study' && row.status === 'in_progress' && <>
      <p className="small">{row.faculty ?? 'Факультет не указан'} · {row.program ?? 'Направление не указано'} · курс {row.year ?? 'не указан'} · {row.groupName ?? 'группа не указана'}</p>
      <ol className="small muted" style={{ margin: 0, paddingLeft: '1.2em' }}>
        <li>Проверьте сведения о студенте выше и отметьте галочку.</li>
        <li>Сформируйте PDF справки и скачайте его, чтобы проверить глазами.</li>
        <li>Если всё верно, нажмите «Справка готова» — студент получит уведомление.</li>
      </ol>
      <label className="field"><span><input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)}/> Сведения и факт обучения проверены</span></label>
      <div className="req__actions"><Button disabled={busy || !verified} onClick={() => void run(() => staffApi.prepare(row.id))}>{row.draftId ? 'Сформировать PDF заново' : 'Сформировать PDF справки'}</Button>
      {row.draftId && <Button disabled={busy} onClick={() => void run(() => downloadFile(`/api/staff/requests/${row.id}/preview`, 'draft.pdf', { draftId: row.draftId }))}>Скачать PDF для проверки</Button>}
      {row.draftId && row.previewedAt && <Button disabled={busy || !verified} onClick={() => void run(() => staffApi.setStatus(row.id, 'ready', { draftId: row.draftId! }))}>Справка готова — уведомить студента</Button>}</div>
      <p className="small muted">{!row.draftId ? 'Сначала сформируйте PDF.' : !row.previewedAt ? 'Скачайте PDF и проверьте его — после этого появится кнопка «Справка готова».' : 'PDF проверен. Можно уведомлять студента.'}</p>
    </>}
    <label className="field">Причина отказа<textarea className="input textarea" maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Что студенту нужно исправить"/></label>
    <Button variant="danger" disabled={busy || !reason.trim()} onClick={() => void run(() => staffApi.setStatus(row.id, 'rejected', { reason: reason.trim() }))}>Отклонить с причиной</Button>
  </div>;
}
