import { SignJWT, jwtVerify } from 'jose';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { hash, verify, argon2id } from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { connectDatabase } from './db.js';
import { groups, sessions, users } from './schema.js';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const lifetime = 8 * 60 * 60;
export function buildApp(options: { logger?: boolean; origin?: string; secureCookies?: boolean } = {}) {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET must contain at least 32 bytes');
  const key = new TextEncoder().encode(secret);
  async function claims(token?: string) {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'], issuer: 'mukpid-api', audience: 'mukpid-web', requiredClaims: ['sub', 'jti', 'exp', 'iat'] });
      if (!/^[0-9a-f-]{36}$/.test(payload.sub ?? '') || !/^[A-Za-z0-9_-]{43}$/.test(payload.jti ?? '')) return null;
      return payload;
    } catch { return null; }
  }
  const secure = options.secureCookies ?? process.env.NODE_ENV === 'production';
  const origin = options.origin ?? process.env.APP_ORIGIN ?? 'http://localhost:5173';
  if (process.env.NODE_ENV === 'production' && (!secure || !process.env.APP_ORIGIN || new URL(origin).protocol !== 'https:')) {
    throw new Error('Production requires HTTPS APP_ORIGIN and secure cookies');
  }
  const name = secure ? '__Host-session' : 'session';
  const cookieOptions = { path: '/', httpOnly: true, secure, sameSite: 'lax' as const };
  const app = Fastify({ logger: options.logger ?? true, bodyLimit: 16384 });
  const connection = connectDatabase();
  const db = connection.db;
  const dummyHash = hash(randomBytes(32), { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const error = (code: string, message: string) => ({ error: { code, message } });
  app.register(cookie);
  app.register(rateLimit, { global: false });
  app.addHook('onClose', async () => { await connection.close(); });
  app.addHook('onRequest', async (req, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      // A custom header forces cross-origin browsers to preflight; CORS is not enabled.
      if (req.headers['x-csrf-protection'] !== '1' ||
          (req.headers.origin !== undefined && req.headers.origin !== origin) ||
          req.headers['sec-fetch-site'] === 'cross-site') {
        return reply.code(403).send(error('FORBIDDEN', 'Запрос отклонён'));
      }
    }
  });
  app.setErrorHandler((err, req, reply) => {
    const candidate = err instanceof Error && 'statusCode' in err ? err.statusCode : undefined;
    const status = typeof candidate === 'number' && candidate >= 400 && candidate < 500 ? candidate : 500;
    if (status === 500) req.log.error({ code: 'INTERNAL_ERROR' }, 'Request failed');
    reply.code(status).send(error(status === 429 ? 'RATE_LIMITED' : status === 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
      status === 429 ? 'Слишком много попыток. Попробуйте позже' : status === 500 ? 'Внутренняя ошибка сервера' : 'Проверьте данные запроса'));
  });
  app.register(async function routes(app) {
  app.get('/health', async () => ({ status: 'ok' }));
  app.post<{ Body: { email: string; password: string } }>('/api/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: { body: { type: 'object', required: ['email', 'password'], additionalProperties: false,
      properties: { email: { type: 'string', format: 'email', maxLength: 254 }, password: { type: 'string', minLength: 1, maxLength: 256 } } } },
  }, async (req, reply) => {
    const [student] = await db.select({ id: users.id, passwordHash: users.passwordHash }).from(users).where(eq(users.email, req.body.email.trim().toLowerCase())).limit(1);
    const valid = await verify(student?.passwordHash ?? await dummyHash, req.body.password);
    if (!student || !valid) return reply.code(401).send(error('INVALID_CREDENTIALS', 'Неверный логин или пароль'));
    const sessionId = randomBytes(32).toString('base64url');
    const token = await new SignJWT({}).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setSubject(student.id).setJti(sessionId).setIssuer('mukpid-api').setAudience('mukpid-web').setIssuedAt().setExpirationTime('8h').sign(key);
    await db.transaction(async tx => {
      const previous = await claims(req.cookies[name]);
      if (previous) await tx.delete(sessions).where(eq(sessions.tokenHash, digest(previous.jti!)));
      await tx.insert(sessions).values({ tokenHash: digest(sessionId), userId: student.id, expiresAt: new Date(Date.now() + lifetime * 1000) });
    });
    reply.setCookie(name, token, { ...cookieOptions, maxAge: lifetime });
    return { data: { authenticated: true } };
  });
  app.post('/api/auth/logout', async (req, reply) => {
    const payload = await claims(req.cookies[name]);
    if (payload) await db.delete(sessions).where(and(eq(sessions.tokenHash, digest(payload.jti!)), eq(sessions.userId, payload.sub!)));
    reply.clearCookie(name, cookieOptions);
    return reply.code(204).send();
  });
  app.get('/api/auth/me', async (req, reply) => {
    const payload = await claims(req.cookies[name]);
    if (!payload) return reply.code(401).send(error('UNAUTHORIZED', 'Войдите в аккаунт'));
    const [profile] = await db.select({ id: users.id, fullName: users.fullName, email: users.email, role: users.role, faculty: users.faculty, department: users.department,
      program: groups.program, year: groups.year, groupName: groups.name }).from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId)).leftJoin(groups, eq(groups.id, users.groupId))
      .where(and(eq(sessions.tokenHash, digest(payload.jti!)), eq(sessions.userId, payload.sub!), gt(sessions.expiresAt, new Date()))).limit(1);
    if (!profile) {
      reply.clearCookie(name, cookieOptions);
      return reply.code(401).send(error('UNAUTHORIZED', 'Войдите в аккаунт'));
    }
    return { data: profile };
  });
  });
  return app;
}
