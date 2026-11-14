import { REQUEST_TYPE_IDS } from './request-types.js';
import { randomUUID } from 'node:crypto';
import { bodyObject, fail, uuid, type DbSession } from './domain.js';
import type { DocumentSnapshot } from './schema.js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { connectDatabase } from './db.js';
import { requestPdf } from './request-pdf.js';
import { notifications, requests, users, groups } from './schema.js';

type Input = { type: string; purpose: string; comment?: string; delivery: string };
export function requestRoutes(app: FastifyInstance, db: ReturnType<typeof connectDatabase>['db'], student: (req: FastifyRequest, reply: FastifyReply) => Promise<string | null>, staff: (req: FastifyRequest, reply: FastifyReply) => Promise<string | null>) {
  const publicRow = ({ documentBase64, draftSnapshot, ...row }: typeof requests.$inferSelect) => row;
  async function snapshot(tx: DbSession, row: typeof requests.$inferSelect): Promise<DocumentSnapshot> {
    const [u] = await tx.select({ fullName:users.fullName, faculty:users.faculty, groupId:users.groupId }).from(users).where(eq(users.id,row.studentId)).for('share');
    if (!u) fail(409, 'Профиль студента не найден');
    const [g] = u.groupId ? await tx.select().from(groups).where(eq(groups.id,u.groupId)).for('share') : [];
    const p={fullName:u.fullName,faculty:u.faculty,program:g?.program??null,year:g?.year??null,groupName:g?.name??null};
    const missing = Object.entries(p).filter(([key,value]) => key === 'year' ? !Number.isInteger(value) || Number(value) < 1 : typeof value !== 'string' || !value.trim()).map(([key])=>key);
    if (!row.purpose.trim()) missing.push('purpose');
    if (missing.length) fail(409, 'Заполните учебные сведения: '+missing.join(', '));
    return { ...p, program:p.program!, year:p.year!, groupName:p.groupName!, purpose:row.purpose, templateVersion:'study-v2' };
  }
  const failure = (code: string, message: string) => ({ error: { code, message } });
  app.get('/api/requests', async (req, reply) => {
    const id = await student(req, reply); if (!id) return;
    return { data: (await db.select().from(requests).where(eq(requests.studentId, id)).orderBy(desc(requests.createdAt), desc(requests.id))).map(publicRow) };
  });
  app.post<{ Body: Input }>('/api/requests', {
    schema: { body: { type: 'object', required: ['type', 'purpose', 'delivery'], additionalProperties: false, properties: {
      type: { type: 'string', enum: REQUEST_TYPE_IDS },
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
    const rows = await db.select({ request: requests, fullName: users.fullName, groupName: groups.name, faculty:users.faculty, program:groups.program, year:groups.year }).from(requests)
      .innerJoin(users, eq(users.id, requests.studentId)).leftJoin(groups, eq(groups.id, users.groupId)).orderBy(desc(requests.createdAt));
    return { data: rows.map(row => ({ ...publicRow(row.request), fullName: row.fullName, groupName: row.groupName, faculty:row.faculty, program:row.program, year:row.year })) };
  });
  app.patch<{ Params: { id: string }; Body: { status: string; reason?: string; draftId?: string } }>('/api/staff/requests/:id/status', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
      body: { type: 'object', required: ['status'], additionalProperties: false, properties: { status: { type: 'string', enum: ['in_progress', 'ready', 'issued', 'rejected'] }, reason: { type:'string', minLength:1,maxLength:1000 }, draftId:{type:'string',format:'uuid'} } },
    },
  }, async (req, reply) => {
    const staffId = await staff(req, reply); if (!staffId) return;
    const result = await db.transaction(async tx => {
      const [row] = await tx.select().from(requests).where(eq(requests.id, req.params.id)).for('update');
      if (!row) return { code: 404, data: null };
      if (row.status === req.body.status) return { code: 200, data: publicRow(row) };
      const allowed: Record<string, string[]> = { submitted: ['in_progress', 'ready', 'rejected'], in_progress: ['ready', 'rejected'], ready: ['issued'] };
      if (!allowed[row.status]?.includes(req.body.status)) return { code: 409, data: null };
      if (req.body.status === 'rejected' && !req.body.reason?.trim()) fail(400,'Укажите причину отказа');
      if (row.type === 'study' && req.body.status === 'ready') {
        if (row.status !== 'in_progress' || !row.verifiedAt || !row.verifiedBy || !row.draftSnapshot || !row.previewedAt || req.body.draftId !== row.draftId) fail(409,'Нужны проверка сведений и просмотр актуального черновика');
        const current = await snapshot(tx,row);
        if (Object.entries(current).some(([k,v])=>row.draftSnapshot![k as keyof DocumentSnapshot]!==v)) fail(409,'Сведения изменились. Подготовьте и просмотрите новый черновик');
      }
      let documentBase64 = row.documentBase64;
      const readyAt = req.body.status === 'ready' ? new Date() : row.readyAt;
      if (req.body.status === 'ready') {
        const [student] = await tx.select({ fullName: users.fullName, groupName: groups.name }).from(users).leftJoin(groups, eq(groups.id, users.groupId)).where(eq(users.id, row.studentId));
        documentBase64 = (await requestPdf({ ...row, ...student!, ...(row.type==='study'?row.draftSnapshot:{}), readyAt: readyAt! })).toString('base64');
      }
      const [updated] = await tx.update(requests).set({ status: req.body.status, processedBy: staffId, updatedAt: new Date(), readyAt, documentBase64, ...(req.body.status==='rejected'?{rejectionReason:req.body.reason!.trim()}: {}) }).where(eq(requests.id, row.id)).returning();
      await tx.insert(notifications).values({ studentId: row.studentId, title: req.body.status === 'ready' ? 'Заявка готова' : 'Статус заявки изменён', body: 'Откройте раздел заявок для просмотра.' });
      return { code: 200, data: publicRow(updated!) };
    });
    if (!result.data) return reply.code(result.code).send(failure(result.code === 404 ? 'NOT_FOUND' : 'CONFLICT', result.code === 404 ? 'Заявка не найдена' : 'Этот переход статуса недоступен'));
    return { data: result.data };
  });

  app.post<{Params:{id:string}}>('/api/staff/requests/:id/prepare', async(req,reply)=>{
    const staffId=await staff(req,reply);if(!staffId)return;
    if(bodyObject(req.body).verified!==true)fail(400,'Подтвердите проверку сведений и факта обучения');
    const row=await db.transaction(async tx=>{
      const [r]=await tx.select().from(requests).where(eq(requests.id,uuid(req.params.id))).for('update');
      if(!r)fail(404,'Заявка не найдена');if(r.type!=='study'||r.status!=='in_progress')fail(409,'Справка должна быть в работе');
      const draftSnapshot=await snapshot(tx,r);
      const [updated]=await tx.update(requests).set({draftSnapshot,draftId:randomUUID(),verifiedBy:staffId,verifiedAt:new Date(),previewedAt:null,updatedAt:new Date()}).where(eq(requests.id,r.id)).returning();return updated;
    });return {data:publicRow(row)};
  });
  app.post<{Params:{id:string}}>('/api/staff/requests/:id/preview', async(req,reply)=>{
    if(!await staff(req,reply))return;const draftId=uuid(bodyObject(req.body).draftId);
    const pdf=await db.transaction(async tx=>{
      const [r]=await tx.select().from(requests).where(eq(requests.id,uuid(req.params.id))).for('update');
      if(!r)fail(404,'Заявка не найдена');if(r.status!=='in_progress'||r.draftId!==draftId||!r.draftSnapshot)fail(409,'Черновик недоступен');
      const current=await snapshot(tx,r);
      if(Object.entries(current).some(([k,v])=>r.draftSnapshot![k as keyof DocumentSnapshot]!==v))fail(409,'Сведения изменились. Подготовьте новый черновик');
      const result=await requestPdf({...r,...r.draftSnapshot,readyAt:new Date(),draft:true});
      await tx.update(requests).set({previewedAt:new Date()}).where(eq(requests.id,r.id));return result;
    });return reply.type('application/pdf').header('X-Content-Type-Options','nosniff').header('Content-Disposition','attachment; filename="draft.pdf"').send(pdf);
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
