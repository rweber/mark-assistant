---
status: complete
priority: p1
issue_id: "001"
tags: [code-review, security]
dependencies: []
---

# Webhook Signature Verification Incomplete

## Problem Statement

The Resend inbound webhook endpoint (`src/app/api/email/inbound/route.ts`) only checks for the presence of the `svix-signature` header but does not verify the actual signature. This means any attacker who knows the endpoint URL can forge webhook payloads, triggering email processing, agent runs, and database writes.

## Findings

- **security-sentinel**: CRITICAL — webhook auth is presence-check only (lines 26-34)
- **architecture-strategist**: Incomplete webhook authentication — TODO comment acknowledges missing Svix verification
- Lines 26-34 in `route.ts`: `if (!signature)` check only, no cryptographic verification

## Proposed Solutions

### Solution A: Full Svix Verification (Recommended)
Install `@svix/webhooks` and verify the full signature using the webhook secret.

**Pros:** Industry-standard, Resend's recommended approach, prevents all forgery
**Cons:** New dependency
**Effort:** Small
**Risk:** Low

### Solution B: HMAC-SHA256 Manual Verification
Manually verify using the Svix protocol (base64 decode, HMAC-SHA256).

**Pros:** No new dependency
**Cons:** More code to maintain, easy to get wrong
**Effort:** Medium
**Risk:** Medium — crypto verification bugs

## Recommended Action

_To be filled during triage_

## Technical Details

- **Affected files:** `src/app/api/email/inbound/route.ts`
- **Components:** Inbound email webhook handler
- **Database changes:** None

## Acceptance Criteria

- [ ] Svix signature is cryptographically verified on every inbound webhook
- [ ] Invalid signatures return 401 and are logged
- [ ] Webhook secret is required in production (not optional)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-28 | Created from code review of PR #1 | Found by security-sentinel and architecture-strategist |

## Resources

- PR #1: feat: Mark — email-first AI sales agent (Phase 1 & 2)
- [Resend webhook verification docs](https://resend.com/docs/webhooks)
- [@svix/webhooks npm package](https://www.npmjs.com/package/@svix/webhooks)
