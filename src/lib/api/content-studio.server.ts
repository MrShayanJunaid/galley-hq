/**
 * Server-only prompt construction and AI calls for the Content Studio.
 * Never imported by client code (blocked by the *.server.ts guard).
 */
import { AiError, chatJson, type AiJsonResult } from "@/lib/ai/chat.server";
import { renderBrandContext, type BrandContext } from "@/lib/brand/context";
import {
  CONTENT_TYPES,
  OBJECTIVES,
  PLATFORMS,
  type ContentDraft,
  type ContentIdea,
  type CreativePrompt,
} from "@/lib/content/schema";

export { AiError } from "@/lib/ai/chat.server";

export type StudioConfig = {
  platform: string;
  contentType: string;
  objective: string;
  topic: string;
};

function str(value: unknown, limit = 1200): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function stringArray(value: unknown, limit = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 80))
    .slice(0, limit);
}

function optionGuidance(
  options: Array<{ id: string; label: string; guidance: string }>,
  id: string,
): { label: string; guidance: string } {
  const found = options.find((option) => option.id === id);
  return found ? { label: found.label, guidance: found.guidance } : { label: id, guidance: "" };
}

/** Builds the shared brand + configuration briefing every generation uses. */
function briefing(brand: BrandContext, config: StudioConfig): string {
  const platform = PLATFORMS.find((entry) => entry.id === config.platform);
  const contentType = optionGuidance(CONTENT_TYPES, config.contentType);
  const objective = optionGuidance(OBJECTIVES, config.objective);
  const brandText = renderBrandContext(brand);

  return [
    "=== CLIENT BRAND INTELLIGENCE (the single source of truth) ===",
    brandText || "(No brand profile has been completed for this client yet.)",
    brand.websiteInsights
      ? `Website insights: ${JSON.stringify(brand.websiteInsights).slice(0, 2500)}`
      : "",
    "",
    "=== CONTENT CONFIGURATION ===",
    `Platform: ${platform?.label ?? config.platform}`,
    platform ? `Platform guidance: ${platform.guidance}` : "",
    platform ? `Caption length target: ${platform.captionLength}` : "",
    platform ? `Hashtag usage: ${platform.hashtags}` : "",
    `Content type: ${contentType.label} — ${contentType.guidance}`,
    `Objective: ${objective.label} — ${objective.guidance}`,
    config.topic
      ? `User topic / instruction (must be honoured): ${config.topic}`
      : "No custom topic given — derive direction from the brand's own content pillars, positioning and audience.",
  ]
    .filter(Boolean)
    .join("\n");
}

const BRAND_RULES = [
  "Everything you produce must be specific to THIS brand: its audience, positioning, differentiators, tone and vocabulary.",
  "Never produce generic marketing filler that could apply to any company.",
  "Respect the brand's words-to-use and words-to-avoid lists and its communication rules exactly.",
  "Never invent facts, statistics, awards, prices, testimonials or claims that are not in the brand intelligence.",
  "Respond with a single JSON object and nothing else. Plain text values, no markdown.",
].join("\n");

export type IdeasResult = {
  ideas: ContentIdea[];
  meta: AiJsonResult;
};

export async function generateIdeas(args: {
  brand: BrandContext;
  config: StudioConfig;
  count: number;
  avoidTitles: string[];
}): Promise<IdeasResult> {
  const system = [
    "You are a senior social content strategist at a marketing agency.",
    BRAND_RULES,
    `Return: { "ideas": [ { "title": string, "concept": string, "explanation": string, "angle": string, "format": string } ] }`,
    "title = a scroll-stopping hook or headline (max 90 chars).",
    "concept = the core content idea in one or two sentences.",
    "explanation = why this works for THIS audience and objective (max 300 chars).",
    "angle = the suggested narrative angle or point of view.",
    "format = the recommended content format for the chosen platform (e.g. carousel, reel, single image, text post, short thread).",
    `Produce exactly ${args.count} distinct ideas.`,
  ].join("\n");

  const user = [
    briefing(args.brand, args.config),
    args.avoidTitles.length
      ? `\n=== ALREADY GENERATED — produce genuinely different ideas, do not repeat these ===\n${args.avoidTitles
          .slice(0, 24)
          .map((title) => `- ${title}`)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const meta = await chatJson({ system, user, timeoutMs: 120_000 });
  const rawIdeas = Array.isArray(meta.parsed["ideas"]) ? (meta.parsed["ideas"] as unknown[]) : [];

  const ideas: ContentIdea[] = rawIdeas
    .map((entry) => {
      const raw = (entry ?? {}) as Record<string, unknown>;
      return {
        id: crypto.randomUUID(),
        title: str(raw["title"], 160),
        concept: str(raw["concept"], 600),
        explanation: str(raw["explanation"], 600),
        angle: str(raw["angle"], 400),
        format: str(raw["format"], 120),
      };
    })
    .filter((idea) => idea.title || idea.concept)
    .slice(0, Math.max(args.count, 1));

  if (!ideas.length) {
    throw new AiError("ai_empty", "The AI returned no usable ideas. Please retry.", true);
  }

  return { ideas, meta };
}

export type DraftResult = {
  draft: ContentDraft;
  meta: AiJsonResult;
};

export async function generateDraft(args: {
  brand: BrandContext;
  config: StudioConfig;
  idea: ContentIdea;
  instructions: string;
  /** When set, only this part is regenerated and the rest is returned unchanged. */
  section?: "hook" | "body" | "cta" | "hashtags" | null;
  current?: ContentDraft | null;
}): Promise<DraftResult> {
  const platform = PLATFORMS.find((entry) => entry.id === args.config.platform);
  const hashtagRule =
    platform?.hashtags === "none"
      ? "Return an empty hashtags array."
      : platform?.hashtags === "few"
        ? "Return 2–4 highly relevant hashtags or keywords."
        : "Return 8–12 relevant, non-spammy hashtags mixing broad and niche.";

  const system = [
    "You are a senior social copywriter writing in the client's own brand voice.",
    BRAND_RULES,
    `Return: { "hook": string, "body": string, "cta": string, "hashtags": string[], "notes": string }`,
    "hook = the opening line that stops the scroll; it must also read naturally as the first line of the post.",
    "body = the post copy WITHOUT the hook line and WITHOUT the CTA and hashtags.",
    "cta = a single call to action consistent with the brand's stated CTA preferences.",
    hashtagRule,
    "notes = one short line on why this fits the brand and platform.",
    "Write natively for the platform — the same idea must read differently on different platforms.",
    args.section
      ? `Only the "${args.section}" value will be used, but still return the full object. Keep it consistent with the existing copy provided.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    briefing(args.brand, args.config),
    "",
    "=== SELECTED IDEA ===",
    `Title / hook: ${args.idea.title}`,
    `Concept: ${args.idea.concept}`,
    `Angle: ${args.idea.angle}`,
    `Recommended format: ${args.idea.format}`,
    args.instructions ? `\n=== EXTRA USER INSTRUCTIONS ===\n${args.instructions}` : "",
    args.current && (args.current.hook || args.current.body || args.current.cta)
      ? `\n=== EXISTING COPY (the user may have edited this — stay consistent with it) ===\nHook: ${args.current.hook}\nBody: ${args.current.body}\nCTA: ${args.current.cta}\nHashtags: ${args.current.hashtags.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const meta = await chatJson({ system, user, timeoutMs: 120_000 });
  const parsed = meta.parsed;

  const draft: ContentDraft = {
    hook: str(parsed["hook"], 400),
    body: str(parsed["body"], 6000),
    cta: str(parsed["cta"], 400),
    hashtags: stringArray(parsed["hashtags"]).map((tag) =>
      tag.startsWith("#") || tag.includes(" ") ? tag : `#${tag}`,
    ),
    notes: str(parsed["notes"], 400) || null,
  };

  if (!draft.body && !draft.hook) {
    throw new AiError("ai_empty", "The AI returned empty content. Please retry.", true);
  }

  return { draft, meta };
}

export type CreativeResult = {
  creative: CreativePrompt;
  meta: AiJsonResult;
};

export async function generateCreativePrompt(args: {
  brand: BrandContext;
  config: StudioConfig;
  idea: ContentIdea;
  draft: ContentDraft;
}): Promise<CreativeResult> {
  const platform = PLATFORMS.find((entry) => entry.id === args.config.platform);

  const system = [
    "You are an art director writing a production-ready creative brief for an image generation system.",
    BRAND_RULES,
    `Return: { "prompt": string, "subject": string, "composition": string, "visual_style": string, "environment": string, "mood": string, "typography": string, "brand_considerations": string, "aspect_ratio": string, "negative_prompt": string }`,
    "prompt = a single self-contained visual generation prompt (60–120 words) describing what to SHOW. It must be visual instructions, not a restatement of the caption.",
    "Do NOT include the caption text in the prompt. Describe imagery: subject, framing, lighting, colour, materials, styling.",
    "typography = direction for any on-image text (max 8 words of actual copy), or state that no text should appear.",
    "brand_considerations = how the brand's identity, tone and audience should shape the visual.",
    `aspect_ratio = the correct format for the platform (default: ${platform?.aspectRatio ?? "1:1"}).`,
    "negative_prompt = what to avoid (clichés, stock-photo tropes, off-brand elements).",
  ].join("\n");

  const user = [
    briefing(args.brand, args.config),
    "",
    "=== CONTENT IDEA ===",
    `${args.idea.title}\n${args.idea.concept}\nAngle: ${args.idea.angle}\nFormat: ${args.idea.format}`,
    "",
    "=== FINAL COPY (for message alignment only — do not repeat it in the prompt) ===",
    `Hook: ${args.draft.hook}`,
    `Body: ${args.draft.body}`,
    `CTA: ${args.draft.cta}`,
  ].join("\n");

  const meta = await chatJson({ system, user, timeoutMs: 120_000 });
  const parsed = meta.parsed;

  const creative: CreativePrompt = {
    prompt: str(parsed["prompt"], 3000),
    subject: str(parsed["subject"], 600),
    composition: str(parsed["composition"], 600),
    visual_style: str(parsed["visual_style"], 600),
    environment: str(parsed["environment"], 600),
    mood: str(parsed["mood"], 400),
    typography: str(parsed["typography"], 600),
    brand_considerations: str(parsed["brand_considerations"], 800),
    aspect_ratio: str(parsed["aspect_ratio"], 60) || (platform?.aspectRatio ?? "1:1"),
    negative_prompt: str(parsed["negative_prompt"], 600),
  };

  if (!creative.prompt) {
    throw new AiError("ai_empty", "The AI returned no creative direction. Please retry.", true);
  }

  return { creative, meta };
}

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> };
    };
    insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
  };
};

export type LoadedBrand = {
  client: { id: string; workspace_id: string; name: string; company_name: string; website: string | null };
  brand: BrandContext;
};

/**
 * Loads the client and its saved Brand Intelligence with the caller's own
 * RLS-scoped client, so cross-workspace ids simply return nothing.
 */
export async function loadClientBrand(
  supabase: unknown,
  clientId: string,
): Promise<LoadedBrand | null> {
  const db = supabase as SupabaseLike;
  const clientResult = await db
    .from("clients")
    .select("id, workspace_id, name, company_name, website")
    .eq("id", clientId)
    .maybeSingle();

  if (clientResult.error || !clientResult.data) return null;
  const client = clientResult.data as LoadedBrand["client"];

  const profileResult = await db
    .from("client_brand_profiles")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  const { buildBrandContext } = await import("@/lib/brand/context");
  const brand = buildBrandContext(
    (profileResult.data as Record<string, unknown> | null) ?? { brand_name: client.company_name },
  );

  return { client, brand };
}

/** Records one AI generation for later plan limits and admin monitoring. */
export async function recordAiUsage(
  supabase: unknown,
  values: {
    workspaceId: string;
    clientId: string | null;
    userId: string;
    generationType: string;
    status: "success" | "error";
    provider?: string | null;
    model?: string | null;
    errorCode?: string | null;
    durationMs?: number | null;
    usage?: { promptTokens: number | null; completionTokens: number | null; totalTokens: number | null } | null;
  },
): Promise<void> {
  const db = supabase as SupabaseLike;
  const { error } = await db.from("ai_generation_events").insert({
    workspace_id: values.workspaceId,
    client_id: values.clientId,
    user_id: values.userId,
    generation_type: values.generationType,
    status: values.status,
    provider: values.provider ?? null,
    model: values.model ?? null,
    error_code: values.errorCode ?? null,
    duration_ms: values.durationMs ?? null,
    prompt_tokens: values.usage?.promptTokens ?? null,
    completion_tokens: values.usage?.completionTokens ?? null,
    total_tokens: values.usage?.totalTokens ?? null,
  });
  if (error) console.error("[content-studio] usage log failed", error);
}

/** Maps a thrown generation error to a client-safe failure and records it. */
export async function mapGenerationFailure(
  error: unknown,
  supabase: unknown,
  values: { workspaceId: string; clientId: string; userId: string; generationType: string },
): Promise<{ ok: false; code: string; message: string; retryable: boolean }> {
  const isAiError = error instanceof AiError;
  const code = isAiError ? error.code : "unknown";
  const retryable = isAiError ? error.retryable : true;
  const message =
    error instanceof Error ? error.message : "Generation failed unexpectedly. Please retry.";
  console.error(`[content-studio] ${values.generationType} failed`, { code, message });

  await recordAiUsage(supabase, {
    workspaceId: values.workspaceId,
    clientId: values.clientId,
    userId: values.userId,
    generationType: values.generationType,
    status: "error",
    errorCode: code,
  });

  return { ok: false, code, message, retryable };
}
