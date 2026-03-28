---
status: complete
priority: p2
issue_id: "009"
tags: [code-review, architecture]
dependencies: []
---

# Missing Agent Tools for Self-Service Operations

## Problem Statement

The agent lacks tools to inspect its own state — it can't list contacts, check outreach status, or save business context directly. This forces the owner to manually manage information that the agent should handle autonomously.

## Findings

- **agent-native-reviewer**: Missing tools: `list_contacts`, `get_outreach_status`, `save_business_context`
- Agent can draft outreach but can't check if a contact was already reached
- Agent can't persist learnings it discovers during research

## Proposed Solutions

### Solution A: Add Missing Tools (Recommended)
Implement the 3 missing tools following existing patterns in `src/lib/agent/tools/`.

**Pros:** Agent becomes more autonomous, reduces owner burden
**Cons:** More tools = more token usage in system prompt
**Effort:** Medium
**Risk:** Low

## Technical Details

- **Affected files:** `src/lib/agent/tools/` (new files + index.ts registry)

## Acceptance Criteria

- [ ] Agent can list and filter contacts
- [ ] Agent can check outreach draft statuses
- [ ] Agent can save learnings to business_context
- [ ] Tools registered in tool index and available to agent

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-28 | Created from code review of PR #1 | |
