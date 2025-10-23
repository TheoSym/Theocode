# Life IPO Editorial App

> AI-powered editorial workflow automation for the Life IPO Anthology by [Sam Sammane](https://www.sammane.com)

## Overview

The Life IPO Editorial App automates the editorial workflow for an anthology project, handling chapter uploads, AI-powered content processing, quality scoring, iterative improvements, and automated feedback delivery to authors.

### Key Features

- **Dual Processing Tracks:**

    - **Sam's chapters**: AI rewriting → quality scoring → iterative improvement loop until avg score ≥ 85
    - **Co-author chapters**: Quality scoring → constructive feedback generation

- **AI-Powered Agents:**

    - Humanize Agent: Transforms content into compelling narrative non-fiction
    - Faith & Meaning Agent: Adds subtle reflective insights connecting experience to universal meaning
    - Quality Scoring Agent: Evaluates chapters across multiple metrics (0-100 scale)
    - Improvement Agent: Targets weakest metrics for focused enhancement
    - Feedback Agent: Generates encouraging, actionable editorial feedback

- **Production Features:**
    - Background job processing with BullMQ + Redis
    - Idempotent email delivery with retry logic
    - Human approval gate before sending feedback
    - Comprehensive audit trails and observability
    - Optional master DOCX compilation

## Architecture

### Tech Stack

- **Frontend**: Next.js 15 (App Router), React 18, TailwindCSS, Radix UI
- **Backend**: Next.js Server Actions + API Routes
- **Database**: PostgreSQL + Drizzle ORM
- **Queue**: BullMQ + Redis
- **AI**: Anthropic Claude (primary), OpenAI (fallback)
- **Email**: Resend
- **Monorepo**: pnpm + Turbo

### Project Structure

```
packages/
  life-ipo/              # Core database schema and queries
    src/
      db/
        schema.ts        # Drizzle schema (authors, chapters, scores, feedback, etc.)
        queries/         # Type-safe database operations

apps/
  web-life-ipo/          # Editorial dashboard
    src/
      app/               # Next.js routes
        api/             # API endpoints
        chapters/        # Chapter listing
        admin/           # Admin dashboard
      lib/
        agents/          # AI agent implementations
        queue/           # BullMQ job processors
        config.ts        # Configuration management
```

### Data Flow

```
1. Upload → Create chapter record (status: pending)
   ↓
2. Enqueue job based on author role
   ↓
┌─────────────────────────┐   ┌──────────────────────────┐
│ Sam's Flow              │   │ Co-author Flow           │
│                         │   │                          │
│ Humanize                │   │ Score                    │
│   ↓                     │   │   ↓                      │
│ Add Faith & Meaning     │   │ Generate Feedback        │
│   ↓                     │   │   ↓                      │
│ Score (iteration 1)     │   │ Save to DB               │
│   ↓                     │   │   ↓                      │
│ If avg < 85:            │   │ status → ready           │
│   Improve weakest       │   └──────────────────────────┘
│   Re-score              │
│   Repeat (max 4x)       │
│   ↓                     │
│ status → ready          │
└─────────────────────────┘
   ↓
3. Both flags set (sam_quality_complete + coauthor_reports_ready)
   ↓
4. Admin reviews → Approve
   ↓
5. Send feedback emails (idempotent)
   ↓
6. status → sent
```

## Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- Redis 7+
- Anthropic API key

### Installation

1. **Clone and install dependencies:**

```bash
cd Theocode
pnpm install
```

2. **Set up environment variables:**

```bash
cd apps/web-life-ipo
cp .env.example .env
```

Edit `.env` and fill in required values:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/lifeipo_dev
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-ant-api03-xxx
RESEND_API_KEY=re_xxx
EMAIL_FROM=editor@lifeipo.com
SAM_QUALITY_THRESHOLD=85
MAX_IMPROVEMENT_ITERATIONS=4
```

See [CONFIG.md](./CONFIG.md) for detailed configuration options.

3. **Start PostgreSQL and Redis:**

Using Docker Compose (recommended):

```bash
cd packages/life-ipo
pnpm services:up
```

Or use existing instances and update connection strings in `.env`.

4. **Run database migrations:**

```bash
cd packages/life-ipo
pnpm db:push
```

5. **Seed initial data (optional):**

```bash
cd packages/life-ipo
# Run seed script (to be created)
tsx src/cli/seed.ts
```

### Development

**Start the web app:**

```bash
cd apps/web-life-ipo
pnpm dev
```

App runs at http://localhost:3001

**Start background workers:**

```bash
cd apps/web-life-ipo
tsx src/lib/queue/workers/startWorkers.ts
```

Workers listen for jobs and process chapters in the background.

### Production Deployment

**Build:**

```bash
pnpm build
```

**Start:**

```bash
cd apps/web-life-ipo
pnpm start
```

**Workers (separate process):**

```bash
NODE_ENV=production tsx src/lib/queue/workers/startWorkers.ts
```

**Recommended deployment setup:**

- Web app: Vercel, Railway, or self-hosted
- Workers: Background service (PM2, systemd, or container)
- Database: Managed PostgreSQL (Neon, Supabase, AWS RDS)
- Redis: Managed Redis (Upstash, Redis Cloud)

## Usage

### 1. Upload Chapters

Currently via direct database insertion. Upload UI coming soon.

Example:

```typescript
import { createAuthor, createChapter, addSamChapterJob } from "@roo-code/life-ipo"

// Create author
const sam = await createAuthor({
	name: "Sam Sammane",
	email: "sam@sammane.com",
	role: "sam",
})

// Create chapter
const chapter = await createChapter({
	authorId: sam.id,
	title: "My Journey to TheoSym",
	originalText: `...chapter content...`,
	currentText: `...chapter content...`,
	status: "pending",
})

// Enqueue for processing
await addSamChapterJob(chapter.id)
```

### 2. Monitor Progress

**Admin Dashboard**: http://localhost:3001/admin

- View workflow flags (Sam complete, Co-authors ready, Approval status)
- Chapter statistics (pending, processing, ready, etc.)
- Recent job logs

**Chapters List**: http://localhost:3001/chapters

- All chapters with status, scores, and iterations
- Click to view details

### 3. Approve & Send

When both flags are green on the admin dashboard:

1. Review chapters at `/chapters`
2. Click "Review & Approve" button
3. Feedback emails sent automatically to all authors

## API Endpoints

### `GET /api/health`

Health check with sanitized config.

**Response:**

```json
{
	"status": "healthy",
	"timestamp": "2025-10-23T12:00:00Z",
	"config": {
		"samQualityThreshold": 85,
		"maxImprovementIterations": 4,
		"queueConcurrency": 2
	}
}
```

### `GET /api/chapters`

List all chapters.

**Response:**

```json
{
  "success": true,
  "chapters": [...],
  "count": 10
}
```

### `GET /api/workflow/status`

Workflow flags and stats.

**Response:**

```json
{
	"success": true,
	"flags": {
		"samQualityComplete": true,
		"coauthorReportsReady": false,
		"humanApproval": false
	},
	"stats": {
		"readyForApproval": 5,
		"processing": 2
	}
}
```

## AI Agents

### Humanize Agent

**Purpose**: Transform content into engaging narrative non-fiction
**Model**: Claude Sonnet (configurable)
**Input**: Original chapter text
**Output**: Humanized text with authentic voice

### Faith & Meaning Agent

**Purpose**: Add reflective insights connecting experience to universal meaning
**Model**: Claude Sonnet (configurable)
**Input**: Humanized text
**Output**: Text with 1-3 subtle reflective moments

### Scoring Agent

**Purpose**: Evaluate quality across multiple metrics
**Model**: Claude Sonnet (configurable)
**Input**: Chapter text + role (sam/coauthor)
**Output**: Structured JSON with scores and rationale

**Sam Metrics**: Originality, Readability, Storytelling, FaithResonance, HumanTone
**Co-author Metrics**: Originality, Readability, Structure, FaithResonance

### Improvement Agent

**Purpose**: Target weakest metric for focused enhancement
**Model**: Claude Opus (configurable)
**Input**: Current text + scoring result
**Output**: Improved text optimizing weakest metric

### Feedback Agent

**Purpose**: Generate constructive editorial feedback
**Model**: Claude Haiku (configurable)
**Input**: Chapter text + scoring result
**Output**: Strengths + 2-3 actionable improvements

## Configuration

See [CONFIG.md](./CONFIG.md) for detailed configuration guide.

**Key settings:**

| Variable                     | Default     | Description                              |
| ---------------------------- | ----------- | ---------------------------------------- |
| `SAM_QUALITY_THRESHOLD`      | 85          | Minimum avg score for Sam's chapters     |
| `MAX_IMPROVEMENT_ITERATIONS` | 4           | Max rewrite cycles                       |
| `QUEUE_CONCURRENCY`          | 2           | Parallel job processing                  |
| `MODEL_IMPROVE`              | claude-opus | Model for improvements (premium quality) |

## Cost Optimization

**Budget-Friendly Setup:**

```bash
MODEL_HUMANIZE=claude-sonnet-4-20250514
MODEL_IMPROVE=claude-sonnet-4-20250514  # Downgrade from Opus
MODEL_FEEDBACK=claude-3-5-haiku-20241022
SAM_QUALITY_THRESHOLD=80  # Lower threshold
MAX_IMPROVEMENT_ITERATIONS=3
```

**Premium Quality Setup:**

```bash
MODEL_HUMANIZE=claude-opus-4-20250514
MODEL_IMPROVE=claude-opus-4-20250514
MODEL_SCORING=claude-sonnet-4-20250514
SAM_QUALITY_THRESHOLD=90  # Higher bar
MAX_IMPROVEMENT_ITERATIONS=5
```

## Troubleshooting

### Jobs not processing

**Check workers are running:**

```bash
tsx src/lib/queue/workers/startWorkers.ts
```

**Check Redis connection:**

```bash
redis-cli ping  # Should return PONG
```

**View job queue status:**

```bash
# BullMQ admin UI (optional)
npx bull-board
```

### Database connection errors

**Test connection:**

```bash
psql $DATABASE_URL -c "SELECT 1"
```

**Run migrations:**

```bash
cd packages/life-ipo
pnpm db:push
```

### AI API errors

**Rate limits**: Lower `QUEUE_CONCURRENCY` to 1
**Invalid API key**: Check `ANTHROPIC_API_KEY` in `.env`
**Timeout**: Increase `maxTokens` in agent config

## Architecture Decisions

See [ADRs](./adr/) for detailed rationale:

- [001: Technology Stack Selection](./adr/001-technology-stack-selection.md)
- [002: AI Processing Architecture](./adr/002-ai-processing-architecture.md)
- [003: Data Model and State Management](./adr/003-data-model-and-state.md)

## About

**Owner**: [Sam Sammane](https://www.sammane.com) (Born Ghiath AL SAMMANE)
**Email**: editor@lifeipo.com

**Related projects:**

- AI company: [TheoSym.com](https://TheoSym.com)
- Blog/club: [globalentrepreneur-mag.com](https://globalentrepreneur-mag.com)
- Labs: [Care-Europe.com](https://Care-Europe.com), [Qalitex.com](https://Qalitex.com)
- Digital services: [Trelexa.com](https://Trelexa.com)

## License

Proprietary - All rights reserved

## Support

For issues or questions:

- GitHub Issues: (link when public)
- Email: editor@lifeipo.com
