import { z } from "zod"

// Scoring output schema
export const MetricScoreSchema = z.object({
	metric: z.string(),
	score: z.number().min(0).max(100),
	rationale: z.string().optional(),
})

export const ScoringOutputSchema = z.object({
	scores: z.array(MetricScoreSchema),
	average: z.number().min(0).max(100),
	rationale: z.string(),
})

export type MetricScore = z.infer<typeof MetricScoreSchema>
export type ScoringOutput = z.infer<typeof ScoringOutputSchema>

// Feedback output schema
export const ImprovementItemSchema = z.object({
	item: z.string(),
	why: z.string(),
	how: z.string(),
})

export const FeedbackOutputSchema = z.object({
	strengths: z.array(z.string()),
	improvements: z.array(ImprovementItemSchema),
	tone: z.string(),
})

export type ImprovementItem = z.infer<typeof ImprovementItemSchema>
export type FeedbackOutput = z.infer<typeof FeedbackOutputSchema>

// Agent configuration
export interface AgentConfig {
	model: string
	temperature?: number
	maxTokens?: number
	maxRetries?: number
}

// Default metrics for scoring
export const SAM_METRICS = ["Originality", "Readability", "Storytelling", "FaithResonance", "HumanTone"] as const

export const COAUTHOR_METRICS = ["Originality", "Readability", "Structure", "FaithResonance"] as const

export type SamMetric = (typeof SAM_METRICS)[number]
export type CoauthorMetric = (typeof COAUTHOR_METRICS)[number]
