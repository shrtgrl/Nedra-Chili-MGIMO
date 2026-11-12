import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readdirSync } from 'node:fs';
if (!process.env.TEST_DATABASE_URL) {
  console.error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database with migrations applied. Integration tests were not run.');
  process.exit(1);
}
const files=readdirSync('tests').filter(f=>f.endsWith('.test.ts')).map(f=>'tests/'+f);
const result=spawnSync(process.execPath,['--import','tsx','--test',...files],{
  stdio:'inherit',env:{...process.env,NODE_ENV:'test',DATABASE_URL:process.env.TEST_DATABASE_URL,JWT_SECRET:randomBytes(48).toString('hex')},
});
process.exit(result.status??1);
