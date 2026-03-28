import { supabaseAdmin } from "@/lib/supabase/server";

export const draftOutreachDef = {
  name: "draft_outreach" as const,
  description:
    "Create a draft outreach email for a contact. The email will be presented to the owner for approval before sending. The owner must explicitly approve it.",
  input_schema: {
    type: "object" as const,
    properties: {
      contact_id: {
        type: "string",
        description: "UUID of the contact to draft outreach for",
      },
      subject: {
        type: "string",
        description: "Email subject line",
      },
      body_text: {
        type: "string",
        description: "Plain text email body",
      },
      body_html: {
        type: "string",
        description:
          "HTML email body. If not provided, the plain text body will be used.",
      },
    },
    required: ["contact_id", "subject", "body_text"] as string[],
  },
};

export async function draftOutreach(input: {
  contact_id: string;
  subject: string;
  body_text: string;
  body_html?: string;
}): Promise<string> {
  // Verify the contact exists
  const { data: contact, error: contactError } = await supabaseAdmin
    .from("contacts")
    .select("id, name, email, company")
    .eq("id", input.contact_id)
    .maybeSingle();

  if (contactError || !contact) {
    return JSON.stringify({
      error: `Contact not found: ${input.contact_id}`,
    });
  }

  const { data, error } = await supabaseAdmin
    .from("outreach_drafts")
    .insert({
      contact_id: input.contact_id,
      subject: input.subject,
      body_text: input.body_text,
      body_html: input.body_html ?? `<p>${input.body_text.replace(/\n/g, "</p><p>")}</p>`,
      status: "pending_approval",
    })
    .select("id")
    .single();

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  return JSON.stringify({
    action: "draft_created",
    id: data.id,
    message: `Draft outreach created for ${contact.name} (${contact.email}) at ${contact.company}. Subject: "${input.subject}". Awaiting owner approval.`,
  });
}
