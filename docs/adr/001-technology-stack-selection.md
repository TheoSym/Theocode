# ADR 001: Technology Stack Selection for Life IPO Editorial App

**Date:** 2025-10-23
**Status:** Accepted
**Deciders:** Autonomous Full-Stack Engineer

## Context

The Life IPO Editorial App requires a production-ready system for managing an anthology editorial workflow with AI-powered content processing. The existing Theocode monorepo already has established patterns and infrastructure.

## Decision

**Adopt the existing monorepo stack rather than introducing new technologies.**

### Technology Choices:

1. **Frontend Framework:** Next.js 15 (App Router) + React 18

    - Already in use across the monorepo
    - Server Actions provide seamless backend integration
    - App Router enables modern file-based routing

2. **Database:** PostgreSQL 15.4 + Drizzle ORM

    - Existing Postgres instance in Docker Compose
    - Drizzle provides type-safe queries and migrations
    - Battle-tested in `packages/evals`

3. **Styling:** TailwindCSS + Radix UI

    - Consistent with existing apps
    - Accessible, composable components
    - Rapid UI development

4. **Forms:** React Hook Form + Zod

    - Type-safe validation
    - Excellent DX and performance
    - Pattern established in `web-evals`

5. **Background Jobs:** BullMQ + Redis

    - Redis already available in Docker Compose
    - Reliable queue with retries, scheduling
    - Better than cloud-specific solutions (vendor-neutral)

6. **AI Provider:** Anthropic Claude (primary) + OpenAI (fallback)

    - Claude excels at long-form content and structured outputs
    - Function calling for strict JSON schema enforcement
    - Configurable per-agent model selection

7. **File Storage:** Local filesystem (initial) → S3-compatible (production)

    - Simple local development
    - Easy migration path to object storage
    - Abstracted via storage interface

8. **Email:** Resend (primary)

    - Modern API, excellent DX
    - Built-in retry logic
    - Better than Gmail API for production

9. **Testing:** Playwright (E2E) + Vitest (unit)

    - Already configured in monorepo
    - Comprehensive coverage of acceptance criteria

10. **Package Manager:** pnpm + Turbo
    - Existing monorepo setup
    - Fast, efficient workspace management

## Consequences

### Positive:

- **Zero onboarding friction** - follows existing patterns
- **Shared infrastructure** - reuse Postgres, Redis, config
- **Type safety** - end-to-end TypeScript
- **Fast development** - leverage existing components and utilities
- **Production-ready** - proven stack

### Negative:

- **Node.js ecosystem** - not Python/FastAPI (but acceptable trade-off)
- **BullMQ learning curve** - team must learn queue patterns (but well-documented)

### Neutral:

- **Monorepo structure** - adds packages/apps but maintains organization

## Alternatives Considered

1. **Python + FastAPI + Celery**

    - Pros: Great for AI/ML workflows, mature async patterns
    - Cons: Introduces new language, separate deployment, different ORM
    - Rejected: Violates monorepo consistency

2. **Separate microservice architecture**

    - Pros: Independent scaling, technology flexibility
    - Cons: Complexity overhead, network latency, harder local dev
    - Rejected: Premature for initial MVP

3. **Google Sheets as database**
    - Pros: Non-technical users can view data
    - Cons: Not ACID-compliant, poor querying, scalability issues
    - Rejected: Not production-grade; can export to Sheets if needed

## Implementation Notes

- Create `/packages/life-ipo` for shared DB schema and business logic
- Create `/apps/web-life-ipo` for editorial dashboard
- Extend existing `docker-compose.yml` if needed
- Add new dependencies to workspace root and specific packages
