# ADR 003: Data Model and State Management

**Date:** 2025-10-23
**Status:** Accepted
**Deciders:** Autonomous Full-Stack Engineer

## Context

The editorial workflow requires tracking chapters through multiple states, storing AI outputs, managing approval flow, and ensuring idempotent email delivery. The data model must support resumability and comprehensive audit trails.

## Decision

**Use a normalized PostgreSQL schema with explicit state machines and event sourcing for critical operations.**

### Schema Design:

```sql
-- Core entities
authors(id, name, email, role, created_at)
chapters(id, author_id, title, original_text, current_text, status, iteration, metadata_json, created_at, updated_at)
scores(id, chapter_id, iteration, metrics_json, average, created_at)
feedback(id, chapter_id, strengths_json, improvements_json, created_at)

-- Workflow control
workflow_flags(id, sam_quality_complete, coauthor_reports_ready, human_approval, approved_at, approved_by, updated_at)

-- Communication
emails(id, chapter_id, to_email, subject, body_html, status, attempts, last_error, idempotency_key, created_at, sent_at)

-- Storage
files(id, chapter_id, file_type, original_path, processed_path, size_bytes, created_at)

-- Observability
audit_log(id, actor_id, action, entity_type, entity_id, payload_json, ip_address, created_at)
job_logs(id, job_id, job_type, chapter_id, status, started_at, completed_at, error_message, duration_ms, cost_estimate)
```

### Key Design Decisions:

1. **Chapter State Machine**

    - Explicit `status` field: `pending` → `processing` → `sam_improving` → `ready` → `approved` → `sent`
    - `iteration` tracks rewrite cycles (null for co-authors, 1-N for Sam)
    - `current_text` holds latest version; original preserved in `original_text`
    - `metadata_json` stores flexible data (filename, upload source, etc.)

2. **Scores as Separate Table**

    - One row per scoring attempt
    - Linked via `chapter_id` + `iteration`
    - Enables historical tracking and iteration comparison
    - `metrics_json` stores structured array of metric scores

3. **Idempotent Emails**

    - `idempotency_key` = hash(chapter_id + to_email + content_hash)
    - Prevents duplicate sends on retry
    - `status`: `pending` → `sending` → `sent` | `failed`
    - `attempts` counter for retry logic

4. **Single Workflow Flags Table**

    - Global singleton row (id=1)
    - Atomic updates with optimistic locking
    - Triggers notifications when both flags flip to true

5. **Comprehensive Audit Log**

    - Immutable event log
    - Captures all mutations (create, update, approve, send)
    - Includes actor (user/system), timestamp, full payload
    - GDPR-friendly: can export user's data trail

6. **Job Logs for Observability**
    - Separate from BullMQ metadata
    - Business-level tracking (durations, costs, outcomes)
    - Enables cost analysis and performance optimization

### Data Integrity:

- **Foreign keys** with cascading deletes (files → chapters → authors)
- **Check constraints** on scores (0-100 range), status enums
- **Unique constraints** on email idempotency_key
- **Indexes** on status, author_id, iteration, created_at
- **Row-level security** (future) for multi-tenant support

## Consequences

### Positive:

- **Resumability:** Complete state in DB, can recover from any crash
- **Auditability:** Full history of all operations
- **Data integrity:** Constraints prevent invalid states
- **Idempotency:** No duplicate emails or redundant processing
- **Performance:** Indexes on common query patterns

### Negative:

- **Complexity:** More tables than denormalized design
- **Storage:** Audit logs grow over time (mitigated by archival strategy)

### Neutral:

- **Migrations:** Drizzle Kit handles schema evolution

## Alternatives Considered

1. **Single "chapters" table with embedded JSON**

    - Pros: Simpler schema, fewer joins
    - Cons: Harder to query, no referential integrity on embedded data
    - Rejected: Sacrifices data integrity for minimal complexity reduction

2. **Event sourcing for all entities**

    - Pros: Complete history, time-travel queries
    - Cons: Over-engineered, complex rebuilding logic, performance overhead
    - Rejected: Audit log provides sufficient history

3. **NoSQL (MongoDB/DynamoDB)**
    - Pros: Flexible schema, horizontal scaling
    - Cons: Weaker consistency, complex transactions, different ecosystem
    - Rejected: ACID guarantees more important than schema flexibility

## Implementation Notes

### Drizzle Schema Example:

```typescript
export const chapters = pgTable('chapters', {
  id: serial('id').primaryKey(),
  authorId: integer('author_id').references(() => authors.id).notNull(),
  title: text('title').notNull(),
  originalText: text('original_text').notNull(),
  currentText: text('current_text').notNull(),
  status: text('status', { enum: ['pending', 'processing', ...] }).notNull(),
  iteration: integer('iteration'),
  metadataJson: jsonb('metadata_json'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Indexes:

```typescript
export const chaptersStatusIdx = index("chapters_status_idx").on(chapters.status)
export const chaptersAuthorIdx = index("chapters_author_idx").on(chapters.authorId)
```

### Migration Strategy:

- Use Drizzle Kit for schema generation
- Version all migrations
- Seed data for local development (sample chapters, test authors)
