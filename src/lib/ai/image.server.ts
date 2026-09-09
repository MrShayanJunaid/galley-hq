/**
 * Server-only image generation provider layer (OpenAI GPT-Image).
 *
 * The rest of the app only ever sees {@link GeneratedImage}, so the provider
 * can be swapped without touching the Content Studio. Keys are read from
 * server env inside the call and never returned or logged.
 */

export type ImageErrorCode =
  | "image_unavailable"
  | "image_auth"
  | "image_rate_limited"
  | "image_credits"
  | "image_timeout"
  | "image_network"
  | "image_empty"
  | "image_invalid"
  | "image_blocked"
  | "image_failed";

export class ImageGenerationError extends Error {
  code: ImageErrorCode;
  retryable: boolean;

  constructor(code: ImageErrorCode, message: string, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

export type GeneratedImage = {
  /** Raw image bytes. */
  bytes: Uint8Array;
  mimeType: string;
  provider: string;
  model: string;
  durationMs: number;
};

type Provider = {
  label: "openai" | "lovable";
  model: string;
  key: string;
  generationsUrl: string;
  editsUrl: string;
};

/** Latest available GPT-Image model. */
const OPENAI_IMAGE_MODEL = "gpt-image-2";
/** Same model id, namespaced for the managed Lovable AI Gateway. */
const LOVABLE_IMAGE_MODEL = "openai/gpt-image-2";
const OPENAI_BASE = "https://api.openai.com/v1";
const LOVABLE_BASE = "https://ai.gateway.lovable.dev/v1";
/** Deliberately generous: image models routinely run for minutes. */
const IMAGE_TIMEOUT_MS = 300_000;
/** High-quality renders for client-facing creatives. */
const IMAGE_QUALITY = "high";

/**
 * Prefers a workspace-provided OpenAI key, and falls back to the managed
 * Lovable AI Gateway (which serves the same GPT-Image model).
 */
export function resolveImageProvider(): Provider {
  const openaiKey = process.env["OPENAI_API_KEY"];
  if (openaiKey) {
    return {
      label: "openai",
      model: process.env["OPENAI_IMAGE_MODEL"] ?? OPENAI_IMAGE_MODEL,
      key: openaiKey,
      generationsUrl: `${OPENAI_BASE}/images/generations`,
      editsUrl: `${OPENAI_BASE}/images/edits`,
    };
  }
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (lovableKey) {
    return {
      label: "lovable",
      model: LOVABLE_IMAGE_MODEL,
      key: lovableKey,
      generationsUrl: `${LOVABLE_BASE}/images/generations`,
      editsUrl: `${LOVABLE_BASE}/images/edits`,
    };
  }
  throw new ImageGenerationError(
    "image_unavailable",
    "No image provider is configured. Add a server-side image generation API key to enable creative generation.",
  );
}

/** A brand reference image handed to the model as visual guidance. */
export type ReferenceImage = {
  /** Raw base64 (no data-URL prefix). */
  base64: string;
  mimeType: string;
};

export type ImageRequest = {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  /** Brand reference images — the model must match their visual language. */
  referenceImages?: ReferenceImage[];
};

/**
 * GPT-Image only accepts a fixed set of sizes, so social ratios are mapped to
 * the closest supported canvas (portrait ratios stay portrait).
 */
function resolveSize(aspectRatio: string): string {
  const ratio = aspectRatio.trim();
  if (ratio === "9:16" || ratio === "4:5" || ratio === "2:3" || ratio === "3:4") {
    return "1024x1536";
  }
  if (ratio === "16:9" || ratio === "1.91:1" || ratio === "3:2" || ratio === "4:3") {
    return "1536x1024";
  }
  return "1024x1024";
}

export async function generateImage(args: ImageRequest): Promise<GeneratedImage> {
  const provider = resolveImageProvider();
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

  try {
    const references = (args.referenceImages ?? []).filter((reference) => reference.base64);
    const result =
      references.length > 0
        ? await callOpenAiEdits(provider, args, references, controller.signal)
        : await callOpenAiGenerations(provider, args, controller.signal);

    return {
      ...result,
      provider: provider.label,
      model: provider.model,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (error instanceof ImageGenerationError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ImageGenerationError(
        "image_timeout",
        "The image provider took too long to respond. Please try again.",
        true,
      );
    }
    console.error("[image] request failed", error);
    throw new ImageGenerationError(
      "image_network",
      "Could not reach the image generation service. Please try again.",
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}

type RawImage = { bytes: Uint8Array; mimeType: string };

/** Full prompt text, including the aspect-ratio and avoid instructions. */
function composePrompt(args: ImageRequest, size: string): string {
  return [
    args.prompt,
    `Required aspect ratio: ${args.aspectRatio} (rendered at ${size}). Compose for this exact frame.`,
    args.negativePrompt?.trim() ? `Avoid: ${args.negativePrompt.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Text-to-image: OpenAI images-generations shape. */
async function callOpenAiGenerations(
  provider: Provider,
  args: ImageRequest,
  signal: AbortSignal,
): Promise<RawImage> {
  const size = resolveSize(args.aspectRatio);
  const response = await fetch(provider.generationsUrl, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", Authorization: `Bearer ${provider.key}` },
    body: JSON.stringify({
      model: provider.model,
      prompt: composePrompt(args, size),
      size,
      quality: IMAGE_QUALITY,
      n: 1,
    }),
  });

  return await readImageResponse(response, provider);
}

/**
 * Reference-driven image: OpenAI images-edits accepts the uploaded brand
 * references as real multimodal image inputs.
 */
async function callOpenAiEdits(
  provider: Provider,
  args: ImageRequest,
  references: ReferenceImage[],
  signal: AbortSignal,
): Promise<RawImage> {
  const size = resolveSize(args.aspectRatio);
  const form = new FormData();
  form.append("model", provider.model);
  form.append("prompt", composePrompt(args, size));
  form.append("size", size);
  form.append("quality", IMAGE_QUALITY);
  form.append("n", "1");

  // OpenAI caps how many reference files a single edit request may carry.
  references.slice(0, 4).forEach((reference, index) => {
    const bytes = base64ToBytes(reference.base64);
    const type = reference.mimeType || "image/png";
    const extension = type.includes("jpeg") || type.includes("jpg") ? "jpg" : "png";
    form.append(
      "image[]",
      new Blob([bytes as unknown as BlobPart], { type }),
      `reference-${index + 1}.${extension}`,
    );
  });

  // Content-type is derived from FormData; setting it manually breaks the upload.
  const response = await fetch(provider.editsUrl, {
    method: "POST",
    signal,
    headers: { Authorization: `Bearer ${provider.key}` },
    body: form,
  });

  return await readImageResponse(response, provider);
}

async function readImageResponse(response: Response, provider: Provider): Promise<RawImage> {
  if (!response.ok) {
    const body = (await response.text()).slice(0, 800);
    console.error(`[image] provider=${provider.label} status=${response.status}: ${body}`);
    if (/content_policy|moderation/i.test(body)) {
      throw new ImageGenerationError(
        "image_blocked",
        "The image provider refused this creative brief. Edit the creative prompt and try again.",
      );
    }
    throw statusToError(response.status, provider.model);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.startsWith("image/")) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) throw emptyResult();
    return { bytes: new Uint8Array(buffer), mimeType: contentType.split(";")[0] ?? "image/png" };
  }

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    error?: { message?: string; code?: string };
  };

  if (payload.error) {
    const code = payload.error.code ?? "";
    if (/content_policy|moderation/i.test(code)) {
      throw new ImageGenerationError(
        "image_blocked",
        payload.error.message ??
          "The image provider refused this creative brief. Edit the creative prompt and try again.",
      );
    }
    throw new ImageGenerationError(
      "image_failed",
      payload.error.message ?? "Image generation failed. Please try again.",
      true,
    );
  }

  const entry = payload.data?.[0];
  if (entry?.b64_json) return decodeBase64(entry.b64_json, "image/png");
  if (entry?.url) {
    const downloaded = await downloadImage(entry.url);
    if (downloaded) return downloaded;
  }

  throw emptyResult();
}

async function downloadImage(url: string): Promise<RawImage | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "image/png";
  if (!contentType.startsWith("image/")) return null;
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) return null;
  return { bytes: new Uint8Array(buffer), mimeType: contentType.split(";")[0] ?? "image/png" };
}

function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function decodeBase64(input: string, mimeType: string): RawImage {
  try {
    const bytes = base64ToBytes(input);
    if (bytes.byteLength < 100) throw new Error("too small");
    return { bytes, mimeType };
  } catch {
    throw new ImageGenerationError(
      "image_invalid",
      "The image provider returned data that could not be read as an image. Please try again.",
      true,
    );
  }
}

function emptyResult(): ImageGenerationError {
  return new ImageGenerationError(
    "image_empty",
    "The image provider returned no image. Please try again.",
    true,
  );
}

function statusToError(status: number, model: string): ImageGenerationError {
  if (status === 401 || status === 403) {
    return new ImageGenerationError(
      "image_auth",
      "The image provider rejected the configured API key. Update the key and try again.",
    );
  }
  if (status === 404) {
    return new ImageGenerationError(
      "image_failed",
      `The image model "${model}" is not available for this key. Configure an accessible model.`,
    );
  }
  if (status === 429) {
    return new ImageGenerationError(
      "image_rate_limited",
      "The image provider is rate limited. Try again in a moment.",
      true,
    );
  }
  if (status === 402) {
    return new ImageGenerationError(
      "image_credits",
      "Image generation credits are exhausted for this workspace.",
    );
  }
  if (status >= 500) {
    return new ImageGenerationError(
      "image_failed",
      `The image provider is temporarily unavailable (HTTP ${status}).`,
      true,
    );
  }
  return new ImageGenerationError("image_failed", `Image generation failed (HTTP ${status}).`);
}
