import type { Page } from "playwright-core";

/** Every route that must require a verified, signed-in user. */
export const PROTECTED_PATHS = [
  "/dashboard",
  "/clients",
  "/content",
  "/brand",
  "/workspace",
  "/settings",
] as const;

export const UNVERIFIED_MESSAGE =
  "Please verify your email before signing in. Check your inbox for the verification email.";

type Response = { url: string; status: number };

const isServerFn = (response: Response) => response.url.includes("_serverFn");

export function successfulServerFnCalls(responses: Response[]): number {
  return responses.filter((response) => isServerFn(response) && response.status < 300).length;
}

export function serverFnFailures(responses: Response[]): Response[] {
  return responses.filter(
    (response) => isServerFn(response) && (response.status === 401 || response.status === 403),
  );
}

/** True when the Supabase client has persisted an auth session in this page. */
export async function hasStoredSession(page: Page): Promise<boolean> {
  return page.evaluate(() =>
    Object.keys(window.localStorage).some((key) => {
      if (!key.includes("auth-token")) return false;
      try {
        return Boolean(JSON.parse(window.localStorage.getItem(key) ?? "null")?.access_token);
      } catch {
        return false;
      }
    }),
  );
}
