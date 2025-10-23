import { z } from "zod"

const configSchema = z.object({
	// Database
	databaseUrl: z.string().url(),
	productionDatabaseUrl: z.string().url().optional(),

	// Redis
	redisUrl: z.string().url().default("redis://localhost:6379"),

	// AI
	anthropicApiKey: z.string().min(1),
	openaiApiKey: z.string().optional(),

	// Email
	emailProvider: z.enum(["resend", "mock"]).default("resend"),
	resendApiKey: z.string().optional(),
	emailFrom: z.string().email().default("editor@lifeipo.com"),

	// Quality
	samQualityThreshold: z.coerce.number().min(0).max(100).default(85),
	maxImprovementIterations: z.coerce.number().min(1).max(10).default(4),

	// Models
	modelHumanize: z.string().default("claude-sonnet-4-20250514"),
	modelFaith: z.string().default("claude-sonnet-4-20250514"),
	modelScoring: z.string().default("claude-sonnet-4-20250514"),
	modelImprove: z.string().default("claude-opus-4-20250514"),
	modelFeedback: z.string().default("claude-3-5-haiku-20241022"),

	// File storage
	uploadDir: z.string().default("./uploads"),
	maxFileSizeMb: z.coerce.number().default(10),

	// Queue
	queueConcurrency: z.coerce.number().default(2),
	queueMaxRetries: z.coerce.number().default(3),

	// App
	nodeEnv: z.enum(["development", "production", "test"]).default("development"),
	appUrl: z.string().url().default("http://localhost:3001"),
})

export type Config = z.infer<typeof configSchema>

let cachedConfig: Config | null = null

export function getConfig(): Config {
	if (cachedConfig) {
		return cachedConfig
	}

	const rawConfig = {
		databaseUrl: process.env.DATABASE_URL,
		productionDatabaseUrl: process.env.PRODUCTION_DATABASE_URL,
		redisUrl: process.env.REDIS_URL,
		anthropicApiKey: process.env.ANTHROPIC_API_KEY,
		openaiApiKey: process.env.OPENAI_API_KEY,
		emailProvider: process.env.EMAIL_PROVIDER,
		resendApiKey: process.env.RESEND_API_KEY,
		emailFrom: process.env.EMAIL_FROM,
		samQualityThreshold: process.env.SAM_QUALITY_THRESHOLD,
		maxImprovementIterations: process.env.MAX_IMPROVEMENT_ITERATIONS,
		modelHumanize: process.env.MODEL_HUMANIZE,
		modelFaith: process.env.MODEL_FAITH,
		modelScoring: process.env.MODEL_SCORING,
		modelImprove: process.env.MODEL_IMPROVE,
		modelFeedback: process.env.MODEL_FEEDBACK,
		uploadDir: process.env.UPLOAD_DIR,
		maxFileSizeMb: process.env.MAX_FILE_SIZE_MB,
		queueConcurrency: process.env.QUEUE_CONCURRENCY,
		queueMaxRetries: process.env.QUEUE_MAX_RETRIES,
		nodeEnv: process.env.NODE_ENV,
		appUrl: process.env.NEXT_PUBLIC_APP_URL,
	}

	try {
		cachedConfig = configSchema.parse(rawConfig)
		return cachedConfig
	} catch (error) {
		if (error instanceof z.ZodError) {
			const missingFields = error.errors.map((e) => e.path.join(".")).join(", ")
			throw new Error(`Invalid configuration. Missing or invalid fields: ${missingFields}`)
		}
		throw error
	}
}

// Helper to get sanitized config for client-side or logging (no secrets)
export function getSanitizedConfig() {
	const config = getConfig()
	return {
		samQualityThreshold: config.samQualityThreshold,
		maxImprovementIterations: config.maxImprovementIterations,
		queueConcurrency: config.queueConcurrency,
		nodeEnv: config.nodeEnv,
		emailProvider: config.emailProvider,
		maxFileSizeMb: config.maxFileSizeMb,
	}
}
