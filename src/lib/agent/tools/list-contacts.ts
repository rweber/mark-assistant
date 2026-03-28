import { supabaseAdmin } from "@/lib/supabase/server";

export const listContactsDef = {
  name: "list_contacts" as const,
  description:
    "List contacts in the database, optionally filtered by status. Returns name, email, company, status, and last updated date.",
  input_schema: {
    type: "object" as const,
    properties: {
      status: {
        type: "string",
        enum: ["lead", "prospect", "customer", "dead"],
        description: "Filter by contact status. Omit to list all.",
      },
      limit: {
        type: "number",
        description: "Maximum number of contacts to return. Defaults to 50.",
      },
    },
    required: [] as string[],
  },
};

export async function listContacts(input: {
  status?: string;
  limit?: number;
}): Promise<string> {
  const limit = Math.min(input.limit ?? 50, 100);

  let query = supabaseAdmin
    .from("contacts")
    .select("id, email, name, company, status, metadata, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;

  if (error) return JSON.stringify({ error: error.message });
  if (!data || data.length === 0) {
    return JSON.stringify({ message: "No contacts found.", count: 0 });
  }
  return JSON.stringify({ count: data.length, contacts: data });
}
