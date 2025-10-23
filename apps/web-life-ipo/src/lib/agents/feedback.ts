import { getAnthropicClient, AI_MODELS } from "../ai-client"
import { FeedbackOutputSchema, type FeedbackOutput, type ScoringOutput, type AgentConfig } from "./types"

const DEFAULT_CONFIG: AgentConfig = {
	model: AI_MODELS.CLAUDE_HAIKU, // Faster, cheaper model for feedback
	temperature: 0.6,
	maxTokens: 3000,
	maxRetries: 3,
}

function buildFeedbackPrompt(text: string, scoringResult: ScoringOutput): string {
	const scoresText = scoringResult.scores.map((s) => `- ${s.metric}: ${s.score}/100`).join("\n")

	return `You are a supportive editor providing constructive feedback to a co-author for the Life IPO Anthology.

Chapter text:
"""
${text}
"""

Quality scores:
${scoresText}

Overall score: ${scoringResult.average}/100

Generate encouraging, actionable feedback with:

1. **Strengths** (2-3 specific things done well)
2. **Improvements** (2-3 prioritized, actionable suggestions)

For each improvement:
- "item": What needs improvement (specific, brief)
- "why": Why this matters (impact on reader/story)
- "how": Concrete steps to improve it

Tone: Encouraging, constructive, specific. Celebrate strengths genuinely while providing clear paths for improvement.

Respond with ONLY valid JSON matching this structure:
{
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "improvements": [
    {
      "item": "Improve narrative pacing in middle section",
      "why": "Helps maintain reader engagement",
      "how": "Add more scene breaks and vary sentence length to create rhythm"
    },
    ...
  ],
  "tone": "encouraging, concise"
}`
}

export async function generateFeedback(
	text: string,
	scoringResult: ScoringOutput,
	config: Partial<AgentConfig> = {},
): Promise<FeedbackOutput> {
	const finalConfig = { ...DEFAULT_CONFIG, ...config }
	const client = getAnthropicClient()

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
						content: buildFeedbackPrompt(text, scoringResult),
					},
				],
				tools: [
					{
						name: "submit_feedback",
						description: "Submit editorial feedback for the co-author",
						input_schema: {
							type: "object",
							properties: {
								strengths: {
									type: "array",
									items: { type: "string" },
									minItems: 2,
									maxItems: 4,
								},
								improvements: {
									type: "array",
									items: {
										type: "object",
										properties: {
											item: { type: "string" },
											why: { type: "string" },
											how: { type: "string" },
										},
										required: ["item", "why", "how"],
									},
									minItems: 2,
									maxItems: 3,
								},
								tone: { type: "string" },
							},
							required: ["strengths", "improvements", "tone"],
						},
					},
				],
				tool_choice: { type: "tool", name: "submit_feedback" },
			})

			const toolUse = message.content.find((block) => block.type === "tool_use")
			if (!toolUse || toolUse.type !== "tool_use") {
				throw new Error("No tool use found in response")
			}

			const result = FeedbackOutputSchema.parse(toolUse.input)
			return result
		} catch (error) {
			lastError = error as Error
			console.error(`Feedback agent attempt ${attempt + 1} failed:`, error)

			if (attempt < finalConfig.maxRetries! - 1) {
				await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
			}
		}
	}

	throw new Error(`Feedback agent failed after ${finalConfig.maxRetries} attempts: ${lastError?.message}`)
}
