---
status: complete
priority: p2
issue_id: "008"
tags: [code-review, performance]
dependencies: []
---

# Sequential Outreach Sends with N+1 DB Writes

## Problem Statement

`sendApprovedOutreach()` processes drafts sequentially — each draft does: send email, update draft status, create thread, create message, update contact. With 10+ approved drafts, this takes a long time and risks partial completion on timeout.

## Findings

- **performance-oracle**: Sequential loop with 5 DB operations per draft
- **architecture-strategist**: No batching or parallel execution
- Vercel 300s timeout could be hit with many drafts

## Proposed Solutions

### Solution A: Promise.allSettled with Concurrency Limit
Process drafts in parallel with a concurrency limit (e.g., 5 at a time).

**Pros:** Faster, resilient to individual failures
**Cons:** Slightly more complex error handling
**Effort:** Small
**Risk:** Low

## Technical Details

- **Affected files:** `src/lib/email/outreach.ts`

## Acceptance Criteria

- [ ] Outreach sends execute concurrently with bounded parallelism
- [ ] Individual failures don't block other sends
- [ ] Total execution time is bounded

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-28 | Created from code review of PR #1 | Global learning: concurrency queue > fixed-batch Promise.all |
