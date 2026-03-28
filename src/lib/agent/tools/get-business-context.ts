import { supabaseAdmin } from "@/lib/supabase/server";
import type { BusinessContext } from "@/lib/supabase/types";

export const getBusinessContextDef = {
  name: "get_business_context" as const,
  description:
    "Retrieve all business context entries. Returns key-value pairs describing the business, its ideal customer profile, value proposition, industry, and any other learned context.",
  input_schema: {
    type: "object" as const,
    properties: {},
    required: [] as string[],
  },
};

export async function getBusinessContext(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("business_context")
    .select("*")
    .order("key");

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  const entries = data as BusinessContext[];
  if (entries.length === 0) {
    return JSON.stringify({
      message: "No business context found. The business has not been onboarded yet.",
    });
  }

  return JSON.stringify(entries);
}
