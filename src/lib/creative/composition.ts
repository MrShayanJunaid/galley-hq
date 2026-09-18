/**
 * The composition contract.
 *
 * Every GalleyHQ creative must be ONE intentional, premium marketing
 * composition. These rules are the non-negotiable part of the prompt; variation
 * comes from the concept, the format and the visual direction — never from a
 * fixed template.
 *
 * Client-safe: no server imports.
 */

/** Required of every creative, regardless of brand, brief or format. */
export const COMPOSITION_RULES: string[] = [
  "ONE clear focal subject that the eye lands on first.",
  "A deliberate composition: decide where the subject sits (off-centre, lower third, edge-cropped, centred with margins) and commit to it.",
  "A strong visual hierarchy: headline, then subject, then supporting line, then CTA, then logo.",
  "Clean negative space that is part of the design, not leftover room.",
  "A readable headline and an unmistakable CTA, both legible at thumbnail size.",
  "Restrained decoration — only elements that serve the message.",
  "Consistent brand colour and visual language across every element.",
  "A background that supports the subject instead of competing with it.",
];

/** What must never appear. Short and specific beats a long banlist. */
export const COMPOSITION_BANS: string[] = [
  "collage, grid, mood board, contact sheet, multi-frame or before/after panels",
  "website screenshots, browser chrome, fake dashboards or invented UI",
  "paragraphs of small text, stacked badges, random icons or unnecessary labels",
  "two competing scenes, duplicated subjects or unrelated objects in one frame",
  "invented claims, prices, statistics, guarantees or product details",
  "misspelled, duplicated, clipped or gibberish lettering",
  "generic stock-template look, random gradient blobs, decorative filler shapes",
  "any logo other than this brand's own",
];

/** Native layout guidance per output ratio. */
export function formatDirection(aspectRatio: string): string {
  if (aspectRatio === "9:16") {
    return "Tall 9:16 story frame. Design vertically: keep the top 12% and bottom 15% free of critical type, visual mass through the middle, headline high, CTA low.";
  }
  if (aspectRatio === "4:5") {
    return "4:5 vertical feed frame. Design natively vertical — do not design a square and pad it. Subject occupies the middle-to-lower mass with one clear typographic zone.";
  }
  if (aspectRatio === "16:9") {
    return "16:9 horizontal frame. Use a deliberate horizontal split — type zone on one side, visual mass on the other — with strong alignment.";
  }
  return "1:1 square frame. Share the square deliberately between the typographic zone and the visual zone (banded, split, or centred with generous margins).";
}

/** Typography and copy-layout requirements for the approved copy. */
export function copyLayoutRules(args: {
  headline: string;
  support: string;
  cta: string;
  fonts: string[];
}): string[] {
  const rules: string[] = [];
  if (args.headline) {
    rules.push(
      `Headline, set verbatim and largest: "${args.headline}" — one clear typographic zone, never over the subject's focal point, never clipped by the frame.`,
    );
  }
  if (args.support) {
    rules.push(
      `Supporting line, secondary size, verbatim: "${args.support}" — one line or two at most, directly related to the headline's zone.`,
    );
  }
  if (args.cta) {
    rules.push(`Call to action, small but unmissable (pill, button or bar): "${args.cta}".`);
  }
  if (args.fonts.length > 0) {
    rules.push(`Set all type in the brand's own typefaces: ${args.fonts.join("; ")}.`);
  }
  rules.push(
    "Spell every word exactly as written. Do not reword, translate, shorten, add a tagline or add any text that is not listed above.",
  );
  rules.push("Prefer short readable lines over paragraphs. Keep total on-image words low.");
  return rules;
}
