import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  BRAND_SECTIONS,
  VOICE_FIELDS,
  computeCompletion,
  emptyVoiceConfig,
  normalizeWebsiteUrl,
  type BrandFieldValues,
  type BrandSuggestions,
  type BrandTextField,
  type BrandVoiceConfig,
} from "@/lib/brand/schema";

export type BrandProfile = Database["public"]["Tables"]["client_brand_profiles"]["Row"];
export type BrandAnalysisRun = Database["public"]["Tables"]["brand_analysis_runs"]["Row"];

export { isValidWebsiteUrl, normalizeWebsiteUrl } from "@/lib/brand/schema";

export const brandProfileKeys = {
  detail: (clientId: string) => ["brand-profile", clientId] as const,
  runs: (clientId: string) => ["brand-analysis-runs", clientId] as const,
};

const TEXT_FIELDS: BrandTextField[] = BRAND_SECTIONS.flatMap((section) =>
  section.fields.map((field) => field.key),
);

function normalize(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function profileToValues(
  profile: BrandProfile | null | undefined,
  fallback?: { brandName?: string | null; website?: string | null },
): BrandFieldValues {
  const values = {} as BrandFieldValues;
  for (const key of TEXT_FIELDS) {
    const raw = profile ? ((profile as unknown as Record<string, unknown>)[key] as string | null) : null;
    values[key] = raw ?? "";
  }
  if (!values.brand_name) values.brand_name = fallback?.brandName ?? "";
  if (!values.website_url) values.website_url = fallback?.website ?? "";

  const rawVoice = (profile?.voice_config ?? {}) as Record<string, unknown>;
  const voice = { ...emptyVoiceConfig };
  for (const field of VOICE_FIELDS) {
    voice[field.key] = typeof rawVoice[field.key] === "string" ? (rawVoice[field.key] as string) : "";
  }
  values.voice = voice;
  return values;
}

export function profileSuggestions(profile: BrandProfile | null | undefined): BrandSuggestions {
  const raw = (profile?.ai_suggestions ?? {}) as Record<string, unknown>;
  const values = (raw["values"] ?? {}) as Record<string, unknown>;
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string" && value.trim()) clean[key] = value.trim();
  }
  return {
    values: clean,
    generatedAt: (raw["generatedAt"] as string | null) ?? profile?.ai_suggestions_at ?? null,
    model: (raw["model"] as string | null) ?? null,
    sourceUrl: (raw["sourceUrl"] as string | null) ?? null,
  };
}

/** RLS restricts rows to members of the owning workspace. */
export async function fetchBrandProfile(clientId: string): Promise<BrandProfile | null> {
  const { data, error } = await supabase
    .from("client_brand_profiles")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchAnalysisRuns(clientId: string): Promise<BrandAnalysisRun[]> {
  const { data, error } = await supabase
    .from("brand_analysis_runs")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data ?? [];
}

export type SaveBrandProfileArgs = {
  clientId: string;
  workspaceId: string;
  values: BrandFieldValues;
  /** Keys the user typed into during this session — recorded as user-owned. */
  userEditedKeys?: string[];
  /** Keys accepted from AI suggestions — recorded as AI-sourced. */
  aiAcceptedKeys?: string[];
  /** Replacement suggestion bag (after accept/reject/reset). */
  suggestions?: BrandSuggestions | null;
};

export async function saveBrandProfile({
  clientId,
  workspaceId,
  values,
  userEditedKeys = [],
  aiAcceptedKeys = [],
  suggestions,
}: SaveBrandProfileArgs): Promise<BrandProfile> {
  const { data: userData } = await supabase.auth.getUser();
  const existing = await fetchBrandProfile(clientId);

  const sources: Record<string, string> = {
    ...((existing?.field_sources ?? {}) as Record<string, string>),
  };
  for (const key of aiAcceptedKeys) sources[key] = "ai";
  for (const key of userEditedKeys) sources[key] = "user";

  const completion = computeCompletion(values);
  const status = completion.isComplete
    ? "completed"
    : Object.values(values).some((value) => typeof value === "string" && value.trim())
      ? "in_progress"
      : "not_started";

  const textPayload: Record<string, string | null> = {};
  for (const key of TEXT_FIELDS) {
    textPayload[key] = key === "website_url" ? normalizeWebsiteUrl(values.website_url) : normalize(values[key]);
  }

  type ProfileInsert = Database["public"]["Tables"]["client_brand_profiles"]["Insert"];
  const payload: ProfileInsert = {
    client_id: clientId,
    workspace_id: workspaceId,
    ...textPayload,
    voice_config: values.voice as unknown as ProfileInsert["voice_config"],
    field_sources: sources as unknown as ProfileInsert["field_sources"],
    onboarding_status: status,
    completed_at: completion.isComplete ? (existing?.completed_at ?? new Date().toISOString()) : null,
    created_by: existing?.created_by ?? userData.user?.id ?? null,
  };

  if (suggestions !== undefined) {
    payload.ai_suggestions = (suggestions ?? {}) as unknown as ProfileInsert["ai_suggestions"];
    payload.ai_suggestions_at = suggestions?.generatedAt ?? null;
  }

  const { data, error } = await supabase
    .from("client_brand_profiles")
    .upsert(payload, { onConflict: "client_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/** Applies suggestion values onto a form state without touching other fields. */
export function applySuggestionValues(
  values: BrandFieldValues,
  suggestionValues: Record<string, string>,
  keys: string[],
): BrandFieldValues {
  const next: BrandFieldValues = { ...values, voice: { ...values.voice } };
  for (const key of keys) {
    const value = suggestionValues[key];
    if (!value) continue;
    if (key.startsWith("voice.")) {
      const voiceKey = key.slice("voice.".length) as keyof BrandVoiceConfig;
      next.voice[voiceKey] = value;
    } else {
      next[key as BrandTextField] = value;
    }
  }
  return next;
}
