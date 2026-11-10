ALTER TABLE "users" DROP CONSTRAINT "user_role_valid";--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "processed_by" uuid;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "ready_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "document_base64" text;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "user_role_valid" CHECK ("users"."role" in ('student', 'teacher', 'staff'));