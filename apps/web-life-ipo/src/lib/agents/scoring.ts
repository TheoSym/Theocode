import { getAnthropicClient, AI_MODELS } from "../ai-client"
import { ScoringOutputSchema, type ScoringOutput, type AgentConfig, SAM_METRICS, COAUTHOR_METRICS } from "./types"

const DEFAULT_CONFIG: AgentConfig = {
	model: AI_MODELS.CLAUDE_SONNET,
	temperature: 0.3,
	maxTokens: 4000,
	maxRetries: 3,
}

function buildScoringPrompt(text: string, metrics: readonly string[], role: "sam" | "coauthor"): string {
	const metricDescriptions = {
		Originality: "Unique perspective, fresh insights, avoiding clichés and generic statements",
		Readability: "Clear prose, appropriate pacing, easy to follow and understand",
		Storytelling: "Narrative flow, engaging structure, compelling arc (for Sam)",
		Structure: "Logical organization, clear progression, coherent sections (for co-authors)",
		FaithResonance: "Authentic connection to meaning, universal themes, thoughtful reflection",
		HumanTone: "Authentic voice, natural language, avoids AI-generated feel (for Sam)",
	}

	const metricsList = metrics
		.map((m) => `- ${m}: ${metricDescriptions[m as keyof typeof metricDescriptions]}`)
		.join("\n")

	return `You are an expert editor evaluating a chapter submission for the Life IPO Anthology.

Chapter to evaluate:
"""
${text}
"""

Evaluate the chapter on the following metrics (score 0-100):
${metricsList}

For each metric:
1. Assess the quality objectively
2. Score from 0 (poor) to 100 (exceptional)
3. Be honest - scores in the 60-80 range are common for drafts
4. Provide a brief rationale for your overall assessment

You must respond with ONLY valid JSON matching this exact structure:
{
  "scores": [
    {"metric": "MetricName", "score": 75, "rationale": "Brief explanation"},
    ...
  ],
  "average": 72,
  "rationale": "Overall assessment summary"
}`
}

export async function scoreChapter(
	text: string,
	role: "sam" | "coauthor",
	config: Partial<AgentConfig> = {},
): Promise<ScoringOutput> {
	const finalConfig = { ...DEFAULT_CONFIG, ...config }
	const client = getAnthropicClient()
	const metrics = role === "sam" ? SAM_METRICS : COAUTHOR_METRICS

	let lastError: Error | null = null

	for (let attempt = 0; attempt < finalConfig.maxRetries!; attempt++) {
		try {
			const message = await client.messages.create({
				model: finalConfig.model,
				max_tokens: finalConfig.maxTokens!,
				temperature: finalConfig.temperature,
				messages: [
					{
						role: "user",
						content: buildScoringPrompt(text, metrics, role),
					},
				],
				tools: [
					{
						name: "submit_scores",
						description: "Submit the scoring evaluation for the chapter",
						input_schema: {
							type: "object",
							properties: {
								scores: {
									type: "array",
									items: {
										type: "object",
										properties: {
											metric: { type: "string" },
											score: { type: "number", minimum: 0, maximum: 100 },
											rationale: { type: "string" },
										},
										required: ["metric", "score"],
									},
								},
								average: { type: "number", minimum: 0, maximum: 100 },
								rationale: { type: "string" },
							},
							required: ["scores", "average", "rationale"],
						},
					},
				],
				tool_choice: { type: "tool", name: "submit_scores" },
			})

			// Extract tool use result
			const toolUse = message.content.find((block) => block.type === "tool_use")
			if (!toolUse || toolUse.type !== "tool_use") {
				throw new Error("No tool use found in response")
			}

			// Validate with Zod
			const result = ScoringOutputSchema.parse(toolUse.input)
			return result
		} catch (error) {
			lastError = error as Error
			console.error(`Scoring agent attempt ${attempt + 1} failed:`, error)

			if (attempt < finalConfig.maxRetries! - 1) {
				await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
			}
		}
	}

	throw new Error(`Scoring agent failed after ${finalConfig.maxRetries} attempts: ${lastError?.message}`)
}
