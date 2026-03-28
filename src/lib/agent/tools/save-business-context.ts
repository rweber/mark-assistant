import { supabaseAdmin } from "@/lib/supabase/server";

export const saveBusinessContextDef = {
  name: "save_business_context" as const,
  description:
    "Save or update a business context entry. Use this to persist learnings, observations, or facts about the business that will be useful in future runs. Key should be a short label (e.g., 'ideal_customer_size', 'competitor_analysis').",
  input_schema: {
    type: "object" as const,
    properties: {
      key: {
        type: "string",
        description: "A short, snake_case label for this context entry.",
      },
      value: {
        type: "string",
        description: "The context value to store.",
      },
    },
    required: ["key", "value"] as string[],
  },
};

export async function saveBusinessContext(input: {
  key: string;
  value: string;
}): Promise<string> {
  const { error } = await supabaseAdmin.from("business_context").upsert(
    {
      key: input.key,
      value: input.value,
      source: "agent_learned",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ saved: true, key: input.key });
}
