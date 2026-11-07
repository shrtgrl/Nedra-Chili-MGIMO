import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, integer, timestamp, check, index } from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  faculty: text('faculty').notNull(),
  program: text('program').notNull(),
  year: integer('year').notNull(),
}, t => [check('group_year_positive', sql`${t.year} > 0`)]);

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  login: text('login').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  groupId: uuid('group_id').notNull().references(() => groups.id),
  createdAt: createdAt(),
}, t => [index('students_group_idx').on(t.groupId)]);

export const sessions = pgTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, t => [index('sessions_student_idx').on(t.studentId), index('sessions_expiry_idx').on(t.expiresAt)]);

export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
});

export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id),
  teacherName: text('teacher_name').notNull(),
  room: text('room').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  changeNote: text('change_note'),
}, t => [check('lesson_time_order', sql`${t.endsAt} > ${t.startsAt}`), index('lessons_group_time_idx').on(t.groupId, t.startsAt)]);

export const grades = pgTable('grades', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id),
  assessment: text('assessment').notNull(),
  result: text('result').notNull(),
  semester: integer('semester').notNull(),
}, t => [check('grade_semester_positive', sql`${t.semester} > 0`), index('grades_student_idx').on(t.studentId)]);

export const requests = pgTable('requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  type: text('type').notNull(),
  comment: text('comment').notNull().default(''),
  status: text('status').notNull().default('submitted'),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [check('request_status_valid', sql`${t.status} in ('submitted', 'in_progress', 'ready', 'rejected')`), index('requests_student_idx').on(t.studentId)]);

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: createdAt(),
}, t => [index('notifications_student_idx').on(t.studentId)]);
