---
status: complete
priority: p2
issue_id: "006"
tags: [code-review, security, architecture]
dependencies: []
---

# No Input Validation on Webhook Payloads

## Problem Statement

The inbound email webhook and cron endpoint accept raw JSON without schema validation. Malformed payloads could cause runtime errors or pass unexpected data through the system.

## Findings

- **architecture-strategist**: No Zod schemas for webhook payloads
- **security-sentinel**: Supabase filter injection via unvalidated `senderEmail` used directly in `.eq()` queries
- Payload fields are cast with `String()` but structure is not validated

## Proposed Solutions

### Solution A: Add Zod Schemas (Recommended)
Define Zod schemas for the Resend webhook payload and validate before processing.

**Pros:** Type-safe, clear error messages, prevents unexpected data shapes
**Cons:** New dependency (zod)
**Effort:** Small
**Risk:** Low

## Technical Details

- **Affected files:** `src/app/api/email/inbound/route.ts`, `src/app/api/cron/daily/route.ts`

## Acceptance Criteria

- [ ] Webhook payload is validated against a Zod schema before processing
- [ ] Invalid payloads return 400 with descriptive error
- [ ] Email addresses are validated as proper email format

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-28 | Created from code review of PR #1 | |
