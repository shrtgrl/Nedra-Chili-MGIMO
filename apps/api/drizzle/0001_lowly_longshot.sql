ALTER TABLE students RENAME TO users;
--> statement-breakpoint
ALTER TABLE users RENAME COLUMN login TO email;
--> statement-breakpoint
UPDATE users SET email = CASE WHEN email = 'student1' THEN 'student@mukpid.example' WHEN email = 'student2' THEN 'student2@mukpid.example' WHEN position('@' in email) > 0 THEN lower(trim(email)) ELSE id::text || '@legacy.example' END;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'student';
--> statement-breakpoint
ALTER TABLE users ADD COLUMN faculty text;
--> statement-breakpoint
UPDATE users SET faculty = groups.faculty FROM groups WHERE users.group_id = groups.id;
--> statement-breakpoint
ALTER TABLE users ALTER COLUMN faculty SET NOT NULL;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN department text;
--> statement-breakpoint
ALTER TABLE users ALTER COLUMN group_id DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE users RENAME CONSTRAINT students_login_unique TO users_email_unique;
--> statement-breakpoint
ALTER TABLE users RENAME CONSTRAINT students_group_id_groups_id_fk TO users_group_id_groups_id_fk;
--> statement-breakpoint
ALTER INDEX students_group_idx RENAME TO users_group_idx;
--> statement-breakpoint
ALTER TABLE users ADD CONSTRAINT user_role_valid CHECK (role in ('student', 'teacher'));
--> statement-breakpoint
ALTER TABLE users ADD CONSTRAINT student_requires_group CHECK (role <> 'student' or group_id is not null);
--> statement-breakpoint
ALTER TABLE users ADD CONSTRAINT email_normalized CHECK (email = lower(trim(email)));
--> statement-breakpoint
ALTER TABLE sessions RENAME COLUMN student_id TO user_id;
--> statement-breakpoint
ALTER TABLE sessions RENAME CONSTRAINT sessions_student_id_students_id_fk TO sessions_user_id_users_id_fk;
--> statement-breakpoint
ALTER INDEX sessions_student_idx RENAME TO sessions_user_idx;
--> statement-breakpoint
ALTER TABLE grades RENAME CONSTRAINT grades_student_id_students_id_fk TO grades_student_id_users_id_fk;
--> statement-breakpoint
ALTER TABLE notifications RENAME CONSTRAINT notifications_student_id_students_id_fk TO notifications_student_id_users_id_fk;
--> statement-breakpoint
ALTER TABLE requests RENAME CONSTRAINT requests_student_id_students_id_fk TO requests_student_id_users_id_fk;
