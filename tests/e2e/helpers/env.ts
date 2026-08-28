import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Loads `.env` values into process.env without overwriting real env vars. */
function loadDotEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
      if (!match) continue;
      const key = match[1] as string;
      const value = (match[2] as string).replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env is optional when the variables are already exported.
  }
}

loadDotEnv();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. The auth e2e suite needs it to create and clean up test accounts.`,
    );
  }
  return value;
}

export const APP_URL = process.env["E2E_APP_URL"] ?? "http://localhost:8080";
export const SUPABASE_URL = required("SUPABASE_URL");
export const SUPABASE_PUBLISHABLE_KEY = required("SUPABASE_PUBLISHABLE_KEY");
export const SUPABASE_SERVICE_ROLE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");
