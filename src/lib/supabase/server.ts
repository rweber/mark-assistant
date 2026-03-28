import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Server-side Supabase client with service role key.
 * Bypasses RLS — use only in server contexts (API routes, cron jobs).
 * Lazily initialized to avoid build-time errors when env vars aren't set.
 */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) {
        throw new Error(
          "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
        );
      }
      _client = createClient(url, key);
    }
    return (_client as unknown as Record<string, unknown>)[prop as string];
  },
});
