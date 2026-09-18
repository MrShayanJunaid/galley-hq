/**
 * The four creative concepts GalleyHQ produces for a content item.
 *
 * Each is a single-idea marketing composition: one concept, one intended
 * impact, one art direction. They are deliberately different compositions that
 * still read as the same brand.
 */

export type CreativeAssetType = "image" | "video";

export type CreativeVariant = {
  index: 1 | 2 | 3 | 4;
  id: string;
  label: string;
  summary: string;
  /** The single idea this creative expresses. */
  concept: string;
  /** The emotional / marketing effect it should have. */
  impact: string;
  /** Focal subject, placement, background and framing guidance. */
  artDirection: string;
};

export const CREATIVE_VARIANTS: CreativeVariant[] = [
  {
    index: 1,
    id: "editorial_headline",
    label: "Editorial headline",
    summary: "Type-led editorial statement over one strong brand image.",
    concept:
      "The message itself is the hero: one confident statement supported by a single honest brand image.",
    impact: "Authority and confidence — the viewer trusts the brand before reading the detail.",
    artDirection:
      "One photographic or illustrated subject, cropped close and placed off-centre. A single clear typographic zone (top band, lower third or side column) holds the headline. Background is a calm brand-coloured field or a soft continuation of the subject. Generous margins; nothing overlapping the subject's focal point.",
  },
  {
    index: 2,
    id: "product_offer",
    label: "Product / offer",
    summary: "The real product, artefact or offer presented as the hero.",
    concept: "The offer is the subject: show the actual thing being sold or delivered.",
    impact: "Desire and clarity — the viewer immediately understands what they get.",
    artDirection:
      "Single hero product, packaging or service artefact, isolated on a calm brand surface with precise lighting and one soft realistic shadow. Only depict a screen or interface if a real brand asset shows one — otherwise use the physical object or a symbolic material stand-in. Headline anchors above or beside it on a clean grid; CTA sits below with clear space.",
  },
  {
    index: 3,
    id: "tension_resolution",
    label: "Tension → resolution",
    summary: "One frame that shows the problem and the brand's answer.",
    concept: "A single composition that holds the customer's tension and the brand's resolution.",
    impact: "Recognition then relief — the viewer sees their problem and the way out.",
    artDirection:
      "One unified frame with a deliberate diagonal, foreground/background or light-to-dark contrast carrying the shift. One subject, one shared type system. Never two photos side by side and never a before/after panel. Headline states the shift; CTA closes it.",
  },
  {
    index: 4,
    id: "minimal_premium",
    label: "Minimal premium",
    summary: "Restrained high-end brand statement.",
    concept: "Almost nothing, perfectly placed: a premium brand statement.",
    impact: "Prestige and calm — the restraint itself signals quality.",
    artDirection:
      "A dominant brand colour or material field, one small focal object or detail crop placed with intent, a short high-impact headline, an understated CTA and the logo. Precision spacing, strong figure-ground contrast, no decorative elements at all.",
  },
];

export function variantByIndex(index: number): CreativeVariant | undefined {
  return CREATIVE_VARIANTS.find((variant) => variant.index === index);
}

export function variantLabel(index: number | null | undefined): string {
  if (!index) return "Creative";
  return variantByIndex(index)?.label ?? `Creative ${index}`;
}
