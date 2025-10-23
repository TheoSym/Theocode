CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"payload_json" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "authors_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" integer NOT NULL,
	"title" text NOT NULL,
	"original_text" text NOT NULL,
	"current_text" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"iteration" integer,
	"metadata_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp,
	CONSTRAINT "emails_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"strengths_json" jsonb NOT NULL,
	"improvements_json" jsonb NOT NULL,
	"tone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_chapter_id_unique" UNIQUE("chapter_id")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"file_type" text NOT NULL,
	"file_path" text NOT NULL,
	"size_bytes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"job_type" text NOT NULL,
	"chapter_id" integer,
	"status" text NOT NULL,
	"error_message" text,
	"duration_ms" integer,
	"cost_estimate" integer,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "job_logs_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"iteration" integer NOT NULL,
	"metrics_json" jsonb NOT NULL,
	"average" integer NOT NULL,
	"rationale" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"sam_quality_complete" boolean DEFAULT false NOT NULL,
	"coauthor_reports_ready" boolean DEFAULT false NOT NULL,
	"human_approval" boolean DEFAULT false NOT NULL,
	"approved_at" timestamp,
	"approved_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_logs" ADD CONSTRAINT "job_logs_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "authors_role_idx" ON "authors" USING btree ("role");--> statement-breakpoint
CREATE INDEX "chapters_status_idx" ON "chapters" USING btree ("status");--> statement-breakpoint
CREATE INDEX "chapters_author_idx" ON "chapters" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "chapters_created_idx" ON "chapters" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "emails_status_idx" ON "emails" USING btree ("status");--> statement-breakpoint
CREATE INDEX "emails_chapter_idx" ON "emails" USING btree ("chapter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "emails_idempotency_idx" ON "emails" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "feedback_chapter_idx" ON "feedback" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "files_chapter_idx" ON "files" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "files_type_idx" ON "files" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "job_logs_job_id_idx" ON "job_logs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_logs_status_idx" ON "job_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_logs_chapter_idx" ON "job_logs" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "scores_chapter_idx" ON "scores" USING btree ("chapter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scores_chapter_iteration_idx" ON "scores" USING btree ("chapter_id","iteration");