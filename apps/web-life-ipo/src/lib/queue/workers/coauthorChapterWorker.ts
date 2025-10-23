import { Job } from "bullmq"
import {
	findChapterById,
	updateChapter,
	createScore,
	createFeedback,
	createJobLog,
	updateJobLog,
	createAuditLog,
	updateWorkflowFlags,
	getAuthorsByRole,
	getChaptersByAuthor,
} from "@roo-code/life-ipo"
import { scoreChapter, generateFeedback } from "../../agents"
import { getConfig } from "../../config"
import type { ProcessCoauthorChapterData } from "../index"

const config = getConfig()

export async function processCoauthorChapter(job: Job<ProcessCoauthorChapterData>) {
	const { chapterId } = job.data
	const startTime = Date.now()

	// Create job log
	await createJobLog({
		jobId: job.id!,
		jobType: "process_coauthor_chapter",
		chapterId,
		status: "started",
		startedAt: new Date(),
	})

	try {
		console.log(`[Coauthor Processor] Starting chapter ${chapterId}`)

		// 1. Fetch chapter
		const chapter: any = await findChapterById(chapterId)
		if (!chapter || chapter.author?.role !== "coauthor") {
			throw new Error(`Chapter ${chapterId} not found or not a co-author chapter`)
		}

		// Update status
		await updateChapter(chapterId, { status: "processing" })

		// 2. Score the chapter
		await job.updateProgress({ step: "scoring" })
		console.log(`[Coauthor Processor] Scoring chapter ${chapterId}`)
		const scoringResult = await scoreChapter(chapter.originalText, "coauthor", { model: config.modelScoring })

		// Save score
		await createScore({
			chapterId,
			iteration: 1,
			metricsJson: scoringResult.scores,
			average: Math.round(scoringResult.average),
			rationale: scoringResult.rationale,
		})

		console.log(`[Coauthor Processor] Chapter ${chapterId} score: ${scoringResult.average}`)

		// 3. Generate feedback
		await job.updateProgress({ step: "generating-feedback" })
		console.log(`[Coauthor Processor] Generating feedback for chapter ${chapterId}`)
		const feedbackResult = await generateFeedback(chapter.originalText, scoringResult, {
			model: config.modelFeedback,
		})

		// Save feedback
		await createFeedback({
			chapterId,
			strengthsJson: feedbackResult.strengths,
			improvementsJson: feedbackResult.improvements,
			tone: feedbackResult.tone,
		})

		console.log(`[Coauthor Processor] Feedback generated for chapter ${chapterId}`)

		// 4. Mark as ready
		await updateChapter(chapterId, { status: "ready", currentText: chapter.originalText })

		// 5. Check if all co-author chapters are complete
		const coauthors = await getAuthorsByRole("coauthor")
		let allCoauthorChaptersReady = true

		for (const author of coauthors) {
			const chapters = await getChaptersByAuthor(author.id)
			const hasIncomplete = chapters.some(
				(c) => c.status !== "ready" && c.status !== "approved" && c.status !== "sent",
			)
			if (hasIncomplete) {
				allCoauthorChaptersReady = false
				break
			}
		}

		if (allCoauthorChaptersReady && coauthors.length > 0) {
			console.log(`[Coauthor Processor] All co-author chapters complete, setting flag`)
			await updateWorkflowFlags({ coauthorReportsReady: true })
		}

		// 6. Audit log
		await createAuditLog({
			actorId: "system",
			action: "coauthor_chapter_processed",
			entityType: "chapter",
			entityId: chapterId,
			payloadJson: {
				score: scoringResult.average,
				strengthsCount: feedbackResult.strengths.length,
				improvementsCount: feedbackResult.improvements.length,
			},
		})

		// Update job log
		const duration = Date.now() - startTime
		await updateJobLog(job.id!, {
			status: "completed",
			completedAt: new Date(),
			durationMs: duration,
		})

		console.log(`[Coauthor Processor] Completed chapter ${chapterId} in ${duration}ms`)

		return {
			chapterId,
			score: scoringResult.average,
			duration,
		}
	} catch (error) {
		console.error(`[Coauthor Processor] Failed chapter ${chapterId}:`, error)

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
