import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, asc, eq, gt, lt, ne, or, ilike } from 'drizzle-orm';
import type { connectDatabase } from './db.js';
import { groups, lessons, notifications, subjects, users } from './schema.js';

type Db = ReturnType<typeof connectDatabase>['db'];
type LessonInput = { subject: string; kind: string; teacherName: string; room: string; startsAt: string; endsAt: string; changeNote?: string | null };

const idParam = { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } } as const;
const text = (max: number) => ({ type: 'string', minLength: 1, maxLength: max }) as const;
const fields = {
  subject: text(120), kind: { type: 'string', enum: ['lecture', 'seminar', 'practice'] }, teacherName: text(120), room: text(40),
  startsAt: { type: 'string', format: 'date-time' }, endsAt: { type: 'string', format: 'date-time' },
  changeNote: { anyOf: [{ type: 'string', maxLength: 300 }, { type: 'null' }] },
} as const;

export function scheduleRoutes(app: FastifyInstance, db: Db, staff: (req: FastifyRequest, reply: FastifyReply) => Promise<string | null>) {
  const failure = (code: string, message: string) => ({ error: { code, message } });

  async function subjectId(tx: Pick<Db, 'select' | 'insert'>, name: string) {
    const clean = name.trim();
    const [found] = await tx.select({ id: subjects.id }).from(subjects).where(eq(subjects.name, clean)).limit(1);
    if (found) return found.id;
    const [created] = await tx.insert(subjects).values({ name: clean }).returning({ id: subjects.id });
    return created!.id;
  }
  const lessonRows = (where: ReturnType<typeof and>) => db.select({
    id: lessons.id, groupId: lessons.groupId, subject: subjects.name, kind: lessons.kind, teacherName: lessons.teacherName,
    room: lessons.room, startsAt: lessons.startsAt, endsAt: lessons.endsAt, changeNote: lessons.changeNote,
  }).from(lessons).innerJoin(subjects, eq(subjects.id, lessons.subjectId)).where(where).orderBy(asc(lessons.startsAt));

  app.get<{ Querystring: { q?: string } }>('/api/staff/groups', {
    schema: { querystring: { type: 'object', additionalProperties: false, properties: { q: { type: 'string', maxLength: 60 } } } },
  }, async (req, reply) => {
    if (!await staff(req, reply)) return;
    const q = (req.query.q ?? '').trim().replace(/[\\%_]/g, m => `\\${m}`);
    const where = q ? or(ilike(groups.name, `%${q}%`), ilike(groups.program, `%${q}%`), ilike(groups.faculty, `%${q}%`)) : undefined;
    const rows = await db.select().from(groups).where(where).orderBy(asc(groups.name)).limit(30);
    return { data: rows };
  });

  app.get<{ Params: { id: string }; Querystring: { from: string; to: string } }>('/api/staff/groups/:id/lessons', {
    schema: { params: idParam, querystring: { type: 'object', required: ['from', 'to'], additionalProperties: false,
      properties: { from: { type: 'string', format: 'date-time' }, to: { type: 'string', format: 'date-time' } } } },
  }, async (req, reply) => {
    if (!await staff(req, reply)) return;
    const from = new Date(req.query.from), to = new Date(req.query.to);
    if (!(to > from) || to.getTime() - from.getTime() > 62 * 86_400_000) return reply.code(400).send(failure('BAD_REQUEST', 'Некорректный период'));
    const [group] = await db.select().from(groups).where(eq(groups.id, req.params.id));
    if (!group) return reply.code(404).send(failure('NOT_FOUND', 'Группа не найдена'));
    return { data: { group, lessons: await lessonRows(and(eq(lessons.groupId, group.id), gt(lessons.endsAt, from), lt(lessons.startsAt, to))) } };
  });

  /** Занятия одной группы не должны пересекаться по времени. */
  async function overlaps(tx: Pick<Db, 'select'>, groupId: string, startsAt: Date, endsAt: Date, exceptId?: string) {
    const [clash] = await tx.select({ id: lessons.id }).from(lessons)
      .where(and(eq(lessons.groupId, groupId), lt(lessons.startsAt, endsAt), gt(lessons.endsAt, startsAt), exceptId ? ne(lessons.id, exceptId) : undefined)).limit(1);
    return !!clash;
  }
  async function notifyGroup(tx: Pick<Db, 'select' | 'insert'>, groupId: string, title: string, body: string) {
    const students = await tx.select({ id: users.id }).from(users).where(and(eq(users.groupId, groupId), eq(users.role, 'student')));
    if (students.length) await tx.insert(notifications).values(students.map(s => ({ studentId: s.id, title, body })));
  }
  const when = (d: Date) => d.toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });

  app.post<{ Params: { id: string }; Body: LessonInput }>('/api/staff/groups/:id/lessons', {
    schema: { params: idParam, body: { type: 'object', required: ['subject', 'kind', 'teacherName', 'room', 'startsAt', 'endsAt'], additionalProperties: false, properties: fields } },
  }, async (req, reply) => {
    if (!await staff(req, reply)) return;
    const startsAt = new Date(req.body.startsAt), endsAt = new Date(req.body.endsAt);
    if (!(endsAt > startsAt) || endsAt.getTime() - startsAt.getTime() > 12 * 3_600_000) return reply.code(400).send(failure('BAD_REQUEST', 'Окончание должно быть позже начала'));
    const result = await db.transaction(async tx => {
      const [group] = await tx.select().from(groups).where(eq(groups.id, req.params.id));
      if (!group) return 404;
      if (await overlaps(tx, group.id, startsAt, endsAt)) return 409;
      const [row] = await tx.insert(lessons).values({ groupId: group.id, subjectId: await subjectId(tx, req.body.subject), kind: req.body.kind,
        teacherName: req.body.teacherName.trim(), room: req.body.room.trim(), startsAt, endsAt, changeNote: req.body.changeNote?.trim() || null }).returning({ id: lessons.id });
      await notifyGroup(tx, group.id, 'Расписание изменено', `Добавлено занятие «${req.body.subject.trim()}» — ${when(startsAt)}.`);
      return row!.id;
    });
    if (result === 404) return reply.code(404).send(failure('NOT_FOUND', 'Группа не найдена'));
    if (result === 409) return reply.code(409).send(failure('CONFLICT', 'В это время у группы уже есть занятие'));
    const [row] = await lessonRows(eq(lessons.id, result));
    return reply.code(201).send({ data: row });
  });

  app.patch<{ Params: { id: string }; Body: Partial<LessonInput> }>('/api/staff/lessons/:id', {
    schema: { params: idParam, body: { type: 'object', minProperties: 1, additionalProperties: false, properties: fields } },
  }, async (req, reply) => {
    if (!await staff(req, reply)) return;
    const result = await db.transaction(async tx => {
      const [row] = await tx.select().from(lessons).where(eq(lessons.id, req.params.id)).for('update');
      if (!row) return 404;
      const startsAt = req.body.startsAt ? new Date(req.body.startsAt) : row.startsAt;
      const endsAt = req.body.endsAt ? new Date(req.body.endsAt) : row.endsAt;
      if (!(endsAt > startsAt) || endsAt.getTime() - startsAt.getTime() > 12 * 3_600_000) return 400;
      if (await overlaps(tx, row.groupId, startsAt, endsAt, row.id)) return 409;
      await tx.update(lessons).set({
        startsAt, endsAt,
        ...(req.body.subject ? { subjectId: await subjectId(tx, req.body.subject) } : {}),
        ...(req.body.kind ? { kind: req.body.kind } : {}),
        ...(req.body.teacherName ? { teacherName: req.body.teacherName.trim() } : {}),
        ...(req.body.room ? { room: req.body.room.trim() } : {}),
        ...('changeNote' in req.body ? { changeNote: req.body.changeNote?.trim() || null } : {}),
      }).where(eq(lessons.id, row.id));
      await notifyGroup(tx, row.groupId, 'Расписание изменено', `Занятие от ${when(row.startsAt)} обновлено.`);
      return row.id;
    });
    if (result === 404) return reply.code(404).send(failure('NOT_FOUND', 'Занятие не найдено'));
    if (result === 400) return reply.code(400).send(failure('BAD_REQUEST', 'Окончание должно быть позже начала'));
    if (result === 409) return reply.code(409).send(failure('CONFLICT', 'В это время у группы уже есть занятие'));
    const [row] = await lessonRows(eq(lessons.id, result));
    return { data: row };
  });

  app.delete<{ Params: { id: string } }>('/api/staff/lessons/:id', { schema: { params: idParam } }, async (req, reply) => {
    if (!await staff(req, reply)) return;
    const removed = await db.transaction(async tx => {
      const [row] = await tx.delete(lessons).where(eq(lessons.id, req.params.id)).returning();
      if (row) await notifyGroup(tx, row.groupId, 'Расписание изменено', `Занятие от ${when(row.startsAt)} отменено.`);
      return row;
    });
    if (!removed) return reply.code(404).send(failure('NOT_FOUND', 'Занятие не найдено'));
    return reply.code(204).send();
  });
}
