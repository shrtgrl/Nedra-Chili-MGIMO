import type { FastifyInstance } from 'fastify';
import { and, desc, eq } from 'drizzle-orm';
import { notifications, userPrefs } from './schema.js';
import { bodyObject, fail, uuid, type Authorize, type Db } from './domain.js';
export function notificationRoutes(app: FastifyInstance, db: Db, auth: Authorize) {
    app.get('/api/notifications', async (req, reply) => {
        const id = await auth(req, reply);
        if (!id)
            return;
        return { data: await db.select().from(notifications).where(eq(notifications.studentId, id)).orderBy(desc(notifications.createdAt), desc(notifications.id)) };
    });
    app.patch('/api/notifications/read-all', async (req, reply) => {
        const id = await auth(req, reply);
        if (!id)
            return;
        await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.studentId, id));
        return reply.code(204).send();
    });
    app.patch<{
        Params: {
            id: string;
        };
    }>('/api/notifications/:id/read', async (req, reply) => {
        const id = await auth(req, reply);
        if (!id)
            return;
        const [row] = await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, uuid(req.params.id)), eq(notifications.studentId, id))).returning();
        if (!row)
            fail(404, 'Уведомление не найдено');
        return { data: row };
    });
    const readPrefs = async (id: string) => (await db.select({ deadlines: userPrefs.deadlines, schedule: userPrefs.schedule, news: userPrefs.news }).from(userPrefs).where(eq(userPrefs.userId, id)))[0] ?? { deadlines: true, schedule: true, news: false };
    app.get('/api/user/prefs', async (req, reply) => { const id = await auth(req, reply); if (id)
        return { data: await readPrefs(id) }; });
    app.patch('/api/user/prefs', async (req, reply) => {
        const id = await auth(req, reply);
        if (!id)
            return;
        const body = bodyObject(req.body);
        if (!Object.keys(body).length || Object.entries(body).some(([k, v]) => !['deadlines', 'schedule', 'news'].includes(k) || typeof v !== 'boolean'))
            fail(400, 'Неверные настройки');
        const values = body as Partial<{
            deadlines: boolean;
            schedule: boolean;
            news: boolean;
        }>;
        await db.insert(userPrefs).values({ userId: id, ...values }).onConflictDoUpdate({ target: userPrefs.userId, set: values });
        return { data: await readPrefs(id) };
    });
}
