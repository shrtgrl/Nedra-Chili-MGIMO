import { hash, argon2id } from 'argon2';
import { eq, inArray } from 'drizzle-orm';
import { connectDatabase } from '../db.js';
import { sessions, users } from '../schema.js';

if (process.env.NODE_ENV === 'production') throw new Error('Demo password reset is disabled in production');

const accounts = [
  { email: 'student@mukpid.example', password: process.env.SEED_STUDENT_1_PASSWORD },
  { email: 'student2@mukpid.example', password: process.env.SEED_STUDENT_2_PASSWORD },
];
for (const account of accounts) {
  if (!account.password || account.password.length < 12) {
    throw new Error(`Set ${account.email === accounts[0].email ? 'SEED_STUDENT_1_PASSWORD' : 'SEED_STUDENT_2_PASSWORD'} to at least 12 characters`);
  }
}

const connection = connectDatabase();
try {
  const existing = await connection.db.select({ id: users.id, email: users.email, role: users.role })
    .from(users).where(inArray(users.email, accounts.map(account => account.email)));
  if (existing.length !== accounts.length || existing.some(user => user.role !== 'student')) {
    throw new Error('Both demo student accounts must exist with the student role; run db:seed first');
  }
  const hashes = await Promise.all(accounts.map(account => hash(account.password!, {
    type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1,
  })));
  await connection.db.transaction(async tx => {
    for (const [index, account] of accounts.entries()) {
      const user = existing.find(user => user.email === account.email)!;
      await tx.update(users).set({ passwordHash: hashes[index]! }).where(eq(users.id, user.id));
      await tx.delete(sessions).where(eq(sessions.userId, user.id));
    }
  });
  console.log('Demo student passwords updated; their sessions revoked.');
} finally {
  await connection.close();
}
