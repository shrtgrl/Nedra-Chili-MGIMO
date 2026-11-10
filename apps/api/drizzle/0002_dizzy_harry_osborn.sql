ALTER TABLE "requests" DROP CONSTRAINT "request_status_valid";--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "purpose" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "delivery" text DEFAULT 'office' NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "request_status_valid" CHECK ("requests"."status" in ('submitted', 'in_progress', 'ready', 'rejected', 'issued', 'cancelled'));