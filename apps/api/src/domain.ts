import type { FastifyReply, FastifyRequest } from 'fastify';
import type { connectDatabase } from './db.js';
import { and, eq } from 'drizzle-orm';
import { groups, subjects, teachingAssignments, users } from './schema.js';
export type Db = ReturnType<typeof connectDatabase>['db'];
export type DbSession = Pick<Db, 'select' | 'insert' | 'update' | 'delete' | 'execute'>;
export type Authorize = (req: FastifyRequest, reply: FastifyReply) => Promise<string | null>;
export class DomainError extends Error {
    constructor(public statusCode: number, public code: string, message: string) { super(message); }
}
export function fail(status: number, message: string): never {
    throw new DomainError(status, ({ 400: 'BAD_REQUEST', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 413: 'TOO_LARGE' } as Record<number, string>)[status] ?? 'BAD_REQUEST', message);
}
export function textValue(value: unknown, max: number, label = 'Поле'): string {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
        fail(400, `${label}: требуется от 1 до ${max} символов`);
    return value.trim();
}
export function uuid(value: unknown): string {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
        fail(400, 'Неверный идентификатор');
    return value;
}
export function bodyObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        fail(400, 'Ожидается JSON-объект');
    return value as Record<string, unknown>;
}
export async function actor(db: DbSession, id: string) {
    const [u] = await db.select({ id: users.id, role: users.role, groupId: users.groupId }).from(users).where(eq(users.id, id));
    if (!u)
        fail(403, 'Пользователь недоступен');
    return u;
}
export type Actor = Awaited<ReturnType<typeof actor>>;
export const assignmentsQuery = (db: DbSession) => db.select({
    id: teachingAssignments.id, teacherId: teachingAssignments.teacherId, subjectId: teachingAssignments.subjectId,
    groupId: teachingAssignments.groupId, semester: teachingAssignments.semester, form: teachingAssignments.form,
    deadline: teachingAssignments.deadline, version: teachingAssignments.version,
    subject: subjects.name, group: groups.name, teacher: users.fullName,
}).from(teachingAssignments).innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
    .innerJoin(groups, eq(groups.id, teachingAssignments.groupId)).innerJoin(users, eq(users.id, teachingAssignments.teacherId));
export async function assignmentAccess(db: DbSession, id: string, u: Actor, write = false) {
    const [a] = await assignmentsQuery(db).where(eq(teachingAssignments.id, uuid(id)));
    if (!a)
        fail(404, 'Учебное назначение не найдено');
    if (u.role === 'teacher' ? a.teacherId !== u.id : write || u.role !== 'student' || a.groupId !== u.groupId)
        fail(403, 'Нет доступа к дисциплине и группе');
    return a;
}
export function assignmentFilter(u: Actor) {
    if (u.role === 'teacher')
        return eq(teachingAssignments.teacherId, u.id);
    if (u.role === 'student' && u.groupId)
        return eq(teachingAssignments.groupId, u.groupId);
    fail(403, 'Раздел доступен студентам и преподавателям');
}
export async function studentsOf(db: DbSession, groupId: string) {
    return db.select({ id: users.id, name: users.fullName }).from(users).where(and(eq(users.groupId, groupId), eq(users.role, 'student'))).orderBy(users.fullName);
}
export function instant(value: unknown): Date {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value))
        fail(400, 'Дата должна содержать время и часовой пояс ISO 8601');
    const year = Number(value.slice(0, 4)), month = Number(value.slice(5, 7)), day = Number(value.slice(8, 10));
    if (year < 1900 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59)
        fail(400, 'Несуществующая дата или время');
    const date = new Date(value);
    if (!Number.isFinite(+date))
        fail(400, 'Некорректная дата');
    return date;
}
