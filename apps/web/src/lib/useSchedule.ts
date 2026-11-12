import { useCallback, useEffect, useState } from 'react';
import { dataApi } from './api';
import type { Lesson } from '../types';
export const moscowYmd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
export const moscowTime = (d: Date) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
export const moscowCivil = (d: Date) => new Date(`${moscowYmd(d)}T${moscowTime(d)}:00`);
export function useSchedule(from: string, to: string) {
    const [lessons, setLessons] = useState<Lesson[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null);
    const [revision, setRevision] = useState(0);
    const reload = useCallback(() => setRevision(v => v + 1), []);
    useEffect(() => {
        let live = true;
        setLoading(true);
        setLessons([]);
        dataApi.schedule(new Date(from + 'T00:00:00+03:00'), new Date(to + 'T00:00:00+03:00')).then(rows => { if (!live)
            return; setLessons(rows.map(r => ({ id: r.id, date: moscowYmd(new Date(r.startsAt)), day: (new Date(moscowYmd(new Date(r.startsAt)) + 'T12:00').getDay() + 6) % 7, start: moscowTime(new Date(r.startsAt)), end: moscowTime(new Date(r.endsAt)), subject: r.subject, kind: ({ lecture: 'Лекция', seminar: 'Семинар', practice: 'Практика' } as const)[r.kind], room: r.room, teacher: r.teacherName, group: r.groupName, status: r.cancelled ? 'cancelled' : r.changeNote ? 'moved' : undefined, movedFrom: r.changeNote ?? undefined }))); setError(null); }).catch(e => { if (live)
            setError(e.message); }).finally(() => { if (live)
            setLoading(false); });
        return () => { live = false; };
    }, [from, to, revision]);
    useEffect(() => { const f = () => { if (document.visibilityState === 'visible')
        reload(); }; window.addEventListener('focus', f); const timer = setInterval(f, 60000); return () => { clearInterval(timer); window.removeEventListener('focus', f); }; }, [reload]);
    return { lessons, loading, error, reload };
}
export function useTodaySchedule(now: Date) { const date = moscowYmd(now); const next = moscowYmd(new Date(+now + 86400000)); return useSchedule(date, next); }
