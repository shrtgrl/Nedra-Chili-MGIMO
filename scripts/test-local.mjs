import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import pg from 'pg';

const root = resolve(import.meta.dirname, '..');
const source = process.env.DATABASE_URL;
if (!source) throw new Error('Укажите локальный DATABASE_URL в .env');
const url = new URL(source);
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !['postgres:', 'postgresql:'].includes(url.protocol)) {
  throw new Error('Тесты разрешены только для локальной PostgreSQL');
}
const databaseName = 'dean_integration_test';
const adminUrl = new URL(source);
adminUrl.pathname = '/postgres';
const admin = new pg.Client({ connectionString: adminUrl.toString(), connectionTimeoutMillis: 5000 });
try {
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  if (!exists.rowCount) {
    try { await admin.query(`CREATE DATABASE ${databaseName}`); }
    catch (error) { if (error.code !== '42P04') throw error; }
  }
} finally {
  await admin.end();
}
url.pathname = '/' + databaseName;
const testUrl = url.toString();
const env = { ...process.env, DATABASE_URL: testUrl, TEST_DATABASE_URL: testUrl, NODE_ENV: 'test' };
delete env.DATABASE_URL_UNPOOLED;
function run(args, cwd) {
  const result = spawnSync(process.execPath, args, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('Применяю миграции к отдельной локальной тестовой базе');
run(['../../node_modules/drizzle-kit/bin.cjs', 'migrate'], resolve(root, 'apps/api'));
console.log('Запускаю интеграционные тесты');
run(['../../scripts/test-integration.mjs'], resolve(root, 'apps/api'));
