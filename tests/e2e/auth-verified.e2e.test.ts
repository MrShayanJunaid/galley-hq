import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser } from "playwright-core";

import {
  currentPath,
  launchBrowser,
  loginViaUi,
  newTrackedContext,
  visit,
} from "./helpers/browser";
import { PROTECTED_PATHS, hasStoredSession, serverFnFailures } from "./helpers/app";
import {
  createTestUser,
  deleteTestUser,
  signInWithPassword,
  userApi,
  type TestUser,
} from "./helpers/supabase";

describe("verified accounts", () => {
  let browser: Browser;
  let user: TestUser;
  let accessToken: string;

  beforeAll(async () => {
    browser = await launchBrowser();
    user = await createTestUser({
      verified: true,
      prefix: "verified",
      fullName: "Verified Tester",
      workspaceName: "Verified Agency",
    });

    const session = await signInWithPassword(user);
    expect(session.ok).toBe(true);
    accessToken = String(session.body.access_token);
  });

  afterAll(async () => {
    await browser?.close();
    if (user) await deleteTestUser(user.id).catch(() => null);
  });

  it("reports the email as verified to the database", async () => {
    const result = await userApi<boolean>("/rest/v1/rpc/is_email_verified", accessToken, {
      method: "POST",
      body: "{}",
    });
    expect(result.ok).toBe(true);
    expect(result.body).toBe(true);
  });

  it("logs in through the UI and lands on the dashboard", async () => {
    const { context, page } = await newTrackedContext(browser);
    try {
      await loginViaUi(page, user.email, user.password);
      expect(await currentPath(page)).toBe("/dashboard");
      expect(await hasStoredSession(page)).toBe(true);

      const body = await page.innerText("body");
      expect(body).toContain("Dashboard");
      expect(body).toContain("Free");
    } finally {
      await context.close();
    }
  });

  it("bootstraps a workspace the user can read", async () => {
    const members = await userApi<{ workspace_id: string; role: string }[]>(
      "/rest/v1/workspace_members?select=workspace_id,role",
      accessToken,
    );
    expect(members.ok).toBe(true);
    expect(Array.isArray(members.body)).toBe(true);
    expect(members.body.length).toBeGreaterThan(0);
  });

  it("opens every protected route, survives refresh and back navigation", async () => {
    const { context, page, responses } = await newTrackedContext(browser);
    try {
      await loginViaUi(page, user.email, user.password);

      for (const path of PROTECTED_PATHS) {
        await visit(page, path);
        expect(await currentPath(page), `deep link ${path}`).toBe(path);
      }

      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      expect(await currentPath(page)).toBe("/settings");

      await page.goBack();
      await page.waitForTimeout(2500);
      expect(await currentPath(page)).toBe("/workspace");

      // Protected server functions used by these pages must not be rejected.
      expect(serverFnFailures(responses)).toEqual([]);
    } finally {
      await context.close();
    }
  });

  it("keeps the session out of protected routes after signing out", async () => {
    const { context, page } = await newTrackedContext(browser);
    try {
      await loginViaUi(page, user.email, user.password);
      await page.getByRole("button", { name: "Log out" }).click();
      await page.waitForTimeout(4000);
      expect(await currentPath(page)).toBe("/auth");
      expect(await hasStoredSession(page)).toBe(false);

      await visit(page, "/dashboard");
      expect(await currentPath(page)).toBe("/auth");
    } finally {
      await context.close();
    }
  });
});
