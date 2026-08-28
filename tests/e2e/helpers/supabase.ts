import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from "./env";

type Json = Record<string, unknown>;

export type TestUser = {
  id: string;
  email: string;
  password: string;
};

export type ApiResult<T = unknown> = {
  status: number;
  ok: boolean;
  body: T;
};

async function request<T = unknown>(
  path: string,
  init: RequestInit & { key: string; token?: string },
): Promise<ApiResult<T>> {
  const { key, token, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("apikey", key);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${SUPABASE_URL}${path}`, { ...rest, headers });
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON error bodies are returned as raw text.
  }
  return { status: response.status, ok: response.ok, body: body as T };
}

const admin = <T = unknown>(path: string, init: RequestInit = {}) =>
  request<T>(path, { ...init, key: SUPABASE_SERVICE_ROLE_KEY, token: SUPABASE_SERVICE_ROLE_KEY });

export const anonApi = <T = unknown>(path: string, init: RequestInit = {}) =>
  request<T>(path, { ...init, key: SUPABASE_PUBLISHABLE_KEY });

export const userApi = <T = unknown>(
  path: string,
  token: string,
  init: RequestInit = {},
) => request<T>(path, { ...init, key: SUPABASE_PUBLISHABLE_KEY, token });

export function uniqueEmail(prefix: string): string {
  return `e2e-${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

export const TEST_PASSWORD = "E2eTestPass!2345";

/** Creates a user directly through the Auth admin API. */
export async function createTestUser(options: {
  verified: boolean;
  prefix: string;
  fullName?: string;
  workspaceName?: string;
}): Promise<TestUser> {
  const email = uniqueEmail(options.prefix);
  const result = await admin<{ id: string }>("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      password: TEST_PASSWORD,
      email_confirm: options.verified,
      user_metadata: {
        full_name: options.fullName ?? "E2E Tester",
        workspace_name: options.workspaceName ?? "E2E Workspace",
      },
    }),
  });

  if (!result.ok) {
    throw new Error(`Failed to create test user: ${result.status} ${JSON.stringify(result.body)}`);
  }
  return { id: result.body.id, email, password: TEST_PASSWORD };
}

/** Password sign-in through the Auth API (bypasses the UI). */
export async function signInWithPassword(user: TestUser) {
  return anonApi<Json & { access_token?: string; error_code?: string; msg?: string }>(
    "/auth/v1/token?grant_type=password",
    { method: "POST", body: JSON.stringify({ email: user.email, password: user.password }) },
  );
}

export async function resendVerification(email: string) {
  return anonApi("/auth/v1/resend", {
    method: "POST",
    body: JSON.stringify({ type: "signup", email }),
  });
}

/** Removes the user plus the rows that reference it, so auth deletion succeeds. */
export async function deleteTestUser(userId: string): Promise<void> {
  await admin(`/rest/v1/subscriptions?workspace_id=in.(${await ownedWorkspaceIds(userId)})`, {
    method: "DELETE",
  }).catch(() => null);
  await admin(`/rest/v1/workspaces?owner_id=eq.${userId}`, { method: "DELETE" }).catch(() => null);
  await admin(`/rest/v1/profiles?id=eq.${userId}`, { method: "DELETE" }).catch(() => null);
  await admin(`/auth/v1/admin/users/${userId}`, { method: "DELETE" });
}

async function ownedWorkspaceIds(userId: string): Promise<string> {
  const result = await admin<{ id: string }[]>(
    `/rest/v1/workspaces?owner_id=eq.${userId}&select=id`,
  );
  if (!result.ok || !Array.isArray(result.body) || result.body.length === 0) return "00000000-0000-0000-0000-000000000000";
  return result.body.map((row) => row.id).join(",");
}

/** Looks up a user id by email through the Auth admin API. */
export async function getUserIdByEmail(email: string): Promise<string | null> {
  const result = await admin<{ users?: { id: string; email: string }[] }>(
    `/auth/v1/admin/users?filter=${encodeURIComponent(email)}&per_page=50`,
  );
  if (!result.ok) return null;
  const match = result.body.users?.find((user) => user.email === email);
  return match?.id ?? null;
}
