/**
 * Server-only image generation provider layer (Nano Banana).
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
  label: "nano-banana" | "lovable";
  model: string;
  key: string;
};

const NANO_BANANA_DEFAULT_MODEL = "gemini-2.5-flash-image";
const LOVABLE_IMAGE_MODEL = "google/gemini-3-pro-image";
const LOVABLE_IMAGE_URL = "https://ai.gateway.lovable.dev/v1/images/generations";
const GOOGLE_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
/** Deliberately generous: image models routinely run for minutes. */
const IMAGE_TIMEOUT_MS = 300_000;

/**
 * Prefers a workspace-provided Nano Banana key, and falls back to the managed
 * Lovable AI Gateway (which serves the same Nano Banana family of models).
 */
export function resolveImageProvider(): Provider {
  const nanoKey =
    process.env["NANO_BANANA_API_KEY"] ??
    process.env["GEMINI_API_KEY"] ??
    process.env["GOOGLE_AI_API_KEY"];
  if (nanoKey) {
    return {
      label: "nano-banana",
      model: process.env["NANO_BANANA_MODEL"] ?? NANO_BANANA_DEFAULT_MODEL,
      key: nanoKey,
    };
  }
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (lovableKey) {
    return { label: "lovable", model: LOVABLE_IMAGE_MODEL, key: lovableKey };
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

export async function generateImage(args: ImageRequest): Promise<GeneratedImage> {
  const provider = resolveImageProvider();
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

  try {
    const result =
      provider.label === "nano-banana"
        ? await callNanoBanana(provider, args, controller.signal)
        : await callLovableGateway(provider, args, controller.signal);

    return { ...result, provider: provider.label, model: provider.model, durationMs: Date.now() - startedAt };
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

/** Google Generative Language API ("Nano Banana") direct integration. */
async function callNanoBanana(
  provider: Provider,
  args: ImageRequest,
  signal: AbortSignal,
): Promise<RawImage> {
  const prompt = args.negativePrompt?.trim()
    ? `${args.prompt}\n\nAvoid: ${args.negativePrompt.trim()}`
    : args.prompt;

  // Reference images come first so the model reads them as style guidance for
  // the instruction that follows.
  const parts: Array<Record<string, unknown>> = [];
  for (const reference of args.referenceImages ?? []) {
    parts.push({ inlineData: { mimeType: reference.mimeType, data: reference.base64 } });
  }
  parts.push({ text: prompt });

  const response = await fetch(
    `${GOOGLE_BASE_URL}/${encodeURIComponent(provider.model)}:generateContent`,
    {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", "x-goog-api-key": provider.key },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: args.aspectRatio },
        },
      }),
    },
  );

  if (!response.ok) {
    const body = (await response.text()).slice(0, 800);
    console.error(`[image] provider=nano-banana status=${response.status}: ${body}`);
    throw statusToError(response.status, provider.model);
  }

  const payload = (await response.json()) as {
    promptFeedback?: { blockReason?: string };
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
    }>;
  };

  if (payload.promptFeedback?.blockReason) {
    throw new ImageGenerationError(
      "image_blocked",
      "The image provider refused this creative brief. Edit the creative prompt and try again.",
    );
  }

  const responseParts = payload.candidates?.[0]?.content?.parts ?? [];
  for (const part of responseParts) {
    const data = part.inlineData?.data;
    if (data) return decodeBase64(data, part.inlineData?.mimeType ?? "image/png");
  }

  throw emptyResult();
}

/** Managed Lovable AI Gateway image endpoint (same Nano Banana model family). */
async function callLovableGateway(
  provider: Provider,
  args: ImageRequest,
  signal: AbortSignal,
): Promise<RawImage> {
  const prompt = [
    args.prompt,
    `Required aspect ratio: ${args.aspectRatio}.`,
    args.negativePrompt?.trim() ? `Avoid: ${args.negativePrompt.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const references = args.referenceImages ?? [];
  const content =
    references.length > 0
      ? [
          ...references.map((reference) => ({
            type: "image_url" as const,
            image_url: { url: `data:${reference.mimeType};base64,${reference.base64}` },
          })),
          { type: "text" as const, text: prompt },
        ]
      : prompt;

  const response = await fetch(LOVABLE_IMAGE_URL, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", Authorization: `Bearer ${provider.key}` },
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {

    const body = (await response.text()).slice(0, 800);
    console.error(`[image] provider=lovable status=${response.status}: ${body}`);
    throw statusToError(response.status, provider.model);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.startsWith("image/")) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) throw emptyResult();
    return { bytes: new Uint8Array(buffer), mimeType: contentType.split(";")[0] ?? "image/png" };
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const found = await findImageInPayload(payload, signal);
  if (!found) throw emptyResult();
  return found;
}

/**
 * Providers describe images inconsistently (base64, data URL, remote URL,
 * nested in chat-style choices). This walks the payload and normalises
 * whatever representation it finds into raw bytes.
 */
async function findImageInPayload(
  value: unknown,
  signal: AbortSignal,
  depth = 0,
): Promise<RawImage | null> {
  if (depth > 6 || value == null) return null;

  if (typeof value === "string") {
    if (value.startsWith("data:image/")) {
      const [meta, data] = value.split(",", 2);
      if (!data) return null;
      return decodeBase64(data, meta?.slice(5).split(";")[0] ?? "image/png");
    }
    if (/^https?:\/\//.test(value)) return await downloadImage(value, signal);
    if (value.length > 512 && /^[A-Za-z0-9+/=\s]+$/.test(value)) return decodeBase64(value, "image/png");
    return null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = await findImageInPayload(entry, signal, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = ["b64_json", "image_base64", "base64", "data", "url", "image_url", "images", "image"];
    for (const key of preferred) {
      if (key in record) {
        const found = await findImageInPayload(record[key], signal, depth + 1);
        if (found) return found;
      }
    }
    for (const [key, entry] of Object.entries(record)) {
      if (preferred.includes(key)) continue;
      const found = await findImageInPayload(entry, signal, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

async function downloadImage(url: string, signal: AbortSignal): Promise<RawImage | null> {
  const response = await fetch(url, { signal });
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "image/png";
  if (!contentType.startsWith("image/")) return null;
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) return null;
  return { bytes: new Uint8Array(buffer), mimeType: contentType.split(";")[0] ?? "image/png" };
}

function decodeBase64(input: string, mimeType: string): RawImage {
  try {
    const clean = input.replace(/\s/g, "");
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
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
