/**
 * Single source of truth for the brand intelligence field model.
 * Client-safe: no server-only imports. Future AI modules read brand context
 * through `buildBrandContext` rather than defining their own brand fields.
 */

export type BrandTextField =
  | "brand_name"
  | "website_url"
  | "industry"
  | "description"
  | "products_services"
  | "target_audience"
  | "brand_positioning"
  | "usp"
  | "key_differentiators"
  | "customer_problems"
  | "desired_perception"
  | "content_topics"
  | "content_goals"
  | "content_formats"
  | "cta_preferences"
  | "content_instructions"
  | "brand_notes";

export type BrandVoiceField =
  | "tone"
  | "formality"
  | "personality"
  | "writing_style"
  | "language"
  | "words_to_use"
  | "words_to_avoid"
  | "communication_rules";

export type BrandVoiceConfig = Record<BrandVoiceField, string>;

export const emptyVoiceConfig: BrandVoiceConfig = {
  tone: "",
  formality: "",
  personality: "",
  writing_style: "",
  language: "",
  words_to_use: "",
  words_to_avoid: "",
  communication_rules: "",
};

export type BrandFieldDef = {
  key: BrandTextField;
  label: string;
  placeholder: string;
  multiline?: boolean;
  rows?: number;
};

export type BrandSection = {
  id: "basics" | "positioning" | "voice" | "content";
  title: string;
  description: string;
  fields: BrandFieldDef[];
};

export const BRAND_SECTIONS: BrandSection[] = [
  {
    id: "basics",
    title: "Basic information",
    description: "Who the brand is and what it sells.",
    fields: [
      { key: "brand_name", label: "Brand name", placeholder: "Northwind Coffee" },
      { key: "website_url", label: "Website URL", placeholder: "northwind.com" },
      { key: "industry", label: "Industry", placeholder: "Specialty coffee retail" },
      {
        key: "description",
        label: "Business description",
        placeholder: "What the business does, for whom, and how it operates.",
        multiline: true,
        rows: 4,
      },
      {
        key: "products_services",
        label: "Products / services",
        placeholder: "Core products and services, with the ones to feature most.",
        multiline: true,
        rows: 3,
      },
      {
        key: "target_audience",
        label: "Target audience",
        placeholder: "Demographics, interests, buying triggers, pain points.",
        multiline: true,
        rows: 3,
      },
    ],
  },
  {
    id: "positioning",
    title: "Positioning",
    description: "How the brand wins against alternatives.",
    fields: [
      {
        key: "brand_positioning",
        label: "Brand positioning",
        placeholder: "The category, the promise, and the alternative it replaces.",
        multiline: true,
        rows: 3,
      },
      {
        key: "usp",
        label: "Unique selling proposition",
        placeholder: "The single strongest reason to choose this brand.",
        multiline: true,
        rows: 2,
      },
      {
        key: "key_differentiators",
        label: "Key differentiators",
        placeholder: "Proof points competitors cannot claim.",
        multiline: true,
        rows: 3,
      },
      {
        key: "customer_problems",
        label: "Customer problems",
        placeholder: "The problems customers are trying to solve.",
        multiline: true,
        rows: 3,
      },
      {
        key: "desired_perception",
        label: "Desired customer perception",
        placeholder: "How customers should describe the brand to a friend.",
        multiline: true,
        rows: 2,
      },
    ],
  },
  {
    id: "content",
    title: "Content preferences",
    description: "How content should be planned and framed.",
    fields: [
      {
        key: "content_topics",
        label: "Main content topics",
        placeholder: "Recurring themes and content pillars.",
        multiline: true,
        rows: 3,
      },
      {
        key: "content_goals",
        label: "Content goals",
        placeholder: "Awareness, lead generation, retention, community…",
        multiline: true,
        rows: 2,
      },
      {
        key: "content_formats",
        label: "Preferred content formats",
        placeholder: "Carousels, reels, single images, long captions…",
        multiline: true,
        rows: 2,
      },
      {
        key: "cta_preferences",
        label: "CTA preferences",
        placeholder: "Preferred calls to action and links.",
        multiline: true,
        rows: 2,
      },
      {
        key: "content_instructions",
        label: "Additional content instructions",
        placeholder: "Hard rules, legal constraints, approval notes.",
        multiline: true,
        rows: 3,
      },
      {
        key: "brand_notes",
        label: "Additional brand notes",
        placeholder: "Anything else the team should know.",
        multiline: true,
        rows: 3,
      },
    ],
  },
];

export const VOICE_FIELDS: Array<{
  key: BrandVoiceField;
  label: string;
  placeholder: string;
  multiline?: boolean;
  options?: string[];
}> = [
  {
    key: "tone",
    label: "Tone",
    placeholder: "Warm and confident",
    options: [
      "Warm and friendly",
      "Confident and direct",
      "Playful and witty",
      "Expert and authoritative",
      "Calm and reassuring",
      "Bold and energetic",
    ],
  },
  {
    key: "formality",
    label: "Formality",
    placeholder: "Conversational",
    options: ["Very casual", "Conversational", "Neutral", "Professional", "Formal"],
  },
  { key: "personality", label: "Personality", placeholder: "The knowledgeable friend who never lectures." },
  {
    key: "writing_style",
    label: "Writing style",
    placeholder: "Short sentences, concrete nouns, no jargon.",
    multiline: true,
  },
  { key: "language", label: "Preferred language", placeholder: "English (UK)" },
  {
    key: "words_to_use",
    label: "Words / phrases to use",
    placeholder: "slow-roasted, small-batch, our crew",
    multiline: true,
  },
  {
    key: "words_to_avoid",
    label: "Words / phrases to avoid",
    placeholder: "cheap, guys, revolutionary, game-changer",
    multiline: true,
  },
  {
    key: "communication_rules",
    label: "Communication rules",
    placeholder: "No more than one emoji. Never make health claims. Always credit the roaster.",
    multiline: true,
  },
];

/** Minimum information required before onboarding can be marked complete. */
export const REQUIRED_TEXT_FIELDS: BrandTextField[] = [
  "brand_name",
  "industry",
  "description",
  "products_services",
  "target_audience",
  "brand_positioning",
];

export const REQUIRED_VOICE_FIELDS: BrandVoiceField[] = ["tone", "writing_style"];

export const FIELD_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    BRAND_SECTIONS.flatMap((section) => section.fields.map((field) => [field.key, field.label])),
  ),
  ...Object.fromEntries(VOICE_FIELDS.map((field) => [`voice.${field.key}`, `Voice — ${field.label}`])),
};

export type BrandFieldValues = Record<BrandTextField, string> & { voice: BrandVoiceConfig };

/** Suggestion keys are field keys, or `voice.<field>` for voice config entries. */
export type BrandSuggestions = {
  values: Record<string, string>;
  generatedAt?: string | null;
  model?: string | null;
  sourceUrl?: string | null;
};

export type CompletionResult = {
  percent: number;
  missing: string[];
  isComplete: boolean;
};

function filled(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 1);
}

export function computeCompletion(values: BrandFieldValues): CompletionResult {
  const missing: string[] = [];
  for (const key of REQUIRED_TEXT_FIELDS) {
    if (!filled(values[key])) missing.push(FIELD_LABELS[key] ?? key);
  }
  for (const key of REQUIRED_VOICE_FIELDS) {
    if (!filled(values.voice?.[key])) missing.push(FIELD_LABELS[`voice.${key}`] ?? key);
  }
  const total = REQUIRED_TEXT_FIELDS.length + REQUIRED_VOICE_FIELDS.length;
  const done = total - missing.length;
  return {
    percent: Math.round((done / total) * 100),
    missing,
    isComplete: missing.length === 0,
  };
}

/** Accepts bare domains and http(s) URLs; returns a normalized URL or null. */
export function normalizeWebsiteUrl(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname)) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function isValidWebsiteUrl(value: string): boolean {
  return normalizeWebsiteUrl(value) !== null;
}
