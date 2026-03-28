# Mark: AI Sales & Marketing Agent for Small B2B Businesses

**Date:** 2026-03-28
**Status:** Brainstorm complete

## What We're Building

**Mark** is an AI-powered sales and marketing agent designed for small B2B businesses that lack dedicated sales/marketing staff. The pilot user is a small B2B company (VPAK.com) whose sole operator lost his business partner who handled all sales and outreach.

Mark acts as a tireless marketing partner that:
1. **Researches leads** — finds potential customers, companies, and contacts relevant to the business
2. **Drafts outreach** — writes personalized emails and messages for the business owner to review and approve
3. **Runs autonomously on a daily cadence** — a cron job triggers Mark's "brain" each day to decide what's most useful (new leads, follow-up reminders, draft messages)
4. **Communicates via email** — sends daily emails to the business owner with actionable recommendations; the owner can reply directly to have a conversation with Mark
5. **Builds knowledge over time** — accumulates a growing repository of contacts, business context, conversation history, and market intelligence

## Why This Approach

**Email-first (Approach A)** was chosen over web-chat-first or hybrid approaches because:

- **Lowest friction for the target user** — the business owner already checks email daily; no new app to learn
- **Two-way email conversation** means the owner can reply naturally without visiting a dashboard
- **Cron + email is simple and reliable** — proven pattern, easy to debug
- **Web UI can start minimal** — just enough for the admin (Ryan) to configure and monitor Mark
- **Voice modality can be added later** as a browser-based feature once the core loop is proven

## Key Decisions

1. **Product name:** Mark (the marketing agent)
2. **Primary interaction channel:** Two-way email (Mark sends, dad replies, conversation continues)
3. **Daily cadence:** Cron job runs Mark's reasoning loop; Mark decides what's most useful to surface each day (leads, drafts, reminders — not a fixed template)
4. **Starting scope:** Research leads + draft outreach emails. No social media, content creation, or CRM features initially.
5. **Knowledge storage:** Database (Supabase) for contacts, conversations, leads, and business context
6. **Users:** Multi-user from the start (dad as primary user, Ryan as admin/configurator, possibly more later)
7. **Voice/chat:** Deferred to a later phase; email is the v1 conversational interface
8. **Web UI:** Minimal dashboard for admin visibility — not the primary user-facing surface in v1

## Architecture Sketch

```
[Cron Job / Daily Trigger]
        |
        v
[Mark's Brain - LLM Agent Loop]
  - Check knowledge base for pending follow-ups
  - Research new leads (web search, etc.)
  - Draft outreach emails
  - Decide what to surface today
        |
        v
[Send Email to Dad]
        |
   (Dad replies)
        |
        v
[Inbound Email Webhook]
        |
        v
[Mark processes reply, updates knowledge, responds]
```

**Tech stack:**
- Next.js 16 (already scaffolded)
- Supabase (database + auth)
- Claude API (Anthropic) for Mark's reasoning
- Email service: TBD (Resend, SendGrid, or Postmark — evaluate inbound parsing)
- Inbound email: webhook-based (SendGrid Inbound Parse, Postmark Inbound, or Resend)
- Cron: Vercel Cron Jobs or external trigger
- Deployment: Vercel

## Open Questions

1. **Which email service?** Resend is simple and modern; SendGrid/Postmark have mature inbound parsing. Need to evaluate during planning.

## Resolved Questions

1. **LLM provider:** Claude API (Anthropic) — natural fit with existing tooling and ecosystem.
2. **Approval flow:** Dad approves every outreach email before it sends. No autonomous sending in v1.
3. **Email identity:** Custom VPAK domain (e.g., mark@vpak.com) for professional credibility. Requires DNS setup.
4. **Lead research:** Give Mark web search tools and let him learn the business over time. No pre-loaded contact list required.
5. **Lead sources:** Web search APIs (Serper, Tavily, etc.) — Mark discovers leads autonomously rather than working from a provided list.

## Future Phases (Not in v1)

- Voice chat in browser (WebRTC + LLM voice API)
- Google Meet / phone call integration
- Social media posting (LinkedIn)
- Content creation (newsletters, blog posts)
- Full CRM with contact management dashboard
- Google Chat or SMS as additional channels
