---
status: complete
priority: p2
issue_id: "005"
tags: [code-review, architecture, quality]
dependencies: []
---

# Tool Execution Errors Crash Agent Loop

## Problem Statement

In `src/lib/agent/tools/index.ts`, if `executeTool()` throws an unhandled error, the entire agent loop in `mark.ts` crashes. The agent should gracefully report tool failures back to the LLM so it can retry or choose a different approach.

## Findings

- **agent-native-reviewer**: Tool errors propagate up and crash the loop instead of being returned as error tool_results
- **architecture-strategist**: No error boundaries around tool execution

## Proposed Solutions

### Solution A: Wrap executeTool in try/catch (Recommended)
Return `{ error: message }` as the tool result on failure, letting the LLM decide how to proceed.

**Pros:** Simple, lets the agent self-recover
**Cons:** None significant
**Effort:** Small
**Risk:** Low

## Technical Details

- **Affected files:** `src/lib/agent/mark.ts`, `src/lib/agent/tools/index.ts`

## Acceptance Criteria

- [ ] Tool execution errors return error messages to the LLM, not thrown exceptions
- [ ] Agent loop continues after tool failures
- [ ] Tool errors are logged for debugging

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-28 | Created from code review of PR #1 | |
