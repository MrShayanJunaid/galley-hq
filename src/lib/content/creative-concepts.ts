/**
 * The four creative directions GalleyHQ produces for a content item.
 *
 * Each is a *designed* social media creative — a complete marketing layout with
 * headline, supporting copy, CTA and brand furniture — not a bare photograph
 * with text dropped on top. The four are deliberately different compositions
 * that still read as the same brand's design system.
 */

export type CreativeAssetType = "image" | "video";

export type CreativeVariant = {
  index: 1 | 2 | 3 | 4;
  id: string;
  label: string;
  summary: string;
  /** Layout/composition direction handed to the prompt engine. */
  direction: string;
};

export const CREATIVE_VARIANTS: CreativeVariant[] = [
  {
    index: 1,
    id: "editorial_headline",
    label: "Editorial headline layout",
    summary: "Big typographic headline over an editorial brand image.",
    direction:
      "Design an editorial-poster layout: one strong photographic or illustrated brand image plus a large, confidently set headline occupying a clear typographic zone (top band, lower third or side column — whichever the reference layouts favour). Supporting line and CTA sit in a deliberate secondary hierarchy. Logo placed exactly where the references place it. Generous, intentional negative space; the type must never float randomly over the subject's face or focal point.",
  },
  {
    index: 2,
    id: "product_ui_focus",
    label: "Product / offer composition",
    summary: "The product, service artefact or UI presented as the hero.",
    direction:
      "Design a product/offer layout: the brand's actual product, service artefact, packaging or interface is the hero, presented with the reference set's treatment (cut-out on colour block, in-context shot, device frame, floating detail callouts). Headline and CTA anchor around it in a clean grid. Use colour blocking or shapes drawn from the brand palette to separate the type zone from the product zone.",
  },
  {
    index: 3,
    id: "problem_solution",
    label: "Problem → solution layout",
    summary: "Split or contrasted composition resolving a real tension.",
    direction:
      "Design a single-frame problem→solution composition: one deliberate split, diagonal, or foreground/background contrast that shows the tension and the brand's resolution. This is one unified designed layout with one shared type system — never two separate images pasted side by side, never a before/after collage of framed photos. Headline states the shift; CTA closes it.",
  },
  {
    index: 4,
    id: "minimal_premium",
    label: "Minimal premium composition",
    summary: "Restrained, high-end brand statement.",
    direction:
      "Design a minimal, premium brand statement: very few elements, dominant brand colour or material field, one small focal visual, short high-impact headline, understated CTA and logo. Precision spacing, refined typographic detail, strong figure-ground contrast. Restraint is the point — no decorative clutter, no stock flourishes.",
  },
];

export function variantByIndex(index: number): CreativeVariant | undefined {
  return CREATIVE_VARIANTS.find((variant) => variant.index === index);
}

export function variantLabel(index: number | null | undefined): string {
  if (!index) return "Creative";
  return variantByIndex(index)?.label ?? `Creative ${index}`;
}

/** Global "never produce this" list applied to every generation. */
export const GENERIC_OUTPUT_BANLIST = [
  "generic stock-photo businessperson at a laptop",
  "anonymous corporate office, meeting room or boardroom scene",
  "invented SaaS dashboard, fake charts, fake statistics or fake pricing",
  "random purple/blue gradient background, abstract gradient blobs or generic 3D shapes",
  "collage, grid, contact sheet, mockup sheet, multiple framed images or device-mockup showcase",
  "watermarks, provider logos, stock-site logos or any other brand's logo",
  "gibberish, misspelled, duplicated or cut-off lettering",
  "handshake, thumbs-up or lightbulb 'idea' cliché",
  "text floating without a layout, centred caption plates, or a photo with a plain text box slapped on top",
  "copying a reference image, reproducing its exact subject, or embedding a reference inside the output",
].join("; ");
