/**
 * Reference-derived Visual Design Language.
 *
 * This is NOT the hand-written Visual Brand Profile (see `visual-schema.ts`) and
 * it never overwrites Brand Intelligence. It is a separate, machine-derived
 * structured profile learned by visually analysing the client's uploaded
 * reference creatives, stored in
 * `client_brand_profiles.reference_visual_profile` and reused for every future
 * creative generation.
 *
 * Client-safe: no server imports.
 */

export type ReferenceProfileField =
  | "visual_style"
  | "composition_style"
  | "layout_patterns"
  | "visual_hierarchy"
  | "color_behavior"
  | "typography_style"
  | "headline_treatment"
  | "cta_patterns"
  | "logo_placement"
  | "text_density"
  | "image_style"
  | "photography_direction"
  | "graphic_elements"
  | "background_treatment"
  | "lighting_and_contrast"
  | "subject_framing"
  | "product_ui_treatment"
  | "spacing_and_density"
  | "design_characteristics"
  | "things_to_avoid";

export type ReferenceVisualProfile = Record<ReferenceProfileField, string>;

export const REFERENCE_PROFILE_FIELDS: Array<{ key: ReferenceProfileField; label: string }> = [
  { key: "visual_style", label: "Visual style" },
  { key: "composition_style", label: "Composition style" },
  { key: "layout_patterns", label: "Layout patterns" },
  { key: "visual_hierarchy", label: "Visual hierarchy" },
  { key: "color_behavior", label: "Colour behaviour" },
  { key: "typography_style", label: "Typography style" },
  { key: "headline_treatment", label: "Headline treatment" },
  { key: "cta_patterns", label: "CTA patterns" },
  { key: "logo_placement", label: "Logo placement" },
  { key: "text_density", label: "Text density" },
  { key: "image_style", label: "Image style" },
  { key: "photography_direction", label: "Photography direction" },
  { key: "graphic_elements", label: "Graphic elements, shapes & overlays" },
  { key: "background_treatment", label: "Background treatment" },
  { key: "lighting_and_contrast", label: "Lighting & contrast" },
  { key: "subject_framing", label: "Subject framing & positioning" },
  { key: "product_ui_treatment", label: "Product / UI treatment" },
  { key: "spacing_and_density", label: "Spacing & visual density" },
  { key: "design_characteristics", label: "Design characteristics" },
  { key: "things_to_avoid", label: "Things to avoid" },
];

export const emptyReferenceProfile: ReferenceVisualProfile = Object.fromEntries(
  REFERENCE_PROFILE_FIELDS.map((field) => [field.key, ""]),
) as ReferenceVisualProfile;

/** Coerces stored JSON into a typed reference profile. */
export function toReferenceProfile(value: unknown): ReferenceVisualProfile {
  const raw = (value ?? {}) as Record<string, unknown>;
  const next = { ...emptyReferenceProfile };
  for (const field of REFERENCE_PROFILE_FIELDS) {
    const entry = raw[field.key];
    next[field.key] = typeof entry === "string" ? entry.trim() : "";
  }
  return next;
}

export function hasReferenceProfile(profile: ReferenceVisualProfile): boolean {
  return REFERENCE_PROFILE_FIELDS.some((field) => profile[field.key].length > 1);
}

/** Prompt-ready rendering handed to the image model. */
export function renderReferenceProfile(profile: ReferenceVisualProfile): string {
  return REFERENCE_PROFILE_FIELDS.map((field) =>
    profile[field.key]?.trim() ? `${field.label}: ${profile[field.key].trim()}` : "",
  )
    .filter(Boolean)
    .join("\n");
}

export type ReferenceAnalysisStatus = "idle" | "running" | "ready" | "error";

export function toReferenceStatus(value: unknown): ReferenceAnalysisStatus {
  return value === "running" || value === "ready" || value === "error" ? value : "idle";
}
