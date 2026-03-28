import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Missing RESEND_API_KEY");
    _resend = new Resend(key);
  }
  return _resend;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
}

export async function sendEmail(opts: SendEmailOptions) {
  const fromEmail = process.env.MARK_FROM_EMAIL ?? "mark@vpak.com";
  const fromName = process.env.MARK_FROM_NAME ?? "Mark | VPAK";

  const headers: Record<string, string> = {};
  if (opts.inReplyTo) {
    headers["In-Reply-To"] = opts.inReplyTo;
  }
  if (opts.references) {
    headers["References"] = opts.references;
  }

  const { data, error } = await getResend().emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    replyTo: opts.replyTo,
    headers,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  return data;
}
