# Life IPO Editorial App - Quick Setup Guide

## Prerequisites

You need PostgreSQL and Redis running. Here are the quickest ways to set them up:

### Option 1: Docker (Recommended)

```bash
# Create a docker-compose.yml in the project root if you don't have one
docker compose up -d

# Or run PostgreSQL and Redis individually:
docker run -d --name lifeipo-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=lifeipo_dev \
  -p 5432:5432 \
  postgres:15

docker run -d --name lifeipo-redis \
  -p 6379:6379 \
  redis:7
```

### Option 2: Local Installation

**PostgreSQL:**
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15
createdb lifeipo_dev

# Ubuntu/Debian
sudo apt install postgresql-15
sudo systemctl start postgresql
sudo -u postgres createdb lifeipo_dev
```

**Redis:**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis
sudo systemctl start redis
```

## Setup Steps

### 1. Configure Environment Variables

Edit `apps/web-life-ipo/.env` and add your API keys:

```bash
cd apps/web-life-ipo
nano .env  # or use your preferred editor
```

**Required:**
- `ANTHROPIC_API_KEY`: Get from https://console.anthropic.com/
- `DATABASE_URL`: Should match your PostgreSQL setup
- `REDIS_URL`: Should match your Redis setup

**Optional but recommended:**
- `RESEND_API_KEY`: Get from https://resend.com/api-keys (for email sending)

### 2. Apply Database Migrations

```bash
cd /home/user/Theocode/packages/life-ipo

# Push the schema to your database
pnpm db:push
```

This will create all the necessary tables:
- `authors` - Sam and co-authors
- `chapters` - Uploaded content
- `scores` - Quality assessments
- `feedback` - Editorial feedback
- `workflow_flags` - Workflow state
- `emails` - Email delivery tracking
- `files` - File storage tracking
- `audit_log` - Audit trail
- `job_logs` - Background job tracking

### 3. Start the Application

```bash
cd /home/user/Theocode/apps/web-life-ipo

# Start the web server
pnpm dev
```

The app will be available at: **http://localhost:3001**

### 4. Start Background Workers (Separate Terminal)

```bash
cd /home/user/Theocode/apps/web-life-ipo

# Start the job workers
tsx src/lib/queue/workers/startWorkers.ts
```

These workers process chapters in the background using the AI agents.

## Verify Setup

### 1. Check Health Endpoint

```bash
curl http://localhost:3001/api/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "config": {
    "samQualityThreshold": 85,
    "maxImprovementIterations": 4,
    "queueConcurrency": 2
  }
}
```

### 2. Check Database Connection

```bash
# From packages/life-ipo
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lifeipo_dev \
  psql -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
```

Should list all 9 tables.

### 3. Check Redis Connection

```bash
redis-cli ping
# Should return: PONG
```

## Seed Sample Data (Optional)

To test the system with sample chapters:

```bash
cd /home/user/Theocode/packages/life-ipo

# Create a seed script
tsx src/cli/seed.ts  # (to be created)
```

Or manually insert via SQL:

```sql
-- Connect to database
psql postgresql://postgres:postgres@localhost:5432/lifeipo_dev

-- Insert Sam as author
INSERT INTO authors (name, email, role) VALUES
('Sam Sammane', 'sam@sammane.com', 'sam');

-- Insert a sample chapter
INSERT INTO chapters (author_id, title, original_text, current_text, status)
VALUES (
  1,
  'My Journey to TheoSym',
  'This is a sample chapter about my entrepreneurial journey...',
  'This is a sample chapter about my entrepreneurial journey...',
  'pending'
);
```

## Troubleshooting

### "Failed query" error in browser

**Issue:** Database tables don't exist
**Fix:** Run `pnpm db:push` in `packages/life-ipo`

### "ANTHROPIC_API_KEY is not set"

**Issue:** Missing API key
**Fix:** Add your key to `apps/web-life-ipo/.env`

### Workers not processing jobs

**Issue:** Redis not running or workers not started
**Fix:**
1. Check Redis: `redis-cli ping`
2. Start workers: `tsx src/lib/queue/workers/startWorkers.ts`

### "Connection refused" to PostgreSQL

**Issue:** PostgreSQL not running
**Fix:** Start PostgreSQL service (see Option 1 or 2 above)

## Next Steps

Once everything is running:

1. **Visit the admin dashboard**: http://localhost:3001/admin
2. **View chapters**: http://localhost:3001/chapters
3. **Upload chapters** (UI coming soon - use SQL for now)
4. **Monitor processing** in the admin dashboard

## Production Deployment

For production, see the main [README](../../../docs/LIFE_IPO_README.md) for:
- Managed database providers (Neon, Supabase, AWS RDS)
- Managed Redis providers (Upstash, Redis Cloud)
- Deployment platforms (Vercel, Railway, self-hosted)
- Environment variable security
- Worker process management

## Support

For issues:
- Check [docs/LIFE_IPO_README.md](../../../docs/LIFE_IPO_README.md)
- Check [docs/CONFIG.md](../../../docs/CONFIG.md)
- GitHub Issues (when public)
- Email: editor@lifeipo.com
