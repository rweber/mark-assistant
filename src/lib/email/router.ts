import { supabaseAdmin } from "@/lib/supabase/server";

export type EmailRouteType =
  | "owner_approval"
  | "owner_conversation"
  | "prospect_reply"
  | "auto_reply"
  | "unknown";

export interface RoutedEmail {
  type: EmailRouteType;
  senderEmail: string;
  subject: string;
  bodyText: string;
  messageId: string | null;
  inReplyTo: string | null;
  references: string | null;
  contactId: string | null;
}

const AUTO_REPLY_PATTERNS = [
  /out of office/i,
  /auto[ -]?reply/i,
  /automatic reply/i,
  /away from (my |the )?office/i,
  /on vacation/i,
  /delivery (status )?notification/i,
  /undeliverable/i,
  /mailer-daemon/i,
];

const APPROVAL_PATTERN =
  /^\s*(APPROVE|REJECT|EDIT)\s*(ALL|\d+)?/im;

/**
 * Route an inbound email based on sender identity and content.
 */
export async function routeEmail(
  senderEmail: string,
  subject: string,
  bodyText: string,
  headers: Record<string, string>
): Promise<RoutedEmail> {
  const messageId = headers["message-id"] ?? headers["Message-ID"] ?? null;
  const inReplyTo = headers["in-reply-to"] ?? headers["In-Reply-To"] ?? null;
  const references = headers["references"] ?? headers["References"] ?? null;

  const base: Omit<RoutedEmail, "type" | "contactId"> = {
    senderEmail: senderEmail.toLowerCase(),
    subject,
    bodyText: stripQuotedText(bodyText),
    messageId,
    inReplyTo,
    references,
  };

  // Check for auto-replies / bounces first
  if (isAutoReply(senderEmail, subject, bodyText)) {
    return { ...base, type: "auto_reply", contactId: null };
  }

  // Check if sender is an owner
  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase();
  if (ownerEmail && senderEmail.toLowerCase() === ownerEmail) {
    // Verify email authentication to prevent spoofing (#004)
    if (!isEmailAuthenticated(headers)) {
      console.warn(
        `Owner email from ${senderEmail} failed SPF/DKIM check — treating as unknown`
      );
      return { ...base, type: "unknown", contactId: null };
    }

    // Check if it contains approval keywords
    if (APPROVAL_PATTERN.test(base.bodyText)) {
      return { ...base, type: "owner_approval", contactId: null };
    }
    return { ...base, type: "owner_conversation", contactId: null };
  }

  // Check if sender is a known contact (prospect)
  const { data: contact } = await supabaseAdmin
    .from("contacts")
    .select("id")
    .eq("email", senderEmail.toLowerCase())
    .maybeSingle();

  if (contact) {
    return { ...base, type: "prospect_reply", contactId: contact.id };
  }

  // Unknown sender
  return { ...base, type: "unknown", contactId: null };
}

function isAutoReply(
  senderEmail: string,
  subject: string,
  body: string
): boolean {
  if (senderEmail.toLowerCase().includes("mailer-daemon")) return true;
  if (senderEmail.toLowerCase().includes("postmaster@")) return true;

  const combined = `${subject} ${body}`;
  return AUTO_REPLY_PATTERNS.some((p) => p.test(combined));
}

/**
 * Check email authentication headers (SPF/DKIM/ARC) from Resend.
 * Returns true if the email passes authentication or if no auth headers are present
 * (to avoid blocking in dev/test environments).
 */
function isEmailAuthenticated(headers: Record<string, string>): boolean {
  // Resend provides authentication results in these headers
  const spf =
    headers["received-spf"] ??
    headers["Received-SPF"] ??
    "";
  const authResults =
    headers["authentication-results"] ??
    headers["Authentication-Results"] ??
    "";

  // If no authentication headers present (dev mode), allow through
  if (!spf && !authResults) return true;

  // Check SPF
  if (spf && /fail/i.test(spf)) return false;

  // Check Authentication-Results for DKIM/SPF failures
  if (authResults) {
    if (/dkim=fail/i.test(authResults)) return false;
    if (/spf=fail/i.test(authResults)) return false;
  }

  return true;
}

/**
 * Strip quoted text and email signatures from a reply.
 * Handles common patterns: "On DATE, NAME wrote:", "> quoted lines", "-- " signature marker.
 */
export function stripQuotedText(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    // Stop at signature marker
    if (line.trim() === "--" || line.trim() === "-- ") break;

    // Stop at "On ... wrote:" pattern
    if (/^On .+ wrote:$/i.test(line.trim())) break;

    // Stop at forwarding headers
    if (/^-{3,}\s*(Forwarded|Original) message/i.test(line.trim())) break;

    // Skip quoted lines
    if (line.startsWith(">")) continue;

    result.push(line);
  }

  return result.join("\n").trim();
}
