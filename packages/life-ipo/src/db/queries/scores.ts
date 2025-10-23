import { eq, and, desc } from "drizzle-orm"
import { scores, type InsertScore, type Score } from "../schema.js"
import { client as db } from "../db.js"
import { RecordNotCreatedError } from "./errors.js"

export const createScore = async (data: InsertScore): Promise<Score> => {
	const records = await db.insert(scores).values(data).returning()

	const record = records[0]
	if (!record) {
		throw new RecordNotCreatedError("Score not created")
	}

	return record
}

export const getScoresByChapter = async (chapterId: number): Promise<Score[]> => {
	return db.query.scores.findMany({
		where: eq(scores.chapterId, chapterId),
		orderBy: desc(scores.iteration),
	})
}

export const getLatestScore = async (chapterId: number): Promise<Score | undefined> => {
	return db.query.scores.findFirst({
		where: eq(scores.chapterId, chapterId),
		orderBy: desc(scores.iteration),
	})
}

export const getScoreByIteration = async (chapterId: number, iteration: number): Promise<Score | undefined> => {
	return db.query.scores.findFirst({
		where: and(eq(scores.chapterId, chapterId), eq(scores.iteration, iteration)),
	})
}
