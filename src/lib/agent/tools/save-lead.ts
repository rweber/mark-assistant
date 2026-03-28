import { supabaseAdmin } from "@/lib/supabase/server";

export const saveLeadDef = {
  name: "save_lead" as const,
  description:
    "Save a newly discovered lead to the knowledge base. Deduplicates by email address — if a contact with the same email exists, it updates the existing record instead of creating a duplicate.",
  input_schema: {
    type: "object" as const,
    properties: {
      email: { type: "string", description: "Lead's email address" },
      name: { type: "string", description: "Lead's full name" },
      company: { type: "string", description: "Company name" },
      company_domain: {
        type: "string",
        description: "Company website domain (e.g., example.com)",
      },
      title: { type: "string", description: "Job title" },
      notes: {
        type: "string",
        description: "Why this lead is relevant, how they were found",
      },
    },
    required: ["email", "name", "company"] as string[],
  },
};

export async function saveLead(input: {
  email: string;
  name: string;
  company: string;
  company_domain?: string;
  title?: string;
  notes?: string;
}): Promise<string> {
  // Check for existing contact by email
  const { data: existing } = await supabaseAdmin
    .from("contacts")
    .select("id, email")
    .eq("email", input.email.toLowerCase())
    .maybeSingle();

  if (existing) {
    // Update existing contact
    const { error } = await supabaseAdmin
      .from("contacts")
      .update({
        name: input.name,
        company: input.company,
        company_domain: input.company_domain ?? null,
        title: input.title ?? null,
        metadata: input.notes ? { notes: input.notes } : undefined,
      })
      .eq("id", existing.id);

    if (error) {
      return JSON.stringify({ error: error.message });
    }
    return JSON.stringify({
      action: "updated",
      id: existing.id,
      message: `Updated existing contact: ${input.name} (${input.email})`,
    });
  }

  // Create new contact
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .insert({
      email: input.email.toLowerCase(),
      name: input.name,
      company: input.company,
      company_domain: input.company_domain ?? null,
      title: input.title ?? null,
      source: "web_search",
      status: "lead",
      metadata: input.notes ? { notes: input.notes } : {},
    })
    .select("id")
    .single();

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  return JSON.stringify({
    action: "created",
    id: data.id,
    message: `Saved new lead: ${input.name} at ${input.company} (${input.email})`,
  });
}
