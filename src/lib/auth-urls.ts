/**
 * Canonical application URLs used for Supabase auth email redirects.
 *
 * Production auth links must always come back to galleyhq.com — never to a
 * Lovable preview host. During local/preview development we keep using the
 * current origin so the flows stay testable.
 */
export const PRODUCTION_APP_URL = "https://galleyhq.com";

const DEV_HOST_PATTERNS = [/^localhost$/i, /^127\.0\.0\.1$/, /\.lovable\.app$/i, /\.lovableproject\.com$/i];

function isDevelopmentHost(hostname: string) {
  return DEV_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

/** Origin that auth emails should link back to. */
export function authAppOrigin() {
  if (typeof window === "undefined") return PRODUCTION_APP_URL;
  return isDevelopmentHost(window.location.hostname)
    ? window.location.origin
    : PRODUCTION_APP_URL;
}

/** Absolute URL for an in-app auth path, e.g. `/auth/confirm`. */
export function authRedirectUrl(path: string) {
  return `${authAppOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

export const EMAIL_CONFIRM_PATH = "/auth/confirm";
export const PASSWORD_RESET_PATH = "/reset-password";
