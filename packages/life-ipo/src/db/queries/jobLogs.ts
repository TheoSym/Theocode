import { eq, desc } from "drizzle-orm"
import { jobLogs, type InsertJobLog, type UpdateJobLog, type JobLog } from "../schema.js"
import { client as db } from "../db.js"
import { RecordNotFoundError, RecordNotCreatedError, RecordNotUpdatedError } from "./errors.js"

export const createJobLog = async (data: InsertJobLog): Promise<JobLog> => {
	const records = await db.insert(jobLogs).values(data).returning()

	const record = records[0]
	if (!record) {
		throw new RecordNotCreatedError("Job log not created")
	}

	return record
}

export const updateJobLog = async (jobId: string, data: UpdateJobLog): Promise<JobLog> => {
	const records = await db.update(jobLogs).set(data).where(eq(jobLogs.jobId, jobId)).returning()

	const record = records[0]
	if (!record) {
		throw new RecordNotUpdatedError("Job log not updated")
	}

	return record
}

export const findJobLogByJobId = async (jobId: string): Promise<JobLog | undefined> => {
	return db.query.jobLogs.findFirst({
		where: eq(jobLogs.jobId, jobId),
	})
}

export const getJobLogsByChapter = async (chapterId: number): Promise<JobLog[]> => {
	return db.query.jobLogs.findMany({
		where: eq(jobLogs.chapterId, chapterId),
		orderBy: desc(jobLogs.startedAt),
	})
}

export const getRecentJobLogs = async (limit = 50): Promise<JobLog[]> => {
	return db.query.jobLogs.findMany({
		orderBy: desc(jobLogs.startedAt),
		limit,
	})
}
