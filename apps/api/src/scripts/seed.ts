import { hash, argon2id } from 'argon2';
import { randomBytes } from 'node:crypto';
import { connectDatabase } from '../db.js';
import { and, eq, isNull } from 'drizzle-orm';

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
const at = (week: number, day: number, hhmm: string, hourOffset = 0) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(FIRST_MONDAY + ((week * 7 + day) * 24 + h! + hourOffset - 3) * 3_600_000 + m! * 60_000);
};
import { groups, lessons, subjects, users, teachingAssignments, gradeEntries, requests, inquiries, inquiryReplies, materials, notifications } from '../schema.js';

const passwords = [process.env.SEED_STUDENT_1_PASSWORD, process.env.SEED_STUDENT_2_PASSWORD, process.env.SEED_TEACHER_PASSWORD, process.env.SEED_STAFF_PASSWORD];
if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production');
const fixtures = [
  { email: 'student@edu.mukpid.ru', fullName: 'Мирослав Тестов Демонстрационный', group: 'ДЕМО-МО-101', faculty: 'Учебный факультет международных отношений', program: 'Международные отношения', year: 1 },
  { email: 'student2@edu.mukpid.ru', fullName: 'Алина Примерова Демонстрационная', group: 'ДЕМО-ЭК-202', faculty: 'Учебный факультет экономики', program: 'Экономика', year: 2 },
];
const additionalTeachers = [
  { email: 'belova.teacher@mukpid.ru', fullName: 'Белова Елена Николаевна (демо)', label: 'Белова Е. Н.', subjects: ['Английский язык'], department: 'Кафедра иностранных языков' },
  { email: 'smirnov.teacher@mukpid.ru', fullName: 'Смирнов Дмитрий Алексеевич (демо)', label: 'Смирнов Д. А.', subjects: ['Основы вайб-кодинга', 'Проектирование интерфейсов'], department: 'Кафедра цифровых технологий' },
  { email: 'gromova.teacher@mukpid.ru', fullName: 'Громова Татьяна Игоревна (демо)', label: 'Громова Т. И.', subjects: ['Теория вероятностей'], department: 'Кафедра математики' },
  { email: 'krylov.teacher@mukpid.ru', fullName: 'Крылов Павел Сергеевич (демо)', label: 'Крылов П. С.', subjects: ['История России'], department: 'Кафедра истории' },
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
          ({ groupId: group.id, subjectId: subjectIds.get(subject)!, kind, teacherName, room, startsAt: at(week, day, from, i * 3), endsAt: at(week, day, to, i * 3) }))).flat());
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
    for (const demo of additionalTeachers) {
      const [existing] = await tx.select().from(users).where(eq(users.email, demo.email));
      if (existing && existing.role !== 'teacher') throw new Error(`Demo teacher role mismatch: ${demo.email}`);
      const passwordHash = existing ? null : await hash(randomBytes(32).toString('hex'), { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
      if (passwordHash) await tx.insert(users).values({ email: demo.email, role: 'teacher', fullName: demo.fullName, faculty: 'Учебный факультет', department: demo.department, passwordHash }).onConflictDoNothing({ target: users.email });
      const [account] = await tx.select().from(users).where(eq(users.email, demo.email));
      if (!account || account.role !== 'teacher') throw new Error(`Demo teacher missing: ${demo.email}`);
      for (const subjectName of demo.subjects) {
        const [discipline] = await tx.select().from(subjects).where(eq(subjects.name, subjectName)).limit(1);
        if (!discipline) throw new Error(`Demo subject missing: ${subjectName}`);
        for (const fixture of fixtures) {
          const [group] = await tx.select().from(groups).where(eq(groups.name, fixture.group));
          if (!group) throw new Error(`Demo group missing: ${fixture.group}`);
          await tx.insert(teachingAssignments).values({ teacherId: account.id, subjectId: discipline.id, groupId: group.id, semester: group.year * 2 - 1, form: 'Зачёт' }).onConflictDoNothing();
          await tx.update(lessons).set({ teacherId: account.id, teacherName: account.fullName }).where(and(eq(lessons.groupId, group.id), eq(lessons.subjectId, discipline.id), eq(lessons.teacherName, demo.label)));
        }
      }
    }
    // Earlier seeds gave both groups identical slots. Shift only untouched lessons
    // of the second fictional group; leave any staff edits and cancellations intact.
    const [secondGroup] = await tx.select({ id: groups.id }).from(groups).where(eq(groups.name, fixtures[1]!.group));
    if (secondGroup) for (let week = 0; week < 8; week++) for (const [day, from, to, name, kind, teacherName, room] of weekly) {
      const [subject] = await tx.select({ id: subjects.id }).from(subjects).where(eq(subjects.name, name)).limit(1);
      if (!subject) continue;
      await tx.update(lessons).set({ startsAt: at(week, day, from, 3), endsAt: at(week, day, to, 3) })
        .where(and(eq(lessons.groupId, secondGroup.id), eq(lessons.subjectId, subject.id),
          eq(lessons.kind, kind), eq(lessons.room, room),
          eq(lessons.teacherName, name === 'Макроэкономика' ? teacher.fullName : additionalTeachers.find(t => t.label === teacherName)?.fullName ?? teacherName),
          eq(lessons.startsAt, at(week, day, from)), eq(lessons.endsAt, at(week, day, to)),
          eq(lessons.cancelled, false), isNull(lessons.changeNote)));
    }
  });
  // Showcase records have stable, fictional labels. Re-running the seed only fills missing records.
  await connection.db.transaction(async tx => {
    const [teacher] = await tx.select().from(users).where(eq(users.email, 'teacher@mukpid.ru'));
    const [staff] = await tx.select().from(users).where(eq(users.email, 'staff@staff.mukpid.ru'));
    if (!teacher || teacher.role !== 'teacher' || !staff || staff.role !== 'staff') throw new Error('Demo staff or teacher missing');
    for (const [index, fixture] of fixtures.entries()) {
      const [student] = await tx.select().from(users).where(eq(users.email, fixture.email));
      const [group] = await tx.select().from(groups).where(eq(groups.name, fixture.group));
      if (!student || student.role !== 'student' || student.groupId !== group?.id) throw new Error('Demo student or group mismatch');
      const [assignment] = await tx.select().from(teachingAssignments).where(and(eq(teachingAssignments.teacherId, teacher.id), eq(teachingAssignments.groupId, group.id)));
      if (!assignment) throw new Error('Demo teaching assignment missing');

      await tx.insert(gradeEntries).values({ assignmentId: assignment.id, studentId: student.id, score: index === 0 ? 87 : 74 })
        .onConflictDoNothing({ target: [gradeEntries.assignmentId, gradeEntries.studentId] });

      const requestPurpose = index === 0 ? 'Для предъявления по месту требования (демо)' : 'Для оформления учебной льготы (демо)';
      const [existingRequest] = await tx.select({ id: requests.id }).from(requests).where(and(eq(requests.studentId, student.id), eq(requests.purpose, requestPurpose))).limit(1);
      if (!existingRequest) await tx.insert(requests).values({ studentId: student.id, type: 'study', purpose: requestPurpose, delivery: 'pdf', status: index === 0 ? 'submitted' : 'in_progress', processedBy: index === 0 ? null : staff.id });

      const inquirySubject = index === 0 ? 'Вопрос по заданию (демо)' : 'Консультация перед экзаменом (демо)';
      const [existingInquiry] = await tx.select({ id: inquiries.id }).from(inquiries).where(and(eq(inquiries.studentId, student.id), eq(inquiries.subject, inquirySubject))).limit(1);
      if (!existingInquiry) {
        const [inquiry] = await tx.insert(inquiries).values({ studentId: student.id, teacherId: teacher.id, assignmentId: assignment.id, subject: inquirySubject, text: index === 0 ? 'Подскажите, какие темы повторить к семинару?' : 'Можно ли получить список тем для подготовки?', status: index === 0 ? 'new' : 'progress' }).returning({ id: inquiries.id });
        if (index === 1) await tx.insert(inquiryReplies).values({ inquiryId: inquiry.id, authorId: teacher.id, text: 'Повторите темы 1–4 и решите задачи из учебного материала.' });
      }

      const title = `Материалы по макроэкономике (${fixture.group}, демо)`;
      const previousContent = 'Демонстрационный материал по макроэкономике.\nТемы: спрос, предложение, инфляция.\n';
      const content = index === 0
        ? `Группа ${fixture.group}: спрос и предложение.\nПодготовьте пример изменения рыночного равновесия.\n`
        : `Группа ${fixture.group}: инфляция и денежная политика.\nПодготовьте пример изменения ключевой ставки.\n`;
      const [existingMaterial] = await tx.select().from(materials).where(and(eq(materials.assignmentId, assignment.id), eq(materials.title, title))).limit(1);
      if (!existingMaterial) {
        await tx.insert(materials).values({ assignmentId: assignment.id, uploadedBy: teacher.id, title, fileName: 'macro-demo.txt', mimeType: 'text/plain', size: Buffer.byteLength(content), contentBase64: Buffer.from(content).toString('base64') });
      } else if (existingMaterial.uploadedBy === teacher.id && existingMaterial.fileName === 'macro-demo.txt'
        && existingMaterial.contentBase64 === Buffer.from(previousContent).toString('base64')) {
        await tx.update(materials).set({ size: Buffer.byteLength(content), contentBase64: Buffer.from(content).toString('base64') }).where(eq(materials.id, existingMaterial.id));
      }

      const notificationTitle = `Демо: ведомость по макроэкономике (${fixture.group})`;
      const [existingNotification] = await tx.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.studentId, student.id), eq(notifications.title, notificationTitle))).limit(1);
      if (!existingNotification) await tx.insert(notifications).values({ studentId: student.id, kind: 'grade', title: notificationTitle, body: 'В демонстрационной ведомости доступен балл по макроэкономике.' });
    }
  });
  console.log('Demo users, lessons, assignments, grades, requests, inquiries, materials and notifications ready. Existing users, passwords and records preserved.');
} finally {
  await connection.close();
}
