import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Full-privilege client (bypasses RLS). Used for all data ops inside functions.
export const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export interface CcUser {
  id: string;
  email?: string;
}

/**
 * Resolve the caller from the Authorization header (the session JWT sent
 * automatically by supabase.functions.invoke). Returns null when unauthenticated.
 */
export async function getUserFromAuth(req: Request): Promise<CcUser | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email };
}

export interface ProfileRow {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  kyc_status: string;
  csd_account: string | null;
  onboarded: boolean;
  created_at: string;
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await serviceClient
    .schema("cc")
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return (data as ProfileRow) ?? null;
}

export const STAFF_ROLES = ["admin", "compliance", "trader"] as const;
export const ADMIN_ROLES = ["admin", "compliance"] as const;

export function isStaff(role: string): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export function isAdminRole(role: string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}
