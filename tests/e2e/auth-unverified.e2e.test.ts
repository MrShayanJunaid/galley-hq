import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser } from "playwright-core";

import { APP_URL } from "./helpers/env";
import {
  currentPath,
  launchBrowser,
  loginViaUi,
  newTrackedContext,
  simulateUnverifiedEmail,
  visit,
  type TrackedContext,
} from "./helpers/browser";
import {
  PROTECTED_PATHS,
  UNVERIFIED_MESSAGE,
  hasStoredSession,
  successfulServerFnCalls,
} from "./helpers/app";
import {
  anonApi,
  createTestUser,
  deleteTestUser,
  getUserIdByEmail,
  resendVerification,
  signInWithPassword,
  TEST_PASSWORD,
  uniqueEmail,
  userApi,
  type TestUser,
} from "./helpers/supabase";

describe("unverified accounts", () => {
  let browser: Browser;
  let unverified: TestUser;
  const cleanupUserIds: string[] = [];

  beforeAll(async () => {
    browser = await launchBrowser();
    unverified = await createTestUser({ verified: false, prefix: "unverified" });
    cleanupUserIds.push(unverified.id);
  });

  afterAll(async () => {
    await browser.close();
    for (const id of cleanupUserIds) {
      await deleteTestUser(id).catch(() => null);
    }
  });

  it("signs up a new account and asks the user to confirm their email", async () => {
    const email = uniqueEmail("signup");
    const { context, page } = await newTrackedContext(browser);
    try {
      await visit(page, "/auth");
      await page.getByRole("tab", { name: "Sign up" }).click();
      await page.fill("#signup-name", "E2E Signup");
      await page.fill("#signup-workspace", "E2E Signup Agency");
      await page.fill("#signup-email", email);
      await page.fill("#signup-password", TEST_PASSWORD);
      await page.click("button[type=submit]");
      await page.waitForTimeout(6000);

      const body = await page.innerText("body");
      expect(body).toContain("Check your email");
      expect(await currentPath(page)).toBe("/auth");
      expect(await hasStoredSession(page)).toBe(false);

      const id = await getUserIdByEmail(email);
      expect(id).toBeTruthy();
      if (id) cleanupUserIds.push(id);
    } finally {
      await context.close();
    }
  });

  it("refuses password sign-in at the auth API", async () => {
    const result = await signInWithPassword(unverified);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result.body)).toContain("email_not_confirmed");
  });

  it("blocks login in the UI, keeps no session and offers a resend action", async () => {
    const { context, page } = await newTrackedContext(browser);
    try {
      await loginViaUi(page, unverified.email, unverified.password);

      expect(await currentPath(page)).toBe("/auth");
      expect(await page.innerText("body")).toContain(UNVERIFIED_MESSAGE);
      expect(await page.getByRole("button", { name: "Resend verification email" }).count()).toBe(1);
      expect(await hasStoredSession(page)).toBe(false);
    } finally {
      await context.close();
    }
  });

  it("resends the verification email", async () => {
    const result = await resendVerification(unverified.email);
    // 429 means the project rate limit was hit, which is still correct behavior.
    expect([200, 429]).toContain(result.status);
  });

  it("redirects deep links to protected routes back to /auth when signed out", async () => {
    const { context, page } = await newTrackedContext(browser);
    try {
      for (const path of PROTECTED_PATHS) {
        await visit(page, path);
        expect(await currentPath(page), `deep link ${path}`).toBe("/auth");
      }

      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      expect(await currentPath(page)).toBe("/auth");

      await page.goBack();
      await page.waitForTimeout(2000);
      expect(await currentPath(page)).toBe("/auth");
    } finally {
      await context.close();
    }
  });

  it("keeps an unverified session out of every protected route and server function", async () => {
    // A session whose email is unverified: real gate, real routing.
    const verified = await createTestUser({ verified: true, prefix: "stale-session" });
    cleanupUserIds.push(verified.id);

    let tracked: TrackedContext | undefined;
    try {
      tracked = await newTrackedContext(browser);
      const { context, page, responses } = tracked;

      await loginViaUi(page, verified.email, verified.password);
      expect(await currentPath(page)).toBe("/dashboard");

      await simulateUnverifiedEmail(context);
      responses.length = 0;

      for (const path of PROTECTED_PATHS) {
        await visit(page, path);
        expect(await currentPath(page), `unverified deep link ${path}`).toBe("/verify-email");
      }

      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      expect(await currentPath(page)).toBe("/verify-email");

      await page.goBack();
      await page.waitForTimeout(2000);
      expect(await currentPath(page)).toBe("/verify-email");

      expect(await page.innerText("body")).toContain("Verify your email");
      expect(successfulServerFnCalls(responses)).toBe(0);
    } finally {
      await tracked?.context.close();
    }
  });

  it("rejects unauthenticated calls to the data API", async () => {
    const rpc = await anonApi("/rest/v1/rpc/is_email_verified", { method: "POST", body: "{}" });
    expect(rpc.ok).toBe(false);
    expect(rpc.status).toBe(401);

    // Client rows are RLS-filtered, so anonymous reads must come back empty.
    const clients = await anonApi<unknown[]>("/rest/v1/clients?select=id");
    expect(clients.body).toEqual([]);

    const workspaces = await anonApi<unknown[]>("/rest/v1/workspaces?select=id");
    expect(workspaces.body).toEqual([]);
  });

  it("returns no workspace data for a bogus bearer token", async () => {
    const result = await userApi("/rest/v1/workspace_members?select=workspace_id", "not-a-token");
    expect(result.ok).toBe(false);
  });

  it("serves the app shell without leaking protected content", async () => {
    const response = await fetch(`${APP_URL}/dashboard`);
    const html = await response.text();
    expect(html).not.toContain("CURRENT PLAN");
  });
});
