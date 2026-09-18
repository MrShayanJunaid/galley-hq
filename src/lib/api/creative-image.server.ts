/**
 * Server-only creative (visual) generation for the Content Studio.
 *
 * Pipeline per creative:
 *   load content item (caller RLS) -> load client + brand profile + measured
 *   website identity + uploaded references -> RESOLVE all of it into one
 *   context with explicit precedence (`@/lib/creative/brand-resolution`) ->
 *   select only the most relevant references -> build the structured 8-section
 *   prompt (`@/lib/creative/prompt-builder`) -> call the image provider with the
 *   selected references plus the logo as a labelled brand asset -> upload to the
 *   private `creatives` bucket -> record the versioned asset row.
 *
 * Each of the four creatives is its own request and its own versioned asset.
 * The provider key never leaves this module.
 */
import { generateImage, ImageGenerationError, type ReferenceImage } from "@/lib/ai/image.server";
import { renderBrandContext, type BrandContext } from "@/lib/brand/context";
import { toCreativeDirection, type CreativeDirection } from "@/lib/brand/creative-direction";
import {
  hasReferenceProfile,
  toReferenceProfile,
  type ReferenceVisualProfile,
} from "@/lib/brand/reference-profile";
import { toVisualConfig, type BrandVisualConfig } from "@/lib/brand/visual-schema";
import {
  hasWebsiteIdentity,
  toWebsiteIdentity,
  type WebsiteIdentity,
} from "@/lib/brand/website-identity";
import {
  resolveCreativeContext,
  type BrandMismatch,
  type ResolvedCreativeContext,
} from "@/lib/creative/brand-resolution";
import { buildCreativePrompt, type BuiltPrompt } from "@/lib/creative/prompt-builder";
import { selectReferences, type SelectedReference } from "@/lib/creative/reference-selection";
import {
  CREATIVE_VARIANTS,
  variantByIndex,
  type CreativeAssetType,
  type CreativeVariant,
} from "@/lib/content/creative-variants";
import {
  PLATFORMS,
  creativeFormatById,
  defaultFormatFor,
  toCreativePrompt,
  type CreativePrompt,
} from "@/lib/content/schema";

export const CREATIVES_BUCKET = "creatives";
export const REFERENCES_BUCKET = "brand-references";

/** How many references are attached to a single request at most. */
const MAX_ATTACHED_REFERENCES = 2;

type QueryResult<T> = Promise<{ data: T; error: unknown }>;

type SupabaseLike = {
  from: (table: string) => any;
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        body: ArrayBuffer | Uint8Array | Blob,
        options?: Record<string, unknown>,
      ) => QueryResult<unknown>;
      download: (path: string) => QueryResult<Blob | null>;
      remove: (paths: string[]) => QueryResult<unknown>;
    };
  };
};

export type LoadedContentItem = {
  id: string;
  workspace_id: string;
  client_id: string;
  platform: string;
  title: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  creative_prompt: unknown;
};

/** Loads the content item with the caller's RLS-scoped client. */
export async function loadContentItem(
  supabase: unknown,
  contentItemId: string,
): Promise<LoadedContentItem | null> {
  const db = supabase as SupabaseLike;
  const { data, error } = await db
    .from("content_items")
    .select("id, workspace_id, client_id, platform, title, hook, body, cta, creative_prompt")
    .eq("id", contentItemId)
    .maybeSingle();
  if (error || !data) return null;
  return data as LoadedContentItem;
}

export type LoadedReference = {
  storagePath: string;
  description: string | null;
  image: ReferenceImage;
};

/**
 * Loads the client's reference images as raw bytes so they can be attached to
 * the generation request as real image inputs (never URLs or filenames).
 */
export async function loadReferenceImages(args: {
  supabase: unknown;
  admin: unknown;
  clientId: string;
}): Promise<LoadedReference[]> {
  const { loadClientReferences } = await import("@/lib/api/reference-analysis.server");
  const loaded = await loadClientReferences({
    supabase: args.supabase,
    admin: args.admin,
    clientId: args.clientId,
    limit: 6,
  });
  return loaded.map((reference) => ({
    storagePath: reference.storagePath,
    description: reference.description,
    image: { base64: reference.base64, mimeType: reference.mimeType },
  }));
}

/** Reference metadata only — used by the prompt preview, which loads no bytes. */
async function loadReferenceMeta(
  supabase: unknown,
  clientId: string,
): Promise<Array<{ storagePath: string; description: string | null }>> {
  const db = supabase as SupabaseLike;
  const { data } = await db
    .from("brand_references")
    .select("storage_path, description, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    storagePath: String(row["storage_path"] ?? ""),
    description: (row["description"] as string | null) ?? null,
  }));
}

export type PreparedCreative = {
  item: LoadedContentItem;
  variant: CreativeVariant;
  brief: CreativePrompt;
  context: ResolvedCreativeContext;
  built: BuiltPrompt;
  selected: SelectedReference<LoadedReference>[];
  logo: ReferenceImage | null;
  aspectRatio: string;
  formatId: string | null;
  version: number;
};

/**
 * Everything that happens before the image call: loading, resolution,
 * reference selection and prompt composition. Shared by generation and the
 * prompt preview so the preview shows the real prompt.
 */
export async function prepareCreative(args: {
  supabase: unknown;
  admin: unknown;
  contentItemId: string;
  variantIndex: number;
  formatId?: string | null;
  feedback?: string | null;
  /** The preview skips loading image bytes and the logo fetch. */
  metadataOnly?: boolean;
}): Promise<
  | { ok: true; prepared: PreparedCreative }
  | { ok: false; code: string; message: string; mismatch?: BrandMismatch }
> {
  const db = args.supabase as SupabaseLike;
  const variant = variantByIndex(args.variantIndex) ?? CREATIVE_VARIANTS[0]!;

  const item = await loadContentItem(args.supabase, args.contentItemId);
  if (!item) {
    return { ok: false, code: "forbidden", message: "This content is not available in your workspace." };
  }

  const brief = toCreativePrompt(item.creative_prompt);
  if (!brief.prompt.trim()) {
    return {
      ok: false,
      code: "missing_prompt",
      message: "Generate the creative direction first — the visual needs a creative brief.",
    };
  }

  const format = creativeFormatById(args.formatId) ?? creativeFormatById(defaultFormatFor(item.platform));
  const aspectRatio = format?.aspectRatio ?? brief.aspect_ratio ?? "1:1";
  const platformLabel = PLATFORMS.find((entry) => entry.id === item.platform)?.label ?? item.platform;

  // The client record is authoritative for the client name and the website URL —
  // they are separate fields and the name is never taken from the website.
  let clientName = "";
  let clientWebsite: string | null = null;
  try {
    const { data } = await db
      .from("clients")
      .select("name, company_name, website")
      .eq("id", item.client_id)
      .maybeSingle();
    const row = (data ?? {}) as Record<string, unknown>;
    clientName = String(row["company_name"] || row["name"] || "").trim();
    clientWebsite = (row["website"] as string | null) ?? null;
  } catch (error) {
    console.error("[creative] client record unavailable", error);
  }

  let brand: BrandContext | null = null;
  let visual: BrandVisualConfig = toVisualConfig(null);
  let referenceProfile: ReferenceVisualProfile = toReferenceProfile(null);
  let direction: CreativeDirection = toCreativeDirection(null);
  let storedSignature: string | null = null;
  let websiteIdentity: WebsiteIdentity | null = null;
  try {
    const { data } = await db
      .from("client_brand_profiles")
      .select("*")
      .eq("client_id", item.client_id)
      .maybeSingle();
    if (data) {
      const row = data as Record<string, unknown>;
      const { buildBrandContext } = await import("@/lib/brand/context");
      brand = buildBrandContext(row);
      visual = toVisualConfig(row["visual_config"]);
      referenceProfile = toReferenceProfile(row["reference_visual_profile"]);
      direction = toCreativeDirection(row["creative_direction"]);
      storedSignature = (row["reference_visual_signature"] as string | null) ?? null;
      const identity = toWebsiteIdentity(row["website_identity"]);
      websiteIdentity = hasWebsiteIdentity(identity) ? identity : null;
    }
  } catch (error) {
    console.error("[creative] brand context unavailable", error);
  }

  if (!clientName) clientName = brand?.brandName ?? "";

  // Reference bytes are only loaded when the agency's direction asks for them.
  const wantsReferences = direction.visualDirectionMode === "references";
  const candidates: LoadedReference[] = wantsReferences
    ? args.metadataOnly
      ? (await loadReferenceMeta(args.supabase, item.client_id)).map((entry) => ({
          storagePath: entry.storagePath,
          description: entry.description,
          image: { base64: "", mimeType: "" },
        }))
      : await loadReferenceImages({
          supabase: args.supabase,
          admin: args.admin,
          clientId: item.client_id,
        })
    : [];

  const briefText = [brief.prompt, brief.subject, brief.composition, brief.mood, item.title ?? ""].join(" ");
  const selected = selectReferences({
    candidates,
    briefText,
    variantIndex: variant.index,
    limit: MAX_ATTACHED_REFERENCES,
  });

  // Relearn the reference design language when the uploads changed.
  if (!args.metadataOnly && candidates.length > 0) {
    try {
      const analysis = await import("@/lib/api/reference-analysis.server");
      const signature = analysis.referenceSignature(candidates);
      if (!hasReferenceProfile(referenceProfile) || storedSignature !== signature) {
        const loaded = await analysis.loadClientReferences({
          supabase: args.supabase,
          admin: args.admin,
          clientId: item.client_id,
        });
        const outcome = await analysis.analyzeReferences({
          references: loaded,
          brandSummary: brand ? renderBrandContext(brand) : null,
        });
        referenceProfile = outcome.profile;
        await analysis.saveReferenceProfile({
          supabase: args.supabase,
          clientId: item.client_id,
          workspaceId: item.workspace_id,
          outcome,
        });
      }
    } catch (error) {
      console.error("[creative] reference analysis skipped", error);
    }
  }

  // The brand's real logo travels as a brand ASSET, never as a style reference.
  let logo: ReferenceImage | null = null;
  const logoAvailable = Boolean(websiteIdentity && websiteIdentity.logos.length > 0);
  if (!args.metadataOnly && logoAvailable && websiteIdentity) {
    try {
      const { fetchLogoAsset } = await import("@/lib/api/website-identity.server");
      const asset = await fetchLogoAsset(websiteIdentity.logos);
      if (asset) logo = { base64: asset.base64, mimeType: asset.mimeType };
    } catch (error) {
      console.error("[creative] website logo unavailable", error);
    }
  }

  const version = await nextVersionFor(db, item.id, variant.index);

  const context = resolveCreativeContext({
    clientName,
    clientWebsite,
    brand,
    visual,
    websiteIdentity,
    websiteIdentityDecision: direction.websiteIdentityDecision,
    direction,
    directionExplicit: direction.confirmed,
    referenceProfile,
    selectedReferenceCount: selected.length,
    logoAvailable: args.metadataOnly ? logoAvailable : Boolean(logo),
    brief,
    content: { title: item.title, hook: item.hook, body: item.body, cta: item.cta },
    platformLabel,
    aspectRatio,
    feedback: args.feedback ?? null,
    version,
  });

  // A website that looks like another brand is never merged silently.
  if (context.mismatch && direction.websiteIdentityDecision === null) {
    return {
      ok: false,
      code: "brand_mismatch",
      message: context.mismatch.reason,
      mismatch: context.mismatch,
    };
  }

  const built = buildCreativePrompt({
    context,
    variant,
    references: selected,
    logoAttached: args.metadataOnly ? logoAvailable : Boolean(logo),
  });

  return {
    ok: true,
    prepared: {
      item,
      variant,
      brief,
      context,
      built,
      selected,
      logo,
      aspectRatio,
      formatId: format?.id ?? null,
      version,
    },
  };
}

export type CreativeAssetRecord = {
  id: string;
  version: number;
  variantIndex: number;
  variantLabel: string | null;
  concept: string | null;
  assetType: CreativeAssetType;
  status: string;
  storagePath: string | null;
  provider: string | null;
  model: string | null;
  aspectRatio: string | null;
  formatId: string | null;
  mimeType: string | null;
  byteSize: number | null;
  createdAt: string;
};

export type GenerateCreativeResult =
  | { ok: true; asset: CreativeAssetRecord }
  | {
      ok: false;
      code: string;
      message: string;
      retryable: boolean;
      variantIndex?: number;
      mismatch?: BrandMismatch;
    };

/** What the prompt preview returns — the real prompt plus its inputs. */
export type CreativePromptPreview = {
  ok: true;
  variantIndex: number;
  variantLabel: string;
  aspectRatio: string;
  prompt: string;
  sections: BuiltPrompt["sections"];
  sources: BuiltPrompt["sources"];
  missing: string[];
  attachments: string[];
  mismatch: BrandMismatch | null;
};

export type CreativePromptPreviewResult =
  | CreativePromptPreview
  | { ok: false; code: string; message: string; mismatch?: BrandMismatch };

/** Composes the prompt without generating anything. */
export async function previewCreative(args: {
  supabase: unknown;
  admin: unknown;
  contentItemId: string;
  variantIndex: number;
  formatId?: string | null;
}): Promise<CreativePromptPreviewResult> {
  const prepared = await prepareCreative({ ...args, metadataOnly: true });
  if (!prepared.ok) {
    // A mismatch must still be inspectable, so compose with the website held back.
    if (prepared.code !== "brand_mismatch") return prepared;
    return { ok: false, code: prepared.code, message: prepared.message, mismatch: prepared.mismatch };
  }
  const { prepared: ready } = prepared;
  return {
    ok: true,
    variantIndex: ready.variant.index,
    variantLabel: ready.variant.label,
    aspectRatio: ready.aspectRatio,
    prompt: ready.built.prompt,
    sections: ready.built.sections,
    sources: ready.built.sources,
    missing: ready.built.missing,
    attachments: ready.built.attachments,
    mismatch: ready.context.mismatch,
  };
}

/**
 * Generates ONE creative variant for a content item and stores it durably.
 * Versions are tracked per variant, so regenerating creative #2 never touches
 * creatives #1, #3 or #4 and never destroys earlier versions.
 */
export async function generateCreativeVariant(args: {
  /** Caller's RLS-scoped client — used for every table read/write. */
  supabase: unknown;
  /** Service-role client — used only for the private buckets. */
  admin: unknown;
  userId: string;
  contentItemId: string;
  variantIndex: number;
  formatId?: string | null;
  promptOverride?: string | null;
  /** Refinement feedback applied to this regeneration only. */
  feedback?: string | null;
}): Promise<GenerateCreativeResult> {
  const db = args.supabase as SupabaseLike;

  const outcome = await prepareCreative({
    supabase: args.supabase,
    admin: args.admin,
    contentItemId: args.contentItemId,
    variantIndex: args.variantIndex,
    formatId: args.formatId,
    feedback: args.feedback,
  });

  if (!outcome.ok) {
    return {
      ok: false,
      code: outcome.code,
      message: outcome.message,
      retryable: false,
      variantIndex: args.variantIndex,
      ...(outcome.mismatch ? { mismatch: outcome.mismatch } : {}),
    };
  }

  const { item, variant, brief, built, selected, logo, aspectRatio, formatId, version } =
    outcome.prepared;
  const prompt = args.promptOverride?.trim() || built.prompt;

  const { data: created, error: insertError } = await db
    .from("content_creatives")
    .insert({
      workspace_id: item.workspace_id,
      client_id: item.client_id,
      content_item_id: item.id,
      created_by: args.userId,
      version,
      variant_index: variant.index,
      variant_label: variant.label,
      concept: variant.concept,
      asset_type: "image",
      status: "pending",
      prompt,
      prompt_reference: brief as unknown as Record<string, unknown>,
      reference_paths: selected.map((entry) => entry.candidate.storagePath),
      format_id: formatId,
      aspect_ratio: aspectRatio,
      storage_bucket: CREATIVES_BUCKET,
    })
    .select("*")
    .single();

  if (insertError || !created) {
    console.error("[creative] could not create asset row", insertError);
    return {
      ok: false,
      code: "db_error",
      message: "Couldn't start the creative generation. Please try again.",
      retryable: true,
      variantIndex: variant.index,
    };
  }

  const row = created as Record<string, unknown>;
  const assetId = String(row["id"]);

  try {
    const image = await generateImage({
      prompt,
      negativePrompt: brief.negative_prompt,
      aspectRatio,
      // Selected style references first, then the logo as the final asset input —
      // the prompt tells the model the last image is the logo, not a style cue.
      referenceImages: [
        ...selected.map((entry) => entry.candidate.image),
        ...(logo ? [logo] : []),
      ],
    });

    const extension = image.mimeType.includes("jpeg")
      ? "jpg"
      : image.mimeType.includes("webp")
        ? "webp"
        : "png";
    const storagePath = `${item.workspace_id}/${item.client_id}/${item.id}/${assetId}.${extension}`;

    // The original generated bytes are stored as-is — never a derivative.
    const upload = await (args.admin as SupabaseLike).storage
      .from(CREATIVES_BUCKET)
      .upload(storagePath, image.bytes, { contentType: image.mimeType, upsert: true });

    if (upload.error) {
      console.error("[creative] upload failed", upload.error);
      throw new ImageGenerationError(
        "image_failed",
        "The image was generated but could not be stored. Please try again.",
        true,
      );
    }

    const { data: updated } = await db
      .from("content_creatives")
      .update({
        status: "succeeded",
        storage_path: storagePath,
        mime_type: image.mimeType,
        byte_size: image.bytes.byteLength,
        provider: image.provider,
        model: image.model,
      })
      .eq("id", assetId)
      .select("*")
      .single();

    await recordUsage(db, {
      workspaceId: item.workspace_id,
      clientId: item.client_id,
      contentItemId: item.id,
      userId: args.userId,
      status: "success",
      provider: image.provider,
      model: image.model,
      durationMs: image.durationMs,
    });

    await db
      .from("content_items")
      .update({ status: "creative_generated" })
      .eq("id", item.id)
      .in("status", ["draft", "ready_for_creative", "generating_creative"]);

    return { ok: true, asset: mapAsset((updated as Record<string, unknown>) ?? { ...row, id: assetId }) };
  } catch (error) {
    const isImageError = error instanceof ImageGenerationError;
    const code = isImageError ? error.code : "image_failed";
    const message =
      error instanceof Error ? error.message : "Creative generation failed. Please try again.";
    const retryable = isImageError ? error.retryable : true;
    console.error("[creative] generation failed", { code, message, variant: variant.index });

    await db
      .from("content_creatives")
      .update({ status: "failed", error_code: code, error_message: message.slice(0, 500) })
      .eq("id", assetId);

    await recordUsage(db, {
      workspaceId: item.workspace_id,
      clientId: item.client_id,
      contentItemId: item.id,
      userId: args.userId,
      status: "error",
      errorCode: code,
    });

    return { ok: false, code, message, retryable, variantIndex: variant.index };
  }
}

async function nextVersionFor(
  db: SupabaseLike,
  contentItemId: string,
  variantIndex: number,
): Promise<number> {
  const { data } = await db
    .from("content_creatives")
    .select("version")
    .eq("content_item_id", contentItemId)
    .eq("variant_index", variantIndex)
    .order("version", { ascending: false })
    .limit(1);
  const rows = (data ?? []) as Array<{ version: number | null }>;
  return (rows[0]?.version ?? 0) + 1;
}

export function mapAsset(row: Record<string, unknown>): CreativeAssetRecord {
  return {
    id: String(row["id"]),
    version: Number(row["version"] ?? 1),
    variantIndex: Number(row["variant_index"] ?? 1),
    variantLabel: (row["variant_label"] as string | null) ?? null,
    concept: (row["concept"] as string | null) ?? null,
    assetType: ((row["asset_type"] as string | null) ?? "image") as CreativeAssetType,
    status: String(row["status"] ?? "pending"),
    storagePath: (row["storage_path"] as string | null) ?? null,
    provider: (row["provider"] as string | null) ?? null,
    model: (row["model"] as string | null) ?? null,
    aspectRatio: (row["aspect_ratio"] as string | null) ?? null,
    formatId: (row["format_id"] as string | null) ?? null,
    mimeType: (row["mime_type"] as string | null) ?? null,
    byteSize: (row["byte_size"] as number | null) ?? null,
    createdAt: String(row["created_at"] ?? new Date().toISOString()),
  };
}

async function recordUsage(
  db: SupabaseLike,
  values: {
    workspaceId: string;
    clientId: string;
    contentItemId: string;
    userId: string;
    status: "success" | "error";
    provider?: string;
    model?: string;
    errorCode?: string;
    durationMs?: number;
  },
): Promise<void> {
  const { error } = await db.from("ai_generation_events").insert({
    workspace_id: values.workspaceId,
    client_id: values.clientId,
    content_item_id: values.contentItemId,
    user_id: values.userId,
    generation_type: "creative_image",
    status: values.status,
    provider: values.provider ?? null,
    model: values.model ?? null,
    error_code: values.errorCode ?? null,
    duration_ms: values.durationMs ?? null,
  });
  if (error) console.error("[creative] usage log failed", error);
}
