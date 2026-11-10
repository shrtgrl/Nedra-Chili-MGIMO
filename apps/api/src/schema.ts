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

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('student'),
  faculty: text('faculty').notNull(),
  department: text('department'),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  groupId: uuid('group_id').references(() => groups.id),
  createdAt: createdAt(),
}, t => [index('users_group_idx').on(t.groupId), check('user_role_valid', sql`${t.role} in ('student', 'teacher', 'staff')`), check('student_requires_group', sql`${t.role} <> 'student' or ${t.groupId} is not null`), check('email_normalized', sql`${t.email} = lower(trim(${t.email}))`)]);

export const sessions = pgTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, t => [index('sessions_user_idx').on(t.userId), index('sessions_expiry_idx').on(t.expiresAt)]);

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
  kind: text('kind').notNull().default('lecture'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  changeNote: text('change_note'),
}, t => [check('lesson_time_order', sql`${t.endsAt} > ${t.startsAt}`), check('lesson_kind_valid', sql`${t.kind} in ('lecture', 'seminar', 'practice')`), index('lessons_group_time_idx').on(t.groupId, t.startsAt)]);

export const grades = pgTable('grades', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id),
  assessment: text('assessment').notNull(),
  result: text('result').notNull(),
  semester: integer('semester').notNull(),
}, t => [check('grade_semester_positive', sql`${t.semester} > 0`), index('grades_student_idx').on(t.studentId)]);

export const requests = pgTable('requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  processedBy: uuid('processed_by').references(() => users.id),
  readyAt: timestamp('ready_at', { withTimezone: true }),
  documentBase64: text('document_base64'),
  purpose: text('purpose').notNull().default(''),
  delivery: text('delivery').notNull().default('office'),
  comment: text('comment').notNull().default(''),
  status: text('status').notNull().default('submitted'),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [check('request_status_valid', sql`${t.status} in ('submitted', 'in_progress', 'ready', 'rejected', 'issued', 'cancelled')`), index('requests_student_idx').on(t.studentId)]);

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: createdAt(),
}, t => [index('notifications_student_idx').on(t.studentId)]);
