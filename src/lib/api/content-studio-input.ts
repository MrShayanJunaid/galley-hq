/**
 * Pure input coercion shared by the Content Studio server functions.
 * Kept outside *.functions.ts so the server-fn splitter cannot strip it.
 */
import type { ContentDraft, ContentIdea } from "@/lib/content/schema";

export type StudioConfigInput = {
  platform: string;
  contentType: string;
  objective: string;
  topic: string;
};

export type GenerationFailure = {
  ok: false;
  code: string;
  message: string;
  retryable: boolean;
};

export const FORBIDDEN_RESULT: GenerationFailure = {
  ok: false,
  code: "forbidden",
  message: "This client is not available in your workspace.",
  retryable: false,
};

export function coerceConfig(input: unknown): StudioConfigInput {
  const raw = (input ?? {}) as Record<string, unknown>;
  return {
    platform: String(raw["platform"] ?? "instagram"),
    contentType: String(raw["contentType"] ?? "educational"),
    objective: String(raw["objective"] ?? "awareness"),
    topic: String(raw["topic"] ?? "").slice(0, 2000),
  };
}

export function coerceIdea(input: unknown): ContentIdea {
  const raw = (input ?? {}) as Record<string, unknown>;
  const str = (key: string) => String(raw[key] ?? "").slice(0, 1200);
  return {
    id: str("id"),
    title: str("title"),
    concept: str("concept"),
    explanation: str("explanation"),
    angle: str("angle"),
    format: str("format"),
  };
}

export function coerceDraft(input: unknown): ContentDraft {
  const raw = (input ?? {}) as Record<string, unknown>;
  return {
    hook: String(raw["hook"] ?? "").slice(0, 2000),
    body: String(raw["body"] ?? "").slice(0, 8000),
    cta: String(raw["cta"] ?? "").slice(0, 1000),
    hashtags: Array.isArray(raw["hashtags"])
      ? (raw["hashtags"] as unknown[]).filter((v): v is string => typeof v === "string").slice(0, 30)
      : [],
  };
}

export function coerceSection(
  value: unknown,
): "hook" | "body" | "cta" | "hashtags" | null {
  return value === "hook" || value === "body" || value === "cta" || value === "hashtags"
    ? value
    : null;
}
