import { getAnthropicClient, AI_MODELS } from "../ai-client"
import type { AgentConfig, ScoringOutput } from "./types"

const DEFAULT_CONFIG: AgentConfig = {
	model: AI_MODELS.CLAUDE_OPUS, // Use stronger model for improvements
	temperature: 0.7,
	maxTokens: 16000,
	maxRetries: 3,
}

function buildImprovementPrompt(text: string, weakestMetric: string, currentScore: number): string {
	const improvementGuidance: Record<string, string> = {
		Originality: `Focus on adding unique perspectives, fresh insights, and avoiding clichés. Replace generic statements with specific, personal observations.`,
		Readability: `Improve clarity and flow. Use shorter sentences where appropriate, vary sentence structure, and ensure smooth transitions between ideas.`,
		Storytelling: `Enhance the narrative arc. Add tension, pacing, or emotional resonance. Make the story more compelling and engaging.`,
		Structure: `Improve logical flow and organization. Ensure clear transitions, coherent sections, and a well-defined progression of ideas.`,
		FaithResonance: `Deepen the connection to universal meaning. Add subtle, authentic reflections that emerge naturally from the experience.`,
		HumanTone: `Make the writing feel more authentic and natural. Remove AI-sounding phrases, add conversational elements, and strengthen the author's voice.`,
	}

	return `You are an expert editor tasked with improving a specific aspect of this chapter.

Current chapter text:
"""
${text}
"""

PROBLEM: The "${weakestMetric}" metric scored only ${currentScore}/100.

TASK: Rewrite the chapter to specifically improve ${weakestMetric} while preserving all other qualities.

${improvementGuidance[weakestMetric] || "Improve this aspect significantly."}

Guidelines:
1. Focus primarily on improving ${weakestMetric}
2. Preserve all factual content and key messages
3. Maintain the author's voice and perspective
4. Do not harm other metrics (Originality, Readability, etc.)
5. Keep approximately the same length (within 10%)

Output only the improved chapter text. Do not add commentary or explanations.`
}

export async function improveWeakestMetric(
	text: string,
	scoringResult: ScoringOutput,
	config: Partial<AgentConfig> = {},
): Promise<string> {
	const finalConfig = { ...DEFAULT_CONFIG, ...config }
	const client = getAnthropicClient()

	// Find weakest metric
	const sortedScores = [...scoringResult.scores].sort((a, b) => a.score - b.score)
	const weakest = sortedScores[0]

	if (!weakest) {
		throw new Error("No scores found in scoring result")
	}

	console.log(`Improving weakest metric: ${weakest.metric} (score: ${weakest.score})`)

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
						content: buildImprovementPrompt(text, weakest.metric, weakest.score),
					},
				],
			})

			const content = message.content.find((block) => block.type === "text")
			if (content && content.type === "text") {
				return content.text.trim()
			}

			throw new Error("Unexpected response format from AI")
		} catch (error) {
			lastError = error as Error
			console.error(`Improve agent attempt ${attempt + 1} failed:`, error)

			if (attempt < finalConfig.maxRetries! - 1) {
				await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
			}
		}
	}

	throw new Error(`Improve agent failed after ${finalConfig.maxRetries} attempts: ${lastError?.message}`)
}
