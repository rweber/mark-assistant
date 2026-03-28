---
status: complete
priority: p3
issue_id: "013"
tags: [code-review, quality]
dependencies: []
---

# Unhandled stop_reasons in Agent Loop

## Problem Statement

The agent loop only handles `end_turn` and `tool_use` stop reasons. Other stop reasons like `max_tokens` (output truncated) are not explicitly handled, which could cause silent data loss.

## Findings

- **agent-native-reviewer**: `max_tokens` stop reason not handled — agent output may be silently truncated

## Proposed Solutions

### Solution A: Handle max_tokens explicitly
When `stop_reason === "max_tokens"`, log a warning and attempt to continue or wrap up gracefully.

**Pros:** Prevents silent truncation
**Cons:** Minor code addition
**Effort:** Small
**Risk:** Low

## Technical Details

- **Affected files:** `src/lib/agent/mark.ts`

## Acceptance Criteria

- [ ] `max_tokens` stop reason is explicitly handled
- [ ] Warning logged when output is truncated

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-28 | Created from code review of PR #1 | |
