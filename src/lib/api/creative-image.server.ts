/**
 * Server-only creative (visual) generation for the Content Studio.
 *
 * Per creative: load the content item under the caller's RLS -> load Brand
 * Intelligence, the hand-written Visual Brand Profile, the reference-derived
 * visual design language, and the actual reference image bytes -> build a
 * structured art-direction brief for a *designed* marketing creative -> call the
 * image provider with the reference images attached as real multimodal inputs ->
 * upload to the private `creatives` bucket -> record the versioned asset row.
 *
 * Each of the four creatives is its own request, so they are four independent,
 * independently versioned assets — never a collage.
 * The provider key never leaves this module.
 */
import { generateImage, ImageGenerationError, type ReferenceImage } from "@/lib/ai/image.server";
import { renderBrandContext, type BrandContext } from "@/lib/brand/context";
import {
  hasReferenceProfile,
  renderReferenceProfile,
  toReferenceProfile,
  type ReferenceVisualProfile,
} from "@/lib/brand/reference-profile";
import {
  renderVisualConfig,
  toVisualConfig,
  type BrandVisualConfig,
} from "@/lib/brand/visual-schema";
import {
  CREATIVE_VARIANTS,
  GENERIC_OUTPUT_BANLIST,
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
    limit: 4,
  });
  return loaded.map((reference) => ({
    storagePath: reference.storagePath,
    description: reference.description,
    image: { base64: reference.base64, mimeType: reference.mimeType },
  }));
}

/** Copy that must appear on the creative, exactly as approved. */
function copyBlock(content: {
  title: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
}): string {
  const headline = (content.hook ?? content.title ?? "").trim();
  const support = (content.body ?? "").split(/\n+/)[0]?.trim() ?? "";
  const cta = (content.cta ?? "").trim();

  return [
    headline ? `HEADLINE (set this text verbatim, it is the largest type): "${headline}"` : "",
    support
      ? `SUPPORTING LINE (optional, secondary size, shorten only by trimming whole words, never reword): "${support.slice(0, 160)}"`
      : "",
    cta ? `CALL TO ACTION (button, pill or bar treatment, small but unmissable): "${cta}"` : "",
    "Spell every word exactly as written. Do not translate, paraphrase, add taglines, add pricing, add statistics, add guarantees or invent any claim, feature or result.",
    "Every piece of text must sit inside a deliberate typographic zone with real hierarchy — never floating over a focal point, never clipped by the frame edge, never overlapping another element.",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatLayoutGuidance(aspectRatio: string): string {
  if (aspectRatio === "9:16") {
    return "Vertical story frame: design for a tall 9:16 canvas. Keep the top ~12% and bottom ~15% clear of critical type (platform UI overlays there). Stack the layout vertically — visual mass in the middle, headline in the upper third, CTA in the lower third.";
  }
  if (aspectRatio === "4:5") {
    return "Vertical feed frame: design natively for 4:5. Use vertical stacking with the subject occupying the lower-to-middle mass and a clear typographic band. Do not design a square and pad it.";
  }
  if (aspectRatio === "16:9") {
    return "Horizontal frame: design natively for 16:9. Use a side-by-side or column layout — type zone on one side, visual mass on the other — with strong horizontal alignment.";
  }
  return "Square frame: design natively for 1:1 with a balanced grid — typographic zone and visual zone sharing the square deliberately (banded, split, or centred with margins).";
}

/**
 * The creative prompt engine. Combines Brand Intelligence, the written visual
 * identity, the reference-derived design language, the creative brief, the
 * approved copy and the required format into one art-direction instruction for a
 * finished, designed marketing creative.
 */
export function composeVariantPrompt(args: {
  creative: CreativePrompt;
  brand: BrandContext | null;
  visual: BrandVisualConfig;
  referenceProfile: ReferenceVisualProfile;
  references: LoadedReference[];
  variant: CreativeVariant;
  content: { title: string | null; hook: string | null; body: string | null; cta: string | null };
  platformLabel: string;
  aspectRatio: string;
  brandName?: string | null;
  /** Bumped on regeneration so a new version explores a new direction. */
  version?: number;
}): string {
  const { creative, variant, visual } = args;
  const brandText = args.brand ? renderBrandContext(args.brand).slice(0, 2000) : "";
  const visualText = renderVisualConfig(visual).slice(0, 1600);
  const referenceText = hasReferenceProfile(args.referenceProfile)
    ? renderReferenceProfile(args.referenceProfile).slice(0, 2600)
    : "";

  const referenceLines = args.references.map((reference, index) =>
    reference.description?.trim()
      ? `Attached reference ${index + 1} — agency note: ${reference.description.trim()}`
      : `Attached reference ${index + 1} — study its layout, hierarchy, type treatment and colour roles.`,
  );

  const negatives = [creative.negative_prompt?.trim(), GENERIC_OUTPUT_BANLIST]
    .filter(Boolean)
    .join("; ");

  return [
    "ROLE: You are the senior art director and designer at the agency that made the attached reference creatives. Design the next campaign asset in that same design system.",
    `TASK: Produce ONE finished, social-media-ready marketing creative — a complete designed layout (image + typography + brand furniture), not a photograph with text placed on top. This is creative ${variant.index} of 4 for this post.`,
    "It must be one single standalone composition. Never a collage, grid, mosaic, multi-frame layout, mockup sheet or device showcase.",
    "",
    `=== THIS CREATIVE'S DESIGN DIRECTION: ${variant.label.toUpperCase()} ===`,
    variant.direction,
    `Its composition must be visibly, structurally different from the other three directions (${CREATIVE_VARIANTS.filter(
      (entry) => entry.index !== variant.index,
    )
      .map((entry) => entry.label)
      .join(", ")}) — different layout skeleton, different visual subject, different type placement — while unmistakably the same brand's design system.`,
    args.version && args.version > 1
      ? `This is regeneration v${args.version}: keep the brand design language identical, but take a genuinely new compositional route than a first attempt would — different crop, different type placement, different visual device.`
      : "",
    "",
    referenceText
      ? [
          "=== REFERENCE-DERIVED VISUAL DESIGN LANGUAGE (learned from this brand's own creatives — highest authority on HOW it should look) ===",
          referenceText,
          "Apply these as design rules for a NEW composition. Learn the system; do not reproduce any reference.",
        ].join("\n")
      : "",
    "",
    args.references.length > 0
      ? [
          `=== ATTACHED REFERENCE CREATIVES (${args.references.length}) ===`,
          "The attached images are this brand's real creatives. Study composition, layout skeleton, visual hierarchy, typography treatment, headline and CTA placement, logo placement, colour roles, background treatment, graphic shapes/overlays, photography style, spacing and text-to-visual density.",
          "Then design something NEW for the brief below using those same principles. Do not copy a reference, do not reuse its subject or its wording, and never place a reference image inside the output.",
          ...referenceLines,
        ].join("\n")
      : "No reference creatives are attached — follow the written visual identity strictly and design a deliberate, agency-quality layout rather than defaulting to stock-style imagery.",
    "",
    visualText ? `=== WRITTEN VISUAL IDENTITY (client-stated preferences) ===\n${visualText}` : "",
    "",
    brandText ? `=== BRAND INTELLIGENCE (voice, positioning, audience, offering) ===\n${brandText}` : "",
    args.brandName ? `Brand name for any wordmark/logo lockup: ${args.brandName}.` : "",
    "=== BRAND ASSETS ===",
    "If a logo or wordmark appears in the attached references, reproduce it faithfully in the placement the references use — same mark, same proportions, same colourway. Never invent a different logo, never restyle the mark, and never substitute a generic icon. If no logo is visible in the references, place a small, clean wordmark of the brand name in the brand's typographic style instead. Keep brand colours exactly as the references use them.",
    "",
    "=== CREATIVE BRIEF FOR THIS POST ===",
    creative.prompt?.trim() ?? "",
    creative.subject ? `Subject: ${creative.subject}` : "",
    creative.composition ? `Composition & framing: ${creative.composition}` : "",
    creative.visual_style ? `Visual style: ${creative.visual_style}` : "",
    creative.environment ? `Environment / setting: ${creative.environment}` : "",
    creative.mood ? `Mood & lighting: ${creative.mood}` : "",
    creative.typography ? `Typography direction: ${creative.typography}` : "",
    creative.brand_considerations ? `Brand considerations: ${creative.brand_considerations}` : "",
    args.content.title ? `Post concept: ${args.content.title}` : "",
    "",
    "=== COPY TO SET ON THE CREATIVE (approved — use verbatim) ===",
    copyBlock(args.content),
    "",
    "=== FORMAT ===",
    `Destination platform: ${args.platformLabel}.`,
    `Aspect ratio: exactly ${args.aspectRatio}. ${formatLayoutGuidance(args.aspectRatio)}`,
    "Compose natively for this frame with safe margins. Do not stretch, letterbox, or crop a square design into this ratio.",
    "",
    "=== QUALITY BAR ===",
    "Deliberate composition, professional marketing layout, strong visual hierarchy, crisp legible typography with correct kerning, intentional CTA placement, brand-consistent colour and material language. It must be indistinguishable from work a professional design agency would deliver to this client.",
    `Never produce: ${negatives}.`,
  ]
    .filter((line) => line !== "")
    .join("\n");
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
  | { ok: false; code: string; message: string; retryable: boolean; variantIndex?: number };

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
}): Promise<GenerateCreativeResult> {
  const db = args.supabase as SupabaseLike;
  const variant = variantByIndex(args.variantIndex) ?? CREATIVE_VARIANTS[0]!;

  const item = await loadContentItem(args.supabase, args.contentItemId);
  if (!item) {
    return {
      ok: false,
      code: "forbidden",
      message: "This content is not available in your workspace.",
      retryable: false,
      variantIndex: variant.index,
    };
  }

  const creative = toCreativePrompt(item.creative_prompt);
  if (!creative.prompt.trim() && !args.promptOverride?.trim()) {
    return {
      ok: false,
      code: "missing_prompt",
      message: "Generate the creative direction first — the visual needs a creative brief.",
      retryable: false,
      variantIndex: variant.index,
    };
  }

  const format =
    creativeFormatById(args.formatId) ?? creativeFormatById(defaultFormatFor(item.platform));
  const aspectRatio = format?.aspectRatio ?? creative.aspect_ratio ?? "1:1";
  const platformLabel =
    PLATFORMS.find((entry) => entry.id === item.platform)?.label ?? item.platform;

  // Brand + visual context sharpen the visual; a missing profile must not block generation.
  let brand: BrandContext | null = null;
  let visual: BrandVisualConfig = toVisualConfig(null);
  let referenceProfile: ReferenceVisualProfile = toReferenceProfile(null);
  let storedSignature: string | null = null;
  let brandName: string | null = null;
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
      storedSignature = (row["reference_visual_signature"] as string | null) ?? null;
      brandName = (row["brand_name"] as string | null) ?? null;
    }
  } catch (error) {
    console.error("[creative] brand context unavailable", error);
  }

  const references = await loadReferenceImages({
    supabase: args.supabase,
    admin: args.admin,
    clientId: item.client_id,
  });

  // Learn (or relearn) the reference design language before generating, so the
  // creative is always driven by an up-to-date reading of the references.
  if (references.length > 0) {
    try {
      const analysis = await import("@/lib/api/reference-analysis.server");
      const signature = analysis.referenceSignature(references);
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

  const nextVersion = await nextVersionFor(db, item.id, variant.index);

  const prompt =
    args.promptOverride?.trim() ||
    composeVariantPrompt({
      creative,
      brand,
      visual,
      referenceProfile,
      references,
      variant,
      content: { title: item.title, hook: item.hook, body: item.body, cta: item.cta },
      platformLabel,
      aspectRatio,
      brandName,
      version: nextVersion,
    });

  const { data: created, error: insertError } = await db
    .from("content_creatives")
    .insert({
      workspace_id: item.workspace_id,
      client_id: item.client_id,
      content_item_id: item.id,
      created_by: args.userId,
      version: nextVersion,
      variant_index: variant.index,
      variant_label: variant.label,
      concept: variant.summary,
      asset_type: "image",
      status: "pending",
      prompt,
      prompt_reference: creative as unknown as Record<string, unknown>,
      reference_paths: references.map((reference) => reference.storagePath),
      format_id: format?.id ?? null,
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
      negativePrompt: creative.negative_prompt,
      aspectRatio,
      referenceImages: references.map((reference) => reference.image),
    });

    const extension = image.mimeType.includes("jpeg")
      ? "jpg"
      : image.mimeType.includes("webp")
        ? "webp"
        : "png";
    const storagePath = `${item.workspace_id}/${item.client_id}/${item.id}/${assetId}.${extension}`;

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
