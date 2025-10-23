import { Worker } from "bullmq"
import { Redis } from "ioredis"
import { getConfig } from "../../config"
import { processSamChapter } from "./samChapterWorker"
import { processCoauthorChapter } from "./coauthorChapterWorker"
import type { ProcessSamChapterData, ProcessCoauthorChapterData } from "../index"

const config = getConfig()

const connection = new Redis(config.redisUrl, {
	maxRetriesPerRequest: null,
})

// Sam Chapter Worker
const samWorker = new Worker<ProcessSamChapterData>(
	"sam-chapters",
	async (job) => {
		return processSamChapter(job)
	},
	{
		connection,
		concurrency: config.queueConcurrency,
	},
)

// Coauthor Chapter Worker
const coauthorWorker = new Worker<ProcessCoauthorChapterData>(
	"coauthor-chapters",
	async (job) => {
		return processCoauthorChapter(job)
	},
	{
		connection,
		concurrency: config.queueConcurrency,
	},
)

// Event handlers
samWorker.on("completed", (job) => {
	console.log(`[Worker] Sam chapter job ${job.id} completed`)
})

samWorker.on("failed", (job, err) => {
	console.error(`[Worker] Sam chapter job ${job?.id} failed:`, err)
})

coauthorWorker.on("completed", (job) => {
	console.log(`[Worker] Coauthor chapter job ${job.id} completed`)
})

coauthorWorker.on("failed", (job, err) => {
	console.error(`[Worker] Coauthor chapter job ${job?.id} failed:`, err)
})

// Graceful shutdown
process.on("SIGTERM", async () => {
	console.log("Shutting down workers...")
	await samWorker.close()
	await coauthorWorker.close()
	await connection.quit()
	process.exit(0)
})

console.log("Workers started. Listening for jobs...")
console.log(`- Sam chapters: concurrency ${config.queueConcurrency}`)
console.log(`- Coauthor chapters: concurrency ${config.queueConcurrency}`)

export { samWorker, coauthorWorker }
