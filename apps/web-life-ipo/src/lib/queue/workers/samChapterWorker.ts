import { Job } from "bullmq"
import { client as db } from "@roo-code/life-ipo"
import {
	findChapterById,
	updateChapter,
	createScore,
	createJobLog,
	updateJobLog,
	createAuditLog,
	updateWorkflowFlags,
	getChaptersByAuthor,
} from "@roo-code/life-ipo"
import { humanizeChapter, addFaithMeaning, scoreChapter, improveWeakestMetric } from "../../agents"
import { getConfig } from "../../config"
import type { ProcessSamChapterData } from "../index"

const config = getConfig()

export async function processSamChapter(job: Job<ProcessSamChapterData>) {
	const { chapterId } = job.data
	const startTime = Date.now()

	// Create job log
	await createJobLog({
		jobId: job.id!,
		jobType: "process_sam_chapter",
		chapterId,
		status: "started",
		startedAt: new Date(),
	})

	try {
		console.log(`[Sam Processor] Starting chapter ${chapterId}`)

		// 1. Fetch chapter
		const chapter: any = await findChapterById(chapterId)
		if (!chapter || chapter.author?.role !== "sam") {
			throw new Error(`Chapter ${chapterId} not found or not Sam's chapter`)
		}

		// Update status
		await updateChapter(chapterId, { status: "processing" })

		// 2. Humanize
		await job.updateProgress({ step: "humanizing", iteration: 1 })
		console.log(`[Sam Processor] Humanizing chapter ${chapterId}`)
		let currentText = await humanizeChapter(chapter.originalText, { model: config.modelHumanize })

		// 3. Add Faith & Meaning
		await job.updateProgress({ step: "faith-meaning", iteration: 1 })
		console.log(`[Sam Processor] Adding faith & meaning to chapter ${chapterId}`)
		currentText = await addFaithMeaning(currentText, { model: config.modelFaith })

		// 4. Score initial version
		await job.updateProgress({ step: "scoring", iteration: 1 })
		console.log(`[Sam Processor] Scoring chapter ${chapterId} (iteration 1)`)
		let scoringResult = await scoreChapter(currentText, "sam", { model: config.modelScoring })

		// Save initial score
		await createScore({
			chapterId,
			iteration: 1,
			metricsJson: scoringResult.scores,
			average: Math.round(scoringResult.average),
			rationale: scoringResult.rationale,
		})

		// Update chapter with current text and iteration
		await updateChapter(chapterId, {
			currentText,
			status: "sam_improving",
			iteration: 1,
		})

		console.log(`[Sam Processor] Chapter ${chapterId} initial score: ${scoringResult.average}`)

		// 5. Improvement loop
		let iteration = 1
		while (scoringResult.average < config.samQualityThreshold && iteration < config.maxImprovementIterations) {
			iteration++
			console.log(`[Sam Processor] Starting improvement iteration ${iteration} for chapter ${chapterId}`)

			await job.updateProgress({ step: "improving", iteration })

			// Improve weakest metric
			currentText = await improveWeakestMetric(currentText, scoringResult, { model: config.modelImprove })

			// Re-score
			await job.updateProgress({ step: "scoring", iteration })
			scoringResult = await scoreChapter(currentText, "sam", { model: config.modelScoring })

			// Save score
			await createScore({
				chapterId,
				iteration,
				metricsJson: scoringResult.scores,
				average: Math.round(scoringResult.average),
				rationale: scoringResult.rationale,
			})

			// Update chapter
			await updateChapter(chapterId, {
				currentText,
				iteration,
			})

			console.log(`[Sam Processor] Chapter ${chapterId} iteration ${iteration} score: ${scoringResult.average}`)
		}

		// 6. Mark as ready
		await updateChapter(chapterId, { status: "ready" })

		// 7. Check if all Sam's chapters are complete
		const samAuthorId = chapter.authorId
		const allSamChapters = await getChaptersByAuthor(samAuthorId)
		const allReady = allSamChapters.every(
			(c) => c.status === "ready" || c.status === "approved" || c.status === "sent",
		)

		if (allReady) {
			console.log(`[Sam Processor] All Sam chapters complete, setting flag`)
			await updateWorkflowFlags({ samQualityComplete: true })
		}

		// 8. Audit log
		await createAuditLog({
			actorId: "system",
			action: "sam_chapter_processed",
			entityType: "chapter",
			entityId: chapterId,
			payloadJson: {
				finalScore: scoringResult.average,
				iterations: iteration,
			},
		})

		// Update job log
		const duration = Date.now() - startTime
		await updateJobLog(job.id!, {
			status: "completed",
			completedAt: new Date(),
			durationMs: duration,
		})

		console.log(`[Sam Processor] Completed chapter ${chapterId} in ${duration}ms`)

		return {
			chapterId,
			finalScore: scoringResult.average,
			iterations: iteration,
			duration,
		}
	} catch (error) {
		console.error(`[Sam Processor] Failed chapter ${chapterId}:`, error)

		// Update chapter status to failed
		await updateChapter(chapterId, { status: "failed" })

		// Update job log
		const duration = Date.now() - startTime
		await updateJobLog(job.id!, {
			status: "failed",
			errorMessage: error instanceof Error ? error.message : String(error),
			completedAt: new Date(),
			durationMs: duration,
		})

		throw error
	}
}
