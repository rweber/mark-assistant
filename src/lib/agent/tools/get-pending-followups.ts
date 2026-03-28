import { supabaseAdmin } from "@/lib/supabase/server";

export const getPendingFollowupsDef = {
  name: "get_pending_followups" as const,
  description:
    "Get contacts that need follow-up. Returns contacts with status 'lead' or 'prospect' who haven't been contacted recently, along with their last email interaction.",
  input_schema: {
    type: "object" as const,
    properties: {
      days_since_last_contact: {
        type: "number",
        description:
          "Only return contacts not contacted in this many days. Defaults to 7.",
      },
    },
    required: [] as string[],
  },
};

export async function getPendingFollowups(input: {
  days_since_last_contact?: number;
}): Promise<string> {
  const daysCutoff = input.days_since_last_contact ?? 7;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysCutoff);

  const { data: contacts, error } = await supabaseAdmin
    .from("contacts")
    .select("*")
    .in("status", ["lead", "prospect"])
    .lt("updated_at", cutoffDate.toISOString())
    .order("updated_at", { ascending: true })
    .limit(10);

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!contacts || contacts.length === 0) {
    return JSON.stringify({
      message: "No contacts need follow-up at this time.",
    });
  }

  return JSON.stringify(contacts);
}
