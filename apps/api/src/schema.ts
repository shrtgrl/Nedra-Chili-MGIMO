import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, integer, timestamp, check, index, boolean, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

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
  teacherId: uuid('teacher_id').references(() => users.id),
  cancelled: boolean('cancelled').notNull().default(false),
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
  rejectionReason: text('rejection_reason'),
  verifiedBy: uuid('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  draftId: uuid('draft_id'),
  draftSnapshot: jsonb('draft_snapshot').$type<DocumentSnapshot>(),
  previewedAt: timestamp('previewed_at', { withTimezone: true }),
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
  kind: text('kind').notNull().default('request'),
  title: text('title').notNull(),
  body: text('body').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: createdAt(),
}, t => [index('notifications_student_idx').on(t.studentId)]);

export interface DocumentSnapshot {
  fullName: string; faculty: string; program: string; year: number; groupName: string;
  purpose: string; templateVersion: string;
}
export const userPrefs = pgTable('user_prefs', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  deadlines: boolean('deadlines').notNull().default(true),
  schedule: boolean('schedule').notNull().default(true),
  news: boolean('news').notNull().default(false),
});
export const teachingAssignments = pgTable('teaching_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  teacherId: uuid('teacher_id').notNull().references(() => users.id),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id),
  groupId: uuid('group_id').notNull().references(() => groups.id),
  semester: integer('semester').notNull(),
  form: text('form').notNull().default('Экзамен'),
  deadline: timestamp('deadline', { withTimezone: true }),
  version: integer('version').notNull().default(0),
}, t => [uniqueIndex('assignment_subject_group_semester').on(t.subjectId, t.groupId, t.semester),
  check('assignment_semester_positive', sql`${t.semester} > 0`),
  check('assignment_form_valid', sql`${t.form} in ('Экзамен', 'Зачёт')`)]);
export const academicDeadlines = pgTable('academic_deadlines', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id').notNull().references(() => teachingAssignments.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, t => [index('academic_deadlines_assignment_due_idx').on(t.assignmentId, t.dueAt)]);
export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').references(() => groups.id),
  publishedBy: uuid('published_by').notNull().references(() => users.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  createdAt: createdAt(),
}, t => [index('announcements_created_idx').on(t.createdAt)]);
export const gradeEntries = pgTable('grade_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id').notNull().references(() => teachingAssignments.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  score: integer('score'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex('grade_assignment_student').on(t.assignmentId, t.studentId), check('score_range', sql`${t.score} between 0 and 100`)]);
export const inquiries = pgTable('inquiries', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id),
  teacherId: uuid('teacher_id').notNull().references(() => users.id),
  assignmentId: uuid('assignment_id').notNull().references(() => teachingAssignments.id),
  subject: text('subject').notNull(),
  text: text('text').notNull(),
  status: text('status').notNull().default('new'),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [check('inquiry_status_valid', sql`${t.status} in ('new', 'progress', 'closed')`)]);
export const inquiryReplies = pgTable('inquiry_replies', {
  id: uuid('id').primaryKey().defaultRandom(),
  inquiryId: uuid('inquiry_id').notNull().references(() => inquiries.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id),
  text: text('text').notNull(), createdAt: createdAt(),
});
export const materials = pgTable('materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id').notNull().references(() => teachingAssignments.id),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  title: text('title').notNull(), fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(), size: integer('size').notNull(),
  contentBase64: text('content_base64').notNull(), createdAt: createdAt(),
});
