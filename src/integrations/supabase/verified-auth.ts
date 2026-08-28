import { createMiddleware } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server middleware for every protected server function.
 *
 * Extends the generated bearer-token middleware with a hard email-verification
 * check performed in the database (`public.is_email_verified()` reads
 * `auth.users.email_confirmed_at` for the caller). An authenticated session
 * whose email is not confirmed is rejected before any handler runs, so route
 * guards are never the only defence.
 */
export const requireVerifiedSupabaseAuth = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const client = context.supabase as unknown as {
      rpc: (fn: string) => Promise<{ data: unknown; error: unknown }>;
    };
    const { data, error } = await client.rpc("is_email_verified");
    if (error || data !== true) {
      throw new Error("Unauthorized: email address not verified");
    }
    return next();
  });
