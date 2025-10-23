import { eq, desc, and, inArray } from "drizzle-orm"
import { chapters, type InsertChapter, type UpdateChapter, type Chapter } from "../schema.js"
import { client as db } from "../db.js"
import { RecordNotFoundError, RecordNotCreatedError, RecordNotUpdatedError } from "./errors.js"

export const findChapterById = async (id: number): Promise<Chapter> => {
	const chapter = await db.query.chapters.findFirst({
		where: eq(chapters.id, id),
		with: {
			author: true,
			scores: {
				orderBy: (scores, { desc }) => [desc(scores.iteration)],
			},
			feedback: true,
			files: true,
		},
	})

	if (!chapter) {
		throw new RecordNotFoundError("Chapter not found")
	}

	return chapter
}

export const createChapter = async (data: InsertChapter): Promise<Chapter> => {
	const records = await db
		.insert(chapters)
		.values({
			...data,
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		.returning()

	const record = records[0]
	if (!record) {
		throw new RecordNotCreatedError("Chapter not created")
	}

	return record
}

export const updateChapter = async (id: number, data: UpdateChapter): Promise<Chapter> => {
	const records = await db
		.update(chapters)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(eq(chapters.id, id))
		.returning()

	const record = records[0]
	if (!record) {
		throw new RecordNotUpdatedError("Chapter not updated")
	}

	return record
}

export const getChapters = async (): Promise<Chapter[]> => {
	return db.query.chapters.findMany({
		orderBy: desc(chapters.createdAt),
		with: {
			author: true,
			scores: {
				orderBy: (scores, { desc }) => [desc(scores.iteration)],
				limit: 1, // Latest score only
			},
		},
	})
}

export const getChaptersByStatus = async (status: Chapter["status"] | Chapter["status"][]): Promise<Chapter[]> => {
	const statusArray = Array.isArray(status) ? status : [status]

	return db.query.chapters.findMany({
		where: inArray(chapters.status, statusArray),
		orderBy: desc(chapters.createdAt),
		with: {
			author: true,
			scores: {
				orderBy: (scores, { desc }) => [desc(scores.iteration)],
				limit: 1,
			},
		},
	})
}

export const getChaptersByAuthor = async (authorId: number): Promise<Chapter[]> => {
	return db.query.chapters.findMany({
		where: eq(chapters.authorId, authorId),
		orderBy: desc(chapters.createdAt),
		with: {
			scores: {
				orderBy: (scores, { desc }) => [desc(scores.iteration)],
			},
			feedback: true,
		},
	})
}

export const getSamChapters = async (): Promise<Chapter[]> => {
	return db.query.chapters.findMany({
		where: eq(chapters.status, "sam_improving"),
		with: {
			author: true,
			scores: {
				orderBy: (scores, { desc }) => [desc(scores.iteration)],
			},
		},
	})
}

export const getChaptersReadyForApproval = async (): Promise<Chapter[]> => {
	return db.query.chapters.findMany({
		where: eq(chapters.status, "ready"),
		orderBy: desc(chapters.createdAt),
		with: {
			author: true,
			scores: {
				orderBy: (scores, { desc }) => [desc(scores.iteration)],
				limit: 1,
			},
			feedback: true,
		},
	})
}
