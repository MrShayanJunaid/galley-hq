import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";

import { APP_URL, SUPABASE_URL } from "./env";

/**
 * Resolves the Chromium binary. Honors E2E_CHROMIUM_PATH, then the
 * PLAYWRIGHT_BROWSERS_PATH install, then Playwright's own default lookup.
 */
function resolveExecutablePath(): string | undefined {
  const explicit = process.env["E2E_CHROMIUM_PATH"];
  if (explicit && existsSync(explicit)) return explicit;

  const root = process.env["PLAYWRIGHT_BROWSERS_PATH"];
  if (!root || !existsSync(root)) return undefined;

  const candidates = readdirSync(root)
    .filter((entry) => entry.startsWith("chromium"))
    .sort()
    .reverse();

  for (const dir of candidates) {
    for (const binary of [
      join(root, dir, "chrome-linux", "headless_shell"),
      join(root, dir, "chrome-linux", "chrome"),
      join(root, dir, "chrome-headless-shell-linux64", "chrome-headless-shell"),
    ]) {
      if (existsSync(binary)) return binary;
    }
  }
  return undefined;
}

export async function launchBrowser(): Promise<Browser> {
  const executablePath = resolveExecutablePath();
  return chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
}

export type TrackedContext = {
  context: BrowserContext;
  page: Page;
  /** Every network response the page received, in order. */
  responses: { url: string; status: number }[];
};

export async function newTrackedContext(browser: Browser): Promise<TrackedContext> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1600 } });
  const page = await context.newPage();
  const responses: { url: string; status: number }[] = [];
  page.on("response", (response) => {
    responses.push({ url: response.url(), status: response.status() });
  });
  return { context, page, responses };
}

/** Navigates and waits for the client router to settle. */
export async function visit(page: Page, path: string): Promise<void> {
  await page.goto(`${APP_URL}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
}

export async function currentPath(page: Page): Promise<string> {
  return new URL(page.url()).pathname;
}

/** Signs in through the real login form. */
export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await visit(page, "/auth");
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.click("button[type=submit]");
  await page.waitForTimeout(4000);
}

export const SERVER_FN_PATTERN = /_serverFn/;

/**
 * Makes `GET /auth/v1/user` report an unverified email for this context.
 * Supabase never mints a session for an unverified account, so this is how the
 * suite exercises the route gate against a session that becomes unverified.
 */
export async function simulateUnverifiedEmail(context: BrowserContext): Promise<void> {
  await context.route(`${SUPABASE_URL}/auth/v1/user*`, async (route) => {
    const response = await route.fetch();
    let body: Record<string, unknown>;
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      await route.fulfill({ response });
      return;
    }
    await route.fulfill({
      response,
      json: { ...body, email_confirmed_at: null, confirmed_at: null },
    });
  });
}
