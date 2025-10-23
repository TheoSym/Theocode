import { Queue, Worker, Job } from "bullmq"
import { Redis } from "ioredis"
import { getConfig } from "../config"

const config = getConfig()

// Create Redis connection
const connection = new Redis(config.redisUrl, {
	maxRetriesPerRequest: null,
})

// Job types
export type JobType = "process_sam_chapter" | "process_coauthor_chapter" | "send_feedback_email" | "compile_docx"

export interface ProcessSamChapterData {
	chapterId: number
}

export interface ProcessCoauthorChapterData {
	chapterId: number
}

export interface SendFeedbackEmailData {
	chapterId: number
}

export interface CompileDocxData {
	chapterIds: number[]
}

export type JobData = ProcessSamChapterData | ProcessCoauthorChapterData | SendFeedbackEmailData | CompileDocxData

// Queues
export const samChapterQueue = new Queue<ProcessSamChapterData>("sam-chapters", {
	connection,
	defaultJobOptions: {
		attempts: config.queueMaxRetries,
		backoff: {
			type: "exponential",
			delay: 2000,
		},
		removeOnComplete: {
			count: 100, // Keep last 100 completed jobs
		},
		removeOnFail: {
			count: 500, // Keep last 500 failed jobs
		},
	},
})

export const coauthorChapterQueue = new Queue<ProcessCoauthorChapterData>("coauthor-chapters", {
	connection,
	defaultJobOptions: {
		attempts: config.queueMaxRetries,
		backoff: {
			type: "exponential",
			delay: 2000,
		},
		removeOnComplete: {
			count: 100,
		},
		removeOnFail: {
			count: 500,
		},
	},
})

export const emailQueue = new Queue<SendFeedbackEmailData>("emails", {
	connection,
	defaultJobOptions: {
		attempts: 5, // More retries for emails due to potential throttling
		backoff: {
			type: "exponential",
			delay: 5000,
		},
		removeOnComplete: {
			count: 200,
		},
		removeOnFail: {
			count: 500,
		},
	},
})

export const docxQueue = new Queue<CompileDocxData>("docx-compilation", {
	connection,
	defaultJobOptions: {
		attempts: 3,
		backoff: {
			type: "exponential",
			delay: 3000,
		},
		removeOnComplete: {
			count: 50,
		},
		removeOnFail: {
			count: 100,
		},
	},
})

// Helper to add jobs
export async function addSamChapterJob(chapterId: number) {
	return samChapterQueue.add("process-sam", { chapterId }, { jobId: `sam-${chapterId}` })
}

export async function addCoauthorChapterJob(chapterId: number) {
	return coauthorChapterQueue.add("process-coauthor", { chapterId }, { jobId: `coauthor-${chapterId}` })
}

export async function addEmailJob(chapterId: number) {
	return emailQueue.add("send-feedback", { chapterId }, { jobId: `email-${chapterId}-${Date.now()}` })
}

export async function addDocxCompilationJob(chapterIds: number[]) {
	return docxQueue.add("compile", { chapterIds }, { jobId: `docx-${Date.now()}` })
}

// Graceful shutdown
export async function closeQueues() {
	await Promise.all([samChapterQueue.close(), coauthorChapterQueue.close(), emailQueue.close(), docxQueue.close()])
	await connection.quit()
}
