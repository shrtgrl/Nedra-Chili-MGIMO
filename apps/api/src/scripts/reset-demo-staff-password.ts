import { argon2id, hash } from 'argon2';
import { eq } from 'drizzle-orm';
import { connectDatabase } from '../db.js';
import { sessions, users } from '../schema.js';

if (process.env.NODE_ENV === 'production') throw new Error('Demo password reset is disabled in production');

const password = process.env.SEED_STAFF_PASSWORD;
if (!password || password.length < 12) {
  throw new Error('Set SEED_STAFF_PASSWORD to at least 12 characters');
}

const connection = connectDatabase();
try {
  const [staff] = await connection.db.select({ id: users.id, role: users.role })
    .from(users).where(eq(users.email, 'staff@staff.mukpid.ru')).limit(1);
  if (!staff || staff.role !== 'staff') {
    throw new Error('Demo staff account must exist with the staff role; run db:seed first');
  }

  const passwordHash = await hash(password, {
    type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1,
  });
  await connection.db.transaction(async tx => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, staff.id));
    await tx.delete(sessions).where(eq(sessions.userId, staff.id));
  });
  console.log('Demo staff password updated; their sessions revoked.');
} finally {
  await connection.close();
}
