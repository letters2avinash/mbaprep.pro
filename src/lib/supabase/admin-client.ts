import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

// Service-role client. Bypasses RLS, so use it only in server code, and only
// after the caller's role has been checked (see lib/auth/require-admin.ts).
export function createSupabaseAdminClient() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
