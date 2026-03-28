import { NextRequest } from "next/server";
import { after } from "next/server";
import { routeEmail } from "@/lib/email/router";
import {
  parseApprovalCommand,
  executeApproval,
} from "@/lib/email/approval";
import {
  sendApprovedOutreach,
  isUnsubscribeRequest,
} from "@/lib/email/outreach";
import { sendEmail } from "@/lib/email/send";
import { runMark } from "@/lib/agent/mark";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Resend inbound email webhook.
 * Returns 200 immediately, processes the email asynchronously via after().
 */
export async function POST(request: NextRequest) {
  // Verify webhook signature
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get("svix-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }
    // In production, verify the full Svix signature.
    // For now, we check that the header is present.
    // TODO: Add full Svix signature verification with @svix/webhooks
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Return 200 immediately, process asynchronously
  after(async () => {
    try {
      await processInboundEmail(payload);
    } catch (err) {
      console.error(
        "Inbound email processing error:",
        err instanceof Error ? err.message : err
      );
    }
  });

  return new Response("OK", { status: 200 });
}

async function processInboundEmail(payload: Record<string, unknown>) {
  // Extract email data from Resend webhook payload
  // Resend sends metadata; we may need to fetch full body via API
  const data = (payload.data ?? payload) as Record<string, unknown>;
  const senderEmail = String(data.from ?? data.sender ?? "");
  const subject = String(data.subject ?? "");
  const bodyText = String(data.text ?? data.body ?? "");
  const headers = (data.headers ?? {}) as Record<string, string>;

  if (!senderEmail) {
    console.error("Inbound email missing sender address");
    return;
  }

  // Route the email
  const routed = await routeEmail(senderEmail, subject, bodyText, headers);

  // Log the inbound message
  await logInboundMessage(routed.senderEmail, subject, bodyText, headers);

  switch (routed.type) {
    case "owner_approval":
      await handleOwnerApproval(routed.bodyText);
      break;

    case "owner_conversation":
      await handleOwnerConversation(
        routed.bodyText,
        routed.subject,
        routed.inReplyTo,
        routed.references
      );
      break;

    case "prospect_reply":
      await handleProspectReply(
        routed.senderEmail,
        routed.subject,
        routed.bodyText,
        routed.contactId!
      );
      break;

    case "auto_reply":
      // Logged but no action needed
      break;

    case "unknown":
      // Logged but no action needed
      break;
  }
}

async function handleOwnerApproval(bodyText: string) {
  const command = parseApprovalCommand(bodyText);
  if (!command) return;

  const result = await executeApproval(command);

  // Send approved outreach
  if (command.action === "approve" && result.processed.length > 0) {
    const sendResult = await sendApprovedOutreach();

    // Notify owner of what was sent
    const ownerEmail = process.env.OWNER_EMAIL;
    if (ownerEmail) {
      const items = [
        ...sendResult.sent.map((s) => `✓ ${s}`),
        ...sendResult.failed.map((f) => `✗ ${f}`),
        ...result.errors.map((e) => `⚠ ${e}`),
      ];

      await sendEmail({
        to: ownerEmail,
        subject: "Mark: Outreach sent",
        html: `<p>Done! Here's what happened:</p><ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`,
        text: `Done! Here's what happened:\n${items.join("\n")}`,
      });
    }
  } else if (result.processed.length > 0 || result.errors.length > 0) {
    // Notify owner of rejection/edit result
    const ownerEmail = process.env.OWNER_EMAIL;
    if (ownerEmail) {
      const items = [
        ...result.processed,
        ...result.errors.map((e) => `⚠ ${e}`),
      ];
      await sendEmail({
        to: ownerEmail,
        subject: "Mark: Got it",
        html: `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`,
        text: items.join("\n"),
      });
    }
  }
}

async function handleOwnerConversation(
  bodyText: string,
  subject: string,
  inReplyTo: string | null,
  references: string | null
) {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) return;

  // Run Mark's agent loop with the owner's message as context
  const result = await runMark(
    `The business owner replied to your email with the following message:\n\n"${bodyText}"\n\nRespond helpfully. If they're asking a question, answer it. If they're giving you context or instructions, acknowledge and incorporate it.`,
    "inbound_email"
  );

  // Send Mark's response back maintaining the thread
  await sendEmail({
    to: ownerEmail,
    subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
    html: `<p>${result.output.replace(/\n/g, "</p><p>")}</p>`,
    text: result.output,
    inReplyTo: inReplyTo ?? undefined,
    references: references ?? undefined,
  });
}

async function handleProspectReply(
  senderEmail: string,
  subject: string,
  bodyText: string,
  contactId: string
) {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) return;

  // Check for unsubscribe requests
  if (isUnsubscribeRequest(bodyText)) {
    await supabaseAdmin
      .from("contacts")
      .update({ status: "dead" })
      .eq("id", contactId);
    return;
  }

  // Get contact info for context
  const { data: contact } = await supabaseAdmin
    .from("contacts")
    .select("name, company")
    .eq("id", contactId)
    .maybeSingle();

  const contactName = contact?.name ?? senderEmail;
  const company = contact?.company ?? "";

  // Forward to owner immediately
  await sendEmail({
    to: ownerEmail,
    subject: `Prospect reply from ${contactName}${company ? ` (${company})` : ""}: ${subject}`,
    html: `
      <p><strong>${contactName}</strong>${company ? ` at ${company}` : ""} replied to your outreach:</p>
      <blockquote style="border-left: 3px solid #6366f1; padding-left: 12px; margin: 16px 0; color: #333;">
        ${bodyText.replace(/\n/g, "<br>")}
      </blockquote>
      <p style="color: #666; font-size: 13px;">Reply directly to ${senderEmail} to continue the conversation. Mark will track this interaction.</p>
    `,
    text: `${contactName}${company ? ` at ${company}` : ""} replied to your outreach:\n\n${bodyText}\n\n---\nReply directly to ${senderEmail} to continue the conversation.`,
  });

  // Update contact status
  await supabaseAdmin
    .from("contacts")
    .update({
      status: "prospect",
      metadata: { last_reply: new Date().toISOString(), last_reply_preview: bodyText.slice(0, 200) },
    })
    .eq("id", contactId);
}

async function logInboundMessage(
  senderEmail: string,
  subject: string,
  bodyText: string,
  headers: Record<string, string>
) {
  try {
    // Find or create a thread for this message
    const inReplyTo = headers["in-reply-to"] ?? headers["In-Reply-To"];

    // For now, create a simple message log without thread matching
    // Thread matching by In-Reply-To header can be added later
    const { data: thread } = await supabaseAdmin
      .from("email_threads")
      .insert({
        thread_type: "owner_conversation",
        subject,
      })
      .select("id")
      .single();

    if (thread) {
      await supabaseAdmin.from("email_messages").insert({
        thread_id: thread.id,
        direction: "inbound",
        from_email: senderEmail,
        to_email: process.env.MARK_FROM_EMAIL ?? "mark@vpak.com",
        subject,
        body_text: bodyText,
        headers: { ...headers, "in-reply-to": inReplyTo ?? "" },
      });
    }
  } catch (err) {
    // Don't let logging failure block email processing
    console.error("Failed to log inbound message:", err);
  }
}
