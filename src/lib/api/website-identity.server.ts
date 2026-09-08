/**
 * Server-only extraction of a website's REAL visual identity.
 *
 * It inspects the actual sources rather than the visible text:
 *  - the page HTML (head, header, meta, inline <style>, inline <svg>)
 *  - every linked stylesheet (including Google Fonts CSS)
 *  - CSS custom properties (design tokens), @font-face rules and font stacks
 *  - image / SVG logo assets and icons
 *
 * Colours, fonts, typography, UI shapes and logos are MEASURED. Only the
 * written "overall style" summary is generated, and only from that measured
 * evidence. Nothing is invented when it can be extracted.
 *
 * Never imported by client code (blocked by the *.server.ts guard).
 */

import { chatJson } from "@/lib/ai/chat.server";
import {
  emptyWebsiteIdentity,
  toWebsiteIdentity,
  type WebsiteColor,
  type WebsiteColorRole,
  type WebsiteFont,
  type WebsiteIdentity,
  type WebsiteLogo,
  type WebsiteTypeStyle,
} from "@/lib/brand/website-identity";

const USER_AGENT =
  "Mozilla/5.0 (compatible; GalleyHQBrandBot/1.0; +https://galleyhq.com/bot) AppleWebKit/537.36 Chrome/120 Safari/537.36";

const MAX_CSS_FILES = 8;
const MAX_CSS_BYTES = 400_000;

function log(stage: string, detail: Record<string, unknown>) {
  console.log(`[website-identity] ${stage}`, JSON.stringify(detail));
}

async function fetchText(url: string, timeoutMs = 12_000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "text/css,text/html,*/*" },
    });
    if (!response.ok) return null;
    return (await response.text()).slice(0, MAX_CSS_BYTES);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ colours */

function clamp255(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => clamp255(c).toString(16).padStart(2, "0")).join("")}`;
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];
  const m = lig - c / 2;
  return toHex((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255);
}

/** Normalises a CSS colour literal to a hex string; returns null when unsupported. */
export function normalizeColor(input: string): string | null {
  const value = input.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(value);
  if (hex) {
    const digits = hex[1]!;
    if (digits.length === 3 || digits.length === 4) {
      const [r, g, b] = [digits[0]!, digits[1]!, digits[2]!];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return `#${digits.slice(0, 6)}`;
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(value);
  if (rgb) return toHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]));
  const hsl = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(value);
  if (hsl) return hslToHex(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]));
  return null;
}

function hexParts(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function luminance(hex: string): number {
  const { r, g, b } = hexParts(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function saturation(hex: string): number {
  const { r, g, b } = hexParts(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function hue(hex: string): number {
  const { r, g, b } = hexParts(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (((h * 60) % 360) + 360) % 360;
}

const COLOR_LITERAL =
  /#(?:[0-9a-fA-F]{3,8})\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;

function roleFromVariableName(name: string): WebsiteColorRole | null {
  const key = name.toLowerCase();
  if (/(background|--bg|page-bg|body-bg)/.test(key) && !/foreground/.test(key)) return "background";
  if (/(surface|card|panel|elevated|muted-bg)/.test(key)) return "surface";
  if (/(text|foreground|copy|ink|body-color)/.test(key)) return "text";
  if (/(accent|highlight|cta|action)/.test(key)) return "accent";
  if (/(secondary|brand-2|alt)/.test(key)) return "secondary";
  if (/(primary|brand|main|theme)/.test(key)) return "primary";
  return null;
}

/* ------------------------------------------------------------------- parsing */

type CssBundle = { css: string; sources: string[]; googleFontUrls: string[] };

function absolute(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/** Collects the page's inline styles plus every linked stylesheet it can read. */
async function collectCss(html: string, pageUrl: string): Promise<CssBundle> {
  const sources: string[] = [];
  const googleFontUrls: string[] = [];
  let css = "";

  for (const match of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    css += `\n/* inline */\n${match[1] ?? ""}`;
  }
  if (css) sources.push(`${pageUrl} (inline <style>)`);

  const hrefs: string[] = [];
  for (const match of html.matchAll(/<link[^>]+>/gi)) {
    const tag = match[0];
    if (!/stylesheet/i.test(tag) && !/fonts\.googleapis/i.test(tag)) continue;
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href) continue;
    const url = absolute(href, pageUrl);
    if (url) hrefs.push(url);
  }

  const unique = [...new Set(hrefs)].slice(0, MAX_CSS_FILES);
  const fetched = await Promise.all(
    unique.map(async (url) => ({ url, text: await fetchText(url) })),
  );
  for (const entry of fetched) {
    if (!entry.text) continue;
    if (/fonts\.googleapis\.com/.test(entry.url)) googleFontUrls.push(entry.url);
    sources.push(entry.url);
    css += `\n/* ${entry.url} */\n${entry.text}`;
  }

  // Stylesheets often @import further sheets (common with font hosts).
  const imports: string[] = [];
  for (const match of css.matchAll(/@import\s+(?:url\()?["']?([^"')]+)["']?\)?/gi)) {
    const url = absolute(match[1] ?? "", pageUrl);
    if (url) imports.push(url);
  }
  const importFetched = await Promise.all(
    [...new Set(imports)].slice(0, 4).map(async (url) => ({ url, text: await fetchText(url) })),
  );
  for (const entry of importFetched) {
    if (!entry.text) continue;
    if (/fonts\.googleapis\.com/.test(entry.url)) googleFontUrls.push(entry.url);
    sources.push(entry.url);
    css += `\n/* ${entry.url} */\n${entry.text}`;
  }

  return { css: css.slice(0, 900_000), sources, googleFontUrls };
}

function extractCssVariables(css: string): Array<{ name: string; value: string }> {
  const map = new Map<string, string>();
  for (const match of css.matchAll(/(--[a-z0-9-_]+)\s*:\s*([^;{}]+)/gi)) {
    const name = (match[1] ?? "").trim();
    const value = (match[2] ?? "").trim().slice(0, 120);
    if (!name || !value || map.has(name)) continue;
    const keep =
      normalizeColor(value) !== null ||
      /^(oklch|lab|lch|color-mix)\(/i.test(value) ||
      /^[\d.]+%?\s+[\d.]+%?\s+[\d.]+%?$/.test(value) ||
      /font|radius|shadow|border|space|size|weight|leading|tracking/i.test(name);
    if (keep) map.set(name, value);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).slice(0, 60);
}

function buildPalette(
  css: string,
  html: string,
  variables: Array<{ name: string; value: string }>,
): WebsiteIdentity["colors"] {
  const counts = new Map<string, number>();
  const bump = (hex: string, by = 1) => counts.set(hex, (counts.get(hex) ?? 0) + by);

  for (const match of `${css}\n${html}`.matchAll(COLOR_LITERAL)) {
    const hex = normalizeColor(match[0]);
    if (hex) bump(hex);
  }

  const roleFromVar = new Map<WebsiteColorRole, { hex: string; source: string }>();
  for (const variable of variables) {
    const hex = normalizeColor(variable.value);
    if (!hex) continue;
    const role = roleFromVariableName(variable.name);
    bump(hex, 3);
    if (role && !roleFromVar.has(role)) roleFromVar.set(role, { hex, source: variable.name });
  }

  // Colours declared directly on body / html are the real page surface colours.
  const bodyRule =
    /(?:^|})\s*(?:html\s*,?\s*)?body[^{}]*\{([^}]*)\}/i.exec(css)?.[1] ??
    /(?:^|})\s*html[^{}]*\{([^}]*)\}/i.exec(css)?.[1] ??
    "";
  const bodyBackground = normalizeColor(
    /background(?:-color)?\s*:\s*([^;]+)/i.exec(bodyRule)?.[1]?.trim() ?? "",
  );
  const bodyText = normalizeColor(/(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(bodyRule)?.[1]?.trim() ?? "");

  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([hex]) => /^#[0-9a-f]{6}$/.test(hex));

  const background =
    roleFromVar.get("background")?.hex ??
    bodyBackground ??
    ranked.find(([hex]) => luminance(hex) > 0.88 || luminance(hex) < 0.1)?.[0] ??
    null;

  const text =
    roleFromVar.get("text")?.hex ??
    bodyText ??
    ranked.find(([hex]) => saturation(hex) < 0.25 && Math.abs(luminance(hex) - (background ? luminance(background) : 1)) > 0.45)?.[0] ??
    null;

  const chromatic = ranked.filter(
    ([hex]) => saturation(hex) > 0.2 && luminance(hex) > 0.06 && luminance(hex) < 0.95,
  );

  const primary = roleFromVar.get("primary")?.hex ?? chromatic[0]?.[0] ?? null;
  const secondary =
    roleFromVar.get("secondary")?.hex ??
    chromatic.find(([hex]) => hex !== primary && (!primary || Math.abs(hue(hex) - hue(primary)) > 20))?.[0] ??
    null;
  const accent =
    roleFromVar.get("accent")?.hex ??
    chromatic.find(
      ([hex]) =>
        hex !== primary &&
        hex !== secondary &&
        saturation(hex) > (primary ? saturation(primary) : 0.3) * 0.8,
    )?.[0] ??
    null;

  const surface =
    roleFromVar.get("surface")?.hex ??
    ranked.find(
      ([hex]) =>
        hex !== background &&
        saturation(hex) < 0.18 &&
        (background ? Math.abs(luminance(hex) - luminance(background)) < 0.25 : luminance(hex) > 0.8),
    )?.[0] ??
    null;

  const roles: Array<[WebsiteColorRole, string | null]> = [
    ["primary", primary],
    ["secondary", secondary],
    ["accent", accent],
    ["background", background],
    ["surface", surface],
    ["text", text],
  ];

  const palette: WebsiteColor[] = [];
  const seen = new Set<string>();
  for (const [role, hex] of roles) {
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    palette.push({
      hex,
      role,
      source: roleFromVar.get(role)?.source ?? "measured from stylesheet",
      occurrences: counts.get(hex) ?? 0,
    });
  }
  for (const [hex, occurrences] of ranked) {
    if (palette.length >= 16) break;
    if (seen.has(hex)) continue;
    seen.add(hex);
    palette.push({ hex, role: "other", source: "usage frequency", occurrences });
  }

  return { primary, secondary, accent, background, surface, text, palette };
}

function splitFontStack(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim().replace(/^["']|["']$/g, ""))
    .filter((part) => part.length > 0 && !/^(inherit|initial|unset|revert)$/i.test(part));
}

const GENERIC_FAMILIES =
  /^(sans-serif|serif|monospace|system-ui|-apple-system|blinkmacsystemfont|ui-sans-serif|ui-serif|ui-monospace|cursive|fantasy|emoji|math|apple color emoji|segoe ui emoji|segoe ui symbol|noto color emoji|helvetica|helvetica neue|arial|roboto|segoe ui|inherit)$/i;

function extractFonts(css: string, html: string, googleFontUrls: string[]): WebsiteFont[] {
  const fonts = new Map<string, WebsiteFont>();
  const add = (family: string, source: string, role: string, weights: string[] = []) => {
    const clean = family.trim().replace(/^["']|["']$/g, "");
    if (!clean || GENERIC_FAMILIES.test(clean)) return;
    const key = clean.toLowerCase();
    const existing = fonts.get(key);
    if (existing) {
      existing.weights = [...new Set([...existing.weights, ...weights])].sort();
      if (existing.role === "unknown" && role !== "unknown") existing.role = role;
      return;
    }
    fonts.set(key, { family: clean, weights: [...new Set(weights)].sort(), source, role });
  };

  // Google Fonts requests carry the exact families and weights the site loads.
  const googleHrefs = [
    ...googleFontUrls,
    ...[...html.matchAll(/href=["']([^"']*fonts\.googleapis\.com[^"']*)["']/gi)].map(
      (match) => (match[1] ?? "").replace(/&amp;/g, "&"),
    ),
  ];
  for (const href of googleHrefs) {
    for (const match of href.matchAll(/family=([^&]+)/gi)) {
      const raw = decodeURIComponent(match[1] ?? "").replace(/\+/g, " ");
      const [familyPart, axisPart] = raw.split(":");
      const weights = axisPart
        ? [...axisPart.matchAll(/(\d{3})/g)].map((entry) => entry[1] ?? "").filter(Boolean)
        : [];
      if (familyPart) add(familyPart, "google-fonts", "unknown", weights);
    }
  }

  // Self-hosted fonts.
  for (const match of css.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
    const block = match[1] ?? "";
    const family = /font-family\s*:\s*([^;]+)/i.exec(block)?.[1];
    const weight = /font-weight\s*:\s*([^;]+)/i.exec(block)?.[1]?.trim();
    if (family) {
      add(
        splitFontStack(family)[0] ?? family,
        "font-face",
        "unknown",
        weight ? weight.split(/\s+/).filter(Boolean) : [],
      );
    }
  }

  // Font design tokens.
  for (const match of css.matchAll(/(--[a-z0-9-_]*font[a-z0-9-_]*)\s*:\s*([^;{}]+)/gi)) {
    const name = (match[1] ?? "").toLowerCase();
    const role = /head|display|title/.test(name)
      ? "heading"
      : /body|text|sans|base/.test(name)
        ? "body"
        : /mono|code/.test(name)
          ? "mono"
          : "unknown";
    for (const family of splitFontStack(match[2] ?? "").slice(0, 2)) {
      add(family, "css-variable", role);
    }
  }

  // Role assignment from real selectors.
  const roleSelectors: Array<[RegExp, string]> = [
    [/(^|,)\s*(h1|h2|h3|\.h1|\.h2|\.heading|\.title|\.display)[^{,]*\{/i, "heading"],
    [/(^|,)\s*(body|html|p|\.body|\.text)[^{,]*\{/i, "body"],
    [/(^|,)\s*(code|pre|\.mono)[^{,]*\{/i, "mono"],
  ];
  for (const match of css.matchAll(/([^{}]+)\{([^}]*font-family[^}]*)\}/gi)) {
    const selector = (match[1] ?? "").split("}").pop() ?? "";
    const block = match[2] ?? "";
    const family = /font-family\s*:\s*([^;]+)/i.exec(block)?.[1];
    if (!family) continue;
    let role = "unknown";
    for (const [pattern, candidate] of roleSelectors) {
      if (pattern.test(`${selector}{`)) {
        role = candidate;
        break;
      }
    }
    for (const item of splitFontStack(family).slice(0, 2)) add(item, "css-stack", role);
  }

  const list = [...fonts.values()];
  list.sort((a, b) => {
    const rank = (font: WebsiteFont) =>
      (font.role === "heading" ? 0 : font.role === "body" ? 1 : font.role === "mono" ? 3 : 2) +
      (font.source === "google-fonts" || font.source === "font-face" ? 0 : 0.5);
    return rank(a) - rank(b);
  });
  return list.slice(0, 10);
}

function declaration(block: string, property: string): string | null {
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, "i").exec(block);
  return match ? (match[1] ?? "").trim().slice(0, 60) : null;
}

function extractTypography(css: string): WebsiteTypeStyle[] {
  const wanted = ["h1", "h2", "h3", "h4", "body", "p", "button", ".btn", "a"];
  const styles: WebsiteTypeStyle[] = [];
  for (const selector of wanted) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `(?:^|[},])\\s*(?:[^{},]*[\\s,])?${escaped}\\s*(?:,[^{}]*)?\\{([^}]*)\\}`,
      "i",
    );
    const block = pattern.exec(css)?.[1];
    if (!block) continue;
    const style: WebsiteTypeStyle = {
      selector,
      fontFamily: declaration(block, "font-family"),
      fontSize: declaration(block, "font-size"),
      fontWeight: declaration(block, "font-weight"),
      lineHeight: declaration(block, "line-height"),
      letterSpacing: declaration(block, "letter-spacing"),
      textTransform: declaration(block, "text-transform"),
    };
    if (
      style.fontFamily ||
      style.fontSize ||
      style.fontWeight ||
      style.lineHeight ||
      style.letterSpacing ||
      style.textTransform
    ) {
      styles.push(style);
    }
  }
  return styles;
}

function topValues(css: string, property: string, limit: number): string[] {
  const counts = new Map<string, number>();
  const pattern = new RegExp(`${property}\\s*:\\s*([^;{}]+)`, "gi");
  for (const match of css.matchAll(pattern)) {
    const value = (match[1] ?? "").trim().slice(0, 120);
    if (!value || /^(0|none|inherit|initial|unset)$/i.test(value)) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

function ruleSummary(css: string, selectorPattern: RegExp, limit: number): string[] {
  const results: string[] = [];
  for (const match of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selector = ((match[1] ?? "").split("}").pop() ?? "").trim();
    if (!selectorPattern.test(selector)) continue;
    const block = (match[2] ?? "").replace(/\s+/g, " ").trim();
    const interesting = [
      declaration(block, "background") ?? declaration(block, "background-color"),
      declaration(block, "color") ? `color ${declaration(block, "color")}` : null,
      declaration(block, "border-radius") ? `radius ${declaration(block, "border-radius")}` : null,
      declaration(block, "border") ? `border ${declaration(block, "border")}` : null,
      declaration(block, "padding") ? `padding ${declaration(block, "padding")}` : null,
      declaration(block, "box-shadow") ? `shadow ${declaration(block, "box-shadow")}` : null,
      declaration(block, "text-transform") ? `transform ${declaration(block, "text-transform")}` : null,
      declaration(block, "font-weight") ? `weight ${declaration(block, "font-weight")}` : null,
    ].filter(Boolean);
    if (interesting.length < 2) continue;
    results.push(`${selector.slice(0, 40)} → ${interesting.join(", ")}`.slice(0, 300));
    if (results.length >= limit) break;
  }
  return results;
}

function extractComponents(css: string, html: string): WebsiteIdentity["components"] {
  const shapes: string[] = [];
  const radii = topValues(css, "border-radius", 6);
  if (radii.some((value) => /9999px|50%|999rem|100vmax/.test(value))) shapes.push("fully rounded pills");
  if (radii.some((value) => /^0(px)?$/.test(value.trim()))) shapes.push("hard square corners");
  if (/linear-gradient|radial-gradient|conic-gradient/i.test(css)) shapes.push("gradient fills");
  if (/backdrop-filter\s*:\s*blur/i.test(css)) shapes.push("frosted / blurred panels");
  if (/clip-path/i.test(css)) shapes.push("clipped / angled shapes");
  if (/<svg/i.test(html)) shapes.push("inline SVG iconography");
  if (/border-radius\s*:\s*[^;]*\/\s*/i.test(css)) shapes.push("elliptical corners");
  if (/text-transform\s*:\s*uppercase/i.test(css)) shapes.push("uppercase labels");

  return {
    buttons: ruleSummary(css, /(^|\.|\s)(btn|button)[\w-]*$|^button/i, 4),
    borderRadii: radii,
    shadows: topValues(css, "box-shadow", 4),
    borders: topValues(css, "border", 4),
    cards: ruleSummary(css, /(^|\.|\s)(card|panel|tile|box)[\w-]*$/i, 3),
    shapes: [...new Set(shapes)],
  };
}

function extractLogos(html: string, pageUrl: string): WebsiteLogo[] {
  const logos: WebsiteLogo[] = [];
  const push = (url: string | null | undefined, kind: WebsiteLogo["kind"], alt: string | null) => {
    if (!url) return;
    const absoluteUrl = url.startsWith("data:") ? url : absolute(url, pageUrl);
    if (!absoluteUrl) return;
    if (logos.some((logo) => logo.url === absoluteUrl)) return;
    logos.push({ url: absoluteUrl.slice(0, 600), kind, alt });
  };

  for (const match of html.matchAll(/<img[^>]+>/gi)) {
    const tag = match[0];
    const src = /(?:data-)?src=["']([^"']+)["']/i.exec(tag)?.[1];
    const alt = /alt=["']([^"']*)["']/i.exec(tag)?.[1] ?? null;
    const cls = /class=["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
    if (!src) continue;
    if (!/logo|brand|wordmark|mark/i.test(`${src} ${alt ?? ""} ${cls}`)) continue;
    push(src, src.toLowerCase().endsWith(".svg") ? "svg" : "image", alt);
    if (logos.length >= 4) break;
  }

  for (const match of html.matchAll(/<link[^>]+>/gi)) {
    const tag = match[0];
    const rel = /rel=["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase() ?? "";
    if (!/icon|mask-icon|apple-touch-icon/.test(rel)) continue;
    push(/href=["']([^"']+)["']/i.exec(tag)?.[1], "favicon", rel);
  }

  const ogImage =
    /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i.exec(html)?.[1] ??
    /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i.exec(html)?.[1];
  push(ogImage, "og-image", "og:image");

  return logos.slice(0, 8);
}

function text(value: string | undefined | null, max = 300): string | null {
  if (!value) return null;
  const clean = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
  return clean ? clean.slice(0, max) : null;
}

function extractMessaging(html: string): WebsiteIdentity["messaging"] {
  const title = text(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1], 200);
  const description = text(
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i.exec(html)?.[1] ??
      /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["']/i.exec(html)?.[1],
    500,
  );
  const h1 = text(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1], 200);
  const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((match) => text(match[1], 160))
    .filter((entry): entry is string => Boolean(entry))
    .slice(0, 6);

  return {
    tagline: h1 ?? title,
    valueProposition: description ?? h1,
    keyMessages: headings,
    productInfo: null,
  };
}

/* --------------------------------------------------------------- entry point */

export type WebsiteIdentityOutcome = {
  identity: WebsiteIdentity;
  /** Set when the deterministic pass found nothing usable. */
  warning: string | null;
};

/**
 * Extracts the site's real visual identity. Deterministic first: colours,
 * fonts, typography, logos and UI shapes come from the actual CSS/HTML. A
 * single small AI pass then *describes* that measured evidence (style summary,
 * design patterns, product context) — it is never allowed to introduce colours
 * or fonts of its own.
 */
export async function extractWebsiteIdentity(args: {
  websiteUrl: string;
  brandName?: string | null;
  /** Readable page text already retrieved by the brand analyser, if any. */
  pageText?: string | null;
}): Promise<WebsiteIdentityOutcome> {
  const html = await fetchText(args.websiteUrl, 15_000);
  if (!html) {
    return {
      identity: { ...emptyWebsiteIdentity, websiteUrl: args.websiteUrl },
      warning: "We couldn't read the website's HTML, so no visual identity could be extracted.",
    };
  }

  const bundle = await collectCss(html, args.websiteUrl);
  const cssVariables = extractCssVariables(bundle.css);
  const colors = buildPalette(bundle.css, html, cssVariables);
  const fonts = extractFonts(bundle.css, html, bundle.googleFontUrls);
  const typography = extractTypography(bundle.css);
  const components = extractComponents(bundle.css, html);
  const logos = extractLogos(html, args.websiteUrl);
  const messaging = extractMessaging(html);

  log("measured", {
    url: args.websiteUrl,
    stylesheets: bundle.sources.length,
    colors: colors.palette.length,
    fonts: fonts.length,
    logos: logos.length,
    variables: cssVariables.length,
  });

  let identity: WebsiteIdentity = {
    websiteUrl: args.websiteUrl,
    colors,
    cssVariables,
    fonts,
    typography,
    logos,
    components,
    visualStyle: null,
    designPatterns: [],
    messaging,
    sources: [args.websiteUrl, ...bundle.sources].slice(0, 16),
    extractedAt: new Date().toISOString(),
    model: null,
  };

  // Describe (never replace) the measured evidence.
  try {
    const evidence = [
      `Website: ${args.websiteUrl}`,
      args.brandName ? `Brand: ${args.brandName}` : "",
      `Measured colours: ${JSON.stringify(colors)}`,
      `Design tokens: ${JSON.stringify(cssVariables.slice(0, 30))}`,
      `Fonts: ${JSON.stringify(fonts)}`,
      `Typography: ${JSON.stringify(typography)}`,
      `UI furniture: ${JSON.stringify(components)}`,
      `Headings & meta: ${JSON.stringify(messaging)}`,
      args.pageText ? `Page copy (excerpt):\n${args.pageText.slice(0, 6000)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const result = await chatJson({
      system: [
        "You describe a website's existing visual identity for a design brief.",
        "You are given values MEASURED from the site's real HTML and CSS. Treat them as fact.",
        "Never invent, rename, replace or 'improve' colours, fonts, weights or shapes. Never add hex values or font names that are not in the input.",
        "Return a single JSON object with exactly these keys:",
        '"visual_style" (string, 2-4 sentences describing the site\'s actual design language: colour usage, type treatment, density, shapes, imagery style),',
        '"design_patterns" (array of up to 8 short strings naming recurring, observable patterns),',
        '"messaging" (object with "tagline", "value_proposition", "key_messages" (array up to 5) and "product_info" — all grounded strictly in the supplied copy; omit a key if there is no evidence).',
        "Plain text only, no markdown.",
      ].join("\n"),
      user: evidence,
      timeoutMs: 90_000,
    });

    const parsed = result.parsed;
    const parsedMessaging = (parsed["messaging"] ?? {}) as Record<string, unknown>;
    identity = toWebsiteIdentity({
      ...identity,
      visualStyle: parsed["visual_style"],
      designPatterns: parsed["design_patterns"],
      messaging: {
        tagline: parsedMessaging["tagline"] ?? messaging.tagline,
        valueProposition: parsedMessaging["value_proposition"] ?? messaging.valueProposition,
        keyMessages: Array.isArray(parsedMessaging["key_messages"])
          ? parsedMessaging["key_messages"]
          : messaging.keyMessages,
        productInfo: parsedMessaging["product_info"] ?? null,
      },
      model: result.model,
    });
  } catch (error) {
    log("summary_skipped", { error: error instanceof Error ? error.message : "unknown" });
    identity = toWebsiteIdentity(identity);
  }

  const measuredNothing =
    colors.palette.length === 0 && fonts.length === 0 && logos.length === 0;

  return {
    identity,
    warning: measuredNothing
      ? "The site's styling could not be read (it may render entirely client-side or block automated requests). Add reference creatives or fill in the visual profile manually."
      : null,
  };
}

/** Downloads the extracted logo so it can be attached to image generation. */
export async function fetchLogoAsset(
  logos: WebsiteLogo[],
): Promise<{ base64: string; mimeType: string; url: string } | null> {
  const ordered = [...logos].sort((a, b) => {
    const rank = (logo: WebsiteLogo) =>
      logo.kind === "svg" ? 0 : logo.kind === "image" ? 1 : logo.kind === "og-image" ? 3 : 2;
    return rank(a) - rank(b);
  });

  for (const logo of ordered) {
    if (logo.url.startsWith("data:")) continue;
    try {
      const response = await fetch(logo.url, { headers: { "user-agent": USER_AGENT } });
      if (!response.ok) continue;
      const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "image/png";
      // Raster inputs only — the image model cannot consume SVG markup.
      if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(mimeType)) continue;
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength === 0 || buffer.byteLength > 4_000_000) continue;
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return { base64: btoa(binary), mimeType, url: logo.url };
    } catch {
      /* best effort — a missing logo must never block generation */
    }
  }
  return null;
}
