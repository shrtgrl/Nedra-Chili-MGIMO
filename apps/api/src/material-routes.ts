import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { actor, assignmentAccess, assignmentFilter, assignmentsQuery, bodyObject, fail, textValue, uuid, type Authorize, type Db } from './domain.js';
import { materials, teachingAssignments, subjects, groups } from './schema.js';
export function validateFile(fileName: string, content: unknown) {
    if (typeof content !== 'string' || !content || content.length > 7000000 || /[^A-Za-z0-9+/=]/.test(content))
        fail(400, 'Неверные данные файла');
    const bytes = Buffer.from(content, 'base64');
    if (bytes.toString('base64') !== content)
        fail(400, 'Неверная кодировка base64');
    if (!bytes.length || bytes.length > 5 * 1024 * 1024)
        fail(413, 'Допустим файл от 1 байта до 5 МиБ');
    const ext = fileName.split('.').pop()?.toLowerCase();
    let mime = '';
    if (ext === 'pdf' && bytes.subarray(0, 5).toString() === '%PDF-')
        mime = 'application/pdf';
    if (ext === 'png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
        mime = 'image/png';
    if (['jpg', 'jpeg'].includes(ext ?? '') && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
        mime = 'image/jpeg';
    if (ext === 'txt') {
        try {
            new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            if (!bytes.includes(0))
                mime = 'text/plain; charset=utf-8';
        }
        catch { }
    }
    if (!mime)
        fail(400, 'Допустимы PDF, TXT (UTF-8), PNG, JPG с соответствующим содержимым');
    return { size: bytes.length, mimeType: mime, contentBase64: bytes.toString('base64') };
}
export function materialRoutes(app: FastifyInstance, db: Db, auth: Authorize) {
    app.get('/api/materials/assignments', async (req, reply) => { const id = await auth(req, reply); if (!id)
        return; return { data: await assignmentsQuery(db).where(assignmentFilter(await actor(db, id))) }; });
    app.get('/api/materials', async (req, reply) => {
        const id = await auth(req, reply);
        if (!id)
            return;
        return { data: await db.select({ id: materials.id, assignmentId: materials.assignmentId, title: materials.title, fileName: materials.fileName, mimeType: materials.mimeType, size: materials.size, createdAt: materials.createdAt, subject: subjects.name, group: groups.name }).from(materials).innerJoin(teachingAssignments, eq(teachingAssignments.id, materials.assignmentId)).innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId)).innerJoin(groups, eq(groups.id, teachingAssignments.groupId)).where(assignmentFilter(await actor(db, id))).orderBy(desc(materials.createdAt)) };
    });
    app.post('/api/materials', { bodyLimit: 7100000 }, async (req, reply) => {
        const id = await auth(req, reply);
        if (!id)
            return;
        const u = await actor(db, id), b = bodyObject(req.body);
        const assignmentId = uuid(b.assignmentId);
        await assignmentAccess(db, assignmentId, u, true);
        const title = textValue(b.title, 200, 'Название'), fileName = textValue(b.fileName, 180, 'Имя файла');
        if (/[\\/\x00-\x1f\x7f]/.test(fileName))
            fail(400, 'Недопустимое имя файла');
        const data = validateFile(fileName, b.contentBase64);
        const [r] = await db.insert(materials).values({ assignmentId, uploadedBy: id, title, fileName, ...data }).returning({ id: materials.id });
        return reply.code(201).send({ data: r });
    });
    app.get<{
        Params: {
            id: string;
        };
    }>('/api/materials/:id/file', async (req, reply) => {
        const id = await auth(req, reply);
        if (!id)
            return;
        const [r] = await db.select().from(materials).where(eq(materials.id, uuid(req.params.id)));
        if (!r)
            fail(404, 'Файл не найден');
        await assignmentAccess(db, r.assignmentId, await actor(db, id));
        return reply.type(r.mimeType).header('X-Content-Type-Options', 'nosniff').header('Content-Disposition', `attachment; filename="material-${r.id}"; filename*=UTF-8''${encodeURIComponent(r.fileName).replace(/'/g, '%27')}`).send(Buffer.from(r.contentBase64, 'base64'));
    });
    app.delete<{
        Params: {
            id: string;
        };
    }>('/api/materials/:id', async (req, reply) => {
        const id = await auth(req, reply);
        if (!id)
            return;
        await db.transaction(async (tx) => {
            const [r] = await tx.select().from(materials).where(eq(materials.id, uuid(req.params.id))).for('update');
            if (!r)
                fail(404, 'Файл не найден');
            await assignmentAccess(tx, r.assignmentId, await actor(tx, id), true);
            await tx.delete(materials).where(eq(materials.id, r.id));
        });
        return reply.code(204).send();
    });
}
