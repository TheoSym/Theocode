import { getAnthropicClient, AI_MODELS } from "../ai-client"
import type { AgentConfig } from "./types"

const DEFAULT_CONFIG: AgentConfig = {
	model: AI_MODELS.CLAUDE_SONNET,
	temperature: 0.7,
	maxTokens: 16000,
	maxRetries: 3,
}

const SYSTEM_PROMPT = `You are an expert editor specializing in transforming written content into compelling narrative non-fiction.

Your task is to rewrite the provided chapter text to make it feel more human, engaging, and authentic while preserving:
- All factual accuracy and specific details
- The author's unique voice and perspective
- The original structure and key messages

Guidelines:
1. Use active voice and varied sentence structures
2. Eliminate generic, AI-sounding phrases
3. Add vivid, specific details where appropriate
4. Maintain natural transitions and flow
5. Preserve the author's personal experiences and insights exactly as described
6. Keep the same approximate length (within 10%)

Output only the rewritten chapter text. Do not add commentary, explanations, or meta-text.`

export async function humanizeChapter(text: string, config: Partial<AgentConfig> = {}): Promise<string> {
	const finalConfig = { ...DEFAULT_CONFIG, ...config }
	const client = getAnthropicClient()

	let lastError: Error | null = null

	for (let attempt = 0; attempt < finalConfig.maxRetries!; attempt++) {
		try {
			const message = await client.messages.create({
				model: finalConfig.model,
				max_tokens: finalConfig.maxTokens!,
				temperature: finalConfig.temperature,
				system: SYSTEM_PROMPT,
				messages: [
					{
						role: "user",
						content: `Please rewrite the following chapter to make it more human, engaging, and authentic:\n\n${text}`,
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
			console.error(`Humanize agent attempt ${attempt + 1} failed:`, error)

			if (attempt < finalConfig.maxRetries! - 1) {
				// Exponential backoff
				await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
			}
		}
	}

	throw new Error(`Humanize agent failed after ${finalConfig.maxRetries} attempts: ${lastError?.message}`)
}
