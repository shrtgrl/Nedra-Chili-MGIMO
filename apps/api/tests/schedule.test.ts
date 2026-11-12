import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { hash } from 'argon2';
import { eq, inArray } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { connectDatabase } from '../src/db.js';
import { groups, lessons, notifications, sessions, users } from '../src/schema.js';

test('schedule: only staff edits, overlap protection, search and student notifications', async () => {
  const c = connectDatabase();
  const app = buildApp({ logger: false, secureCookies: false, origin: 'http://localhost:5173' });
  const suffix = randomUUID(), groupId = randomUUID();
  const ids = [randomUUID(), randomUUID(), randomUUID()]; // student, teacher, staff
  const password = randomBytes(24).toString('hex'), passwordHash = await hash(password);
  const csrf = { 'x-csrf-protection': '1', origin: 'http://localhost:5173' };
  try {
    await c.db.insert(groups).values({ id: groupId, name: `SCHED-${suffix}`, faculty: 'Тест', program: 'Тест', year: 1 });
    await c.db.insert(users).values(ids.map((id, i) => ({ id, email: `sched-${suffix}-${i}@example.test`, fullName: 'Вымышленный пользователь', faculty: 'Тест',
      role: ['student', 'teacher', 'staff'][i]!, groupId: i === 0 ? groupId : null, passwordHash })));
    const cookies: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await app.inject({ method: 'POST', url: '/api/auth/login', headers: csrf, payload: { email: `sched-${suffix}-${i}@example.test`, password } });
      cookies.push(String(res.headers['set-cookie']).split(';')[0]!);
    }
    const call = (i: number | null, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
      app.inject({ method, url, headers: { ...(method === 'GET' ? {} : csrf), ...(i === null ? {} : { cookie: cookies[i]! }) }, payload });
    const body = { subject: 'Тестовый предмет', kind: 'lecture', teacherId:ids[1], teacherName: 'Тестов Т. Т.', room: suffix, startsAt: '2030-01-07T09:00:00+03:00', endsAt: '2030-01-07T10:30:00+03:00' };
    const list = `/api/staff/groups/${groupId}/lessons?from=2030-01-01T00:00:00Z&to=2030-01-31T00:00:00Z`;

    for (const i of [null, 0, 1]) {
      assert.equal((await call(i, 'GET', '/api/staff/groups?q=SCHED')).statusCode, i === null ? 401 : 403);
      assert.equal((await call(i, 'POST', `/api/staff/groups/${groupId}/lessons`, body)).statusCode, i === null ? 401 : 403);
    }
    const found = (await call(2, 'GET', `/api/staff/groups?q=${suffix.slice(0, 8)}`)).json().data;
    assert.equal(found.length, 1); assert.equal(found[0].id, groupId);
    assert.deepEqual((await call(2, 'GET', '/api/staff/groups?q=%25')).json().data.filter((g: { id: string }) => g.id === groupId), []);

    const created = await call(2, 'POST', `/api/staff/groups/${groupId}/lessons`, body);
    assert.equal(created.statusCode, 201);
    const lesson = created.json().data;
    assert.equal(lesson.subject, body.subject);
    assert.equal((await call(2, 'POST', `/api/staff/groups/${groupId}/lessons`, { ...body, startsAt: '2030-01-07T10:00:00+03:00', endsAt: '2030-01-07T11:00:00+03:00' })).statusCode, 409);
    assert.equal((await call(2, 'POST', `/api/staff/groups/${groupId}/lessons`, { ...body, endsAt: body.startsAt })).statusCode, 400);
    assert.equal((await call(2, 'POST', `/api/staff/groups/${groupId}/lessons`, { ...body, kind: 'party' })).statusCode, 400);
    assert.equal((await call(2, 'POST', `/api/staff/groups/${randomUUID()}/lessons`, body)).statusCode, 404);

    assert.equal((await call(2, 'GET', list)).json().data.lessons.length, 1);
    const patched = await call(2, 'PATCH', `/api/staff/lessons/${lesson.id}`, { room: 'ауд. 2', changeNote: 'Перенос аудитории' });
    assert.equal(patched.statusCode, 200); assert.equal(patched.json().data.room, 'ауд. 2'); assert.equal(patched.json().data.changeNote, 'Перенос аудитории');
    assert.equal((await call(2, 'PATCH', `/api/staff/lessons/${lesson.id}`, { endsAt: '2030-01-07T08:00:00+03:00' })).statusCode, 400);
    assert.equal((await call(0, 'PATCH', `/api/staff/lessons/${lesson.id}`, { room: 'x' })).statusCode, 403);
    assert.equal((await call(2, 'PATCH', `/api/staff/lessons/${randomUUID()}`, { room: 'x' })).statusCode, 404);
    const personal='/api/schedule?from=2030-01-01T00:00:00Z&to=2030-01-31T00:00:00Z';
    assert.equal((await call(0,'GET',personal)).json().data[0].id,lesson.id);
    assert.equal((await call(1,'GET',personal)).json().data[0].id,lesson.id);
    assert.equal((await call(2, 'DELETE', `/api/staff/lessons/${lesson.id}`)).statusCode, 204);
    assert.equal((await call(2, 'DELETE', `/api/staff/lessons/${lesson.id}`)).statusCode, 204);
    assert.equal((await call(2, 'GET', list)).json().data.lessons[0].cancelled, true);
    assert.equal((await c.db.select().from(notifications).where(eq(notifications.studentId, ids[0]!))).length, 3);
  } finally {
    await c.db.delete(lessons).where(eq(lessons.groupId, groupId));
    await c.db.delete(notifications).where(eq(notifications.studentId, ids[0]!));
    await c.db.delete(sessions).where(inArray(sessions.userId, ids));
    await c.db.delete(users).where(inArray(users.id, ids));
    await c.db.delete(groups).where(eq(groups.id, groupId));
    await app.close();
    await c.close();
  }
});
