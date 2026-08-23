/**
 * Canonical, extensible option sets for the AI Content Studio.
 * Add a new platform / content type / objective here and the whole
 * studio (config UI, prompts, records, filters) picks it up.
 */

export type PlatformId = string;

export type PlatformDefinition = {
  id: PlatformId;
  label: string;
  /** Prompt guidance so each platform gets genuinely different output. */
  guidance: string;
  /** Default aspect ratio hint handed to the creative prompt. */
  aspectRatio: string;
  hashtags: "many" | "few" | "none";
  captionLength: string;
};

export const PLATFORMS: PlatformDefinition[] = [
  {
    id: "instagram",
    label: "Instagram",
    guidance:
      "Visual-first. Strong scroll-stopping first line, short punchy lines with line breaks, emotive and personable, emoji used sparingly, ends with a clear CTA. Carousels and reels are common.",
    aspectRatio: "4:5 (feed) or 9:16 (reels)",
    hashtags: "many",
    captionLength: "80–150 words in short broken-up lines",
  },
  {
    id: "facebook",
    label: "Facebook",
    guidance:
      "Conversational and community-oriented. Slightly longer narrative is fine, plain language, question-led engagement, links work well. Minimal hashtags.",
    aspectRatio: "1:1 or 4:5",
    hashtags: "few",
    captionLength: "80–160 words",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    guidance:
      "Professional, insight-led, no hype. Opens with a specific observation or result, uses short paragraphs, may use a compact list, credible and concrete, ends with a discussion prompt or soft CTA. No emoji spam.",
    aspectRatio: "1:1 or 4:5",
    hashtags: "few",
    captionLength: "120–220 words",
  },
  {
    id: "x",
    label: "X",
    guidance:
      "Tight and declarative. Under 280 characters for a single post, or a short numbered thread. Sharp opinionated hook, no filler, at most one or two hashtags.",
    aspectRatio: "16:9 or 1:1",
    hashtags: "few",
    captionLength: "under 280 characters (or a 3–5 post thread)",
  },
];

export type ContentTypeDefinition = {
  id: string;
  label: string;
  guidance: string;
};

export const CONTENT_TYPES: ContentTypeDefinition[] = [
  { id: "educational", label: "Educational", guidance: "Teach one useful, specific thing the audience can act on." },
  { id: "promotional", label: "Promotional", guidance: "Present a product/service with clear value and a direct offer." },
  {
    id: "thought_leadership",
    label: "Thought Leadership",
    guidance: "Take a defensible point of view on the industry, backed by the brand's own experience.",
  },
  { id: "storytelling", label: "Storytelling", guidance: "Tell a concrete human story with a beginning, tension and resolution." },
  { id: "engagement", label: "Engagement", guidance: "Invite a reply: opinions, choices, questions, relatable moments." },
  { id: "product_service", label: "Product / Service", guidance: "Explain how a specific offering works and who it is for." },
  { id: "problem_solution", label: "Problem / Solution", guidance: "Name a real customer problem, then show the brand's solution." },
  { id: "announcement", label: "Announcement", guidance: "Share news clearly: what changed, why it matters, what to do next." },
];

export type ObjectiveDefinition = {
  id: string;
  label: string;
  guidance: string;
};

export const OBJECTIVES: ObjectiveDefinition[] = [
  { id: "awareness", label: "Awareness", guidance: "Maximise reach and memorability; prioritise the hook." },
  { id: "engagement", label: "Engagement", guidance: "Drive comments, saves and shares." },
  { id: "leads", label: "Leads", guidance: "Drive enquiries; the CTA should capture intent." },
  { id: "sales", label: "Sales", guidance: "Drive purchase with clear value and urgency, without hype." },
  { id: "education", label: "Education", guidance: "Increase understanding; clarity beats cleverness." },
  { id: "community", label: "Community building", guidance: "Build belonging and repeat interaction with the brand." },
];

export const CONTENT_STATUSES = [
  { id: "draft", label: "Draft", description: "Still being worked on." },
  { id: "ready_for_creative", label: "Ready for Creative", description: "Copy approved, creative direction ready." },
  {
    id: "generating_creative",
    label: "Generating Creative",
    description: "A visual is being generated for this content.",
  },
  {
    id: "creative_generated",
    label: "Creative Generated",
    description: "A visual has been generated and stored.",
  },
  { id: "ready_for_review", label: "Ready for Review", description: "Waiting on internal review." },
  { id: "archived", label: "Archived", description: "Kept for reference only." },
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number]["id"];

/**
 * Visual output formats. Structured so new platforms / ratios can be added
 * without touching the generation pipeline.
 */
export type CreativeFormat = {
  id: string;
  label: string;
  /** Provider-facing aspect ratio string. */
  aspectRatio: string;
  /** CSS aspect-ratio value for previews. */
  cssRatio: string;
  platforms: string[];
};

export const CREATIVE_FORMATS: CreativeFormat[] = [
  { id: "instagram_square", label: "Instagram square (1:1)", aspectRatio: "1:1", cssRatio: "1 / 1", platforms: ["instagram"] },
  { id: "instagram_portrait", label: "Instagram portrait (4:5)", aspectRatio: "4:5", cssRatio: "4 / 5", platforms: ["instagram"] },
  { id: "instagram_story", label: "Instagram story / reel (9:16)", aspectRatio: "9:16", cssRatio: "9 / 16", platforms: ["instagram"] },
  { id: "instagram_landscape", label: "Instagram landscape (1.91:1)", aspectRatio: "16:9", cssRatio: "1.91 / 1", platforms: ["instagram"] },
  { id: "facebook_square", label: "Facebook square (1:1)", aspectRatio: "1:1", cssRatio: "1 / 1", platforms: ["facebook"] },
  { id: "facebook_landscape", label: "Facebook landscape (16:9)", aspectRatio: "16:9", cssRatio: "16 / 9", platforms: ["facebook"] },
  { id: "linkedin_square", label: "LinkedIn square (1:1)", aspectRatio: "1:1", cssRatio: "1 / 1", platforms: ["linkedin"] },
  { id: "linkedin_portrait", label: "LinkedIn portrait (4:5)", aspectRatio: "4:5", cssRatio: "4 / 5", platforms: ["linkedin"] },
  { id: "x_landscape", label: "X landscape (16:9)", aspectRatio: "16:9", cssRatio: "16 / 9", platforms: ["x"] },
  { id: "x_square", label: "X square (1:1)", aspectRatio: "1:1", cssRatio: "1 / 1", platforms: ["x"] },
];

export const DEFAULT_CREATIVE_FORMAT_BY_PLATFORM: Record<string, string> = {
  instagram: "instagram_portrait",
  facebook: "facebook_square",
  linkedin: "linkedin_square",
  x: "x_landscape",
};

export function formatsForPlatform(platform: string): CreativeFormat[] {
  const scoped = CREATIVE_FORMATS.filter((format) => format.platforms.includes(platform));
  return scoped.length > 0 ? scoped : CREATIVE_FORMATS;
}

export function creativeFormatById(id: string | null | undefined): CreativeFormat | undefined {
  if (!id) return undefined;
  return CREATIVE_FORMATS.find((format) => format.id === id);
}

export function defaultFormatFor(platform: string): string {
  return (
    DEFAULT_CREATIVE_FORMAT_BY_PLATFORM[platform] ?? formatsForPlatform(platform)[0]?.id ?? "instagram_square"
  );
}


export function platformById(id: string): PlatformDefinition | undefined {
  return PLATFORMS.find((platform) => platform.id === id);
}

export function labelFor(
  options: Array<{ id: string; label: string }>,
  id: string | null | undefined,
): string {
  if (!id) return "—";
  return options.find((option) => option.id === id)?.label ?? id;
}

/** One AI-generated content idea. */
export type ContentIdea = {
  id: string;
  title: string;
  concept: string;
  explanation: string;
  angle: string;
  format: string;
};

/** Generated post copy. */
export type ContentDraft = {
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  notes?: string | null;
};

/** Structured brief for the future Creative Production module. */
export type CreativePrompt = {
  prompt: string;
  subject: string;
  composition: string;
  visual_style: string;
  environment: string;
  mood: string;
  typography: string;
  brand_considerations: string;
  aspect_ratio: string;
  negative_prompt: string;
};

export const EMPTY_CREATIVE_PROMPT: CreativePrompt = {
  prompt: "",
  subject: "",
  composition: "",
  visual_style: "",
  environment: "",
  mood: "",
  typography: "",
  brand_considerations: "",
  aspect_ratio: "",
  negative_prompt: "",
};

export const CREATIVE_PROMPT_FIELDS: Array<{
  key: keyof CreativePrompt;
  label: string;
  rows: number;
}> = [
  { key: "prompt", label: "Master creative prompt", rows: 5 },
  { key: "subject", label: "Subject", rows: 2 },
  { key: "composition", label: "Composition", rows: 2 },
  { key: "visual_style", label: "Visual style", rows: 2 },
  { key: "environment", label: "Environment", rows: 2 },
  { key: "mood", label: "Mood", rows: 2 },
  { key: "typography", label: "Typography direction", rows: 2 },
  { key: "brand_considerations", label: "Brand visual considerations", rows: 2 },
  { key: "aspect_ratio", label: "Aspect ratio / format", rows: 1 },
  { key: "negative_prompt", label: "Avoid", rows: 2 },
];

export type ContentConfig = {
  platform: string;
  contentType: string;
  objective: string;
  topic: string;
};

export const DEFAULT_CONTENT_CONFIG: ContentConfig = {
  platform: "instagram",
  contentType: "educational",
  objective: "awareness",
  topic: "",
};

/** Coerces stored JSON back into a typed idea. */
export function toContentIdea(value: unknown): ContentIdea | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const str = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : "");
  if (!str("title") && !str("concept")) return null;
  return {
    id: str("id") || crypto.randomUUID(),
    title: str("title"),
    concept: str("concept"),
    explanation: str("explanation"),
    angle: str("angle"),
    format: str("format"),
  };
}

export function toCreativePrompt(value: unknown): CreativePrompt {
  const raw = (value ?? {}) as Record<string, unknown>;
  const next = { ...EMPTY_CREATIVE_PROMPT };
  for (const key of Object.keys(EMPTY_CREATIVE_PROMPT) as Array<keyof CreativePrompt>) {
    next[key] = typeof raw[key] === "string" ? (raw[key] as string) : "";
  }
  return next;
}

export function hasCreativePrompt(value: CreativePrompt): boolean {
  return Object.values(value).some((entry) => entry.trim().length > 0);
}
