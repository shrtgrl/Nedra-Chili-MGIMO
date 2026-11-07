import { hash, argon2id } from 'argon2';
import { connectDatabase } from '../db.js';
import { groups, students } from '../schema.js';

const passwords = [process.env.SEED_STUDENT_1_PASSWORD, process.env.SEED_STUDENT_2_PASSWORD];
if (passwords.some(p => !p || p.length < 12)) {
  throw new Error('Set both SEED_STUDENT_1_PASSWORD and SEED_STUDENT_2_PASSWORD (at least 12 characters)');
}
if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production');
const fixtures = [
  { login: 'student1', fullName: 'Мирослав Тестов Демонстрационный', group: 'ДЕМО-МО-101', faculty: 'Учебный факультет международных отношений', program: 'Международные отношения', year: 1 },
  { login: 'student2', fullName: 'Алина Примерова Демонстрационная', group: 'ДЕМО-ЭК-202', faculty: 'Учебный факультет экономики', program: 'Экономика', year: 2 },
];
const hashes = await Promise.all(passwords.map(p => hash(p!, { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 })));
const connection = connectDatabase();
try {
  await connection.db.transaction(async tx => {
    for (const [i, fixture] of fixtures.entries()) {
      const groupData = { name: fixture.group, faculty: fixture.faculty, program: fixture.program, year: fixture.year };
      const [group] = await tx.insert(groups).values(groupData)
        .onConflictDoUpdate({ target: groups.name, set: groupData }).returning({ id: groups.id });
      await tx.insert(students).values({ login: fixture.login, fullName: fixture.fullName, groupId: group.id, passwordHash: hashes[i] })
        .onConflictDoNothing({ target: students.login });
    }
  });
  console.log('Demo students ready: student1, student2. Existing students and passwords preserved.');
} finally {
  await connection.close();
}
