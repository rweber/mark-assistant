---
status: complete
priority: p2
issue_id: "010"
tags: [code-review, performance]
dependencies: []
---

# Unbounded Token Growth in Agent Conversation History

## Problem Statement

The agent loop in `mark.ts` appends every tool call and result to the messages array without any truncation. Over 15 iterations with large tool results (web search, conversation history), this could exceed the model's context window or cause high costs.

## Findings

- **performance-oracle**: No message pruning or summarization in agent loop
- Large Tavily search results and conversation histories accumulate
- 15 iteration cap helps but doesn't bound token count

## Proposed Solutions

### Solution A: Truncate Tool Results + Token Budget (Recommended)
Cap tool result sizes (e.g., 2000 chars) and track approximate token count, summarizing earlier messages if budget exceeded.

**Pros:** Predictable costs, prevents context overflow
**Cons:** May lose some context
**Effort:** Medium
**Risk:** Low

## Technical Details

- **Affected files:** `src/lib/agent/mark.ts`

## Acceptance Criteria

- [ ] Tool results are truncated to a reasonable size
- [ ] Approximate token count is tracked per iteration
- [ ] Agent gracefully handles context budget exhaustion

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-28 | Created from code review of PR #1 | |
