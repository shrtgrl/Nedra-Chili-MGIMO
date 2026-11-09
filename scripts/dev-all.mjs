import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:net';

const root = resolve(import.meta.dirname, '..');
const web = resolve(root, 'apps/web');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const docker = process.platform === 'win32' ? 'docker.exe' : 'docker';

if (!existsSync(resolve(root, '.env'))) {
  console.error('Создайте .env из .env.example и задайте секреты и пароли для демоаккаунтов.');
  process.exit(1);
}
if (!existsSync(resolve(root, 'node_modules/.bin/tsx')) || !existsSync(resolve(web, 'node_modules/.bin/vite'))) {
  console.error('Установите зависимости один раз: npm ci; затем cd apps/web && npm ci.');
  process.exit(1);
}

function run(command, args, cwd = root) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolveRun();
      else reject(new Error(`${command} ${args.join(' ')} завершился: ${signal ?? code}`));
    });
  });
}

function assertFreePort(port, host) {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', error => {
      if (error.code === 'EADDRINUSE') reject(new Error(`Порт ${port} занят. Остановите уже запущенный сервер перед npm run dev:all.`));
      else reject(error);
    });
    server.listen(port, host, () => server.close(resolvePort));
  });
}

const services = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of services) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    try {
      if (process.platform === 'win32') child.kill('SIGTERM');
      else process.kill(-child.pid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') console.error(error);
    }
  }
  process.exitCode = code;
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

try {
  await assertFreePort(3001, '127.0.0.1');
  await assertFreePort(5173, 'localhost');
  await run(docker, ['compose', 'up', '-d', '--wait', 'db']);
  await run(npm, ['run', 'db:migrate']);
  await run(npm, ['run', 'db:seed']);

  for (const [name, cwd, args] of [['API', root, ['run', 'dev']], ['Веб', web, ['run', 'dev', '--', '--strictPort']]]) {
    const child = spawn(npm, args, {
      cwd,
      stdio: 'inherit',
      detached: process.platform !== 'win32',
    });
    services.push(child);
    child.once('error', error => {
      console.error(`${name}: ${error.message}`);
      stop(1);
    });
    child.once('exit', (code, signal) => {
      if (!stopping) {
        console.error(`${name} завершился: ${signal ?? code}`);
        stop(code || 1);
      }
    });
  }
  console.log('Интерфейс: http://localhost:5173');
} catch (error) {
  console.error(error.message);
  stop(1);
}
