/**
 * Daily email template for Mark's update to the business owner.
 * Plain HTML — no react-email dependency needed for v1.
 */

export interface DailyEmailData {
  ownerName: string;
  prospectReplies: Array<{
    contact_name: string;
    summary: string;
    urgency: string;
  }>;
  followUpReminders: Array<{
    contact_name: string;
    reason: string;
    last_contact: string;
  }>;
  newLeads: Array<{
    name: string;
    company: string;
    email: string;
    why_relevant: string;
  }>;
  outreachDrafts: Array<{
    draft_number: number;
    contact_name: string;
    subject: string;
    body: string;
    rationale: string;
  }>;
  learnings: Array<{
    key: string;
    value: string;
  }>;
  date: string;
}

export function renderDailyEmail(data: DailyEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const sectionCount =
    data.prospectReplies.length +
    data.followUpReminders.length +
    data.newLeads.length +
    data.outreachDrafts.length;

  const subject =
    sectionCount > 0
      ? `Mark's Daily Update — ${data.date} (${sectionCount} items)`
      : `Mark's Daily Update — ${data.date}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #111; font-size: 22px; margin-bottom: 4px; }
    h2 { color: #333; font-size: 16px; margin-top: 24px; border-bottom: 1px solid #e5e5e5; padding-bottom: 6px; }
    .item { background: #f9f9f9; padding: 12px 16px; border-radius: 6px; margin-bottom: 10px; }
    .item-title { font-weight: 600; margin-bottom: 4px; }
    .urgency-high { border-left: 3px solid #ef4444; }
    .urgency-medium { border-left: 3px solid #f59e0b; }
    .urgency-low { border-left: 3px solid #22c55e; }
    .draft-box { background: #f0f4ff; padding: 16px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #c7d2fe; }
    .draft-subject { font-weight: 600; color: #1e40af; }
    .draft-body { white-space: pre-wrap; font-size: 14px; margin: 8px 0; }
    .draft-actions { font-size: 13px; color: #6366f1; font-weight: 500; margin-top: 8px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 13px; color: #666; }
    .meta { font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <h1>Good morning${data.ownerName ? `, ${data.ownerName}` : ""}</h1>
  <p class="meta">Here's what I've been working on — ${data.date}</p>

${renderProspectReplies(data.prospectReplies)}
${renderFollowUps(data.followUpReminders)}
${renderNewLeads(data.newLeads)}
${renderDrafts(data.outreachDrafts)}
${renderLearnings(data.learnings)}

${sectionCount === 0 ? "<p>Nothing urgent today. I'll keep researching leads and monitoring for opportunities.</p>" : ""}

  <div class="footer">
    <p><strong>Reply to this email to talk to me.</strong> I can answer questions, take direction, or adjust my approach.</p>
    ${data.outreachDrafts.length > 0 ? '<p>To approve outreach drafts, reply with <strong>APPROVE 1</strong>, <strong>APPROVE ALL</strong>, or <strong>EDIT 1: [your changes]</strong></p>' : ""}
    <p class="meta">Mark | VPAK — Your AI Sales Assistant</p>
  </div>
</body>
</html>`;

  const text = renderDailyEmailText(data, sectionCount);
  return { subject, html, text };
}

function renderProspectReplies(
  replies: DailyEmailData["prospectReplies"]
): string {
  if (replies.length === 0) return "";
  return `
  <h2>🔔 Prospect Replies</h2>
  ${replies
    .slice(0, 5)
    .map(
      (r) => `
  <div class="item urgency-${r.urgency}">
    <div class="item-title">${esc(r.contact_name)}</div>
    <div>${esc(r.summary)}</div>
  </div>`
    )
    .join("")}`;
}

function renderFollowUps(
  reminders: DailyEmailData["followUpReminders"]
): string {
  if (reminders.length === 0) return "";
  return `
  <h2>📋 Follow-Up Reminders</h2>
  ${reminders
    .slice(0, 5)
    .map(
      (r) => `
  <div class="item">
    <div class="item-title">${esc(r.contact_name)}</div>
    <div>${esc(r.reason)}</div>
    <div class="meta">Last contact: ${esc(r.last_contact)}</div>
  </div>`
    )
    .join("")}`;
}

function renderNewLeads(leads: DailyEmailData["newLeads"]): string {
  if (leads.length === 0) return "";
  return `
  <h2>🔍 New Leads Found</h2>
  ${leads
    .slice(0, 5)
    .map(
      (l) => `
  <div class="item">
    <div class="item-title">${esc(l.name)} — ${esc(l.company)}</div>
    <div>${esc(l.why_relevant)}</div>
    <div class="meta">${esc(l.email)}</div>
  </div>`
    )
    .join("")}`;
}

function renderDrafts(drafts: DailyEmailData["outreachDrafts"]): string {
  if (drafts.length === 0) return "";
  return `
  <h2>✉️ Outreach Drafts for Your Approval</h2>
  ${drafts
    .slice(0, 5)
    .map(
      (d) => `
  <div class="draft-box">
    <div class="meta">Draft #${d.draft_number} — To: ${esc(d.contact_name)}</div>
    <div class="draft-subject">Subject: ${esc(d.subject)}</div>
    <div class="draft-body">${esc(d.body)}</div>
    <div class="meta">Why: ${esc(d.rationale)}</div>
    <div class="draft-actions">Reply "APPROVE ${d.draft_number}" to send · "EDIT ${d.draft_number}: [changes]" to revise · "REJECT ${d.draft_number}" to discard</div>
  </div>`
    )
    .join("")}`;
}

function renderLearnings(learnings: DailyEmailData["learnings"]): string {
  if (learnings.length === 0) return "";
  return `
  <h2>🧠 What I Learned Today</h2>
  ${learnings
    .slice(0, 5)
    .map(
      (l) => `
  <div class="item">
    <div class="item-title">${esc(l.key)}</div>
    <div>${esc(l.value)}</div>
  </div>`
    )
    .join("")}`;
}

function renderDailyEmailText(
  data: DailyEmailData,
  sectionCount: number
): string {
  let text = `Good morning${data.ownerName ? `, ${data.ownerName}` : ""}!\nHere's what I've been working on — ${data.date}\n\n`;

  if (data.prospectReplies.length > 0) {
    text += "PROSPECT REPLIES\n";
    data.prospectReplies.slice(0, 5).forEach((r) => {
      text += `- ${r.contact_name}: ${r.summary} [${r.urgency}]\n`;
    });
    text += "\n";
  }

  if (data.followUpReminders.length > 0) {
    text += "FOLLOW-UP REMINDERS\n";
    data.followUpReminders.slice(0, 5).forEach((r) => {
      text += `- ${r.contact_name}: ${r.reason} (last: ${r.last_contact})\n`;
    });
    text += "\n";
  }

  if (data.newLeads.length > 0) {
    text += "NEW LEADS FOUND\n";
    data.newLeads.slice(0, 5).forEach((l) => {
      text += `- ${l.name} at ${l.company} (${l.email}): ${l.why_relevant}\n`;
    });
    text += "\n";
  }

  if (data.outreachDrafts.length > 0) {
    text += "OUTREACH DRAFTS FOR APPROVAL\n";
    data.outreachDrafts.slice(0, 5).forEach((d) => {
      text += `\nDraft #${d.draft_number} — To: ${d.contact_name}\nSubject: ${d.subject}\n\n${d.body}\n\nWhy: ${d.rationale}\nReply "APPROVE ${d.draft_number}" to send\n`;
    });
    text += "\n";
  }

  if (data.learnings.length > 0) {
    text += "WHAT I LEARNED\n";
    data.learnings.slice(0, 5).forEach((l) => {
      text += `- ${l.key}: ${l.value}\n`;
    });
    text += "\n";
  }

  if (sectionCount === 0) {
    text +=
      "Nothing urgent today. I'll keep researching leads and monitoring for opportunities.\n\n";
  }

  text +=
    '---\nReply to this email to talk to me.\nTo approve drafts: "APPROVE 1", "APPROVE ALL", or "EDIT 1: [changes]"\n\nMark | VPAK — Your AI Sales Assistant';

  return text;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
