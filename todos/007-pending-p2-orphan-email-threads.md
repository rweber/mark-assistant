---
status: complete
priority: p2
issue_id: "007"
tags: [code-review, architecture]
dependencies: []
---

# Orphan Email Threads Created on Every Inbound

## Problem Statement

`logInboundMessage()` creates a new `email_threads` row for every inbound email instead of matching to existing threads via `In-Reply-To` header. This creates orphan threads and breaks conversation tracking.

## Findings

- **architecture-strategist**: Thread matching by `In-Reply-To` header is acknowledged in a comment but not implemented
- New thread created per message at `route.ts:245-252`

## Proposed Solutions

### Solution A: Match by In-Reply-To/References Headers (Recommended)
Look up existing threads by `message_id` in `email_messages` table, fall back to creating new thread.

**Pros:** Proper conversation threading, no orphans
**Cons:** Slightly more complex query
**Effort:** Small
**Risk:** Low

## Technical Details

- **Affected files:** `src/app/api/email/inbound/route.ts` (logInboundMessage function)

## Acceptance Criteria

- [ ] Inbound replies are matched to existing threads via In-Reply-To header
- [ ] Only genuinely new conversations create new threads
- [ ] Existing orphan threads can be cleaned up

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-28 | Created from code review of PR #1 | |
