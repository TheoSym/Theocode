import { eq } from "drizzle-orm"
import { feedback, type InsertFeedback, type Feedback } from "../schema.js"
import { client as db } from "../db.js"
import { RecordNotCreatedError } from "./errors.js"

export const createFeedback = async (data: InsertFeedback): Promise<Feedback> => {
	const records = await db.insert(feedback).values(data).returning()

	const record = records[0]
	if (!record) {
		throw new RecordNotCreatedError("Feedback not created")
	}

	return record
}

export const getFeedbackByChapter = async (chapterId: number): Promise<Feedback | undefined> => {
	return db.query.feedback.findFirst({
		where: eq(feedback.chapterId, chapterId),
	})
}
