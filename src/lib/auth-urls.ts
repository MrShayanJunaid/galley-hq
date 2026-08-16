/**
 * Canonical application URLs used for Supabase auth email redirects.
 *
 * Production auth links (password recovery, email verification) must always
 * come back to the GalleyHQ domain — never to a Lovable preview or published
 * `*.lovable.app` host. Local development and the editor preview keep using
 * the current origin so the flows stay testable there.
 */
export const PRODUCTION_APP_URL =
  (import.meta.env['VITE_APP_URL'] as string | undefined)?.replace(/\/$/, "") ||
  "https://galleyhq.com";

/** Hosts where auth links should stay on the current origin (dev + editor preview). */
const PREVIEW_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.0\.0\.1$/,
  /^\[::1\]$/,
  /\.lovableproject\.com$/i,
  /^id-preview.*\.lovable\.app$/i,
  /^preview--.*\.lovable\.app$/i,
];

/** Hosts that are the real production app and can be used as-is. */
const PRODUCTION_HOST_PATTERNS = [/^galleyhq\.com$/i, /^www\.galleyhq\.com$/i];

function isPreviewHost(hostname: string) {
  return PREVIEW_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function isProductionHost(hostname: string) {
  return PRODUCTION_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

/** Origin that auth emails should link back to. */
export function authAppOrigin() {
  if (typeof window === "undefined") return PRODUCTION_APP_URL;
  const { hostname, origin } = window.location;
  if (isProductionHost(hostname)) return origin;
  if (isPreviewHost(hostname)) return origin;
  // Any other host (e.g. the published *.lovable.app URL) must not appear in
  // production auth emails — always send users to the GalleyHQ domain.
  return PRODUCTION_APP_URL;
}

/** Absolute URL for an in-app auth path, e.g. `/auth/confirm`. */
export function authRedirectUrl(path: string) {
  return `${authAppOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

export const EMAIL_CONFIRM_PATH = "/auth/confirm";
export const PASSWORD_RESET_PATH = "/reset-password";
