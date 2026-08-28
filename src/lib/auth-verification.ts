import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { EMAIL_CONFIRM_PATH, authRedirectUrl } from "@/lib/auth-urls";

export const UNVERIFIED_MESSAGE =
  "Please verify your email before signing in. Check your inbox for the verification email.";

/** True when the account's email address has been confirmed by Supabase. */
export function isEmailVerified(user: User | null | undefined): boolean {
  if (!user) return false;
  // OAuth identities (Google) arrive pre-verified with confirmed_at set.
  return Boolean(user.email_confirmed_at ?? user.confirmed_at);
}

/**
 * Re-reads the user from the Auth server (never from cached storage) and
 * reports whether the current session belongs to a verified account.
 */
export async function fetchVerificationState(): Promise<{
  user: User | null;
  verified: boolean;
}> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { user: null, verified: false };
  return { user: data.user, verified: isEmailVerified(data.user) };
}

/** Resends the signup confirmation email, respecting Supabase rate limits. */
export async function resendVerificationEmail(email: string) {
  return supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: authRedirectUrl(EMAIL_CONFIRM_PATH) },
  });
}

/** Maps Supabase resend errors to safe, user-facing copy. */
export function resendErrorMessage(message: string | undefined): string {
  const text = (message ?? "").toLowerCase();
  if (text.includes("rate") || text.includes("limit") || text.includes("seconds")) {
    return "Too many requests. Please wait a minute before requesting another email.";
  }
  if (text.includes("already") && text.includes("confirm")) {
    return "This email is already verified — you can sign in now.";
  }
  return "We couldn't send the verification email. Please try again shortly.";
}
