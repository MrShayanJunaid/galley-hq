/**
 * Creative Direction — layers 2 and 3 of the Brand Voice creative reference
 * system.
 *
 * Layer 1 (Brand Foundation) already lives in `schema.ts` (Brand Intelligence)
 * and `visual-schema.ts` (written visual identity), plus the reference-derived
 * design language in `reference-profile.ts`.
 *
 * Layer 2 — VISUAL DIRECTION: where the visual language comes from. Reference
 * creatives are the strongest input, but an agency without references can fall
 * back to brand identity only, a predefined style direction, or a short written
 * description.
 *
 * Layer 3 — CREATIVE STYLE: the finish/energy of the creative (premium,
 * minimal, bold …). This *guides* the render; it never overrides brand identity.
 *
 * Stored as JSON in `client_brand_profiles.creative_direction`.
 * Client-safe: no server imports. Layer 4 (feedback) is intentionally kept in
 * its own module so the learning system can be added later without touching
 * this one.
 */

export type VisualDirectionMode = "references" | "brand_only" | "preset" | "description";

export type CreativeDirection = {
  visualDirectionMode: VisualDirectionMode;
  /** Selected predefined visual style directions (used when mode = "preset"). */
  stylePresetIds: string[];
  /** Free-text visual style description (used when mode = "description"). */
  styleDescription: string;
  /** Layer 3 — creative style tags, always applied. */
  creativeStyleIds: string[];
  /** Optional extra art-direction notes from the agency. */
  notes: string;
};

export const emptyCreativeDirection: CreativeDirection = {
  visualDirectionMode: "references",
  stylePresetIds: [],
  styleDescription: "",
  creativeStyleIds: [],
  notes: "",
};

export const VISUAL_DIRECTION_MODES: Array<{
  id: VisualDirectionMode;
  label: string;
  description: string;
}> = [
  {
    id: "references",
    label: "Use reference creatives",
    description:
      "Best results. Upload creatives you want the output to feel like — layout, typography, colour roles and logo placement are learned from them.",
  },
  {
    id: "brand_only",
    label: "Use website & brand identity only",
    description:
      "No references needed. Creatives are driven purely by the brand foundation: logo, fonts, colours, tone and the written visual identity.",
  },
  {
    id: "preset",
    label: "Pick a visual style direction",
    description:
      "Choose one or two predefined art directions and GalleyHQ applies them on top of the brand identity.",
  },
  {
    id: "description",
    label: "Describe the visual style",
    description: "Write a short brief in your own words and it becomes the art direction.",
  },
];

export type VisualStylePreset = {
  id: string;
  label: string;
  summary: string;
  /** Art-direction text handed to the image model. */
  direction: string;
};

export const VISUAL_STYLE_PRESETS: VisualStylePreset[] = [
  {
    id: "editorial_photography",
    label: "Editorial photography",
    summary: "Magazine-grade imagery with confident typography.",
    direction:
      "Editorial art direction: documentary-grade photography, natural directional light, real materials and real people, generous margins, a confident typographic zone with strong hierarchy. Nothing staged or stock-like.",
  },
  {
    id: "bold_typographic",
    label: "Bold typographic",
    summary: "Type-led posters, colour blocking, big statements.",
    direction:
      "Type-led art direction: the headline is the hero, set very large with tight, deliberate spacing. Flat colour blocking or a single cropped image supports it. High figure-ground contrast, poster energy, no decorative clutter.",
  },
  {
    id: "clean_product",
    label: "Clean product-first",
    summary: "Product or offer isolated on calm brand surfaces.",
    direction:
      "Product-first art direction: the product, packaging or service artefact is isolated cleanly on a calm brand-coloured or textured surface, precise studio lighting, soft realistic shadows, restrained supporting type in a clear grid.",
  },
  {
    id: "luxury_dark",
    label: "Luxury / dark elegance",
    summary: "Deep tones, refined detail, high-end restraint.",
    direction:
      "Luxury art direction: deep, dark or richly saturated brand tones, sculpted low-key lighting, refined materials (glass, stone, metal, fabric), delicate high-contrast typography with wide letter spacing, dramatic negative space.",
  },
  {
    id: "vibrant_lifestyle",
    label: "Vibrant lifestyle",
    summary: "Energetic, human, colour-forward scenes.",
    direction:
      "Lifestyle art direction: real people using or enjoying the offering, energetic candid framing, bright saturated brand colour, natural motion and warmth, punchy typography that sits inside a deliberate band or block.",
  },
  {
    id: "modern_geometric",
    label: "Modern geometric",
    summary: "Grid systems, shapes and crisp brand graphics.",
    direction:
      "Modern geometric art direction: a visible grid system, clean geometric shapes and colour fields drawn from the brand palette, precise alignment, crisp sans typography, tasteful graphic devices instead of photographic backgrounds.",
  },
  {
    id: "soft_organic",
    label: "Soft organic",
    summary: "Warm neutrals, texture and calm pacing.",
    direction:
      "Soft organic art direction: warm neutral palette, tactile textures (paper, linen, plaster, wood), diffused daylight, rounded forms, calm and unhurried pacing, quiet typography with generous leading.",
  },
  {
    id: "high_contrast_promo",
    label: "High-contrast promo",
    summary: "Offer-led layouts built to stop the scroll.",
    direction:
      "Promotional art direction: unmissable hierarchy — the offer or hook reads in under a second. Strong colour contrast, a clear CTA block, tight cropping on the subject, sharp edges and confident scale jumps between type levels. Persuasive but never cheap or cluttered.",
  },
];

export function visualStylePresetById(id: string): VisualStylePreset | undefined {
  return VISUAL_STYLE_PRESETS.find((preset) => preset.id === id);
}

export type CreativeStyleOption = {
  id: string;
  label: string;
  /** How this style should bend the render, without touching brand identity. */
  guidance: string;
};

/** Layer 3 — the finish the agency wants, applied on top of brand identity. */
export const CREATIVE_STYLE_OPTIONS: CreativeStyleOption[] = [
  {
    id: "premium",
    label: "Premium",
    guidance:
      "Premium finish: immaculate craft, refined spacing, considered materials and lighting, nothing cheap or busy.",
  },
  {
    id: "minimal",
    label: "Minimal",
    guidance:
      "Minimal finish: very few elements, dominant empty space, one focal point, only essential type.",
  },
  {
    id: "bold",
    label: "Bold",
    guidance:
      "Bold finish: high contrast, decisive scale jumps, heavy type weight, confident colour blocking.",
  },
  {
    id: "luxury",
    label: "Luxury",
    guidance:
      "Luxury finish: restrained elegance, deep or muted tones, delicate type detail, sculpted light, sense of exclusivity.",
  },
  {
    id: "editorial",
    label: "Editorial",
    summaryless: true,
    guidance:
      "Editorial finish: magazine layout logic, columns and baseline discipline, photographic honesty, typographic sophistication.",
  } as CreativeStyleOption,
  {
    id: "modern",
    label: "Modern",
    guidance:
      "Modern finish: contemporary geometric sans type, crisp edges, grid-true alignment, current design language.",
  },
  {
    id: "clean",
    label: "Clean",
    guidance:
      "Clean finish: uncluttered composition, tidy alignment, calm palette discipline, no visual noise.",
  },
  {
    id: "high_converting",
    label: "High-converting",
    guidance:
      "High-converting finish: instantly readable hook, unmistakable CTA treatment, strong thumb-stopping contrast at small sizes, benefit-forward hierarchy — while staying on brand and never becoming a cheap ad.",
  },
];

export function creativeStyleById(id: string): CreativeStyleOption | undefined {
  return CREATIVE_STYLE_OPTIONS.find((style) => style.id === id);
}

/** Coerces stored JSON into a typed creative direction. */
export function toCreativeDirection(value: unknown): CreativeDirection {
  const raw = (value ?? {}) as Record<string, unknown>;
  const mode = raw["visualDirectionMode"];
  const strings = (input: unknown, allowed?: (id: string) => boolean): string[] =>
    Array.isArray(input)
      ? input
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0 && (!allowed || allowed(entry)))
      : [];

  return {
    visualDirectionMode: VISUAL_DIRECTION_MODES.some((entry) => entry.id === mode)
      ? (mode as VisualDirectionMode)
      : "references",
    stylePresetIds: strings(raw["stylePresetIds"], (id) => Boolean(visualStylePresetById(id))),
    styleDescription:
      typeof raw["styleDescription"] === "string" ? raw["styleDescription"].trim().slice(0, 2000) : "",
    creativeStyleIds: strings(raw["creativeStyleIds"], (id) => Boolean(creativeStyleById(id))),
    notes: typeof raw["notes"] === "string" ? raw["notes"].trim().slice(0, 2000) : "",
  };
}

/** True once the agency has made a deliberate visual-direction choice. */
export function isDirectionConfigured(
  direction: CreativeDirection,
  referenceCount: number,
): boolean {
  if (direction.visualDirectionMode === "references") return referenceCount > 0;
  if (direction.visualDirectionMode === "preset") return direction.stylePresetIds.length > 0;
  if (direction.visualDirectionMode === "description")
    return direction.styleDescription.trim().length > 10;
  return true;
}

export function directionModeLabel(mode: VisualDirectionMode): string {
  return VISUAL_DIRECTION_MODES.find((entry) => entry.id === mode)?.label ?? "Reference creatives";
}

/** Prompt-ready rendering of layers 2 and 3, used by the prompt engine. */
export function renderCreativeDirection(args: {
  direction: CreativeDirection;
  referenceCount: number;
}): string {
  const { direction } = args;
  const lines: string[] = [];

  if (direction.visualDirectionMode === "references" && args.referenceCount > 0) {
    lines.push(
      "VISUAL DIRECTION SOURCE: the attached reference creatives and the reference-derived design language are the authority on how this should look.",
    );
  } else if (direction.visualDirectionMode === "brand_only") {
    lines.push(
      "VISUAL DIRECTION SOURCE: the brand foundation only — logo, brand colours, brand typography, tone and the written visual identity. Do not invent a style outside those; design a deliberate agency-quality layout rather than defaulting to stock-style imagery.",
    );
  } else if (direction.visualDirectionMode === "preset") {
    const presets = direction.stylePresetIds
      .map((id) => visualStylePresetById(id))
      .filter((preset): preset is VisualStylePreset => Boolean(preset));
    lines.push(
      "VISUAL DIRECTION SOURCE: the selected style direction(s) below, applied on top of the brand foundation (brand colours, typography and logo always win).",
    );
    for (const preset of presets) lines.push(`${preset.label}: ${preset.direction}`);
  } else if (direction.visualDirectionMode === "description") {
    lines.push(
      "VISUAL DIRECTION SOURCE: the agency's written style brief below, applied on top of the brand foundation (brand colours, typography and logo always win).",
    );
    if (direction.styleDescription) lines.push(`Style brief: ${direction.styleDescription}`);
  }

  if (
    direction.visualDirectionMode !== "preset" &&
    direction.stylePresetIds.length > 0 &&
    direction.visualDirectionMode !== "references"
  ) {
    const presets = direction.stylePresetIds
      .map((id) => visualStylePresetById(id)?.label)
      .filter(Boolean);
    if (presets.length > 0) lines.push(`Secondary style reference: ${presets.join(", ")}.`);
  }

  const styles = direction.creativeStyleIds
    .map((id) => creativeStyleById(id))
    .filter((style): style is CreativeStyleOption => Boolean(style));
  if (styles.length > 0) {
    lines.push(
      `CREATIVE STYLE (${styles
        .map((style) => style.label)
        .join(
          " + ",
        )}) — this shapes the finish and energy only. It must never override the brand's own colours, typography, logo or visual identity:`,
    );
    for (const style of styles) lines.push(`- ${style.guidance}`);
  }

  if (direction.notes) lines.push(`Agency art-direction notes: ${direction.notes}`);

  return lines.join("\n");
}
