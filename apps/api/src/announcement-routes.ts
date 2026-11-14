import type { FastifyInstance } from 'fastify';
import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { actor, bodyObject, fail, textValue, uuid, type Authorize, type Db } from './domain.js';
import { announcements, groups, notifications, userPrefs, users } from './schema.js';

/** Обложка: стоковая (`stock:<имя>`), загруженное фото (jpeg/webp, до ~500 КБ) или без обложки. */
const STOCK_COVERS = ['campus', 'graduation', 'library', 'lecture', 'schedule', 'languages'];
function coverValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') fail(400, 'Неверная обложка');
  if (value.startsWith('stock:')) {
    if (!STOCK_COVERS.includes(value.slice(6))) fail(400, 'Неизвестная стоковая обложка');
    return value;
  }
  if (!/^data:image\/(jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)) fail(400, 'Обложка: нужен JPEG или WebP');
  if (value.length > 700000) fail(413, 'Фото слишком большое: уменьшите его');
  return value;
}

export function announcementRoutes(app: FastifyInstance, db: Db, auth: Authorize) {
  app.get('/api/announcements', async (req, reply) => {
    const id = await auth(req, reply); if (!id) return;
    const u = await actor(db, id);
    if (u.role !== 'staff' && u.role !== 'student') fail(403, 'Нет доступа к объявлениям');
    return { data: await db.select({ id: announcements.id, groupId: announcements.groupId,
      groupName: groups.name, title: announcements.title, body: announcements.body, cover: announcements.cover, createdAt: announcements.createdAt })
      .from(announcements).leftJoin(groups, eq(groups.id, announcements.groupId))
      .where(u.role === 'student' ? or(isNull(announcements.groupId), eq(announcements.groupId, u.groupId!)) : undefined)
      .orderBy(desc(announcements.createdAt), desc(announcements.id)) };
  });

  app.post('/api/announcements', { bodyLimit: 800000 }, async (req, reply) => {
    const id = await auth(req, reply); if (!id) return;
    const u = await actor(db, id);
    if (u.role !== 'staff') fail(403, 'Объявления публикует сотрудник');
    const b = bodyObject(req.body);
    if (Object.keys(b).some(k => !['groupId', 'title', 'body', 'cover'].includes(k))) fail(400, 'Неверные поля объявления');
    const groupId = b.groupId === null || b.groupId === undefined ? null : uuid(b.groupId);
    const title = textValue(b.title, 200, 'Заголовок'), body = textValue(b.body, 2000, 'Текст');
    const cover = coverValue(b.cover);
    const created = await db.transaction(async tx => {
      if (groupId) {
        const [group] = await tx.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId));
        if (!group) fail(404, 'Группа не найдена');
      }
      const [row] = await tx.insert(announcements).values({ groupId, publishedBy: id, title, body, cover }).returning();
      const recipients = await tx.select({ id: users.id, enabled: userPrefs.news }).from(users)
        .leftJoin(userPrefs, eq(userPrefs.userId, users.id))
        .where(and(eq(users.role, 'student'), groupId ? eq(users.groupId, groupId) : undefined));
      const notices = recipients.filter(r => r.enabled === true).map(r => ({ studentId: r.id, kind: 'news', title, body }));
      if (notices.length) await tx.insert(notifications).values(notices);
      return row;
    });
    return reply.code(201).send({ data: created });
  });

  app.delete<{ Params: { id: string } }>('/api/announcements/:id', async (req, reply) => {
    const id = await auth(req, reply); if (!id) return;
    const u = await actor(db, id);
    if (u.role !== 'staff') fail(403, 'Объявления удаляет сотрудник');
    const [row] = await db.delete(announcements).where(eq(announcements.id, uuid(req.params.id))).returning({ id: announcements.id });
    if (!row) fail(404, 'Объявление не найдено');
    return reply.code(204).send();
  });
}
