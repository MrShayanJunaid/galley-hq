import {
  BRAND_SECTIONS,
  VOICE_FIELDS,
  emptyVoiceConfig,
  type BrandVoiceConfig,
} from "@/lib/brand/schema";

type BrandProfileLike = Record<string, unknown> | null | undefined;

export type BrandContext = {
  clientId: string | null;
  brandName: string | null;
  websiteUrl: string | null;
  onboardingStatus: string;
  fields: Record<string, string>;
  voice: BrandVoiceConfig;
  websiteInsights: Record<string, unknown> | null;
  updatedAt: string | null;
};

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The canonical read path for brand intelligence. Future AI modules (ideas,
 * captions, creatives) must consume this instead of building their own
 * brand-information store.
 */
export function buildBrandContext(profile: BrandProfileLike): BrandContext {
  const source = profile ?? {};
  const fields: Record<string, string> = {};
  for (const section of BRAND_SECTIONS) {
    for (const field of section.fields) {
      const value = str(source[field.key]);
      if (value) fields[field.key] = value;
    }
  }

  const rawVoice = (source["voice_config"] ?? {}) as Record<string, unknown>;
  const voice = { ...emptyVoiceConfig };
  for (const field of VOICE_FIELDS) {
    voice[field.key] = str(rawVoice[field.key]);
  }

  return {
    clientId: str(source["client_id"]) || null,
    brandName: str(source["brand_name"]) || null,
    websiteUrl: str(source["website_url"]) || null,
    onboardingStatus: str(source["onboarding_status"]) || "not_started",
    fields,
    voice,
    websiteInsights: (source["website_analysis"] as Record<string, unknown> | null) ?? null,
    updatedAt: str(source["updated_at"]) || null,
  };
}

/** Prompt-ready rendering of the brand context for later AI features. */
export function renderBrandContext(context: BrandContext): string {
  const lines: string[] = [];
  if (context.brandName) lines.push(`Brand: ${context.brandName}`);
  for (const [key, value] of Object.entries(context.fields)) {
    if (key === "brand_name") continue;
    lines.push(`${key}: ${value}`);
  }
  for (const [key, value] of Object.entries(context.voice)) {
    if (value) lines.push(`voice.${key}: ${value}`);
  }
  return lines.join("\n");
}
