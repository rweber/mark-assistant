---
status: complete
priority: p1
issue_id: "002"
tags: [code-review, security]
dependencies: []
---

# XSS in Email HTML Templates

## Problem Statement

Multiple locations insert user-controlled text into HTML email bodies without escaping. Prospect replies containing malicious HTML/JS could be rendered in the owner's email client, potentially leading to credential theft or session hijacking.

## Findings

- **security-sentinel**: HIGH — `bodyText.replace(/\n/g, "<br>")` used without HTML escaping in `handleProspectReply` (route.ts:216) and `handleOwnerConversation` (route.ts:174)
- `daily-update.ts` has an `esc()` function but it's only used within that template — not shared
- Prospect names and company names are also interpolated unescaped into HTML

## Proposed Solutions

### Solution A: Shared HTML Escape Utility (Recommended)
Extract `esc()` from `daily-update.ts` into a shared utility and apply it everywhere user text enters HTML.

**Pros:** Simple, consistent, reusable
**Cons:** Must audit all HTML interpolation points
**Effort:** Small
**Risk:** Low

### Solution B: Use a Templating Library
Use a library like `handlebars` with auto-escaping enabled.

**Pros:** Auto-escaping by default
**Cons:** New dependency, over-engineering for email templates
**Effort:** Medium
**Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

- **Affected files:** `src/app/api/email/inbound/route.ts` (lines 174, 213-220), `src/lib/email/outreach.ts`
- **Components:** Email rendering in inbound handler, prospect reply forwarding

## Acceptance Criteria

- [ ] All user-controlled text is HTML-escaped before insertion into email HTML
- [ ] Shared `escapeHtml()` utility exists and is used consistently
- [ ] Prospect names, company names, email addresses, and body text are all escaped

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-28 | Created from code review of PR #1 | Found by security-sentinel |

## Resources

- PR #1
- OWASP XSS Prevention Cheat Sheet
