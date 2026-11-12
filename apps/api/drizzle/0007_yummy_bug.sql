CREATE TABLE "grade_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"score" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "score_range" CHECK ("grade_entries"."score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"text" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiry_status_valid" CHECK ("inquiries"."status" in ('new', 'progress', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "inquiry_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"content_base64" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teaching_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"form" text DEFAULT 'Экзамен' NOT NULL,
	"deadline" timestamp with time zone,
	"version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "assignment_semester_positive" CHECK ("teaching_assignments"."semester" > 0),
	CONSTRAINT "assignment_form_valid" CHECK ("teaching_assignments"."form" in ('Экзамен', 'Зачёт'))
);
--> statement-breakpoint
CREATE TABLE "user_prefs" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"deadlines" boolean DEFAULT true NOT NULL,
	"schedule" boolean DEFAULT true NOT NULL,
	"news" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "teacher_id" uuid;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "cancelled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "kind" text DEFAULT 'request' NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "verified_by" uuid;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "draft_id" uuid;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "draft_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "previewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "grade_entries" ADD CONSTRAINT "grade_entries_assignment_id_teaching_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."teaching_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_entries" ADD CONSTRAINT "grade_entries_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_assignment_id_teaching_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."teaching_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_replies" ADD CONSTRAINT "inquiry_replies_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_replies" ADD CONSTRAINT "inquiry_replies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_assignment_id_teaching_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."teaching_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_assignments" ADD CONSTRAINT "teaching_assignments_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_assignments" ADD CONSTRAINT "teaching_assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_assignments" ADD CONSTRAINT "teaching_assignments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_prefs" ADD CONSTRAINT "user_prefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "grade_assignment_student" ON "grade_entries" USING btree ("assignment_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_subject_group_semester" ON "teaching_assignments" USING btree ("subject_id","group_id","semester");--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;