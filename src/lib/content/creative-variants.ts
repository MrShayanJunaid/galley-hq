/**
 * The four creative variations GalleyHQ generates for every content item.
 * Each one is a separate image asset — never a collage or a grid — and each
 * carries its own visual brief so the four outputs are meaningfully different.
 *
 * `assetType` is carried through the pipeline so future video creatives slot in
 * without changing the schema.
 */

export type CreativeAssetType = "image" | "video";

export type CreativeVariant = {
  index: 1 | 2 | 3 | 4;
  id: string;
  label: string;
  summary: string;
  /** Direction handed to the prompt engine for this variant only. */
  direction: string;
};

export const CREATIVE_VARIANTS: CreativeVariant[] = [
  {
    index: 1,
    id: "product_focused",
    label: "Product-focused",
    summary: "The offering itself, shot as the hero.",
    direction:
      "Put the brand's actual product or service artefact at the centre of the frame as the hero subject. Real materials, real detail, close or medium crop. No people dominating the frame. The viewer should understand what is being sold from the image alone.",
  },
  {
    index: 2,
    id: "human_story",
    label: "Human / story-driven",
    summary: "A real person in a true-to-brand moment.",
    direction:
      "Show one authentic person from the brand's actual audience in a specific, believable moment connected to the brand. Candid, documentary framing with natural gesture and expression. Absolutely no stock-photo poses, no generic office worker at a laptop, no forced smiling handshake.",
  },
  {
    index: 3,
    id: "problem_solution",
    label: "Problem / solution",
    summary: "The tension the brand resolves, made visual.",
    direction:
      "Visualise the customer's problem and the brand's resolution in one frame — through contrast, before/after within a single composition, or a visual metaphor grounded in the brand's real world. Concrete objects and situations, not charts, arrows or infographic clichés.",
  },
  {
    index: 4,
    id: "conceptual",
    label: "Conceptual",
    summary: "A bold graphic idea built from brand cues.",
    direction:
      "Take a bolder, more art-directed conceptual approach: unexpected scale, arrangement, texture or perspective built strictly from the brand's own colour, material and mood language. Editorial and striking, still unmistakably this brand. No abstract gradient wallpaper, no random 3D shapes.",
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
  "generic stock-photo businesswoman or businessman at a laptop",
  "anonymous corporate office, meeting room or boardroom scene",
  "fake SaaS dashboard, UI mockup or screen full of invented charts",
  "random purple/blue gradient background or abstract gradient blobs",
  "collage, grid, split panels, multiple framed images or contact sheet",
  "watermarks, provider logos, other brands' logos",
  "gibberish or misspelled lettering",
  "generic handshake, thumbs-up, or lightbulb 'idea' metaphors",
].join("; ");
