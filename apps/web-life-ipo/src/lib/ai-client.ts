import Anthropic from "@anthropic-ai/sdk"
import { OpenAI } from "openai"

// Singleton clients
let anthropicClient: Anthropic | null = null
let openaiClient: OpenAI | null = null

export function getAnthropicClient(): Anthropic {
	if (!anthropicClient) {
		if (!process.env.ANTHROPIC_API_KEY) {
			throw new Error("ANTHROPIC_API_KEY is not set")
		}
		anthropicClient = new Anthropic({
			apiKey: process.env.ANTHROPIC_API_KEY,
		})
	}
	return anthropicClient
}

export function getOpenAIClient(): OpenAI {
	if (!openaiClient) {
		if (!process.env.OPENAI_API_KEY) {
			throw new Error("OPENAI_API_KEY is not set")
		}
		openaiClient = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
		})
	}
	return openaiClient
}

// Model configuration
export const AI_MODELS = {
	// Anthropic Claude models
	CLAUDE_OPUS: "claude-opus-4-20250514",
	CLAUDE_SONNET: "claude-sonnet-4-20250514",
	CLAUDE_HAIKU: "claude-3-5-haiku-20241022",

	// OpenAI models (fallback)
	GPT4_TURBO: "gpt-4-turbo-preview",
	GPT4: "gpt-4",
} as const

export type AIModel = (typeof AI_MODELS)[keyof typeof AI_MODELS]
