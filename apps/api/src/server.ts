import { buildApp } from './app.js';
import fastifyStatic from '@fastify/static';
import { resolve } from 'node:path';

const app = buildApp();
if (process.env.NODE_ENV === 'production') {
  const webRoot = resolve(import.meta.dirname, '../../web/dist');
  app.register(fastifyStatic, { root: webRoot });
  app.setNotFoundHandler((request, reply) => {
    if ((request.method === 'GET' || request.method === 'HEAD') && !request.url.startsWith('/api/')) {
      return reply.sendFile('index.html');
    }
    return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Не найдено' } });
  });
}
const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void app.close(); });
}
try {
  await app.listen({ port, host: process.env.HOST ?? '127.0.0.1' });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
