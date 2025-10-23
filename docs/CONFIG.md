# Life IPO Editorial App - Configuration Guide

## Overview

This document describes all configuration options for the Life IPO Editorial App. Configuration is managed through environment variables, with defaults documented below.

## Environment Variables

### Database

| Variable                  | Required        | Default | Description                                  |
| ------------------------- | --------------- | ------- | -------------------------------------------- |
| `DATABASE_URL`            | Yes             | -       | PostgreSQL connection string for development |
| `PRODUCTION_DATABASE_URL` | Production only | -       | PostgreSQL connection string for production  |

**Example:**

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/lifeipo_dev
```

### Redis

| Variable    | Required | Default                  | Description                           |
| ----------- | -------- | ------------------------ | ------------------------------------- |
| `REDIS_URL` | Yes      | `redis://localhost:6379` | Redis connection string for job queue |

### AI Providers

| Variable            | Required | Default | Description                                 |
| ------------------- | -------- | ------- | ------------------------------------------- |
| `ANTHROPIC_API_KEY` | Yes      | -       | Anthropic Claude API key (primary provider) |
| `OPENAI_API_KEY`    | No       | -       | OpenAI API key (optional fallback)          |

**Getting API Keys:**

- Anthropic: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/api-keys

### Email Configuration

| Variable         | Required              | Default              | Description                         |
| ---------------- | --------------------- | -------------------- | ----------------------------------- |
| `EMAIL_PROVIDER` | Yes                   | `resend`             | Email provider (`resend` supported) |
| `RESEND_API_KEY` | Yes (if using Resend) | -                    | Resend API key                      |
| `EMAIL_FROM`     | Yes                   | `editor@lifeipo.com` | Sender email address                |

**Getting Resend API Key:**
https://resend.com/api-keys

### Quality & Processing

| Variable                     | Required | Default | Description                                      |
| ---------------------------- | -------- | ------- | ------------------------------------------------ |
| `SAM_QUALITY_THRESHOLD`      | No       | `85`    | Minimum average score for Sam's chapters (0-100) |
| `MAX_IMPROVEMENT_ITERATIONS` | No       | `4`     | Maximum rewrite iterations before manual review  |

**Tuning Guidelines:**

- **SAM_QUALITY_THRESHOLD**: Lower (75-80) for faster processing, higher (85-90) for premium quality
- **MAX_IMPROVEMENT_ITERATIONS**: Typical range 3-5; more iterations = higher cost but better quality

### AI Models (Optional Overrides)

| Variable         | Default                     | Description                      |
| ---------------- | --------------------------- | -------------------------------- |
| `MODEL_HUMANIZE` | `claude-sonnet-4-20250514`  | Model for humanizing text        |
| `MODEL_FAITH`    | `claude-sonnet-4-20250514`  | Model for adding faith/meaning   |
| `MODEL_SCORING`  | `claude-sonnet-4-20250514`  | Model for quality scoring        |
| `MODEL_IMPROVE`  | `claude-opus-4-20250514`    | Model for improvement iterations |
| `MODEL_FEEDBACK` | `claude-3-5-haiku-20241022` | Model for co-author feedback     |

**Model Selection Guide:**

- **Opus**: Highest quality, highest cost (use for critical rewrites)
- **Sonnet**: Balanced quality/cost (recommended default)
- **Haiku**: Fast and cheap (good for simple tasks like feedback)

**Cost Optimization:**

```bash
# Budget-friendly setup
MODEL_HUMANIZE=claude-sonnet-4-20250514
MODEL_IMPROVE=claude-sonnet-4-20250514  # Downgrade from Opus
MODEL_FEEDBACK=claude-3-5-haiku-20241022

# Premium quality setup
MODEL_HUMANIZE=claude-opus-4-20250514
MODEL_IMPROVE=claude-opus-4-20250514
MODEL_SCORING=claude-sonnet-4-20250514
```

### File Storage

| Variable           | Required | Default     | Description                        |
| ------------------ | -------- | ----------- | ---------------------------------- |
| `UPLOAD_DIR`       | No       | `./uploads` | Local directory for uploaded files |
| `MAX_FILE_SIZE_MB` | No       | `10`        | Maximum file upload size in MB     |

**Production Recommendation:**
For production, consider S3-compatible object storage (AWS S3, Cloudflare R2, DigitalOcean Spaces).

### Job Queue

| Variable            | Required | Default | Description                        |
| ------------------- | -------- | ------- | ---------------------------------- |
| `QUEUE_CONCURRENCY` | No       | `2`     | Number of concurrent jobs          |
| `QUEUE_MAX_RETRIES` | No       | `3`     | Max retry attempts for failed jobs |

**Tuning for API Rate Limits:**

- **QUEUE_CONCURRENCY=2**: Safe default, avoids rate limits
- **QUEUE_CONCURRENCY=5**: Faster processing (if provider allows)
- **QUEUE_CONCURRENCY=1**: Slowest but safest for strict limits

### Application

| Variable              | Required | Default                 | Description                                            |
| --------------------- | -------- | ----------------------- | ------------------------------------------------------ |
| `NODE_ENV`            | No       | `development`           | Node environment (`development`, `production`, `test`) |
| `NEXT_PUBLIC_APP_URL` | No       | `http://localhost:3001` | Public app URL                                         |

## Configuration Examples

### Local Development

```bash
# .env.development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lifeipo_dev
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-ant-api03-xxx
RESEND_API_KEY=re_xxx
EMAIL_FROM=editor@lifeipo.com
SAM_QUALITY_THRESHOLD=80
MAX_IMPROVEMENT_ITERATIONS=3
```

### Production

```bash
# .env.production
DATABASE_URL=postgresql://user:pass@db.example.com:5432/lifeipo_prod
REDIS_URL=rediss://redis.example.com:6380
ANTHROPIC_API_KEY=sk-ant-api03-prod-xxx
RESEND_API_KEY=re_prod_xxx
EMAIL_FROM=editor@lifeipo.com
SAM_QUALITY_THRESHOLD=85
MAX_IMPROVEMENT_ITERATIONS=4
QUEUE_CONCURRENCY=3
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://editorial.lifeipo.com
```

### Testing

```bash
# .env.test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lifeipo_test
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-ant-api03-test-xxx
EMAIL_PROVIDER=mock
SAM_QUALITY_THRESHOLD=75
MAX_IMPROVEMENT_ITERATIONS=2
NODE_ENV=test
```

## Secrets Management

**Never commit `.env` files to version control.**

### Local Development

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### Production Deployment

Use your platform's secrets management:

- **Vercel**: Environment Variables in dashboard
- **Railway**: Variables tab
- **AWS**: Systems Manager Parameter Store
- **Docker**: Pass via `docker run -e` or `docker-compose.yml`

## Monitoring Configuration

The app exposes configuration via `/api/health` endpoint (sanitized, no secrets):

```json
{
	"status": "healthy",
	"config": {
		"samThreshold": 85,
		"maxIterations": 4,
		"queueConcurrency": 2
	}
}
```

## Troubleshooting

### "ANTHROPIC_API_KEY is not set"

- Ensure `.env` file exists in `apps/web-life-ipo/`
- Restart dev server after adding environment variables

### Jobs stuck in queue

- Check Redis connection: `redis-cli ping`
- Review `QUEUE_CONCURRENCY` (might be too low)
- Check API rate limits (lower concurrency if hitting limits)

### Email sending fails

- Verify `RESEND_API_KEY` is valid
- Check domain verification in Resend dashboard
- Ensure `EMAIL_FROM` uses verified domain

## Contact

For questions about configuration:

- Sam Sammane: www.sammane.com
- App repository: GitHub issues
