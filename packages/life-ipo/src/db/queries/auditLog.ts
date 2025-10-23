import { eq, and, desc } from "drizzle-orm"
import { auditLog, type InsertAuditLog, type AuditLog } from "../schema.js"
import { client as db } from "../db.js"
import { RecordNotCreatedError } from "./errors.js"

export const createAuditLog = async (data: InsertAuditLog): Promise<AuditLog> => {
	const records = await db.insert(auditLog).values(data).returning()

	const record = records[0]
	if (!record) {
		throw new RecordNotCreatedError("Audit log not created")
	}

	return record
}

export const getAuditLogs = async (limit = 100): Promise<AuditLog[]> => {
	return db.query.auditLog.findMany({
		orderBy: desc(auditLog.createdAt),
		limit,
	})
}

export const getAuditLogsByEntity = async (entityType: string, entityId: number): Promise<AuditLog[]> => {
	return db.query.auditLog.findMany({
		where: and(eq(auditLog.entityType, entityType), eq(auditLog.entityId, entityId)),
		orderBy: desc(auditLog.createdAt),
	})
}
