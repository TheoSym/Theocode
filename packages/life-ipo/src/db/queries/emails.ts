import { eq, desc } from "drizzle-orm"
import { emails, type InsertEmail, type UpdateEmail, type Email } from "../schema.js"
import { client as db } from "../db.js"
import { RecordNotFoundError, RecordNotCreatedError, RecordNotUpdatedError } from "./errors.js"
import { createHash } from "crypto"

export const generateEmailIdempotencyKey = (chapterId: number, toEmail: string, contentHash: string): string => {
	return createHash("sha256").update(`${chapterId}-${toEmail}-${contentHash}`).digest("hex")
}

export const createEmail = async (data: InsertEmail): Promise<Email> => {
	const records = await db.insert(emails).values(data).returning()

	const record = records[0]
	if (!record) {
		throw new RecordNotCreatedError("Email not created")
	}

	return record
}

export const updateEmail = async (id: number, data: UpdateEmail): Promise<Email> => {
	const records = await db.update(emails).set(data).where(eq(emails.id, id)).returning()

	const record = records[0]
	if (!record) {
		throw new RecordNotUpdatedError("Email not updated")
	}

	return record
}

export const findEmailByIdempotencyKey = async (key: string): Promise<Email | undefined> => {
	return db.query.emails.findFirst({
		where: eq(emails.idempotencyKey, key),
	})
}

export const getPendingEmails = async (): Promise<Email[]> => {
	return db.query.emails.findMany({
		where: eq(emails.status, "pending"),
		orderBy: desc(emails.createdAt),
	})
}

export const getEmailsByChapter = async (chapterId: number): Promise<Email[]> => {
	return db.query.emails.findMany({
		where: eq(emails.chapterId, chapterId),
		orderBy: desc(emails.createdAt),
	})
}
