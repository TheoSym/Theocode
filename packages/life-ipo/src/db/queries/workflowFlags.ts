import { eq } from "drizzle-orm"
import { workflowFlags, type UpdateWorkflowFlags, type WorkflowFlags } from "../schema.js"
import { client as db } from "../db.js"
import { RecordNotFoundError, RecordNotUpdatedError } from "./errors.js"

const SINGLETON_ID = 1

export const getWorkflowFlags = async (): Promise<WorkflowFlags> => {
	let flags = await db.query.workflowFlags.findFirst({
		where: eq(workflowFlags.id, SINGLETON_ID),
	})

	// Initialize singleton if it doesn't exist
	if (!flags) {
		const records = await db
			.insert(workflowFlags)
			.values({
				id: SINGLETON_ID,
				samQualityComplete: false,
				coauthorReportsReady: false,
				humanApproval: false,
			})
			.returning()

		flags = records[0]
		if (!flags) {
			throw new RecordNotFoundError("Workflow flags not created")
		}
	}

	return flags
}

export const updateWorkflowFlags = async (data: UpdateWorkflowFlags): Promise<WorkflowFlags> => {
	const records = await db
		.update(workflowFlags)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(eq(workflowFlags.id, SINGLETON_ID))
		.returning()

	const record = records[0]
	if (!record) {
		throw new RecordNotUpdatedError("Workflow flags not updated")
	}

	return record
}
