import type { FastifyInstance } from 'fastify';
import { and, asc, eq, gt, lt, ne, or, ilike, sql } from 'drizzle-orm';
import { actor, bodyObject, fail, instant, textValue, uuid, type Authorize, type Db, type DbSession } from './domain.js';
import { groups, lessons, notifications, subjects, userPrefs, users } from './schema.js';
const rowQuery = (db: DbSession) => db.select({ id: lessons.id, groupId: lessons.groupId, groupName: groups.name, subject: subjects.name, kind: lessons.kind, teacherId: lessons.teacherId, teacherName: lessons.teacherName, room: lessons.room, startsAt: lessons.startsAt, endsAt: lessons.endsAt, changeNote: lessons.changeNote, cancelled: lessons.cancelled }).from(lessons).innerJoin(subjects, eq(subjects.id, lessons.subjectId)).innerJoin(groups, eq(groups.id, lessons.groupId));
function period(q: Record<string, unknown>) {
    const from = instant(q.from), to = instant(q.to);
    if (!Number.isFinite(+from) || !Number.isFinite(+to) || !(to > from) || +to - +from > 62 * 86400000)
        fail(400, 'Период: от 1 миллисекунды до 62 дней');
    return { from, to };
}
export function scheduleRoutes(app: FastifyInstance, db: Db, staff: Authorize, auth: Authorize) {
    app.get('/api/staff/teachers', async (req, reply) => { if (!await staff(req, reply))
        return; return { data: await db.select({ id: users.id, name: users.fullName }).from(users).where(eq(users.role, 'teacher')).orderBy(asc(users.fullName)) }; });
    app.get<{
        Querystring: {
            q?: string;
        };
    }>('/api/staff/groups', async (req, reply) => {
        if (!await staff(req, reply))
            return;
        const q = (req.query.q ?? '').trim();
        if (q.length > 60)
            fail(400, 'Слишком длинный поисковый запрос');
        const pattern = '%' + q.replace(/[\\%_]/g, m => '\\' + m) + '%';
        return { data: await db.select().from(groups).where(q ? or(ilike(groups.name, pattern), ilike(groups.program, pattern), ilike(groups.faculty, pattern)) : undefined).orderBy(asc(groups.name)).limit(30) };
    });
    app.get<{
        Params: {
            id: string;
        };
        Querystring: {
            from: string;
            to: string;
        };
    }>('/api/staff/groups/:id/lessons', async (req, reply) => {
        if (!await staff(req, reply))
            return;
        const { from, to } = period(req.query), id = uuid(req.params.id);
        const [group] = await db.select().from(groups).where(eq(groups.id, id));
        if (!group)
            fail(404, 'Группа не найдена');
        return { data: { group, lessons: await rowQuery(db).where(and(eq(lessons.groupId, id), gt(lessons.endsAt, from), lt(lessons.startsAt, to))).orderBy(asc(lessons.startsAt)) } };
    });
    app.get<{
        Querystring: {
            from: string;
            to: string;
        };
    }>('/api/schedule', async (req, reply) => {
        const id = await auth(req, reply);
        if (!id)
            return;
        const u = await actor(db, id), { from, to } = period(req.query);
        if (!['student', 'teacher'].includes(u.role))
            fail(403, 'Используйте кабинет сотрудника');
        return { data: await rowQuery(db).where(and(u.role === 'student' ? eq(lessons.groupId, u.groupId!) : eq(lessons.teacherId, id), gt(lessons.endsAt, from), lt(lessons.startsAt, to))).orderBy(asc(lessons.startsAt)) };
    });
    async function notify(tx: DbSession, groupId: string, title: string, body: string) {
        const recipients = await tx.select({ id: users.id, schedule: userPrefs.schedule }).from(users).leftJoin(userPrefs, eq(userPrefs.userId, users.id)).where(and(eq(users.role, 'student'), eq(users.groupId, groupId)));
        const values = recipients.filter(r => r.schedule !== false).map(r => ({ studentId: r.id, kind: 'change', title, body }));
        if (values.length)
            await tx.insert(notifications).values(values);
    }
    async function values(tx: DbSession, b: Record<string, unknown>, old?: typeof lessons.$inferSelect) {
        const subject = b.subject === undefined && old ? (await tx.select().from(subjects).where(eq(subjects.id, old.subjectId)))[0]!.name : textValue(b.subject, 120, 'Дисциплина');
        const kind = b.kind ?? old?.kind;
        if (!['lecture', 'seminar', 'practice'].includes(String(kind)))
            fail(400, 'Неверный вид занятия');
        const room = textValue(b.room ?? old?.room, 40, 'Аудитория');
        const startsAt = instant(b.startsAt ?? old?.startsAt?.toISOString()), endsAt = instant(b.endsAt ?? old?.endsAt?.toISOString());
        if (!Number.isFinite(+startsAt) || !Number.isFinite(+endsAt) || endsAt <= startsAt || +endsAt - +startsAt > 12 * 3600000)
            fail(400, 'Неверное время занятия');
        let teacherId = old?.teacherId ?? null, teacherName = old?.teacherName ?? '';
        if (b.teacherId !== undefined || !old) {
            teacherId = uuid(b.teacherId);
            const [t] = await tx.select().from(users).where(and(eq(users.id, teacherId), eq(users.role, 'teacher')));
            if (!t)
                fail(400, 'Выберите преподавателя');
            teacherName = t.fullName;
        }
        else if (b.teacherName !== undefined && b.teacherName !== teacherName)
            fail(400, 'Для смены преподавателя передайте teacherId');
        let changeNote = old?.changeNote ?? null;
        if ('changeNote' in b) {
            if (b.changeNote !== null && typeof b.changeNote !== 'string')
                fail(400, 'Неверная пометка');
            changeNote = (b.changeNote as string | null)?.trim() || null;
            if (changeNote && changeNote.length > 300)
                fail(400, 'Пометка до 300 символов');
        }
        const [found] = await tx.select().from(subjects).where(eq(subjects.name, subject)).limit(1);
        const subjectId = found?.id ?? (await tx.insert(subjects).values({ name: subject }).returning())[0]!.id;
        return { subjectId, kind: kind as string, teacherId, teacherName, room, startsAt, endsAt, changeNote };
    }
    async function checkOverlap(tx: DbSession, groupId: string, v: Awaited<ReturnType<typeof values>>, except?: string) {
        const [clash] = await tx.select({ id: lessons.id }).from(lessons).where(and(eq(lessons.cancelled, false), lt(lessons.startsAt, v.endsAt), gt(lessons.endsAt, v.startsAt), except ? ne(lessons.id, except) : undefined, or(eq(lessons.groupId, groupId), v.teacherId ? eq(lessons.teacherId, v.teacherId) : undefined, sql `lower(trim(${lessons.room})) = lower(trim(${v.room}))`))).limit(1);
        if (clash)
            fail(409, 'В это время занята группа, преподаватель или аудитория');
    }
    app.post<{
        Params: {
            id: string;
        };
    }>('/api/staff/groups/:id/lessons', async (req, reply) => {
        if (!await staff(req, reply))
            return;
        const groupId = uuid(req.params.id), b = bodyObject(req.body);
        const row = await db.transaction(async (tx) => {
            await tx.execute(sql `select pg_advisory_xact_lock(746001)`);
            const [g] = await tx.select().from(groups).where(eq(groups.id, groupId));
            if (!g)
                fail(404, 'Группа не найдена');
            const v = await values(tx, b);
            await checkOverlap(tx, groupId, v);
            const [r] = await tx.insert(lessons).values({ ...v, groupId }).returning();
            await notify(tx, groupId, 'Расписание изменено', 'Добавлено занятие. Откройте расписание группы.');
            return (await rowQuery(tx).where(eq(lessons.id, r.id)))[0];
        });
        return reply.code(201).send({ data: row });
    });
    app.patch<{
        Params: {
            id: string;
        };
    }>('/api/staff/lessons/:id', async (req, reply) => {
        if (!await staff(req, reply))
            return;
        const id = uuid(req.params.id), b = bodyObject(req.body);
        const allowed = ['subject', 'kind', 'teacherId', 'teacherName', 'room', 'startsAt', 'endsAt', 'changeNote'];
        if (!Object.keys(b).length || Object.keys(b).some(k => !allowed.includes(k)))
            fail(400, 'Неверные поля занятия');
        const row = await db.transaction(async (tx) => {
            await tx.execute(sql `select pg_advisory_xact_lock(746001)`);
            const [r] = await tx.select().from(lessons).where(eq(lessons.id, id)).for('update');
            if (!r)
                fail(404, 'Занятие не найдено');
            if (r.cancelled)
                fail(409, 'Занятие отменено');
            const v = await values(tx, b, r);
            await checkOverlap(tx, r.groupId, v, id);
            await tx.update(lessons).set(v).where(eq(lessons.id, id));
            await notify(tx, r.groupId, 'Расписание изменено', 'Обновлено занятие. Откройте расписание группы.');
            return (await rowQuery(tx).where(eq(lessons.id, id)))[0];
        });
        return { data: row };
    });
    app.delete<{
        Params: {
            id: string;
        };
    }>('/api/staff/lessons/:id', async (req, reply) => {
        if (!await staff(req, reply))
            return;
        await db.transaction(async (tx) => {
            await tx.execute(sql `select pg_advisory_xact_lock(746001)`);
            const [r] = await tx.select().from(lessons).where(eq(lessons.id, uuid(req.params.id))).for('update');
            if (!r)
                fail(404, 'Занятие не найдено');
            if (r.cancelled)
                return;
            await tx.update(lessons).set({ cancelled: true }).where(eq(lessons.id, r.id));
            await notify(tx, r.groupId, 'Занятие отменено', 'Изменилось расписание. Отменённое занятие сохранено в истории.');
        });
        return reply.code(204).send();
    });
}
