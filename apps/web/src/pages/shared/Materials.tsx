import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useUser } from '../../context/auth';
import { dataApi, downloadFile, type ApiAssignment, type ApiMaterial } from '../../lib/api';
import { Button, PageHeader, ThemeButton } from '../../components/ui';
export function MaterialsPage() {
    const user = useUser(), teacher = user.role === 'teacher';
    const [rows, setRows] = useState<ApiMaterial[]>([]), [assignments, setAssignments] = useState<ApiAssignment[]>([]);
    const [selected, setSelected] = useState(''), [title, setTitle] = useState(''), [file, setFile] = useState<File | null>(null), [formKey, setFormKey] = useState(0);
    const [error, setError] = useState<string | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
    const reload = useCallback(async () => { try {
        const [rs, as] = await Promise.all([dataApi.materials(), dataApi.assignments()]);
        setRows(rs);
        setAssignments(as);
        setError(null);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    }
    finally {
        setLoading(false);
    } }, []);
    useEffect(() => { void reload(); }, [reload]);
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!file || busy)
            return;
        if (file.size > 5 * 1024 * 1024 || file.size === 0) {
            setError('Размер файла: от 1 байта до 5 МиБ');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const contentBase64 = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1]); r.onerror = () => reject(new Error('Не удалось прочитать файл')); r.readAsDataURL(file); });
            await dataApi.uploadMaterial({ assignmentId: selected || assignments[0]?.id, title, fileName: file.name, contentBase64 });
            setTitle('');
            setFile(null);
            setFormKey(k => k + 1);
            await reload();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Не удалось загрузить файл');
        }
        finally {
            setBusy(false);
        }
    };
    return <><PageHeader title="Учебные материалы" eyebrow={teacher ? 'Файлы для ваших дисциплин и групп' : 'Материалы вашей группы'} actions={<ThemeButton />}/>
    {error && <p role="alert" className="form-error">{error} <button className="link-btn" onClick={() => void reload()}>Обновить</button></p>}
    {loading && <p role="status">Загружаем материалы…</p>}
    <div className={teacher ? 'grid-half' : 'stack'}>
      {teacher && <form className="card stack" onSubmit={submit}>
        <h2 className="card__title">Добавить материал</h2>
        <label className="field">Дисциплина и группа<select className="input" required value={selected || assignments[0]?.id || ''} onChange={e => setSelected(e.target.value)}>{assignments.map(a => <option key={a.id} value={a.id}>{a.subject} · {a.group} · семестр {a.semester}</option>)}</select></label>
        {!assignments.length && <p>Нет назначенных дисциплин.</p>}
        <label className="field">Название<input className="input" required maxLength={200} value={title} onChange={e => setTitle(e.target.value)}/></label>
        <label className="field">Файл<input key={formKey} className="input" type="file" required accept=".pdf,.txt,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files?.[0] ?? null)}/></label>
        <p className="small muted">PDF, TXT, PNG, JPG · до 5 МиБ</p><Button type="submit" disabled={busy || !assignments.length}>{busy ? 'Загружаем…' : 'Добавить файл'}</Button>
      </form>}
      <section className="card stack"><h2 className="card__title">Доступные материалы</h2>{!loading && !rows.length && <p className="muted">Материалов пока нет.</p>}
        {rows.map(r => <article className="req" key={r.id}><h3>{r.title}</h3><p className="small muted">{r.subject} · {r.group} · {r.fileName} · {Math.ceil(r.size / 1024)} КБ</p><div className="req__actions">
          <Button onClick={() => void downloadFile(`/api/materials/${r.id}/file`, r.fileName).catch(e => setError(e.message))}>Скачать</Button>
          {teacher && <Button variant="danger" disabled={busy} onClick={async () => { if (!window.confirm(`Удалить «${r.title}»?`))
            return; setBusy(true); try {
            await dataApi.deleteMaterial(r.id);
            await reload();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Не удалось удалить');
        }
        finally {
            setBusy(false);
        } }}>Удалить</Button>}
        </div></article>)}
      </section>
    </div></>;
}
