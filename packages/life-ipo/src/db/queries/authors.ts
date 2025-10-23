import { eq } from "drizzle-orm"
import { authors, type InsertAuthor, type Author } from "../schema.js"
import { client as db } from "../db.js"
import { RecordNotFoundError, RecordNotCreatedError } from "./errors.js"

export const findAuthorById = async (id: number): Promise<Author> => {
	const author = await db.query.authors.findFirst({
		where: eq(authors.id, id),
	})

	if (!author) {
		throw new RecordNotFoundError("Author not found")
	}

	return author
}

export const findAuthorByEmail = async (email: string): Promise<Author | undefined> => {
	return db.query.authors.findFirst({
		where: eq(authors.email, email),
	})
}

export const createAuthor = async (data: InsertAuthor): Promise<Author> => {
	const records = await db.insert(authors).values(data).returning()

	const record = records[0]
	if (!record) {
		throw new RecordNotCreatedError("Author not created")
	}

	return record
}

export const getAuthors = async (): Promise<Author[]> => {
	return db.query.authors.findMany({
		orderBy: (authors, { asc }) => [asc(authors.name)],
	})
}

export const getAuthorsByRole = async (role: "sam" | "coauthor"): Promise<Author[]> => {
	return db.query.authors.findMany({
		where: eq(authors.role, role),
		orderBy: (authors, { asc }) => [asc(authors.name)],
	})
}
