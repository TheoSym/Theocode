import { pgTable, text, timestamp, integer, boolean, jsonb, serial, index, uniqueIndex } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

/**
 * Authors - Sam and co-authors
 */
export const authors = pgTable(
	"authors",
	{
		id: serial("id").primaryKey(),
		name: text("name").notNull(),
		email: text("email").notNull().unique(),
		role: text("role", { enum: ["sam", "coauthor"] }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("authors_role_idx").on(table.role)],
)

export const authorsRelations = relations(authors, ({ many }) => ({
	chapters: many(chapters),
}))

export type Author = typeof authors.$inferSelect
export type InsertAuthor = typeof authors.$inferInsert

/**
 * Chapters - uploaded content with state tracking
 */
export const chapters = pgTable(
	"chapters",
	{
		id: serial("id").primaryKey(),
		authorId: integer("author_id")
			.references(() => authors.id, { onDelete: "cascade" })
			.notNull(),
		title: text("title").notNull(),
		originalText: text("original_text").notNull(),
		currentText: text("current_text").notNull(),
		status: text("status", {
			enum: ["pending", "processing", "sam_improving", "ready", "approved", "sent", "failed"],
		})
			.notNull()
			.default("pending"),
		iteration: integer("iteration"),
		metadataJson: jsonb("metadata_json").$type<{
			filename?: string
			uploadSource?: string
			fileType?: string
			wordCount?: number
		}>(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("chapters_status_idx").on(table.status),
		index("chapters_author_idx").on(table.authorId),
		index("chapters_created_idx").on(table.createdAt),
	],
)

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
	author: one(authors, { fields: [chapters.authorId], references: [authors.id] }),
	scores: many(scores),
	feedback: many(feedback),
	emails: many(emails),
	files: many(files),
}))

export type Chapter = typeof chapters.$inferSelect
export type InsertChapter = typeof chapters.$inferInsert
export type UpdateChapter = Partial<Omit<Chapter, "id" | "createdAt">>

/**
 * Scores - AI quality assessment results
 */
export const scores = pgTable(
	"scores",
	{
		id: serial("id").primaryKey(),
		chapterId: integer("chapter_id")
			.references(() => chapters.id, { onDelete: "cascade" })
			.notNull(),
		iteration: integer("iteration").notNull(),
		metricsJson: jsonb("metrics_json").notNull().$type<
			Array<{
				metric: string
				score: number
				rationale?: string
			}>
		>(),
		average: integer("average").notNull(),
		rationale: text("rationale"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("scores_chapter_idx").on(table.chapterId),
		uniqueIndex("scores_chapter_iteration_idx").on(table.chapterId, table.iteration),
	],
)

export const scoresRelations = relations(scores, ({ one }) => ({
	chapter: one(chapters, { fields: [scores.chapterId], references: [chapters.id] }),
}))

export type Score = typeof scores.$inferSelect
export type InsertScore = typeof scores.$inferInsert

/**
 * Feedback - editorial feedback for co-authors
 */
export const feedback = pgTable(
	"feedback",
	{
		id: serial("id").primaryKey(),
		chapterId: integer("chapter_id")
			.references(() => chapters.id, { onDelete: "cascade" })
			.notNull()
			.unique(),
		strengthsJson: jsonb("strengths_json").notNull().$type<string[]>(),
		improvementsJson: jsonb("improvements_json").notNull().$type<
			Array<{
				item: string
				why: string
				how: string
			}>
		>(),
		tone: text("tone"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("feedback_chapter_idx").on(table.chapterId)],
)

export const feedbackRelations = relations(feedback, ({ one }) => ({
	chapter: one(chapters, { fields: [feedback.chapterId], references: [chapters.id] }),
}))

export type Feedback = typeof feedback.$inferSelect
export type InsertFeedback = typeof feedback.$inferInsert

/**
 * Workflow Flags - global state control (singleton table)
 */
export const workflowFlags = pgTable("workflow_flags", {
	id: serial("id").primaryKey(),
	samQualityComplete: boolean("sam_quality_complete").notNull().default(false),
	coauthorReportsReady: boolean("coauthor_reports_ready").notNull().default(false),
	humanApproval: boolean("human_approval").notNull().default(false),
	approvedAt: timestamp("approved_at"),
	approvedBy: text("approved_by"),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type WorkflowFlags = typeof workflowFlags.$inferSelect
export type UpdateWorkflowFlags = Partial<Omit<WorkflowFlags, "id">>

/**
 * Emails - outbound feedback emails with retry tracking
 */
export const emails = pgTable(
	"emails",
	{
		id: serial("id").primaryKey(),
		chapterId: integer("chapter_id")
			.references(() => chapters.id, { onDelete: "cascade" })
			.notNull(),
		toEmail: text("to_email").notNull(),
		subject: text("subject").notNull(),
		bodyHtml: text("body_html").notNull(),
		status: text("status", { enum: ["pending", "sending", "sent", "failed"] })
			.notNull()
			.default("pending"),
		attempts: integer("attempts").notNull().default(0),
		lastError: text("last_error"),
		idempotencyKey: text("idempotency_key").notNull().unique(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		sentAt: timestamp("sent_at"),
	},
	(table) => [
		index("emails_status_idx").on(table.status),
		index("emails_chapter_idx").on(table.chapterId),
		uniqueIndex("emails_idempotency_idx").on(table.idempotencyKey),
	],
)

export const emailsRelations = relations(emails, ({ one }) => ({
	chapter: one(chapters, { fields: [emails.chapterId], references: [chapters.id] }),
}))

export type Email = typeof emails.$inferSelect
export type InsertEmail = typeof emails.$inferInsert
export type UpdateEmail = Partial<Omit<Email, "id" | "createdAt">>

/**
 * Files - uploaded and generated documents
 */
export const files = pgTable(
	"files",
	{
		id: serial("id").primaryKey(),
		chapterId: integer("chapter_id")
			.references(() => chapters.id, { onDelete: "cascade" })
			.notNull(),
		fileType: text("file_type", { enum: ["original", "processed", "docx_master"] }).notNull(),
		filePath: text("file_path").notNull(),
		sizeBytes: integer("size_bytes"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("files_chapter_idx").on(table.chapterId), index("files_type_idx").on(table.fileType)],
)

export const filesRelations = relations(files, ({ one }) => ({
	chapter: one(chapters, { fields: [files.chapterId], references: [chapters.id] }),
}))

export type File = typeof files.$inferSelect
export type InsertFile = typeof files.$inferInsert

/**
 * Audit Log - immutable record of all mutations
 */
export const auditLog = pgTable(
	"audit_log",
	{
		id: serial("id").primaryKey(),
		actorId: text("actor_id"),
		action: text("action").notNull(),
		entityType: text("entity_type").notNull(),
		entityId: integer("entity_id").notNull(),
		payloadJson: jsonb("payload_json"),
		ipAddress: text("ip_address"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("audit_entity_idx").on(table.entityType, table.entityId),
		index("audit_created_idx").on(table.createdAt),
	],
)

export type AuditLog = typeof auditLog.$inferSelect
export type InsertAuditLog = typeof auditLog.$inferInsert

/**
 * Job Logs - background job execution tracking
 */
export const jobLogs = pgTable(
	"job_logs",
	{
		id: serial("id").primaryKey(),
		jobId: text("job_id").notNull().unique(),
		jobType: text("job_type", {
			enum: ["process_sam_chapter", "process_coauthor_chapter", "send_feedback_email", "compile_docx"],
		}).notNull(),
		chapterId: integer("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
		status: text("status", { enum: ["started", "completed", "failed"] }).notNull(),
		errorMessage: text("error_message"),
		durationMs: integer("duration_ms"),
		costEstimate: integer("cost_estimate"),
		startedAt: timestamp("started_at").notNull(),
		completedAt: timestamp("completed_at"),
	},
	(table) => [
		index("job_logs_job_id_idx").on(table.jobId),
		index("job_logs_status_idx").on(table.status),
		index("job_logs_chapter_idx").on(table.chapterId),
	],
)

export const jobLogsRelations = relations(jobLogs, ({ one }) => ({
	chapter: one(chapters, { fields: [jobLogs.chapterId], references: [chapters.id] }),
}))

export type JobLog = typeof jobLogs.$inferSelect
export type InsertJobLog = typeof jobLogs.$inferInsert
export type UpdateJobLog = Partial<Omit<JobLog, "id" | "jobId" | "startedAt">>
