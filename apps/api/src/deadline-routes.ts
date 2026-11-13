import type { FastifyInstance } from 'fastify';
import { and, asc, eq, gt } from 'drizzle-orm';
import { actor, assignmentAccess, bodyObject, fail, instant, textValue, uuid, type Authorize, type Db } from './domain.js';
import { academicDeadlines, groups, notifications, subjects, teachingAssignments, userPrefs, users } from './schema.js';

export function deadlineRoutes(app: FastifyInstance, db: Db, auth: Authorize) {
  const rows = () => db.select({
    id: academicDeadlines.id, assignmentId: academicDeadlines.assignmentId,
    title: academicDeadlines.title, dueAt: academicDeadlines.dueAt,
    subject: subjects.name, group: groups.name,
  }).from(academicDeadlines)
    .innerJoin(teachingAssignments, eq(teachingAssignments.id, academicDeadlines.assignmentId))
    .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
    .innerJoin(groups, eq(groups.id, teachingAssignments.groupId));

  app.get('/api/deadlines', async (req, reply) => {
    const id = await auth(req, reply); if (!id) return;
    const u = await actor(db, id);
    if (u.role === 'student' && u.groupId) return { data: await rows().where(and(eq(teachingAssignments.groupId, u.groupId), gt(academicDeadlines.dueAt, new Date()))).orderBy(asc(academicDeadlines.dueAt)) };
    if (u.role === 'teacher') return { data: await rows().where(eq(teachingAssignments.teacherId, id)).orderBy(asc(academicDeadlines.dueAt)) };
    fail(403, 'Дедлайны доступны студентам и преподавателям');
  });

  app.post('/api/deadlines', async (req, reply) => {
    const id = await auth(req, reply); if (!id) return;
    const u = await actor(db, id);
    if (u.role !== 'teacher') fail(403, 'Дедлайн создаёт преподаватель');
    const b = bodyObject(req.body);
    if (Object.keys(b).some(k => !['assignmentId', 'title', 'dueAt'].includes(k))) fail(400, 'Неверные поля дедлайна');
    const assignmentId = uuid(b.assignmentId), title = textValue(b.title, 200, 'Название'), dueAt = instant(b.dueAt);
    if (dueAt <= new Date()) fail(400, 'Укажите будущий срок');
    const row = await db.transaction(async tx => {
      const assignment = await assignmentAccess(tx, assignmentId, u, true);
      const [created] = await tx.insert(academicDeadlines).values({ assignmentId, title, dueAt }).returning();
      const recipients = await tx.select({ id: users.id, enabled: userPrefs.deadlines }).from(users)
        .leftJoin(userPrefs, eq(userPrefs.userId, users.id))
        .where(and(eq(users.role, 'student'), eq(users.groupId, assignment.groupId)));
      const notices = recipients.filter(r => r.enabled !== false).map(r => ({ studentId: r.id, kind: 'deadline', title: 'Новый учебный дедлайн', body: `${assignment.subject}: ${title}` }));
      if (notices.length) await tx.insert(notifications).values(notices);
      return created;
    });
    return reply.code(201).send({ data: row });
  });

  app.delete<{ Params: { id: string } }>('/api/deadlines/:id', async (req, reply) => {
    const id = await auth(req, reply); if (!id) return;
    const u = await actor(db, id);
    if (u.role !== 'teacher') fail(403, 'Дедлайн удаляет преподаватель');
    const [row] = await db.select({ assignmentId: academicDeadlines.assignmentId }).from(academicDeadlines).where(eq(academicDeadlines.id, uuid(req.params.id)));
    if (!row) fail(404, 'Дедлайн не найден');
    await assignmentAccess(db, row.assignmentId, u, true);
    await db.delete(academicDeadlines).where(eq(academicDeadlines.id, req.params.id));
    return reply.code(204).send();
  });
}
