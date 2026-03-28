---
status: pending
priority: p2
issue_id: "011"
tags: [code-review, security]
dependencies: []
---

# Incomplete RLS Policies

## Problem Statement

The Supabase migration enables RLS on all tables but only creates policies for `business_context`. Other tables (contacts, outreach_drafts, email_messages, etc.) have RLS enabled with no policies — meaning the anon key has NO access and the service role key bypasses RLS anyway. This is fine for the current server-only architecture but will block any future browser-side features.

## Findings

- **architecture-strategist**: RLS enabled but policies missing for most tables
- **security-sentinel**: Flagged as potential data exposure risk

## Proposed Solutions

### Solution A: Add RLS Policies When Dashboard is Built (Recommended)
This is currently a non-issue since all DB access goes through the service role key. Add proper RLS policies in Phase 3 when the dashboard introduces browser-side Supabase access.

**Pros:** No unnecessary work now
**Cons:** Must remember to add before dashboard ships
**Effort:** N/A (deferred)
**Risk:** Low (service role bypasses RLS)

## Technical Details

- **Affected files:** `supabase/migrations/001_initial_schema.sql`

## Acceptance Criteria

- [ ] Tracked as dependency for Phase 3 dashboard work
- [ ] RLS policies added before any browser-side Supabase client is introduced

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-28 | Created from code review of PR #1 | Not a blocker since all access is service role |
