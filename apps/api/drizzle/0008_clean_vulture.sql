CREATE TABLE "academic_deadlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"title" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academic_deadlines" ADD CONSTRAINT "academic_deadlines_assignment_id_teaching_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."teaching_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "academic_deadlines_assignment_due_idx" ON "academic_deadlines" USING btree ("assignment_id","due_at");