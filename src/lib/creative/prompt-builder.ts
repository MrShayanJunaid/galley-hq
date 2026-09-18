/**
 * The structured creative prompt builder.
 *
 * Replaces the old "concatenate everything" engine. The prompt is assembled
 * from eight fixed, labelled sections, in order, from an already-resolved
 * context (see `brand-resolution.ts`) — so conflicts are settled before any
 * text is written and a data-poor client gets a short focused prompt instead of
 * padding.
 *
 * Client-safe: no server imports (the prompt preview renders this in the UI).
 */

import {
  COMPOSITION_BANS,
  COMPOSITION_RULES,
  copyLayoutRules,
  formatDirection,
} from "@/lib/creative/composition";
import type { ResolvedCreativeContext } from "@/lib/creative/brand-resolution";
import {
  renderReferenceGuidance,
  type ReferenceCandidate,
  type SelectedReference,
} from "@/lib/creative/reference-selection";
import type { CreativeVariant } from "@/lib/content/creative-variants";

export type PromptSection = { title: string; body: string };

export type PromptSource = {
  label: string;
  used: boolean;
  detail: string;
};

export type BuiltPrompt = {
  prompt: string;
  sections: PromptSection[];
  sources: PromptSource[];
  missing: string[];
  /** Ordered description of the image inputs attached to the request. */
  attachments: string[];
};

function bullets(lines: string[]): string {
  return lines.filter(Boolean).map((line) => `- ${line}`).join("\n");
}

export function buildCreativePrompt(args: {
  context: ResolvedCreativeContext;
  variant: CreativeVariant;
  references: SelectedReference<ReferenceCandidate>[];
  /** True when the brand's real logo file is attached as a brand asset. */
  logoAttached: boolean;
}): BuiltPrompt {
  const { context, variant } = args;
  const { identity, campaign, art } = context;
  const useReferences = art.mode === "references" && args.references.length > 0;

  const sections: PromptSection[] = [];
  const push = (title: string, lines: string[]) => {
    const body = lines.filter((line) => Boolean(line && line.trim())).join("\n");
    if (body.trim()) sections.push({ title, body });
  };

  // 1 — Task and output format
  push("1. TASK AND OUTPUT FORMAT", [
    `Design ONE finished marketing creative for ${identity.brandName}, to be published as a ${campaign.platformLabel} post.`,
    "It is a complete designed layout — image, typography and brand furniture together — not a photograph with text dropped on top.",
    `Output exactly one standalone composition at ${campaign.aspectRatio}. ${formatDirection(campaign.aspectRatio)}`,
    context.version > 1
      ? `This is version ${context.version}: keep the brand language identical and take a genuinely different compositional route than a first attempt.`
      : "",
  ]);

  // 2 — Brand identity
  push("2. BRAND IDENTITY (authoritative — never substitute or invent)", [
    `Brand name to render: ${identity.brandName}. Use this exact name for any wordmark or lockup.`,
    identity.colors.length > 0
      ? `Colours:\n${bullets(identity.colors.map((entry) => `${entry.role}: ${entry.value}`))}`
      : "",
    identity.fonts.length > 0
      ? `Typefaces:\n${bullets(
          identity.fonts.map(
            (font) => `${font.role}: ${font.family}${font.weights.length ? ` (weights ${font.weights.join(", ")})` : ""}`,
          ),
        )}`
      : "",
    identity.typeHierarchy.length > 0 ? `Type hierarchy:\n${bullets(identity.typeHierarchy)}` : "",
    identity.uiShapes.length > 0 ? `UI shapes to match:\n${bullets(identity.uiShapes)}` : "",
    args.logoAttached
      ? "The brand's real logo is attached as a brand asset (the LAST attached image). Reproduce that exact mark — same shapes, proportions and colourway — with clean clear space. It is an asset, not a style reference: never restyle, recolour, redraw or duplicate it."
      : "No logo file is available: set a small, clean wordmark of the brand name in the brand's own typeface. Never invent a logo mark or icon.",
    identity.positioning.length > 0 ? `Verified brand context:\n${bullets(identity.positioning)}` : "",
    identity.usingWebsiteIdentity
      ? "These colours, typefaces and shapes were measured from the brand's live website — use them exactly."
      : "",
    context.missing.length > 0
      ? `Unknown for this brand (do NOT invent these — design around them): ${context.missing.join(", ")}.`
      : "",
  ]);

  // 3 — Campaign brief (source of truth for messaging)
  push("3. CAMPAIGN BRIEF (source of truth for the message)", [
    campaign.concept ? `Message: ${campaign.concept}` : "",
    campaign.objectiveHint ? `Objective and audience: ${campaign.objectiveHint}` : "",
    campaign.cta ? `Desired action: ${campaign.cta}` : "",
    "Communicate only what this brief states. Add no claims, statistics, prices, guarantees or product details of your own.",
  ]);

  // 4 — Creative concept
  push("4. CREATIVE CONCEPT", [
    `${variant.label}: ${variant.concept}`,
    variant.impact ? `Intended impact: ${variant.impact}` : "",
    art.briefSubject ? `Focal subject: ${art.briefSubject}` : "",
    "Express this single idea. Do not combine it with another concept in the same frame.",
  ]);

  // 5 — Art direction
  push("5. ART DIRECTION", [
    variant.artDirection,
    art.briefComposition ? `Composition and framing: ${art.briefComposition}` : "",
    art.briefEnvironment ? `Setting: ${art.briefEnvironment}` : "",
    art.briefMood ? `Mood and lighting: ${art.briefMood}` : "",
    art.presetDirections.length > 0 ? bullets(art.presetDirections) : "",
    art.writtenDirection ? `Agency-written direction: ${art.writtenDirection}` : "",
    art.styleGuidance.length > 0 ? `Finish (applies on top of brand identity):\n${bullets(art.styleGuidance)}` : "",
    art.notes ? `Agency notes: ${art.notes}` : "",
    `Required of the composition:\n${bullets(COMPOSITION_RULES)}`,
  ]);

  // 6 — Typography and copy layout
  push("6. TYPOGRAPHY AND COPY LAYOUT (approved copy — verbatim)", [
    bullets(
      copyLayoutRules({
        headline: campaign.headline,
        support: campaign.support,
        cta: campaign.cta,
        fonts: identity.fonts.map(
          (font) => `${font.family}${font.weights.length ? ` ${font.weights.slice(0, 3).join("/")}` : ""}`,
        ),
      }),
    ),
  ]);

  // 7 — Reference guidance
  push(
    "7. REFERENCE GUIDANCE",
    useReferences
      ? [
          ...renderReferenceGuidance(args.references),
          art.referenceLanguage.length > 0
            ? `Design language learned from this brand's references:\n${bullets(art.referenceLanguage)}`
            : "",
        ]
      : [
          art.mode === "brand_only"
            ? "No references are in use by the agency's choice: design from the brand identity above alone. Do not default to stock-style imagery."
            : "No reference creatives are attached: follow the brand identity and the art direction above.",
        ],
  );

  // 8 — Quality constraints
  push("8. QUALITY CONSTRAINTS", [
    "It must be indistinguishable from work a professional design agency delivers: deliberate composition, correct kerning, crisp legible type, intentional CTA placement.",
    `Never produce:\n${bullets([...COMPOSITION_BANS, ...art.avoid])}`,
  ]);

  // Refinement feedback outranks the art direction for this regeneration only.
  if (context.feedback) {
    sections.splice(4, 0, {
      title: "REFINEMENT FEEDBACK (highest priority for this version)",
      body: `${context.feedback}\nApply this precisely while keeping the brand identity, approved copy and format unchanged.`,
    });
  }

  const attachments: string[] = [];
  if (useReferences) {
    args.references.forEach((entry, index) => {
      attachments.push(
        `Style reference ${index + 1} (${entry.attributes.join(", ")})${entry.note ? ` — ${entry.note}` : ""}`,
      );
    });
  }
  if (args.logoAttached) attachments.push("Brand logo — brand asset only, not a style reference");

  const sources: PromptSource[] = [
    {
      label: "Client name",
      used: Boolean(identity.brandName),
      detail: identity.brandName || "missing",
    },
    {
      label: "Website identity",
      used: identity.usingWebsiteIdentity,
      detail: identity.usingWebsiteIdentity
        ? `${identity.colors.length} colours, ${identity.fonts.length} typefaces`
        : context.mismatch
          ? "held back — website may belong to another brand"
          : "not extracted",
    },
    {
      label: "Brand logo",
      used: args.logoAttached,
      detail: args.logoAttached ? "attached as brand asset" : "not available",
    },
    {
      label: "Brand positioning",
      used: identity.positioning.length > 0,
      detail: identity.positioning.length > 0 ? `${identity.positioning.length} verified fields` : "missing",
    },
    {
      label: "Campaign brief",
      used: Boolean(campaign.concept),
      detail: campaign.concept ? `${campaign.concept.slice(0, 80)}…` : "missing",
    },
    {
      label: "Approved copy",
      used: Boolean(campaign.headline || campaign.cta),
      detail: [campaign.headline && "headline", campaign.support && "support", campaign.cta && "CTA"]
        .filter(Boolean)
        .join(", ") || "missing",
    },
    {
      label: "Visual direction",
      used: art.modeExplicit,
      detail: art.modeExplicit ? art.mode : `${art.mode} (not confirmed by the agency)`,
    },
    {
      label: "References",
      used: useReferences,
      detail: useReferences
        ? `${args.references.length} selected as most relevant`
        : art.mode === "references"
          ? "none uploaded"
          : "not used in this mode",
    },
  ];

  const prompt = sections.map((section) => `${section.title}\n${section.body}`).join("\n\n");

  return { prompt, sections, sources, missing: context.missing, attachments };
}
