import { supabaseAdmin } from "@/lib/supabase/server";

export const getConversationHistoryDef = {
  name: "get_conversation_history" as const,
  description:
    "Fetch recent email messages, optionally filtered by a contact's email address. Returns the most recent messages to provide conversation context.",
  input_schema: {
    type: "object" as const,
    properties: {
      contact_email: {
        type: "string",
        description:
          "Filter messages involving this email address. If omitted, returns all recent messages.",
      },
      limit: {
        type: "number",
        description: "Max messages to return. Defaults to 20.",
      },
    },
    required: [] as string[],
  },
};

export async function getConversationHistory(input: {
  contact_email?: string;
  limit?: number;
}): Promise<string> {
  const maxMessages = Math.min(input.limit ?? 20, 50);

  let query = supabaseAdmin
    .from("email_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(maxMessages);

  if (input.contact_email) {
    query = query.or(
      `from_email.eq.${input.contact_email},to_email.eq.${input.contact_email}`
    );
  }

  const { data, error } = await query;

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!data || data.length === 0) {
    return JSON.stringify({
      message: input.contact_email
        ? `No email history found for ${input.contact_email}.`
        : "No email history found.",
    });
  }

  // Return condensed view (no full HTML bodies to save tokens)
  const condensed = data.map((m) => ({
    direction: m.direction,
    from: m.from_email,
    to: m.to_email,
    subject: m.subject,
    body_preview: m.body_text?.slice(0, 300) ?? "",
    date: m.created_at,
  }));

  return JSON.stringify(condensed);
}
