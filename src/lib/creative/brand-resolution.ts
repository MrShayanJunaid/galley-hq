/**
 * Creative source resolution.
 *
 * Before a single word of prompt text exists, every available input is
 * normalised into ONE resolved context with explicit precedence:
 *
 *  - brand identity   -> the client name the agency typed + verified brand
 *                        profile + measured website identity
 *  - campaign message -> the creative brief and the approved copy
 *  - visual direction -> the agency's explicit choice (references / brand only /
 *                        preset / written description)
 *
 * Conflicts are resolved here, never inside prompt text. Anything missing is
 * recorded as missing rather than guessed.
 *
 * Client-safe: no server imports (the UI uses this for the prompt preview).
 */

import type { BrandContext } from "@/lib/brand/context";
import {
  creativeStyleById,
  visualStylePresetById,
  type CreativeDirection,
} from "@/lib/brand/creative-direction";
import type { ReferenceVisualProfile } from "@/lib/brand/reference-profile";
import { hasReferenceProfile } from "@/lib/brand/reference-profile";
import type { BrandVisualConfig } from "@/lib/brand/visual-schema";
import { hasWebsiteIdentity, type WebsiteIdentity } from "@/lib/brand/website-identity";
import type { CreativePrompt } from "@/lib/content/schema";

export type BrandMismatch = {
  /** The name the agency entered for this client — always wins. */
  clientName: string;
  websiteUrl: string;
  /** What the website's own identity says the brand is. */
  websiteBrand: string | null;
  reason: string;
};

export type ResolvedIdentity = {
  /** The brand name rendered on the creative. Always the agency's client name. */
  brandName: string;
  colors: { role: string; value: string }[];
  fonts: { role: string; family: string; weights: string[] }[];
  typeHierarchy: string[];
  uiShapes: string[];
  logoAvailable: boolean;
  positioning: string[];
  /** True when website identity was resolved in (not mismatched, not ignored). */
  usingWebsiteIdentity: boolean;
};

export type ResolvedCampaign = {
  concept: string;
  objectiveHint: string;
  headline: string;
  support: string;
  cta: string;
  platformLabel: string;
  aspectRatio: string;
};

export type ResolvedArtDirection = {
  /** references | brand_only | preset | description */
  mode: CreativeDirection["visualDirectionMode"];
  modeExplicit: boolean;
  styleGuidance: string[];
  presetDirections: string[];
  writtenDirection: string;
  notes: string;
  briefSubject: string;
  briefComposition: string;
  briefMood: string;
  briefEnvironment: string;
  referenceLanguage: string[];
  avoid: string[];
};

export type ResolvedCreativeContext = {
  identity: ResolvedIdentity;
  campaign: ResolvedCampaign;
  art: ResolvedArtDirection;
  mismatch: BrandMismatch | null;
  /** Fields that are genuinely unknown — never invented downstream. */
  missing: string[];
  feedback: string | null;
  version: number;
};

function clean(value: unknown, max = 400): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function host(url: string): string {
  const match = url.trim().toLowerCase().match(/^(?:https?:\/\/)?(?:www\.)?([^/?#]+)/);
  return match?.[1] ?? "";
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

const GENERIC_NAME_TOKENS = new Set([
  "the",
  "and",
  "ltd",
  "llc",
  "inc",
  "group",
  "studio",
  "agency",
  "company",
  "co",
  "media",
  "digital",
  "solutions",
  "services",
  "global",
]);

/**
 * Detects the "client name says X, website says Y" case.
 *
 * The client name the agency typed is authoritative. A website whose own
 * identity points at a different brand is never merged silently — the caller
 * asks the user what to do with it.
 */
export function detectBrandMismatch(args: {
  clientName: string;
  websiteUrl: string | null;
  identity: WebsiteIdentity | null;
}): BrandMismatch | null {
  const clientName = clean(args.clientName, 120);
  const websiteUrl = clean(args.websiteUrl ?? "", 300);
  if (!clientName || !websiteUrl) return null;
  const identity = args.identity;
  if (!identity || !hasWebsiteIdentity(identity)) return null;

  const nameTokens = tokens(clientName).filter((token) => !GENERIC_NAME_TOKENS.has(token));
  if (nameTokens.length === 0) return null;

  const siteHost = host(identity.websiteUrl ?? websiteUrl);
  const haystack = [
    siteHost,
    identity.messaging.tagline ?? "",
    identity.messaging.valueProposition ?? "",
    identity.messaging.keyMessages.join(" "),
    identity.logos.map((logo) => `${logo.alt ?? ""} ${logo.url}`).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  const matched = nameTokens.some((token) => haystack.includes(token));
  if (matched) return null;

  return {
    clientName,
    websiteUrl,
    websiteBrand: siteHost || null,
    reason: `Nothing on ${siteHost || "the website"} mentions “${clientName}”. The extracted colours, fonts and logo may belong to a different brand.`,
  };
}

/**
 * Builds the single resolved context the prompt builder consumes.
 *
 * `websiteIdentityDecision` is the agency's answer to a detected mismatch:
 * "use" applies the site's visual identity anyway, "ignore" drops it. Until a
 * decision exists, a mismatched website is held back.
 */
export function resolveCreativeContext(input: {
  clientName: string;
  clientWebsite: string | null;
  brand: BrandContext | null;
  visual: BrandVisualConfig;
  websiteIdentity: WebsiteIdentity | null;
  websiteIdentityDecision?: "use" | "ignore" | null;
  direction: CreativeDirection;
  directionExplicit: boolean;
  referenceProfile: ReferenceVisualProfile;
  selectedReferenceCount: number;
  logoAvailable: boolean;
  brief: CreativePrompt;
  content: { title: string | null; hook: string | null; body: string | null; cta: string | null };
  platformLabel: string;
  aspectRatio: string;
  feedback?: string | null;
  version?: number;
}): ResolvedCreativeContext {
  const clientName = clean(input.clientName, 120) || clean(input.brand?.brandName ?? "", 120);
  const mismatch = detectBrandMismatch({
    clientName,
    websiteUrl: input.clientWebsite,
    identity: input.websiteIdentity,
  });

  const identityUsable =
    Boolean(input.websiteIdentity && hasWebsiteIdentity(input.websiteIdentity)) &&
    (mismatch === null || input.websiteIdentityDecision === "use") &&
    input.websiteIdentityDecision !== "ignore";

  const site = identityUsable ? input.websiteIdentity : null;
  const missing: string[] = [];

  // ---- Identity: measured website values first, written visual profile second.
  const colors: ResolvedIdentity["colors"] = [];
  const pushColor = (role: string, value: string | null | undefined) => {
    const hex = clean(value ?? "", 40);
    if (hex && !colors.some((entry) => entry.value.toLowerCase() === hex.toLowerCase())) {
      colors.push({ role, value: hex });
    }
  };
  if (site) {
    pushColor("primary", site.colors.primary);
    pushColor("secondary", site.colors.secondary);
    pushColor("accent", site.colors.accent);
    pushColor("background", site.colors.background);
    pushColor("surface", site.colors.surface);
    pushColor("text", site.colors.text);
  }
  if (colors.length === 0) {
    const written = clean(input.visual.color_palette ?? "", 300);
    if (written) colors.push({ role: "stated palette", value: written });
    else missing.push("brand colours");
  }

  const fonts: ResolvedIdentity["fonts"] = [];
  if (site) {
    for (const font of site.fonts.slice(0, 4)) {
      fonts.push({ role: font.role === "unknown" ? "type" : font.role, family: font.family, weights: font.weights });
    }
  }
  if (fonts.length === 0) {
    const written = clean(input.visual.typography ?? "", 200);
    if (written) fonts.push({ role: "stated", family: written, weights: [] });
    else missing.push("brand typefaces");
  }

  const typeHierarchy = site
    ? site.typography
        .slice(0, 5)
        .map((style) =>
          [
            style.selector,
            style.fontSize ? `size ${style.fontSize}` : "",
            style.fontWeight ? `weight ${style.fontWeight}` : "",
            style.letterSpacing ? `tracking ${style.letterSpacing}` : "",
          ]
            .filter(Boolean)
            .join(", "),
        )
        .filter(Boolean)
    : [];

  const uiShapes = site
    ? [
        site.components.borderRadii.length ? `corner radii ${site.components.borderRadii.slice(0, 4).join(", ")}` : "",
        site.components.buttons.length ? `buttons: ${site.components.buttons[0]}` : "",
        site.components.shapes.length ? `recurring shapes: ${site.components.shapes.slice(0, 4).join(", ")}` : "",
      ].filter(Boolean)
    : [];

  if (!input.logoAvailable) missing.push("brand logo file");

  const positioning: string[] = [];
  const brandFields = input.brand?.fields ?? {};
  for (const key of ["positioning", "unique_value", "target_audience", "differentiators", "offering"]) {
    const value = clean(brandFields[key] ?? "", 260);
    if (value) positioning.push(`${key.replace(/_/g, " ")}: ${value}`);
  }
  if (site?.messaging.valueProposition && positioning.length < 4) {
    positioning.push(`website value proposition: ${site.messaging.valueProposition}`);
  }
  if (positioning.length === 0) missing.push("brand positioning");

  // ---- Campaign: the brief and approved copy are the source of truth.
  const headline = clean(input.content.hook ?? input.content.title ?? "", 180);
  const support = clean((input.content.body ?? "").split(/\n+/)[0] ?? "", 160);
  const cta = clean(input.content.cta ?? "", 60);
  if (!headline) missing.push("approved headline");
  if (!cta) missing.push("call to action");

  const concept =
    clean(input.brief.prompt, 700) || clean(input.content.title ?? "", 200) || clean(headline, 180);

  // ---- Art direction: one explicit source, plus the style finish.
  const presetDirections =
    input.direction.visualDirectionMode === "preset"
      ? input.direction.stylePresetIds
          .map((id) => visualStylePresetById(id))
          .filter((preset): preset is NonNullable<typeof preset> => Boolean(preset))
          .map((preset) => `${preset.label}: ${preset.direction}`)
      : [];

  const styleGuidance = input.direction.creativeStyleIds
    .map((id) => creativeStyleById(id)?.guidance)
    .filter((entry): entry is string => Boolean(entry));

  const referenceLanguage: string[] = [];
  if (
    input.direction.visualDirectionMode === "references" &&
    input.selectedReferenceCount > 0 &&
    hasReferenceProfile(input.referenceProfile)
  ) {
    const profile = input.referenceProfile;
    for (const key of [
      "composition_style",
      "visual_hierarchy",
      "color_behavior",
      "typography_style",
      "headline_treatment",
      "cta_patterns",
      "spacing_and_density",
      "lighting_and_contrast",
    ] as const) {
      const value = clean(profile[key], 240);
      if (value) referenceLanguage.push(`${key.replace(/_/g, " ")}: ${value}`);
    }
  }

  const avoid = [
    clean(input.brief.negative_prompt, 300),
    clean(input.referenceProfile.things_to_avoid, 240),
  ].filter(Boolean);

  return {
    identity: {
      brandName: clientName,
      colors: colors.slice(0, 6),
      fonts: fonts.slice(0, 4),
      typeHierarchy,
      uiShapes,
      logoAvailable: input.logoAvailable,
      positioning: positioning.slice(0, 4),
      usingWebsiteIdentity: Boolean(site),
    },
    campaign: {
      concept,
      objectiveHint: clean(input.brief.brand_considerations, 300),
      headline,
      support,
      cta,
      platformLabel: input.platformLabel,
      aspectRatio: input.aspectRatio,
    },
    art: {
      mode: input.direction.visualDirectionMode,
      modeExplicit: input.directionExplicit,
      styleGuidance,
      presetDirections,
      writtenDirection:
        input.direction.visualDirectionMode === "description"
          ? clean(input.direction.styleDescription, 800)
          : "",
      notes: clean(input.direction.notes, 400),
      briefSubject: clean(input.brief.subject, 300),
      briefComposition: clean(input.brief.composition, 300),
      briefMood: clean(input.brief.mood, 200),
      briefEnvironment: clean(input.brief.environment, 200),
      referenceLanguage,
      avoid,
    },
    mismatch,
    missing,
    feedback: clean(input.feedback ?? "", 1200) || null,
    version: input.version ?? 1,
  };
}
