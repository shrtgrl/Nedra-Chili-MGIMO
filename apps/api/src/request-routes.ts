import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { connectDatabase } from './db.js';
import { requestPdf } from './request-pdf.js';
import { notifications, requests, users, groups } from './schema.js';

type Input = { type: string; purpose: string; comment?: string; delivery: string };
export function requestRoutes(app: FastifyInstance, db: ReturnType<typeof connectDatabase>['db'], student: (req: FastifyRequest, reply: FastifyReply) => Promise<string | null>, staff: (req: FastifyRequest, reply: FastifyReply) => Promise<string | null>) {
  const publicRow = ({ documentBase64, ...row }: typeof requests.$inferSelect) => row;
  const failure = (code: string, message: string) => ({ error: { code, message } });
  app.get('/api/requests', async (req, reply) => {
    const id = await student(req, reply); if (!id) return;
    return { data: (await db.select().from(requests).where(eq(requests.studentId, id)).orderBy(desc(requests.createdAt), desc(requests.id))).map(publicRow) };
  });
  app.post<{ Body: Input }>('/api/requests', {
    schema: { body: { type: 'object', required: ['type', 'purpose', 'delivery'], additionalProperties: false, properties: {
      type: { type: 'string', enum: ['study', 'order', 'leave', 'retake'] },
      purpose: { type: 'string', minLength: 1, maxLength: 500 },
      comment: { type: 'string', maxLength: 2000 },
      delivery: { type: 'string', enum: ['pdf', 'office'] },
    } } },
  }, async (req, reply) => {
    const id = await student(req, reply); if (!id) return;
    if (!req.body.purpose.trim()) return reply.code(400).send(failure('BAD_REQUEST', 'Укажите цель заявки'));
    const result = await db.transaction(async tx => {
      const [row] = await tx.insert(requests).values({ studentId: id, type: req.body.type, purpose: req.body.purpose.trim(), comment: req.body.comment?.trim() ?? '', delivery: req.body.delivery }).returning();
      await tx.insert(notifications).values({ studentId: id, title: 'Заявка принята', body: 'Заявка зарегистрирована в деканате.' });
      return row;
    });
    return reply.code(201).send({ data: publicRow(result!) });
  });
  app.patch<{ Params: { id: string } }>('/api/requests/:id/cancel', {
    schema: { params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } } },
  }, async (req, reply) => {
    const id = await student(req, reply); if (!id) return;
    const [row] = await db.select().from(requests).where(eq(requests.id, req.params.id));
    if (!row) return reply.code(404).send(failure('NOT_FOUND', 'Заявка не найдена'));
    if (row.studentId !== id) return reply.code(403).send(failure('FORBIDDEN', 'Нет доступа к заявке'));
    if (row.status === 'cancelled') return { data: publicRow(row) };
    const [updated] = await db.update(requests).set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(requests.id, row.id), eq(requests.studentId, id), inArray(requests.status, ['submitted', 'in_progress']))).returning();
    if (!updated) return reply.code(409).send(failure('CONFLICT', 'Эту заявку уже нельзя отменить'));
    return { data: publicRow(updated) };
  });
  app.get('/api/staff/requests', async (req, reply) => {
    if (!await staff(req, reply)) return;
    const rows = await db.select({ request: requests, fullName: users.fullName, groupName: groups.name }).from(requests)
      .innerJoin(users, eq(users.id, requests.studentId)).leftJoin(groups, eq(groups.id, users.groupId)).orderBy(desc(requests.createdAt));
    return { data: rows.map(row => ({ ...publicRow(row.request), fullName: row.fullName, groupName: row.groupName })) };
  });
  app.patch<{ Params: { id: string }; Body: { status: string } }>('/api/staff/requests/:id/status', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
      body: { type: 'object', required: ['status'], additionalProperties: false, properties: { status: { type: 'string', enum: ['in_progress', 'ready', 'issued'] } } },
    },
  }, async (req, reply) => {
    const staffId = await staff(req, reply); if (!staffId) return;
    const result = await db.transaction(async tx => {
      const [row] = await tx.select().from(requests).where(eq(requests.id, req.params.id)).for('update');
      if (!row) return { code: 404, data: null };
      if (row.status === req.body.status) return { code: 200, data: publicRow(row) };
      const allowed: Record<string, string[]> = { submitted: ['in_progress', 'ready'], in_progress: ['ready'], ready: ['issued'] };
      if (!allowed[row.status]?.includes(req.body.status)) return { code: 409, data: null };
      let documentBase64 = row.documentBase64;
      const readyAt = req.body.status === 'ready' ? new Date() : row.readyAt;
      if (req.body.status === 'ready') {
        const [student] = await tx.select({ fullName: users.fullName, groupName: groups.name }).from(users).leftJoin(groups, eq(groups.id, users.groupId)).where(eq(users.id, row.studentId));
        documentBase64 = (await requestPdf({ ...row, ...student!, readyAt: readyAt! })).toString('base64');
      }
      const [updated] = await tx.update(requests).set({ status: req.body.status, processedBy: staffId, updatedAt: new Date(), readyAt, documentBase64 }).where(eq(requests.id, row.id)).returning();
      await tx.insert(notifications).values({ studentId: row.studentId, title: req.body.status === 'ready' ? 'Заявка готова' : 'Статус заявки изменён', body: 'Откройте раздел заявок для просмотра.' });
      return { code: 200, data: publicRow(updated!) };
    });
    if (!result.data) return reply.code(result.code).send(failure(result.code === 404 ? 'NOT_FOUND' : 'CONFLICT', result.code === 404 ? 'Заявка не найдена' : 'Этот переход статуса недоступен'));
    return { data: result.data };
  });
  for (const isStaff of [false, true]) {
    app.get<{ Params: { id: string } }>(isStaff ? '/api/staff/requests/:id/pdf' : '/api/requests/:id/pdf', {
      schema: { params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } } },
    }, async (req, reply) => {
      const id = await (isStaff ? staff : student)(req, reply); if (!id) return;
      const [row] = await db.select().from(requests).where(eq(requests.id, req.params.id));
      if (!row) return reply.code(404).send(failure('NOT_FOUND', 'Заявка не найдена'));
      if (!isStaff && row.studentId !== id) return reply.code(403).send(failure('FORBIDDEN', 'Нет доступа к заявке'));
      if (!['ready', 'issued'].includes(row.status) || !row.documentBase64 || (!isStaff && row.delivery !== 'pdf')) return reply.code(409).send(failure('CONFLICT', 'Документ пока недоступен для скачивания'));
      return reply.type('application/pdf').header('Content-Disposition', `attachment; filename="request-${row.id}.pdf"`).header('X-Content-Type-Options', 'nosniff').send(Buffer.from(row.documentBase64, 'base64'));
    });
  }

}
