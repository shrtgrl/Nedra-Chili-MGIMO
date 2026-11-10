import { argon2id, hash } from 'argon2';
import { eq } from 'drizzle-orm';
import { connectDatabase } from '../db.js';
import { sessions, users } from '../schema.js';

if (process.env.NODE_ENV === 'production') throw new Error('Demo password reset is disabled in production');

const password = process.env.SEED_TEACHER_PASSWORD;
if (!password || password.length < 12) {
  throw new Error('Set SEED_TEACHER_PASSWORD to at least 12 characters');
}

const connection = connectDatabase();
try {
  const [teacher] = await connection.db.select({ id: users.id, role: users.role })
    .from(users).where(eq(users.email, 'teacher@mukpid.ru')).limit(1);
  if (!teacher || teacher.role !== 'teacher') {
    throw new Error('Demo teacher account must exist with the teacher role; run db:seed first');
  }

  const passwordHash = await hash(password, {
    type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1,
  });
  await connection.db.transaction(async tx => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, teacher.id));
    await tx.delete(sessions).where(eq(sessions.userId, teacher.id));
  });
  console.log('Demo teacher password updated; their sessions revoked.');
} finally {
  await connection.close();
}
