---
status: complete
priority: p1
issue_id: "004"
tags: [code-review, security]
dependencies: []
---

# No Email Sender Verification (SPF/DKIM)

## Problem Statement

The email router trusts the `from` field of inbound emails without verification. An attacker can spoof the owner's email address to send approval commands (APPROVE ALL), or spoof a prospect's email to manipulate contact status.

## Findings

- **security-sentinel**: CRITICAL — sender identity used for routing decisions without SPF/DKIM/ARC verification
- `router.ts:64` compares `senderEmail` against `OWNER_EMAIL` — spoofable
- Combined with the approval flow, a spoofed "APPROVE ALL" from the owner's address would send all pending outreach

## Proposed Solutions

### Solution A: Check Resend Authentication Headers (Recommended)
Resend's inbound webhook includes SPF/DKIM/ARC verification results in headers. Check these before trusting the sender.

**Pros:** No extra infrastructure, leverages existing email auth
**Cons:** Depends on Resend providing these headers consistently
**Effort:** Small
**Risk:** Low

### Solution B: Shared Secret in Approval Commands
Require a per-session token in approval replies (e.g., "APPROVE ALL #abc123").

**Pros:** Strong auth independent of email headers
**Cons:** More friction for the owner
**Effort:** Medium
**Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

- **Affected files:** `src/lib/email/router.ts`, `src/app/api/email/inbound/route.ts`
- **Components:** Email routing, approval flow

## Acceptance Criteria

- [ ] SPF/DKIM pass status is checked for owner-routed emails
- [ ] Failed authentication logs a warning and treats as unknown sender
- [ ] Approval commands from unauthenticated senders are rejected

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-28 | Created from code review of PR #1 | Found by security-sentinel |

## Resources

- PR #1
- Resend inbound webhook documentation
