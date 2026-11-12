import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app.js';
import { DomainError, instant, bodyObject, textValue, uuid } from '../../src/domain.js';
import { validateFile } from '../../src/material-routes.js';
import { requestPdf } from '../../src/request-pdf.js';
import { getTableConfig } from 'drizzle-orm/pg-core';
import * as schema from '../../src/schema.js';
test('all new routes reject missing or forged sessions and enforce CSRF before database access', async () => {
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
    const app = buildApp({ logger: false, origin: 'http://localhost:5173', secureCookies: false });
    const id = randomUUID();
    const routes: [
        string,
        string,
        object?
    ][] = [
        ['GET', '/api/notifications'], ['PATCH', '/api/notifications/read-all'], ['PATCH', `/api/notifications/${id}/read`],
        ['GET', '/api/user/prefs'], ['PATCH', '/api/user/prefs', { schedule: false }], ['GET', '/api/gradebook/groups'], ['PUT', `/api/gradebook/${id}`, { version: 0, scores: [] }], ['GET', '/api/grades'],
        ['GET', '/api/inquiries'], ['GET', '/api/inquiries/teachers'], ['POST', '/api/inquiries', {}], ['PATCH', `/api/inquiries/${id}`, { status: 'closed' }], ['POST', `/api/inquiries/${id}/replies`, { text: 'Тест' }],
        ['GET', '/api/materials'], ['GET', '/api/materials/assignments'], ['POST', '/api/materials', {}], ['DELETE', `/api/materials/${id}`], ['GET', `/api/materials/${id}/file`],
        ['GET', '/api/schedule?from=2030-01-01T00:00:00Z&to=2030-01-02T00:00:00Z'], ['GET', '/api/staff/teachers'], ['GET', '/api/staff/groups'], ['GET', `/api/staff/groups/${id}/lessons`], ['POST', `/api/staff/groups/${id}/lessons`, {}], ['PATCH', `/api/staff/lessons/${id}`, {}], ['DELETE', `/api/staff/lessons/${id}`],
        ['POST', `/api/staff/requests/${id}/prepare`, { verified: true }], ['POST', `/api/staff/requests/${id}/preview`, { draftId: id }],
    ];
    try {
        for (const [method, url, payload] of routes) {
            for (const cookie of ['', 'session=forged']) {
                const r = await app.inject({ method: method as 'GET', url, payload, headers: { cookie, 'x-csrf-protection': '1', origin: 'http://localhost:5173' } });
                assert.equal(r.statusCode, 401, `${method} ${url}: ${r.body}`);
                assert.equal(r.json().error.code, 'UNAUTHORIZED');
            }
            if (method !== 'GET') {
                assert.equal((await app.inject({ method: method as 'POST', url, payload })).statusCode, 403);
                assert.equal((await app.inject({ method: method as 'POST', url, payload, headers: { 'x-csrf-protection': '1', origin: 'https://untrusted.example' } })).statusCode, 403);
            }
        }
    }
    finally {
        await app.close();
    }
});
test('file validation rejects disguised formats, invalid encoding and oversized payloads', () => {
    const b64 = (s: string) => Buffer.from(s).toString('base64');
    assert.equal(validateFile('учебный.txt', b64('Вымышленный учебный материал')).mimeType, 'text/plain; charset=utf-8');
    assert.equal(validateFile('sample.pdf', b64('%PDF-1.4\n%%EOF')).mimeType, 'application/pdf');
    for (const [name, bytes] of [['script.html', b64('<script>')], ['fake.pdf', b64('not a PDF')], ['bad.txt', '////'], ['null.txt', b64('\0')], ['invalid.txt', '??']])
        assert.throws(() => validateFile(name, bytes), DomainError);
    assert.equal(validateFile('limit.txt', Buffer.alloc(5 * 1024 * 1024, 65).toString('base64')).size, 5 * 1024 * 1024);
    assert.throws(() => validateFile('big.txt', Buffer.alloc(5 * 1024 * 1024 + 1, 65).toString('base64')), DomainError);
});
test('input guards reject blank fields, arrays, null and malformed UUIDs', () => {
    assert.equal(textValue(' Тема ', 20), 'Тема');
    assert.equal(uuid(randomUUID()).length, 36);
    for (const value of [null, {}, [], 42, '   ', 'x'.repeat(201)])
        assert.throws(() => textValue(value, 200), DomainError);
    for (const value of [null, [], false, 'x'])
        assert.throws(() => bodyObject(value), DomainError);
    assert.throws(() => uuid('not-an-id'), DomainError);
});
test('schema keeps distinct SQL columns for creation and modification dates', () => {
    for (const table of [schema.inquiries, schema.gradeEntries, schema.requests]) {
        const names = getTableConfig(table).columns.map(c => c.name);
        assert.equal(new Set(names).size, names.length);
        assert(names.includes('updated_at'));
    }
});
test('draft and issued document generation supports Cyrillic and long fields', async () => {
    const input = { id: randomUUID(), type: 'study', purpose: 'Для вымышленного учреждения '.repeat(15), fullName: 'Тестов Студент Демонстрационный', groupName: 'ДЕМО-101', faculty: 'Учебный факультет', program: 'Программная инженерия', year: 1, readyAt: new Date('2030-01-01T00:00:00Z') };
    const final = await requestPdf(input), draft = await requestPdf({ ...input, draft: true });
    assert.equal(final.subarray(0, 5).toString(), '%PDF-');
    assert.equal(draft.subarray(0, 5).toString(), '%PDF-');
    assert.notDeepEqual(final, draft);
});
test('schedule rejects ambiguous timezones and nonexistent calendar dates', () => {
    assert.equal(instant('2030-01-01T09:00:00+03:00').toISOString(), '2030-01-01T06:00:00.000Z');
    for (const value of ['2030-01-01', '2030-01-01T09:00:00', '2030-02-30T09:00:00Z', '2030-01-01T24:00:00Z', 'x'])
        assert.throws(() => instant(value), DomainError);
});
