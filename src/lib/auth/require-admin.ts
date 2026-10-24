import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const ADMIN_SUB_ROLES = ["content", "website", "academic", "marketing", "sales", "accounts"] as const;
export type AdminSubRole = (typeof ADMIN_SUB_ROLES)[number];

export class AccessDeniedError extends Error {}

// Checks, on the server, that the caller is signed in as an admin whose
// sub_role is in allowedSubRoles. The role is read from the profiles table
// with the service role, never from the browser or from user metadata.
export async function requireAdmin(allowedSubRoles: readonly AdminSubRole[]): Promise<{ userId: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    throw new AccessDeniedError("Sign in to continue.");
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("role, sub_role")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw error;
  }

  const allowed =
    profile?.role === "admin" && profile.sub_role !== null && allowedSubRoles.includes(profile.sub_role as AdminSubRole);
  if (!allowed) {
    throw new AccessDeniedError("You do not have access to this page.");
  }

  return { userId };
}
