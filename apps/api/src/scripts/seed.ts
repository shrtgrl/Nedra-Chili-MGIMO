import { hash, argon2id } from 'argon2';
import { connectDatabase } from '../db.js';
import { eq } from 'drizzle-orm';
import { groups, users } from '../schema.js';

const passwords = [process.env.SEED_STUDENT_1_PASSWORD, process.env.SEED_STUDENT_2_PASSWORD, process.env.SEED_TEACHER_PASSWORD];
if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production');
const fixtures = [
  { email: 'student@mukpid.example', fullName: 'Мирослав Тестов Демонстрационный', group: 'ДЕМО-МО-101', faculty: 'Учебный факультет международных отношений', program: 'Международные отношения', year: 1 },
  { email: 'student2@mukpid.example', fullName: 'Алина Примерова Демонстрационная', group: 'ДЕМО-ЭК-202', faculty: 'Учебный факультет экономики', program: 'Экономика', year: 2 },
];
const connection = connectDatabase();
try {
  const emails = [...fixtures.map(f => f.email), 'teacher@mukpid.example'];
  const hashes: (string | null)[] = [];
  for (const [i, email] of emails.entries()) {
    const [existing] = await connection.db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing) { hashes.push(null); continue; }
    if (!passwords[i] || passwords[i]!.length < 12) throw new Error('Set a demo password of at least 12 characters for each new account');
    hashes.push(await hash(passwords[i]!, { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }));
  }
  await connection.db.transaction(async tx => {
    for (const [i, fixture] of fixtures.entries()) {
      const groupData = { name: fixture.group, faculty: fixture.faculty, program: fixture.program, year: fixture.year };
      const [group] = await tx.insert(groups).values(groupData)
        .onConflictDoUpdate({ target: groups.name, set: groupData }).returning({ id: groups.id });
      if (hashes[i]) await tx.insert(users).values({ email: fixture.email, role: 'student', faculty: fixture.faculty, fullName: fixture.fullName, groupId: group.id, passwordHash: hashes[i]! })
        .onConflictDoNothing({ target: users.email });
    }
    if (hashes[2]) await tx.insert(users).values({ email: 'teacher@mukpid.example', role: 'teacher', fullName: 'Орлов Андрей Викторович (демо)', faculty: 'Факультет цифровой экономики', department: 'Кафедра прикладных систем', passwordHash: hashes[2]! }).onConflictDoNothing({ target: users.email });
  });
  console.log('Demo users ready: student@mukpid.example, student2@mukpid.example, teacher@mukpid.example. Existing users and passwords preserved.');
} finally {
  await connection.close();
}
