import { useEffect, useRef, useState } from 'react'
import { ApiError, staffApi, type ApiGroup } from '../../lib/api'
import { CSV_TEMPLATE, decodeCsv, parseCsv, toLessons, type CsvLesson } from '../../lib/csv'
import { pluralize } from '../../lib/format'
import { KIND_LABEL } from '../../lib/staff'
import { Button } from '../../components/ui'
import { Icon } from '../../components/Icon'

const MAX_ROWS = 500
const dayLabel = (iso: string) => (iso ? iso.split('-').reverse().join('.') : '—')

interface Result { added: number; skipped: number; failed: string | null }

/** Загрузка расписания группы из CSV: разбор в браузере, предпросмотр с проверкой строк, затем добавление по одному занятию. */
export function CsvImportDialog({ group, teachers, onClose, onDone }: { group: ApiGroup; teachers:{id:string;name:string}[]; onClose: () => void; onDone: (r: Result) => void }) {
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<CsvLesson[] | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && progress === null) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, progress])

  const read = async (file: File | undefined) => {
    if (!file) return
    setResult(null)
    setProblem(null)
    setRows(null)
    setFileName(file.name)
    if (file.size > 2_000_000) return setProblem('Файл слишком большой — до 2 МБ.')
    try {
    const parsed = toLessons(parseCsv(decodeCsv(await file.arrayBuffer())))
    setFileName(file.name)
    if (parsed.lessons.length === 0) { setRows(null); return setProblem('В файле нет строк с занятиями.') }
    if (parsed.lessons.length > MAX_ROWS) { setRows(null); return setProblem(`В файле больше ${MAX_ROWS} строк — разделите его на части.`) }
    setRows(parsed.lessons.map(r=>{const matches=teachers.filter(t=>t.name.toLowerCase()===r.teacherName.trim().toLowerCase());return {...r,error:r.error||(matches.length!==1?'Нужно полное уникальное имя преподавателя из списка':undefined)}}))
    } catch { setProblem('Не удалось прочитать CSV. Проверьте файл и кодировку.') }
  }

  const valid = rows?.filter((r) => !r.error) ?? []
  const invalid = (rows?.length ?? 0) - valid.length

  const run = async () => {
    let added = 0, skipped = 0
    let failed: string | null = null
    for (const [i, r] of valid.entries()) {
      setProgress(i)
      try {
        await staffApi.addLesson(group.id, {
          subject: r.subject, kind: r.kind, teacherId:teachers.find(t=>t.name.toLowerCase()===r.teacherName.trim().toLowerCase())?.id, teacherName: r.teacherName, room: r.room,
          startsAt: new Date(`${r.date}T${r.from}:00+03:00`).toISOString(), endsAt: new Date(`${r.date}T${r.to}:00+03:00`).toISOString(),
          changeNote: r.changeNote || null,
        })
        added++
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) skipped++
        else { failed = e instanceof ApiError ? e.message : 'Не удалось сохранить занятие'; break }
      }
    }
    setProgress(null)
    const res = { added, skipped, failed }
    setResult(res)
    onDone(res)
  }

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'raspisanie-shablon.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && progress === null) onClose() }}>
      <div className="dialog dialog--wide" role="dialog" aria-modal="true" aria-labelledby="csv-title">
        <div className="dialog__head">
          <div>
            <h2 id="csv-title" className="card__title card__title--lg">Загрузка расписания из CSV</h2>
            <span className="small muted">Группа {group.name}</span>
          </div>
          <button type="button" className="icon-btn icon-btn--sm" aria-label="Закрыть" disabled={progress !== null} onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        {!result && (
          <>
            <p className="small muted csv-help">
              Колонки: <b>дата; начало; конец; предмет; вид; преподаватель; аудитория; пометка</b>. Преподаватель — полное имя из списка. Дата — дд.мм.гггг, время — чч:мм (МСК), вид — лекция, семинар или практика. Подойдёт CSV из Excel (разделитель «;» или «,»).{' '}
              <button type="button" className="link-btn" onClick={downloadTemplate}>Скачать шаблон</button>
            </p>
            <label
              className={`dropzone ${drag ? 'is-drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); void read(e.dataTransfer.files[0]) }}
            >
              <Icon name="file" size={22} />
              <b>{fileName || 'Выберите файл или перетащите его сюда'}</b>
              <span className="small muted">{rows ? 'Нажмите, чтобы выбрать другой файл' : '.csv, до 2 МБ'}</span>
              <input ref={input} type="file" accept=".csv,text/csv" onChange={(e) => { void read(e.target.files?.[0]); e.target.value = '' }} />
            </label>
            {problem && <p className="form-error" role="alert"><Icon name="alert" size={16} /> {problem}</p>}
          </>
        )}

        {rows && !result && (
          <>
            <p className="csv-summary">
              Строк: <b>{rows.length}</b> · готовы к добавлению: <b>{valid.length}</b>
              {invalid > 0 && <> · с ошибками: <b className="csv-bad">{invalid}</b> (будут пропущены)</>}
            </p>
            <div className="csv-table-wrap">
              <table className="csv-table">
                <thead><tr><th>Стр.</th><th>Дата</th><th>Время</th><th>Предмет</th><th>Вид</th><th>Преподаватель</th><th>Ауд.</th><th>Проверка</th></tr></thead>
                <tbody>
                  {rows.slice(0, 200).map((r) => (
                    <tr key={r.line} className={r.error ? 'is-bad' : ''}>
                      <td>{r.line}</td><td>{dayLabel(r.date)}</td><td>{r.from}–{r.to}</td><td>{r.subject}</td><td>{KIND_LABEL[r.kind]}</td><td>{r.teacherName}</td><td>{r.room}</td>
                      <td>{r.error ?? 'ок'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 200 && <p className="small muted">Показаны первые 200 строк из {rows.length}; проверены все.</p>}
            <p className="small muted">Занятия, которые пересекаются по времени с уже существующими занятиями группы, преподавателя или аудитории, будут пропущены. Подписанные на изменения студенты получат уведомления. Импорт может завершиться частично.</p>
          </>
        )}

        {result && (
          <div className="csv-result" role="status">
            <b>Добавлено занятий: {result.added}</b>
            {result.skipped > 0 && <span>Пропущено из-за пересечений по времени: {result.skipped}</span>}
            {invalid > 0 && <span>Пропущено из-за ошибок в строках: {invalid}</span>}
            {result.failed && <span className="csv-bad">Импорт остановлен: {result.failed}</span>}
          </div>
        )}

        <div className="dialog__actions">
          {result ? (
            <Button variant="strong" onClick={onClose}>Готово</Button>
          ) : (
            <>
              <Button type="button" variant="surface" onClick={onClose} disabled={progress !== null}>Отмена</Button>
              <Button type="button" variant="strong" icon="check" disabled={valid.length === 0 || progress !== null} onClick={() => void run()}>
                {progress !== null ? `Добавляем ${progress + 1} из ${valid.length}…` : valid.length ? `Добавить ${valid.length} ${pluralize(valid.length, 'занятие', 'занятия', 'занятий')}` : 'Добавить занятия'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
