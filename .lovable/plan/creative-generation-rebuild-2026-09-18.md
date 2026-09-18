# Creative generation rebuild

## What the audit found

I traced the flow end to end: Content Studio brief → idea/caption generation → creative brief → prompt composition → image call → storage → preview/download. The image model and resolution are not the problem. The real causes are in how information is assembled and how much of it is sent.

1. **One giant unstructured prompt.** The prompt builder concatenates every available block (brand intelligence, written visual identity, website identity, reference design language, agency direction, variant direction, brief, copy, format, bans) with no prioritisation. Real prompts measured from the database run 6,900–16,300 characters. Conflicting instructions appear in the same request (for example "use the website's exact style" next to "follow the reference design system" next to a preset style), so the model averages them into something generic.
2. **No conflict resolution.** Nothing decides which source wins for colour, type, subject or mood. Each block claims "highest authority" in its own text.
3. **Client name vs website brand.** The generator uses the brand profile's `brand_name` and never cross-checks it against the client name the user typed or against the identity extracted from the website. A website belonging to another brand is silently merged in, including its logo and palette.
4. **References sent indiscriminately.** Up to four uploaded references are attached in upload order with no relevance selection, and the fetched website logo is attached in the same image list as the style references — so the logo is treated as a style input.
5. **Silent reference default.** When an agency never sets a creative direction, the stored mode defaults to `references`, so uploads are pulled in without an explicit choice.
6. **No composition contract.** Composition guidance is spread across variant text and brief text. There is no single enforced rule set for one focal subject, hierarchy, negative space and restrained decoration — which is exactly the "collage / cluttered / mood-board" failure mode.
7. **Copy reliability.** Exact copy is requested inside a very long prompt, so headline/CTA rendering is unreliable, and there is no fallback for exact text.
8. **No prompt preview.** There is no way to inspect the composed prompt or see which sources were actually used before spending a 1.5–2.5 minute generation.
9. **Output handling is sound.** The original bytes are stored and the preview/download uses the signed URL of the original file — no thumbnail substitution. Errors do mark the row failed. This part I keep.

## What I will replace

Replaced:
- `composeVariantPrompt` in `src/lib/api/creative-image.server.ts` → a new structured builder in `src/lib/creative/prompt-builder.ts` with the eight required sections.
- New `src/lib/creative/brand-resolution.ts` — normalises and prioritises sources, resolves conflicts, and detects a client-name vs website-brand mismatch.
- New `src/lib/creative/composition.ts` — the composition contract and per-variant/format variation rules.
- New `src/lib/creative/reference-selection.ts` — scores and picks only the most relevant references; keeps the logo strictly as a brand asset, never a style input.
- `src/lib/content/creative-variants.ts` — variant directions rewritten as concept + art-direction pairs instead of prose blobs.

Kept unchanged: the image provider and model (`gpt-image-2` via `src/lib/ai/image.server.ts`), storage, signed-URL preview and download, auth, workspaces, billing, feedback storage, website extraction and reference upload, and the database schema.

## How the new pipeline works

**Resolution step (before any prompt text exists).** Build one resolved creative context: brand identity from the verified profile and measured website identity; campaign messaging from the brief and approved copy; visual direction from the agency's explicit mode. Where two sources disagree, the brief wins for campaign messaging and verified brand data wins for identity. Missing or uncertain data is marked missing rather than guessed.

**Mismatch handling.** The resolved context compares the client name, the client website host and the brand name/messaging extracted from the site. On a likely mismatch the generation returns a `brand_mismatch` outcome and the Creative panel asks the user to either use that website's visual identity or ignore it — the choice is stored per client. Nothing is merged silently, and the client name the user entered is always the brand name on the creative.

**Prompt composition.** Eight fixed, labelled, length-capped sections in this order: task and output format; brand identity; campaign brief; creative concept; art direction; typography and copy layout; reference guidance; quality constraints. Each section is emitted only when it carries resolved content, so a data-poor client gets a short focused prompt rather than padding.

**Composition contract.** Every creative requires one focal subject, deliberate subject placement, a clear hierarchy, clean negative space, a readable headline and CTA, restrained decoration, brand-consistent colour and a supporting background. Variation comes from the concept, format and visual direction, not from a fixed template.

**Copy fallback.** Approved copy is passed verbatim, never rewritten. If rendered text comes back unreliable, the panel offers a text-overlay pass that draws the exact headline/CTA and logo over the generated composition using the brand's resolved typography and the same layout zones the prompt specified.

**Prompt preview.** A "Preview prompt" control in the creative panel shows the exact composed prompt plus a source summary: which brand fields, which brief fields, which references and which logo are in use, and what is missing. Available before generation.

## Testing

I will run the six required scenarios against real records and report actual results: matching website; mismatched website; no website and no references; website identity without references; one relevant reference; several uploads where only the most relevant are chosen. For each I check the brand name, brief and CTA, single-concept composition, absence of unrelated brand details, and that the final image parses, displays and downloads. The first three plus one reference case get real image generations end to end; the rest are verified on the composed prompt and selected inputs (each generation is a paid 1.5–2.5 minute call).

## Notes

No database migration is needed. If the mismatch decision needs persisting beyond the existing `creative_direction` JSON I will say so before applying anything.
