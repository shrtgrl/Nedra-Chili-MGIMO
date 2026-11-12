import { hash, argon2id } from 'argon2';
import { connectDatabase } from '../db.js';
import { and, eq } from 'drizzle-orm';

// День недели (0 = пн), начало, конец, предмет, вид, преподаватель, аудитория. Все данные вымышлены.
const weekly: [number, string, string, string, string, string, string][] = [
  [0, '09:00', '10:30', 'Макроэкономика', 'lecture', 'Орлов А. В.', 'ауд. 214'],
  [0, '10:45', '12:15', 'Английский язык', 'practice', 'Белова Е. Н.', 'ауд. 108'],
  [0, '13:00', '14:30', 'Основы вайб-кодинга', 'seminar', 'Смирнов Д. А.', 'ауд. 305'],
  [1, '09:00', '10:30', 'Теория вероятностей', 'lecture', 'Громова Т. И.', 'ауд. 201'],
  [1, '10:45', '12:15', 'История России', 'seminar', 'Крылов П. С.', 'ауд. 117'],
  [2, '09:00', '10:30', 'Макроэкономика', 'seminar', 'Орлов А. В.', 'ауд. 214'],
  [2, '10:45', '12:15', 'Проектирование интерфейсов', 'lecture', 'Смирнов Д. А.', 'ауд. 305'],
  [3, '10:45', '12:15', 'Теория вероятностей', 'practice', 'Громова Т. И.', 'ауд. 203'],
  [4, '09:00', '10:30', 'Основы вайб-кодинга', 'lecture', 'Смирнов Д. А.', 'ауд. 305'],
  [4, '10:45', '12:15', 'История России', 'lecture', 'Крылов П. С.', 'ауд. 117'],
];
const FIRST_MONDAY = Date.UTC(2026, 10, 2); // 2 ноября 2026; время занятий — по Москве (UTC+3)
const at = (week: number, day: number, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(FIRST_MONDAY + ((week * 7 + day) * 24 + h! - 3) * 3_600_000 + m! * 60_000);
};
import { groups, lessons, subjects, users, teachingAssignments } from '../schema.js';

const passwords = [process.env.SEED_STUDENT_1_PASSWORD, process.env.SEED_STUDENT_2_PASSWORD, process.env.SEED_TEACHER_PASSWORD, process.env.SEED_STAFF_PASSWORD];
if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production');
const fixtures = [
  { email: 'student@edu.mukpid.ru', fullName: 'Мирослав Тестов Демонстрационный', group: 'ДЕМО-МО-101', faculty: 'Учебный факультет международных отношений', program: 'Международные отношения', year: 1 },
  { email: 'student2@edu.mukpid.ru', fullName: 'Алина Примерова Демонстрационная', group: 'ДЕМО-ЭК-202', faculty: 'Учебный факультет экономики', program: 'Экономика', year: 2 },
];
const connection = connectDatabase();
try {
  const emails = [...fixtures.map(f => f.email), 'teacher@mukpid.ru', 'staff@staff.mukpid.ru'];
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
      const [hasLessons] = await tx.select({ id: lessons.id }).from(lessons).where(eq(lessons.groupId, group.id)).limit(1);
      if (!hasLessons) {
        const subjectIds = new Map<string, string>();
        for (const row of weekly) {
          if (subjectIds.has(row[3])) continue;
          const [found] = await tx.select({ id: subjects.id }).from(subjects).where(eq(subjects.name, row[3])).limit(1);
          subjectIds.set(row[3], found?.id ?? (await tx.insert(subjects).values({ name: row[3] }).returning({ id: subjects.id }))[0]!.id);
        }
        await tx.insert(lessons).values(Array.from({ length: 8 }, (_, week) => weekly.map(([day, from, to, subject, kind, teacherName, room]) =>
          ({ groupId: group.id, subjectId: subjectIds.get(subject)!, kind, teacherName, room, startsAt: at(week, day, from), endsAt: at(week, day, to) }))).flat());
      }
      if (hashes[i]) await tx.insert(users).values({ email: fixture.email, role: 'student', faculty: fixture.faculty, fullName: fixture.fullName, groupId: group.id, passwordHash: hashes[i]! })
        .onConflictDoNothing({ target: users.email });
    }
    if (hashes[2]) await tx.insert(users).values({ email: 'teacher@mukpid.ru', role: 'teacher', fullName: 'Орлов Андрей Викторович (демо)', faculty: 'Факультет цифровой экономики', department: 'Кафедра прикладных систем', passwordHash: hashes[2]! }).onConflictDoNothing({ target: users.email });
    if (hashes[3]) await tx.insert(users).values({ email: 'staff@staff.mukpid.ru', role: 'staff', fullName: 'Тестова Вера Демонстрационная', faculty: 'Учебный офис', passwordHash: hashes[3]! }).onConflictDoNothing({ target: users.email });
  });
  // Explicit fictional curriculum; never infer assignments for arbitrary existing users.
  await connection.db.transaction(async tx => {
    const [teacher] = await tx.select().from(users).where(eq(users.email,'teacher@mukpid.ru'));
    if (!teacher || teacher.role !== 'teacher') throw new Error('Demo teacher missing');
    const [subject] = await tx.select().from(subjects).where(eq(subjects.name,'Макроэкономика')).limit(1);
    if (!subject) return;
    for (const fixture of fixtures) {
      const [group] = await tx.select().from(groups).where(eq(groups.name,fixture.group));
      if (!group) continue;
      await tx.insert(teachingAssignments).values({teacherId:teacher.id,subjectId:subject.id,groupId:group.id,semester:group.year*2-1,form:'Экзамен'}).onConflictDoNothing();
      await tx.update(lessons).set({teacherId:teacher.id,teacherName:teacher.fullName}).where(and(eq(lessons.groupId,group.id),eq(lessons.subjectId,subject.id),eq(lessons.teacherName,'Орлов А. В.')));
    }
  });
  console.log('Demo users ready: student@edu.mukpid.ru, student2@edu.mukpid.ru, teacher@mukpid.ru, staff@staff.mukpid.ru. Existing users and passwords preserved.');
} finally {
  await connection.close();
}
