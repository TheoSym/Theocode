import { eq, and } from "drizzle-orm"
import { files, type InsertFile, type File } from "../schema.js"
import { client as db } from "../db.js"
import { RecordNotCreatedError } from "./errors.js"

export const createFile = async (data: InsertFile): Promise<File> => {
	const records = await db.insert(files).values(data).returning()

	const record = records[0]
	if (!record) {
		throw new RecordNotCreatedError("File not created")
	}

	return record
}

export const getFilesByChapter = async (chapterId: number): Promise<File[]> => {
	return db.query.files.findMany({
		where: eq(files.chapterId, chapterId),
		orderBy: (files, { desc }) => [desc(files.createdAt)],
	})
}

export const getFileByType = async (
	chapterId: number,
	fileType: "original" | "processed" | "docx_master",
): Promise<File | undefined> => {
	return db.query.files.findFirst({
		where: and(eq(files.chapterId, chapterId), eq(files.fileType, fileType)),
		orderBy: (files, { desc }) => [desc(files.createdAt)],
	})
}
