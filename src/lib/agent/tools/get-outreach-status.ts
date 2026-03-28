import { supabaseAdmin } from "@/lib/supabase/server";

export const getOutreachStatusDef = {
  name: "get_outreach_status" as const,
  description:
    "Check the status of outreach drafts. Optionally filter by status (draft, pending_approval, approved, sent, failed). Useful to see what's been sent and what's pending.",
  input_schema: {
    type: "object" as const,
    properties: {
      status: {
        type: "string",
        enum: ["draft", "pending_approval", "approved", "sent", "failed"],
        description: "Filter by draft status. Omit to list all recent drafts.",
      },
      limit: {
        type: "number",
        description: "Maximum number of drafts to return. Defaults to 20.",
      },
    },
    required: [] as string[],
  },
};

export async function getOutreachStatus(input: {
  status?: string;
  limit?: number;
}): Promise<string> {
  const limit = Math.min(input.limit ?? 20, 50);

  let query = supabaseAdmin
    .from("outreach_drafts")
    .select("id, contact_id, subject, status, sent_at, created_at, contacts!inner(email, name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;

  if (error) return JSON.stringify({ error: error.message });
  if (!data || data.length === 0) {
    return JSON.stringify({ message: "No outreach drafts found.", count: 0 });
  }
  return JSON.stringify({ count: data.length, drafts: data });
}
