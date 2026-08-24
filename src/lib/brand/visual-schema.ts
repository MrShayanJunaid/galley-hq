/**
 * Visual Brand Profile — the visual half of brand intelligence.
 * Client-safe (no server imports). Stored in
 * `client_brand_profiles.visual_config` as a flat string map so new fields can
 * be added here without a migration.
 */

export type BrandVisualField =
  | "visual_style"
  | "composition"
  | "photography_style"
  | "lighting"
  | "color_direction"
  | "typography_direction"
  | "backgrounds"
  | "visual_mood"
  | "visual_dos"
  | "visual_donts";

export type BrandVisualConfig = Record<BrandVisualField, string>;

export const VISUAL_FIELDS: Array<{
  key: BrandVisualField;
  label: string;
  placeholder: string;
  multiline?: boolean;
  hint?: string;
}> = [
  {
    key: "visual_style",
    label: "Visual style",
    placeholder: "Editorial, warm, tactile. Real materials over illustration.",
    multiline: true,
    hint: "The overall look a stranger should recognise instantly.",
  },
  {
    key: "composition",
    label: "Preferred composition",
    placeholder: "Close crops, single hero subject, generous negative space top-left for text.",
    multiline: true,
  },
  {
    key: "photography_style",
    label: "Photography / illustration style",
    placeholder: "Documentary photography, 35mm, shallow depth of field. No 3D renders.",
    multiline: true,
  },
  {
    key: "lighting",
    label: "Preferred lighting",
    placeholder: "Soft directional daylight, warm highlights, gentle shadows.",
    multiline: true,
  },
  {
    key: "color_direction",
    label: "Preferred colour direction",
    placeholder: "Warm neutrals, deep espresso brown, one terracotta accent. Muted, never neon.",
    multiline: true,
  },
  {
    key: "typography_direction",
    label: "Preferred typography direction",
    placeholder: "Minimal on-image text. Large geometric sans headline, lowercase.",
    multiline: true,
  },
  {
    key: "backgrounds",
    label: "Preferred backgrounds",
    placeholder: "Textured plaster, linen, real counter surfaces. No gradients or abstract blobs.",
    multiline: true,
  },
  {
    key: "visual_mood",
    label: "Preferred visual mood",
    placeholder: "Calm, crafted, unhurried, human.",
    multiline: true,
  },
  {
    key: "visual_dos",
    label: "Visual preferences — always",
    placeholder: "Show real product in real hands. Keep frames uncluttered.",
    multiline: true,
  },
  {
    key: "visual_donts",
    label: "Visual preferences — never",
    placeholder: "Stock corporate offices, generic laptop desk scenes, fake dashboards, random gradients.",
    multiline: true,
  },
];

export const emptyVisualConfig: BrandVisualConfig = {
  visual_style: "",
  composition: "",
  photography_style: "",
  lighting: "",
  color_direction: "",
  typography_direction: "",
  backgrounds: "",
  visual_mood: "",
  visual_dos: "",
  visual_donts: "",
};

export const VISUAL_FIELD_LABELS: Record<string, string> = Object.fromEntries(
  VISUAL_FIELDS.map((field) => [field.key, field.label]),
);

/** Coerces stored JSON into a typed visual config. */
export function toVisualConfig(value: unknown): BrandVisualConfig {
  const raw = (value ?? {}) as Record<string, unknown>;
  const next = { ...emptyVisualConfig };
  for (const field of VISUAL_FIELDS) {
    next[field.key] = typeof raw[field.key] === "string" ? (raw[field.key] as string).trim() : "";
  }
  return next;
}

/** Required before creative generation can be considered brand-aware. */
export const REQUIRED_VISUAL_FIELDS: BrandVisualField[] = [
  "visual_style",
  "photography_style",
  "color_direction",
  "visual_donts",
];

export function visualCompletion(config: BrandVisualConfig): {
  percent: number;
  missing: string[];
  isComplete: boolean;
} {
  const missing = REQUIRED_VISUAL_FIELDS.filter((key) => config[key].trim().length < 2).map(
    (key) => VISUAL_FIELD_LABELS[key] ?? key,
  );
  const total = REQUIRED_VISUAL_FIELDS.length;
  return {
    percent: Math.round(((total - missing.length) / total) * 100),
    missing,
    isComplete: missing.length === 0,
  };
}

/** Prompt-ready rendering used by the creative prompt engine. */
export function renderVisualConfig(config: BrandVisualConfig): string {
  return VISUAL_FIELDS.map((field) =>
    config[field.key]?.trim() ? `${field.label}: ${config[field.key].trim()}` : "",
  )
    .filter(Boolean)
    .join("\n");
}
