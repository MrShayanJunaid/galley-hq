/**
 * Server-only JSON chat helper shared by AI features.
 * Never imported by client code (blocked by the *.server.ts guard).
 */

export type AiErrorCode =
  | "ai_unavailable"
  | "ai_auth"
  | "ai_rate_limited"
  | "ai_credits"
  | "ai_timeout"
  | "ai_network"
  | "ai_empty"
  | "ai_malformed"
  | "ai_failed";

export class AiError extends Error {
  code: AiErrorCode;
  retryable: boolean;

  constructor(code: AiErrorCode, message: string, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

const LOVABLE_AI_MODEL = "openai/gpt-5.6-sol";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_DEFAULT_MODEL = "gpt-4.1-mini";

type AiProvider = { url: string; key: string; model: string; label: "openai" | "lovable" };

/**
 * Prefers a workspace-provided OPENAI_API_KEY and falls back to the managed
 * Lovable AI Gateway. Keys are read inside server code only and never returned.
 */
export function resolveAiProvider(): AiProvider {
  const openaiKey = process.env["OPENAI_API_KEY"];
  if (openaiKey) {
    return {
      url: OPENAI_URL,
      key: openaiKey,
      model: process.env["OPENAI_MODEL"] ?? OPENAI_DEFAULT_MODEL,
      label: "openai",
    };
  }
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (lovableKey) {
    return { url: LOVABLE_AI_URL, key: lovableKey, model: LOVABLE_AI_MODEL, label: "lovable" };
  }
  throw new AiError(
    "ai_unavailable",
    "No AI provider is configured. Add a server-side AI API key to enable generation.",
  );
}

export type AiUsage = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

export type AiJsonResult = {
  parsed: Record<string, unknown>;
  provider: string;
  model: string;
  usage: AiUsage;
  durationMs: number;
};

/**
 * Streams a JSON-object completion and consumes it server-side, so long
 * generations never sit idle behind a buffered request.
 */
export async function chatJson(args: {
  system: string;
  user: string;
  timeoutMs?: number;
  temperature?: number;
}): Promise<AiJsonResult> {
  return chatJsonRequest({
    system: args.system,
    content: args.user,
    ...(args.timeoutMs === undefined ? {} : { timeoutMs: args.timeoutMs }),
  });
}

/**
 * Same JSON contract, but with real multimodal image inputs attached to the
 * user message. Used to visually analyse a brand's reference creatives.
 */
export async function chatJsonVision(args: {
  system: string;
  text: string;
  images: Array<{ base64: string; mimeType: string }>;
  timeoutMs?: number;
}): Promise<AiJsonResult> {
  const content = [
    { type: "text" as const, text: args.text },
    ...args.images.map((image) => ({
      type: "image_url" as const,
      image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
    })),
  ];
  return chatJsonRequest({
    system: args.system,
    content,
    ...(args.timeoutMs === undefined ? {} : { timeoutMs: args.timeoutMs }),
  });
}

async function chatJsonRequest(args: {
  system: string;
  content: unknown;
  timeoutMs?: number;
}): Promise<AiJsonResult> {

  const provider = resolveAiProvider();
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs ?? 120_000);

  let raw = "";
  const usage: AiUsage = { promptTokens: null, completionTokens: null, totalTokens: null };

  try {
    const response = await fetch(provider.url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${provider.key}`,
      },
      body: JSON.stringify({
        model: provider.model,
        stream: true,
        stream_options: { include_usage: true },
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
      }),
    });

    if (!response.ok) {
      const body = (await response.text()).slice(0, 800);
      // Log provider + status + provider message only. Never the key.
      console.error(`[ai] provider=${provider.label} status=${response.status}: ${body}`);
      throw statusToError(response.status, provider.model);
    }
    if (!response.body) {
      throw new AiError("ai_empty", "The AI service returned an empty response.", true);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
            usage?: {
              prompt_tokens?: number;
              completion_tokens?: number;
              total_tokens?: number;
            };
          };
          raw +=
            chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content ?? "";
          if (chunk.usage) {
            usage.promptTokens = chunk.usage.prompt_tokens ?? null;
            usage.completionTokens = chunk.usage.completion_tokens ?? null;
            usage.totalTokens = chunk.usage.total_tokens ?? null;
          }
        } catch {
          /* ignore keep-alive / partial frames */
        }
      }
    }
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiError("ai_timeout", "The AI request timed out. Please retry.", true);
    }
    console.error("[ai] request failed", error);
    throw new AiError("ai_network", "Could not reach the AI service. Please retry.", true);
  } finally {
    clearTimeout(timer);
  }

  if (!raw.trim()) {
    throw new AiError("ai_empty", "The AI returned no content. Please retry.", true);
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new AiError("ai_malformed", "The AI returned an unreadable response. Please retry.", true);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    throw new AiError("ai_malformed", "The AI returned an unreadable response. Please retry.", true);
  }

  return {
    parsed,
    provider: provider.label,
    model: provider.model,
    usage,
    durationMs: Date.now() - startedAt,
  };
}

function statusToError(status: number, model: string): AiError {
  if (status === 401) {
    return new AiError(
      "ai_auth",
      "The AI provider rejected the configured API key. Update the key and try again.",
    );
  }
  if (status === 404) {
    return new AiError(
      "ai_failed",
      `The AI model "${model}" is not available for this key. Configure an accessible model.`,
    );
  }
  if (status === 429) {
    return new AiError("ai_rate_limited", "The AI service is rate limited. Try again in a moment.", true);
  }
  if (status === 402 || status === 403) {
    return new AiError(
      "ai_credits",
      "AI credits are exhausted or AI access is blocked for this workspace.",
    );
  }
  if (status >= 500) {
    return new AiError("ai_failed", `The AI service is temporarily unavailable (HTTP ${status}).`, true);
  }
  return new AiError("ai_failed", `The AI service failed (HTTP ${status}).`);
}
