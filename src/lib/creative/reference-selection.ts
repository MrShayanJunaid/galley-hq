/**
 * Reference selection.
 *
 * References guide design language; they are not combined indiscriminately.
 * Only the most relevant ones are attached, each with the attributes it is
 * being used for. The brand logo is NEVER a style reference — it travels as a
 * brand asset and is labelled as such in the prompt.
 *
 * Client-safe: no server imports (the prompt preview uses this too).
 */

export type ReferenceCandidate = {
  storagePath: string;
  description: string | null;
};

export type ReferenceAttribute =
  | "composition"
  | "color"
  | "typography"
  | "lighting"
  | "spacing";

export type SelectedReference<T extends ReferenceCandidate = ReferenceCandidate> = {
  candidate: T;
  score: number;
  attributes: ReferenceAttribute[];
  note: string | null;
};

const ATTRIBUTE_HINTS: Record<ReferenceAttribute, string[]> = {
  composition: ["layout", "composition", "crop", "frame", "grid", "split", "hero", "placement"],
  color: ["colour", "color", "palette", "tone", "contrast", "background"],
  typography: ["type", "font", "headline", "text", "lettering", "caption", "cta"],
  lighting: ["light", "lighting", "shadow", "mood", "bright", "dark", "studio"],
  spacing: ["space", "spacing", "minimal", "clean", "dense", "margin", "hierarchy"],
};

/** Default attributes when the agency gave no note about a reference. */
const DEFAULT_ATTRIBUTES: ReferenceAttribute[] = ["composition", "color", "typography"];

function scoreAgainst(text: string, briefTokens: Set<string>): number {
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3);
  let score = 0;
  for (const word of words) if (briefTokens.has(word)) score += 2;
  return score;
}

function attributesFor(description: string): ReferenceAttribute[] {
  const lower = description.toLowerCase();
  const found = (Object.keys(ATTRIBUTE_HINTS) as ReferenceAttribute[]).filter((attribute) =>
    ATTRIBUTE_HINTS[attribute].some((hint) => lower.includes(hint)),
  );
  return found.length > 0 ? found : DEFAULT_ATTRIBUTES;
}

/**
 * Picks the most relevant references for THIS creative.
 *
 * Relevance = overlap with the brief/concept text, plus the agency's own note,
 * plus recency (upload order). At most `limit` are attached so the model learns
 * a coherent design language instead of averaging every upload.
 */
export function selectReferences<T extends ReferenceCandidate>(args: {
  candidates: T[];
  briefText: string;
  /** Variant index keeps the four creatives from all leaning on one reference. */
  variantIndex?: number;
  limit?: number;
}): SelectedReference<T>[] {
  const limit = Math.max(1, args.limit ?? 2);
  if (args.candidates.length === 0) return [];

  const briefTokens = new Set(
    args.briefText
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3),
  );

  const scored = args.candidates.map((candidate, index) => {
    const description = (candidate.description ?? "").trim();
    const relevance = description ? scoreAgainst(description, briefTokens) : 0;
    // Earlier uploads are the agency's primary examples; keep a gentle bias.
    const recency = Math.max(0, args.candidates.length - index);
    const described = description ? 1 : 0;
    return {
      candidate,
      score: relevance * 3 + recency + described,
      attributes: description ? attributesFor(description) : DEFAULT_ATTRIBUTES,
      note: description || null,
    } satisfies SelectedReference<T>;
  });

  scored.sort((a, b) => b.score - a.score);

  // Rotate the starting point per variant so the four creatives don't all
  // inherit the same single reference.
  const offset = args.variantIndex && scored.length > limit ? (args.variantIndex - 1) % scored.length : 0;
  const rotated = [...scored.slice(offset), ...scored.slice(0, offset)];
  return rotated.slice(0, Math.min(limit, scored.length));
}

/** Prompt lines describing what to learn from each attached reference. */
export function renderReferenceGuidance(selected: SelectedReference[]): string[] {
  const lines = selected.map((entry, index) => {
    const attributes = entry.attributes.join(", ");
    const note = entry.note ? ` Agency note: ${entry.note}` : "";
    return `Reference image ${index + 1}: learn its ${attributes}.${note}`;
  });
  if (lines.length > 0) {
    lines.push(
      "Learn the design system only. Do not reproduce a reference's subject, wording or exact layout, and never place a reference image inside the output.",
    );
  }
  return lines;
}
