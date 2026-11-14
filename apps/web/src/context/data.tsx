import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
/* Если после фонового обновления данные не изменились, оставляем прежний объект: интерфейс не перерисовывается зря. */
function keep<T>(prev: T, next: T): T { return JSON.stringify(prev) === JSON.stringify(next) ? prev : next; }
import type { GradeSheet, Inquiry, InquiryStatus, Notice, NotifyPrefs, StudentRequest } from '../types';
import { dataApi, type ApiGrade, type ApiStaffRequest } from '../lib/api';
import { useAuth } from './auth';
const dateLabel = (value: string) => new Date(value).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }) + ' МСК';
const requestView = (r: ApiStaffRequest): StudentRequest => ({ ...r, stage: ({ submitted: 0, in_progress: 1, ready: 2, issued: 3, cancelled: 0, rejected: 0 } as const)[r.status], createdLabel: dateLabel(r.createdAt) });
interface Data {
    requests: StudentRequest[];
    notices: Notice[];
    prefs: NotifyPrefs;
    inquiries: Inquiry[];
    sheets: GradeSheet[];
    grades: ApiGrade[];
    unreadCount: number;
    newInquiries: number;
    loading: boolean;
    error: string | null;
    reload: () => Promise<void>;
    addRequest: (r: Pick<StudentRequest, 'type' | 'purpose' | 'comment' | 'delivery'>) => Promise<boolean>;
    cancelRequest: (id: string) => Promise<boolean>;
    markRead: (id: string) => Promise<boolean>;
    markAllRead: () => Promise<boolean>;
    setPref: (k: keyof NotifyPrefs, v: boolean) => Promise<boolean>;
    setInquiryStatus: (id: string, status: InquiryStatus) => Promise<boolean>;
    replyInquiry: (id: string, text: string) => Promise<boolean>;
    saveSheet: (sheet: GradeSheet) => Promise<boolean>;
}
const Ctx = createContext<Data | null>(null);
export function DataProvider({ children }: {
    children: ReactNode;
}) {
    const { user } = useAuth();
    const [requests, setRequests] = useState<StudentRequest[]>([]), [notices, setNotices] = useState<Notice[]>([]), [prefs, setPrefs] = useState<NotifyPrefs>({ deadlines: true, schedule: true, news: false });
    const [inquiries, setInquiries] = useState<Inquiry[]>([]), [sheets, setSheets] = useState<GradeSheet[]>([]), [grades, setGrades] = useState<ApiGrade[]>([]);
    const [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null), sequence = useRef(0);
    const reload = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        const seq = ++sequence.current;
        try {
            const [rs, ns, ps, qs, ss, gs] = await Promise.all([user.role === 'student' ? dataApi.requests() : Promise.resolve([]), dataApi.notices(), dataApi.prefs(), user.role !== 'staff' ? dataApi.inquiries() : Promise.resolve([]), user.role === 'teacher' ? dataApi.sheets() : Promise.resolve([]), user.role === 'student' ? dataApi.grades() : Promise.resolve([])]);
            if (seq !== sequence.current)
                return;
            setRequests(p => keep(p, rs.map(requestView)));
            setNotices(p => keep(p, ns.map(n => ({ id: n.id, title: n.title, text: n.body, time: dateLabel(n.createdAt), unread: !n.readAt, icon: n.kind === 'change' ? 'calendar' : n.kind === 'request' ? 'doc' : n.kind === 'inquiry' ? 'inbox' : 'bell', kind: n.kind }))));
            setPrefs(p => keep(p, ps));
            setInquiries(p => keep(p, qs.map(q => ({ ...q, group: q.group ?? '—', initials: q.student.split(' ').slice(0, 2).map(n => n[0]).join(''), message: q.text, replies: q.replies.map(r => `${dateLabel(r.createdAt)} — ${r.text}`) }))));
            setSheets(p => keep(p, ss.map(s => ({ ...s, deadlineLabel: s.deadline ? dateLabel(s.deadline) : 'срок не задан' }))));
            setGrades(p => keep(p, gs));
            setError(null);
        }
        catch (e) {
            if (seq === sequence.current)
                setError(e instanceof Error ? e.message : 'Не удалось загрузить данные');
        }
        finally {
            if (seq === sequence.current)
                setLoading(false);
        }
    }, [user]);
    useEffect(() => { void reload(); const refresh = () => { if (document.visibilityState === 'visible')
        void reload(); }; const timer = window.setInterval(refresh, 60000); window.addEventListener('focus', refresh); return () => { ++sequence.current; clearInterval(timer); window.removeEventListener('focus', refresh); }; }, [reload]);
    const mutate = useCallback(async (action: () => Promise<unknown>) => { ++sequence.current; try {
        await action();
        await reload();
        return true;
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось сохранить');
        return false;
    } }, [reload]);
    const value = useMemo<Data>(() => ({ requests, notices, prefs, inquiries, sheets, grades, loading, error, reload, unreadCount: notices.filter(n => n.unread).length, newInquiries: inquiries.filter(q => q.status === 'new').length,
            addRequest: r => mutate(() => dataApi.addRequest(r)), cancelRequest: id => mutate(() => dataApi.cancelRequest(id)), markRead: id => mutate(() => dataApi.read(id)), markAllRead: () => mutate(() => dataApi.readAll()), setPref: (k, v) => mutate(() => dataApi.setPrefs({ [k]: v })),
            setInquiryStatus: (id, status) => mutate(() => dataApi.inquiryStatus(id, status)), replyInquiry: (id, text) => mutate(() => dataApi.replyInquiry(id, text)), saveSheet: s => mutate(() => dataApi.saveSheet(s.id, s.version, s.students.map(st => ({ studentId: st.id, score: st.score })))) }), [requests, notices, prefs, inquiries, sheets, grades, loading, error, reload, mutate]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useData() { const v = useContext(Ctx); if (!v)
    throw new Error('useData вне DataProvider'); return v; }
