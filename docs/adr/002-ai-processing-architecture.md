# ADR 002: AI Processing Architecture

**Date:** 2025-10-23
**Status:** Accepted
**Deciders:** Autonomous Full-Stack Engineer

## Context

The editorial workflow requires AI agents to process chapters with different flows for Sam (owner) vs co-authors. Processing must be reliable, resumable, and cost-effective while handling long-running LLM operations.

## Decision

**Implement an asynchronous job-based architecture with strict JSON schemas and idempotent operations.**

### Architecture Components:

1. **Job Queue (BullMQ)**

    - All AI processing runs as background jobs
    - Durable: survives crashes/redeployments
    - Configurable retries with exponential backoff
    - Job types: `process-sam-chapter`, `process-coauthor-chapter`, `send-feedback-email`, `compile-docx`

2. **Agent System (Function-based modules)**

    - Each agent is a pure function with typed input/output
    - Agents: `humanize()`, `addFaithMeaning()`, `score()`, `improveWeakestMetric()`, `generateFeedback()`
    - Use Anthropic's tool/function calling for strict JSON schema enforcement
    - Retry logic for malformed responses (max 3 attempts)

3. **Processing Flows**

    **Sam's Flow:**

    ```
    Upload → Humanize Agent → Faith & Meaning Agent → Quality Scoring
       ↓ (if avg < threshold)
    Improve Weakest Metric → Re-score → Repeat until avg ≥ threshold or max iterations
    ```

    **Co-author's Flow:**

    ```
    Upload → Quality Scoring → Feedback Agent → Store results
    ```

4. **State Management**

    - Database is source of truth for all state
    - `chapters.status`: pending | processing | sam_improving | ready | approved | sent
    - `chapters.iteration`: tracks rewrite cycles
    - Global flags table: `sam_quality_complete`, `coauthor_reports_ready`, `human_approval`

5. **Structured Output Enforcement**

    - Use Claude's `tools` with strict JSON schema
    - Define Zod schemas for all agent outputs
    - Validate responses before persisting
    - Auto-retry on validation failure with refined prompt

6. **Cost Optimization**
    - Configurable models per agent (e.g., Haiku for feedback, Opus for rewrites)
    - Cache chapter embeddings for similarity checks
    - Batch scoring when possible
    - Expose cost estimates in admin UI

## Consequences

### Positive:

- **Reliability:** Jobs survive crashes and can be retried
- **Observability:** Every step is logged and trackable
- **Flexibility:** Easy to add new agents or modify flows
- **Cost control:** Per-agent model selection and caching
- **Type safety:** Zod schemas catch issues early

### Negative:

- **Complexity:** Requires queue infrastructure and job monitoring
- **Latency:** Async jobs add slight delay (acceptable for editorial workflow)
- **Learning curve:** Team must understand job patterns

### Neutral:

- **Redis dependency:** Already in stack, minimal overhead

## Alternatives Considered

1. **Synchronous API-based processing**

    - Pros: Simpler, immediate feedback
    - Cons: Timeouts on long operations, no crash recovery
    - Rejected: Not resilient for production

2. **LangChain orchestration**

    - Pros: Pre-built agent patterns
    - Cons: Heavy abstraction, harder to debug, opinionated structure
    - Rejected: Over-engineered for our use case

3. **Webhooks for async callbacks**
    - Pros: Decoupled, event-driven
    - Cons: Requires exposing endpoints, harder local dev, network errors
    - Rejected: BullMQ provides better guarantees

## Implementation Notes

### Scoring Schema (Zod):

```typescript
const ScoringOutputSchema = z.object({
	scores: z.array(
		z.object({
			metric: z.string(),
			score: z.number().min(0).max(100),
		}),
	),
	average: z.number().min(0).max(100),
	rationale: z.string(),
})
```

### Job Configuration:

- Default timeout: 10 minutes per job
- Max retries: 3 (with exponential backoff)
- Concurrency: 2 (to avoid rate limits)
- Dead letter queue for failed jobs

### Quality Thresholds:

- Sam's target: 85 (configurable via env)
- Max iterations: 4 (prevents infinite loops)
- Graceful degradation: notify admin if max reached
