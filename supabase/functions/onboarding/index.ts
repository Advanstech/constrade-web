export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

const TOTAL_STEPS = 8;

function fnv(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** DEMO: deterministic CSD account from the user id. Replace with real CSD API. */
function generateCsdAccount(userId: string): string {
  const n = 1000000000 + (fnv(userId) % 900000000);
  return "CSD-" + n.toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await getUserFromAuth(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    switch (action) {
      case "status":
        return await status(user.id);

      case "progress":
        return await progress(user.id);

      case "saveStep":
        return await saveStep(user.id, body);

      case "submit":
        return await submit(user.id);

      default:
        return json({ error: "Unknown action: " + action }, 400);
    }
  } catch (e) {
    console.error("onboarding error", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});

async function getKyc(userId: string) {
  const { data } = await serviceClient
    .schema("cc")
    .from("kyc")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as {
    user_id: string;
    data: Record<string, unknown>;
    completed_steps: number;
    status: string;
  } | null) ?? { user_id: userId, data: {}, completed_steps: 0, status: "in_progress" };
}

async function status(userId: string) {
  const profile = await getProfile(userId);
  if (!profile) return json({ error: "Profile not found" }, 404);

  return json({
    application: {
      status: profile.kyc_status,
      onboarded: profile.onboarded,
      csdAccount: profile.csd_account,
      fullName: profile.full_name,
      phone: profile.phone,
    },
  });
}

async function progress(userId: string) {
  const kyc = await getKyc(userId);
  const profile = await getProfile(userId);

  return json({
    progress: {
      completedSteps: kyc.completed_steps,
      totalSteps: TOTAL_STEPS,
      status: profile?.kyc_status === "approved" ? "approved" : kyc.status,
      data: kyc.data ?? {},
    },
  });
}

async function saveStep(userId: string, body: Record<string, unknown>) {
  const step = Number(body.step);
  const stepData = (body.data as Record<string, unknown>) ?? {};

  if (!Number.isInteger(step) || step < 1 || step > TOTAL_STEPS) {
    return json({ error: "Invalid step" }, 400);
  }
  if (typeof stepData !== "object" || Array.isArray(stepData)) {
    return json({ error: "data must be an object" }, 400);
  }

  const existing = await getKyc(userId);
  const merged = { ...existing.data, [String(step)]: stepData };
  const completedSteps = Math.max(existing.completed_steps, step);

  const { error } = await serviceClient.schema("cc").from("kyc").upsert({
    user_id: userId,
    data: merged,
    completed_steps: completedSteps,
    status: existing.status === "approved" ? "approved" : "in_progress",
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("saveStep error", error);
    return json({ error: "Could not save progress" }, 500);
  }

  return json({
    progress: { completedSteps, totalSteps: TOTAL_STEPS, saved: true },
  });
}

async function submit(userId: string) {
  const kyc = await getKyc(userId);
  // The final step (review & submit) is not a saveable form step, so require
  // all form steps (1..TOTAL_STEPS-1) to be completed.
  if (kyc.completed_steps < TOTAL_STEPS - 1) {
    return json({ error: `Complete all ${TOTAL_STEPS} steps before submitting` }, 400);
  }

  const step2 = (kyc.data["2"] as Record<string, unknown>) ?? {};
  const step3 = (kyc.data["3"] as Record<string, unknown>) ?? {};
  const fullName = [
    step2.title,
    step2.firstName,
    step2.surname,
  ].filter((v) => typeof v === "string" && v.trim()).join(" ").trim();
  const phone = typeof step3.mobile1 === "string" ? step3.mobile1 : "";

  // DEMO: simulate instant approval so clients receive their CSD account
  // immediately. The real flow will submit to Constant Capital's KYC/CSD API.
  const csdAccount = generateCsdAccount(userId);
  const now = new Date().toISOString();

  const { error } = await serviceClient.schema("cc").from("profiles").update({
    full_name: fullName || undefined,
    phone: phone || undefined,
    kyc_status: "approved",
    csd_account: csdAccount,
    onboarded: true,
    updated_at: now,
  }).eq("user_id", userId);

  if (error) {
    console.error("onboarding submit error", error);
    return json({ error: "Could not submit application" }, 500);
  }

  await serviceClient.schema("cc").from("kyc").upsert({
    user_id: userId,
    completed_steps: TOTAL_STEPS,
    status: "approved",
    updated_at: now,
  });

  return json({
    message: "Application approved",
    application: {
      id: "APP-" + now.slice(0, 10).replace(/-/g, ""),
      status: "approved",
      csdAccount,
      onboarded: true,
    },
  });
}
