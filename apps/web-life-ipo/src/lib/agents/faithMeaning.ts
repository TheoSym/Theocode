import { getAnthropicClient, AI_MODELS } from "../ai-client"
import type { AgentConfig } from "./types"

const DEFAULT_CONFIG: AgentConfig = {
	model: AI_MODELS.CLAUDE_SONNET,
	temperature: 0.7,
	maxTokens: 16000,
	maxRetries: 3,
}

const SYSTEM_PROMPT = `You are a thoughtful editor who helps authors connect their personal experiences to universal meaning and deeper insights.

Your task is to enhance the provided chapter by adding 1-3 succinct reflective insights that:
- Connect the author's experience to broader universal themes or meaning
- Feel natural and emerge organically from the narrative
- Avoid preachy, heavy-handed, or overly philosophical language
- Preserve the author's authentic voice and perspective
- Are woven seamlessly into the existing text

Guidelines:
1. Add insights subtly within the narrative flow
2. Keep the author's voice - do not impose an external philosophical tone
3. Focus on "showing" meaning through story rather than "telling" it explicitly
4. Add 1-3 reflective moments maximum
5. Do not drastically change the length or structure

Output only the enhanced chapter text with the faith/meaning insights integrated. Do not add commentary or explanations.`

export async function addFaithMeaning(text: string, config: Partial<AgentConfig> = {}): Promise<string> {
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
						content: `Please enhance the following chapter by adding subtle, authentic reflective insights that connect the experience to universal meaning:\n\n${text}`,
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
			console.error(`Faith & Meaning agent attempt ${attempt + 1} failed:`, error)

			if (attempt < finalConfig.maxRetries! - 1) {
				await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
			}
		}
	}

	throw new Error(`Faith & Meaning agent failed after ${finalConfig.maxRetries} attempts: ${lastError?.message}`)
}
