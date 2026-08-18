import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type BrandProfile = Database["public"]["Tables"]["client_brand_profiles"]["Row"];

export type BrandProfileInput = {
  brand_name?: string | null;
  website_url?: string | null;
  industry?: string | null;
  description?: string | null;
  target_audience?: string | null;
  brand_positioning?: string | null;
  brand_voice?: string | null;
  tone_preferences?: string | null;
  key_offerings?: string | null;
  brand_notes?: string | null;
};

export const brandProfileKeys = {
  detail: (clientId: string) => ["brand-profile", clientId] as const,
};

function normalize(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Accepts bare domains and http(s) URLs; returns a normalized https URL or null. */
export function normalizeWebsiteUrl(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(candidate);
  return url.toString().replace(/\/$/, "");
}

export function isValidWebsiteUrl(value: string): boolean {
  try {
    const url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname)
    );
  } catch {
    return false;
  }
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

export async function saveBrandProfile(
  clientId: string,
  workspaceId: string,
  values: BrandProfileInput,
): Promise<BrandProfile> {
  const { data: userData } = await supabase.auth.getUser();

  const payload = {
    client_id: clientId,
    workspace_id: workspaceId,
    brand_name: normalize(values.brand_name),
    website_url: normalizeWebsiteUrl(values.website_url),
    industry: normalize(values.industry),
    description: normalize(values.description),
    target_audience: normalize(values.target_audience),
    brand_positioning: normalize(values.brand_positioning),
    brand_voice: normalize(values.brand_voice),
    tone_preferences: normalize(values.tone_preferences),
    key_offerings: normalize(values.key_offerings),
    brand_notes: normalize(values.brand_notes),
    created_by: userData.user?.id ?? null,
  };

  const { data, error } = await supabase
    .from("client_brand_profiles")
    .upsert(payload, { onConflict: "client_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
