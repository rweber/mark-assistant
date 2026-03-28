---
status: complete
priority: p3
issue_id: "012"
tags: [code-review, quality]
dependencies: []
---

# Remove Unused Code (~225 LOC)

## Problem Statement

Several files and tools are either unused or redundant, adding unnecessary complexity.

## Findings

- **code-simplicity-reviewer**:
  - `src/lib/supabase/client.ts` — browser Supabase client, unused (no dashboard yet)
  - `read-shared-file` tool — YAGNI, no file ingestion path exists
  - `get-business-context` tool — redundant since business context is already injected into system prompt
  - Unused types in `types.ts` for tables not yet used via browser

## Proposed Solutions

### Solution A: Remove Dead Code (Recommended)
Delete `client.ts`, remove `read-shared-file` tool, evaluate if `get-business-context` tool adds value beyond system prompt injection.

**Pros:** Cleaner codebase, less to maintain
**Cons:** Minor — may need to re-add later
**Effort:** Small
**Risk:** Low

## Technical Details

- **Affected files:** `src/lib/supabase/client.ts`, `src/lib/agent/tools/read-shared-file.ts`, `src/lib/agent/tools/get-business-context.ts`, `src/lib/agent/tools/index.ts`

## Acceptance Criteria

- [ ] Unused client.ts removed
- [ ] YAGNI tools removed or justified
- [ ] Tool registry updated

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-28 | Created from code review of PR #1 | |
