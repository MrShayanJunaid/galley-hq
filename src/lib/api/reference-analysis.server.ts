/**
 * Server-only: learns a client's visual design language from their uploaded
 * reference creatives.
 *
 * The reference images are sent to a vision model as real multimodal image
 * inputs (base64 data URLs), and the model returns a structured profile that is
 * persisted in `client_brand_profiles.reference_visual_profile`. Brand
 * Intelligence and the hand-written Visual Brand Profile are never overwritten.
 */
import { chatJsonVision } from "@/lib/ai/chat.server";
import {
  REFERENCE_PROFILE_FIELDS,
  toReferenceProfile,
  type ReferenceVisualProfile,
} from "@/lib/brand/reference-profile";

type SupabaseLike = {
  from: (table: string) => any;
  storage: {
    from: (bucket: string) => {
      download: (path: string) => Promise<{ data: Blob | null; error: unknown }>;
    };
  };
};

export const REFERENCES_BUCKET = "brand-references";
/** Providers cap inline images; a focused set teaches better than a long tail. */
export const MAX_REFERENCES = 6;

export type LoadedReference = {
  storagePath: string;
  description: string | null;
  base64: string;
  mimeType: string;
};

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

/**
 * Loads reference rows through the caller's RLS-scoped client and their bytes
 * through the service-role client, because the bucket is private.
 */
export async function loadClientReferences(args: {
  supabase: unknown;
  admin: unknown;
  clientId: string;
  limit?: number;
}): Promise<LoadedReference[]> {
  const db = args.supabase as SupabaseLike;
  const { data, error } = await db
    .from("client_brand_references")
    .select("storage_path, description, mime_type")
    .eq("client_id", args.clientId)
    .order("created_at", { ascending: false })
    .limit(args.limit ?? MAX_REFERENCES);

  if (error) {
    console.error("[references] rows unavailable", error);
    return [];
  }

  const rows = (data ?? []) as Array<{
    storage_path: string;
    description: string | null;
    mime_type: string | null;
  }>;

  const loaded: LoadedReference[] = [];
  for (const row of rows) {
    try {
      const download = await (args.admin as SupabaseLike).storage
        .from(REFERENCES_BUCKET)
        .download(row.storage_path);
      if (download.error || !download.data) {
        console.error("[references] download failed", row.storage_path, download.error);
        continue;
      }
      const buffer = await download.data.arrayBuffer();
      if (buffer.byteLength === 0) continue;
      loaded.push({
        storagePath: row.storage_path,
        description: row.description,
        base64: toBase64(new Uint8Array(buffer)),
        mimeType: row.mime_type ?? "image/png",
      });
    } catch (loadError) {
      console.error("[references] unreadable", row.storage_path, loadError);
    }
  }
  return loaded;
}

/** Stable fingerprint of the reference set, so we can detect staleness. */
export function referenceSignature(references: Array<{ storagePath: string }>): string {
  return references
    .map((reference) => reference.storagePath)
    .sort()
    .join("|");
}

const SYSTEM = `You are a senior art director at a social-media creative agency, performing a forensic design audit.

You will be shown a brand's own reference creatives (finished marketing designs). Extract the REUSABLE DESIGN LANGUAGE behind them so a new, different campaign can be designed in the same design system by another designer who has never seen these images.

Rules:
- Describe design decisions, not the specific content. "Headline set in heavy geometric sans, lowercase, upper-left, occupying two lines over a flat colour band" — not "the headline says 60 days".
- Be concrete and directive. Name placements, proportions, ratios, colour roles (dominant / field / accent), type weight and case, shape motifs, crop behaviour.
- If the references disagree on something, describe the range and the dominant pattern.
- "things_to_avoid" must list what would break this brand's look (based on what is conspicuously absent from the references).
- Never invent brand claims, pricing, statistics or copy.

Return ONLY a JSON object with exactly these string keys:
${REFERENCE_PROFILE_FIELDS.map((field) => `"${field.key}"`).join(", ")}
Each value: 1-3 dense sentences of directive design guidance. Use an empty string only when the references genuinely show nothing about it.`;

export type ReferenceAnalysisOutcome = {
  profile: ReferenceVisualProfile;
  provider: string;
  model: string;
  durationMs: number;
  referenceCount: number;
  signature: string;
};

/** Runs the vision analysis over the loaded references. */
export async function analyzeReferences(args: {
  references: LoadedReference[];
  brandSummary?: string | null;
}): Promise<ReferenceAnalysisOutcome> {
  const textParts = [
    args.brandSummary?.trim()
      ? `Brand context (for interpretation only — do not let it override what the images show):\n${args.brandSummary.trim().slice(0, 1200)}`
      : "",
    `You are shown ${args.references.length} reference creative(s) from this brand.`,
    ...args.references.map((reference, index) =>
      reference.description?.trim()
        ? `Reference ${index + 1} note from the agency: ${reference.description.trim()}`
        : `Reference ${index + 1}: no note provided.`,
    ),
    "Audit them and return the JSON design-language profile.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await chatJsonVision({
    system: SYSTEM,
    text: textParts,
    images: args.references.map((reference) => ({
      base64: reference.base64,
      mimeType: reference.mimeType,
    })),
    timeoutMs: 180_000,
  });

  return {
    profile: toReferenceProfile(result.parsed),
    provider: result.provider,
    model: result.model,
    durationMs: result.durationMs,
    referenceCount: args.references.length,
    signature: referenceSignature(args.references),
  };
}

/** Persists the derived profile without touching any Brand Intelligence field. */
export async function saveReferenceProfile(args: {
  supabase: unknown;
  clientId: string;
  workspaceId: string;
  outcome: ReferenceAnalysisOutcome;
}): Promise<void> {
  const db = args.supabase as SupabaseLike;
  const { error } = await db.from("client_brand_profiles").upsert(
    {
      client_id: args.clientId,
      workspace_id: args.workspaceId,
      reference_visual_profile: args.outcome.profile,
      reference_visual_status: "ready",
      reference_visual_error: null,
      reference_visual_analyzed_at: new Date().toISOString(),
      reference_visual_signature: args.outcome.signature,
    },
    { onConflict: "client_id" },
  );
  if (error) throw error;
}

export async function markReferenceStatus(args: {
  supabase: unknown;
  clientId: string;
  workspaceId: string;
  status: "running" | "error" | "idle";
  message?: string | null;
}): Promise<void> {
  const db = args.supabase as SupabaseLike;
  await db.from("client_brand_profiles").upsert(
    {
      client_id: args.clientId,
      workspace_id: args.workspaceId,
      reference_visual_status: args.status,
      reference_visual_error: args.message?.slice(0, 500) ?? null,
    },
    { onConflict: "client_id" },
  );
}
