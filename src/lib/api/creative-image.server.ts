/**
 * Server-only creative (visual) generation for the Content Studio.
 *
 * Flow: load content item under the caller's RLS -> compose the final image
 * prompt from the structured creative brief + brand context -> call the image
 * provider -> upload the bytes to the private `creatives` bucket -> record the
 * asset row. The provider key never leaves this module.
 */
import { generateImage, ImageGenerationError } from "@/lib/ai/image.server";
import { renderBrandContext, type BrandContext } from "@/lib/brand/context";
import {
  PLATFORMS,
  creativeFormatById,
  defaultFormatFor,
  toCreativePrompt,
  type CreativePrompt,
} from "@/lib/content/schema";

export const CREATIVES_BUCKET = "creatives";

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

/** Turns the structured creative brief into one self-contained image prompt. */
export function composeImagePrompt(args: {
  creative: CreativePrompt;
  brand: BrandContext | null;
  platformLabel: string;
  aspectRatio: string;
}): string {
  const { creative } = args;
  const brandText = args.brand ? renderBrandContext(args.brand).slice(0, 1800) : "";

  return [
    "Create a single, finished social media creative image.",
    "",
    "=== PRIMARY CREATIVE DIRECTION (follow this exactly) ===",
    creative.prompt,
    "",
    "=== CREATIVE DETAIL ===",
    creative.subject ? `Subject: ${creative.subject}` : "",
    creative.composition ? `Composition & framing: ${creative.composition}` : "",
    creative.visual_style ? `Visual style: ${creative.visual_style}` : "",
    creative.environment ? `Environment / setting: ${creative.environment}` : "",
    creative.mood ? `Mood & lighting: ${creative.mood}` : "",
    creative.typography ? `On-image text direction: ${creative.typography}` : "No on-image text.",
    creative.brand_considerations ? `Brand considerations: ${creative.brand_considerations}` : "",
    "",
    brandText ? `=== BRAND IDENTITY REFERENCE ===\n${brandText}` : "",
    "",
    "=== OUTPUT REQUIREMENTS ===",
    `Destination platform: ${args.platformLabel}.`,
    `Aspect ratio: ${args.aspectRatio} — compose for this frame with safe margins.`,
    "High-quality, production-ready, visually clean and on-brand.",
    "Do not render the caption, hashtags, watermarks, logos of other brands, or gibberish text.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export type CreativeAssetRecord = {
  id: string;
  version: number;
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
  | { ok: false; code: string; message: string; retryable: boolean };

/**
 * Generates one visual for a content item and stores it durably.
 * Every attempt is recorded so failures are visible and versions never
 * overwrite each other.
 */
export async function generateAndStoreCreative(args: {
  /** Caller's RLS-scoped client — used for every table read/write. */
  supabase: unknown;
  /** Service-role client — used only for the private bucket upload. */
  admin: unknown;
  userId: string;
  contentItemId: string;
  formatId?: string | null;
  promptOverride?: string | null;
}): Promise<GenerateCreativeResult> {
  const db = args.supabase as SupabaseLike;
  const item = await loadContentItem(args.supabase, args.contentItemId);
  if (!item) {
    return {
      ok: false,
      code: "forbidden",
      message: "This content is not available in your workspace.",
      retryable: false,
    };
  }

  const creative = toCreativePrompt(item.creative_prompt);
  if (!creative.prompt.trim() && !args.promptOverride?.trim()) {
    return {
      ok: false,
      code: "missing_prompt",
      message: "Generate the creative direction first — the visual needs a creative prompt.",
      retryable: false,
    };
  }

  const format =
    creativeFormatById(args.formatId) ?? creativeFormatById(defaultFormatFor(item.platform));
  const aspectRatio = format?.aspectRatio ?? creative.aspect_ratio ?? "1:1";
  const platformLabel = PLATFORMS.find((entry) => entry.id === item.platform)?.label ?? item.platform;

  // Brand context sharpens the visual; a missing profile must not block generation.
  let brand: BrandContext | null = null;
  try {
    const { data } = await db
      .from("client_brand_profiles")
      .select("*")
      .eq("client_id", item.client_id)
      .maybeSingle();
    if (data) {
      const { buildBrandContext } = await import("@/lib/brand/context");
      brand = buildBrandContext(data as Record<string, unknown>);
    }
  } catch (error) {
    console.error("[creative] brand context unavailable", error);
  }

  const prompt =
    args.promptOverride?.trim() ||
    composeImagePrompt({ creative, brand, platformLabel, aspectRatio });

  const nextVersion = await nextVersionFor(db, item.id);

  const { data: created, error: insertError } = await db
    .from("content_creatives")
    .insert({
      workspace_id: item.workspace_id,
      client_id: item.client_id,
      content_item_id: item.id,
      created_by: args.userId,
      version: nextVersion,
      status: "pending",
      prompt,
      prompt_reference: creative as unknown as Record<string, unknown>,
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
    };
  }

  const row = created as Record<string, unknown>;
  const assetId = String(row["id"]);

  try {
    const image = await generateImage({
      prompt,
      negativePrompt: creative.negative_prompt,
      aspectRatio,
    });

    const extension = image.mimeType.includes("jpeg") ? "jpg" : image.mimeType.includes("webp") ? "webp" : "png";
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
    console.error("[creative] generation failed", { code, message });

    await db
      .from("content_creatives")
      .update({ status: "failed", error_code: code, error_message: message.slice(0, 500) })
      .eq("id", assetId);

    await recordUsage(db, {
      workspaceId: item.workspace_id,
      clientId: item.client_id,
      userId: args.userId,
      status: "error",
      errorCode: code,
    });

    return { ok: false, code, message, retryable };
  }
}

async function nextVersionFor(db: SupabaseLike, contentItemId: string): Promise<number> {
  const { data } = await db
    .from("content_creatives")
    .select("version")
    .eq("content_item_id", contentItemId)
    .order("version", { ascending: false })
    .limit(1);
  const rows = (data ?? []) as Array<{ version: number | null }>;
  return (rows[0]?.version ?? 0) + 1;
}

export function mapAsset(row: Record<string, unknown>): CreativeAssetRecord {
  return {
    id: String(row["id"]),
    version: Number(row["version"] ?? 1),
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
