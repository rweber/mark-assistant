import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "./send";

const CAN_SPAM_FOOTER = `
<hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e5e5;">
<p style="font-size: 11px; color: #999; margin-top: 12px;">
  You received this email from VPAK. If you no longer wish to receive emails,
  <a href="mailto:mark@vpak.com?subject=UNSUBSCRIBE">reply with UNSUBSCRIBE</a>.
</p>`;

/**
 * Send all approved outreach drafts.
 * Called after approval processing or by the cron job.
 */
export async function sendApprovedOutreach(): Promise<{
  sent: string[];
  failed: string[];
}> {
  const sent: string[] = [];
  const failed: string[] = [];

  const { data: approved } = await supabaseAdmin
    .from("outreach_drafts")
    .select("*, contacts!inner(email, name, company)")
    .eq("status", "approved");

  if (!approved || approved.length === 0) return { sent, failed };

  for (const draft of approved) {
    const contact = draft.contacts as unknown as {
      email: string;
      name: string;
      company: string;
    };

    try {
      const result = await sendEmail({
        to: contact.email,
        subject: draft.subject,
        html: draft.body_html + CAN_SPAM_FOOTER,
        text:
          draft.body_text +
          "\n\n---\nTo unsubscribe, reply with UNSUBSCRIBE.",
      });

      // Update draft status to sent
      await supabaseAdmin
        .from("outreach_drafts")
        .update({
          status: "sent",
          resend_message_id: result?.id ?? null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", draft.id);

      // Create email thread and message record
      const { data: thread } = await supabaseAdmin
        .from("email_threads")
        .insert({
          thread_type: "prospect_outreach",
          contact_id: draft.contact_id,
          subject: draft.subject,
        })
        .select("id")
        .single();

      if (thread) {
        await supabaseAdmin.from("email_messages").insert({
          thread_id: thread.id,
          direction: "outbound",
          from_email: process.env.MARK_FROM_EMAIL ?? "mark@vpak.com",
          to_email: contact.email,
          subject: draft.subject,
          body_text: draft.body_text,
          body_html: draft.body_html,
          resend_message_id: result?.id ?? null,
        });
      }

      // Update contact status to prospect (they've been reached out to)
      await supabaseAdmin
        .from("contacts")
        .update({ status: "prospect" })
        .eq("id", draft.contact_id)
        .eq("status", "lead");

      sent.push(`Sent to ${contact.name} (${contact.email}): "${draft.subject}"`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      failed.push(`Failed to send to ${contact.email}: ${errorMsg}`);

      await supabaseAdmin
        .from("outreach_drafts")
        .update({ status: "failed" })
        .eq("id", draft.id);
    }
  }

  return { sent, failed };
}

/**
 * Check if an inbound email contains unsubscribe language.
 */
export function isUnsubscribeRequest(bodyText: string): boolean {
  const patterns = [
    /\bunsubscribe\b/i,
    /\bstop\b/i,
    /\bremove me\b/i,
    /\bopt[ -]?out\b/i,
    /\bdo not (contact|email|send)\b/i,
  ];
  // Only match if the unsubscribe-like word is the primary content
  // (not buried in a longer email)
  const trimmed = bodyText.trim();
  if (trimmed.split(/\s+/).length <= 5) {
    return patterns.some((p) => p.test(trimmed));
  }
  return false;
}
