type RpcClient = { rpc: (fn: string) => Promise<{ data: unknown; error: unknown }> };

export async function isPlatformAdmin(supabase: unknown): Promise<boolean> {
  const { data, error } = await (supabase as RpcClient).rpc("is_platform_admin");
  return !error && data === true;
}

/** Throws unless the caller's own session carries the platform admin role. */
export async function assertAdmin(supabase: unknown): Promise<void> {
  if (!(await isPlatformAdmin(supabase))) {
    throw new Error("Forbidden: admin role required");
  }
}

/** Privileged, server-only client. Loaded lazily so it never enters client bundles. */
export async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
