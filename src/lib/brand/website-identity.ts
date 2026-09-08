/**
 * Website Brand Identity — the *measured* visual identity of a client's own
 * website (colours, fonts, typography, logos, UI shapes, design patterns and
 * messaging), extracted from the real HTML, stylesheets, CSS variables, font
 * declarations and image/SVG assets.
 *
 * This is deliberately separate from:
 *  - `visual-schema.ts`      — the hand-written Visual Brand Profile
 *  - `reference-profile.ts`  — the design language learned from uploaded reference creatives
 *
 * Stored in `client_brand_profiles.website_identity`.
 * Client-safe: no server imports.
 */

export type WebsiteColorRole =
  | "primary"
  | "secondary"
  | "accent"
  | "background"
  | "surface"
  | "text"
  | "other";

export type WebsiteColor = {
  hex: string;
  role: WebsiteColorRole;
  /** Where the value was found: a CSS variable name, selector or "usage frequency". */
  source: string;
  /** How many times the value occurs across the inspected CSS/HTML. */
  occurrences: number;
};

export type WebsiteFont = {
  family: string;
  weights: string[];
  /** google-fonts | font-face | css-stack | css-variable */
  source: string;
  /** heading | body | mono | unknown */
  role: string;
};

export type WebsiteTypeStyle = {
  selector: string;
  fontFamily: string | null;
  fontSize: string | null;
  fontWeight: string | null;
  lineHeight: string | null;
  letterSpacing: string | null;
  textTransform: string | null;
};

export type WebsiteLogo = {
  url: string;
  kind: "svg" | "image" | "favicon" | "og-image";
  alt: string | null;
};

export type WebsiteIdentity = {
  websiteUrl: string | null;
  colors: {
    primary: string | null;
    secondary: string | null;
    accent: string | null;
    background: string | null;
    surface: string | null;
    text: string | null;
    palette: WebsiteColor[];
  };
  cssVariables: Array<{ name: string; value: string }>;
  fonts: WebsiteFont[];
  typography: WebsiteTypeStyle[];
  logos: WebsiteLogo[];
  components: {
    buttons: string[];
    borderRadii: string[];
    shadows: string[];
    borders: string[];
    cards: string[];
    shapes: string[];
  };
  /** Written summary — derived from the measured evidence only. */
  visualStyle: string | null;
  designPatterns: string[];
  messaging: {
    tagline: string | null;
    valueProposition: string | null;
    keyMessages: string[];
    productInfo: string | null;
  };
  /** Documents actually inspected (page + stylesheets + font CSS). */
  sources: string[];
  extractedAt: string | null;
  model: string | null;
};

export const emptyWebsiteIdentity: WebsiteIdentity = {
  websiteUrl: null,
  colors: {
    primary: null,
    secondary: null,
    accent: null,
    background: null,
    surface: null,
    text: null,
    palette: [],
  },
  cssVariables: [],
  fonts: [],
  typography: [],
  logos: [],
  components: { buttons: [], borderRadii: [], shadows: [], borders: [], cards: [], shapes: [] },
  visualStyle: null,
  designPatterns: [],
  messaging: { tagline: null, valueProposition: null, keyMessages: [], productInfo: null },
  sources: [],
  extractedAt: null,
  model: null,
};

function str(value: unknown, max = 400): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function strList(value: unknown, limit = 12, max = 240): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => str(item, max))
    .filter((item): item is string => Boolean(item))
    .slice(0, limit);
}

/** Coerces stored JSON into a typed website identity. */
export function toWebsiteIdentity(value: unknown): WebsiteIdentity {
  const raw = (value ?? {}) as Record<string, unknown>;
  const colors = (raw["colors"] ?? {}) as Record<string, unknown>;
  const components = (raw["components"] ?? {}) as Record<string, unknown>;
  const messaging = (raw["messaging"] ?? {}) as Record<string, unknown>;

  return {
    websiteUrl: str(raw["websiteUrl"]),
    colors: {
      primary: str(colors["primary"], 40),
      secondary: str(colors["secondary"], 40),
      accent: str(colors["accent"], 40),
      background: str(colors["background"], 40),
      surface: str(colors["surface"], 40),
      text: str(colors["text"], 40),
      palette: Array.isArray(colors["palette"])
        ? (colors["palette"] as unknown[])
            .map((entry) => {
              const item = (entry ?? {}) as Record<string, unknown>;
              const hex = str(item["hex"], 40);
              if (!hex) return null;
              return {
                hex,
                role: (str(item["role"], 20) ?? "other") as WebsiteColorRole,
                source: str(item["source"], 120) ?? "",
                occurrences: typeof item["occurrences"] === "number" ? item["occurrences"] : 0,
              } satisfies WebsiteColor;
            })
            .filter((entry): entry is WebsiteColor => Boolean(entry))
            .slice(0, 24)
        : [],
    },
    cssVariables: Array.isArray(raw["cssVariables"])
      ? (raw["cssVariables"] as unknown[])
          .map((entry) => {
            const item = (entry ?? {}) as Record<string, unknown>;
            const name = str(item["name"], 80);
            const val = str(item["value"], 120);
            return name && val ? { name, value: val } : null;
          })
          .filter((entry): entry is { name: string; value: string } => Boolean(entry))
          .slice(0, 40)
      : [],
    fonts: Array.isArray(raw["fonts"])
      ? (raw["fonts"] as unknown[])
          .map((entry) => {
            const item = (entry ?? {}) as Record<string, unknown>;
            const family = str(item["family"], 80);
            if (!family) return null;
            return {
              family,
              weights: strList(item["weights"], 12, 12),
              source: str(item["source"], 40) ?? "css-stack",
              role: str(item["role"], 20) ?? "unknown",
            } satisfies WebsiteFont;
          })
          .filter((entry): entry is WebsiteFont => Boolean(entry))
          .slice(0, 12)
      : [],
    typography: Array.isArray(raw["typography"])
      ? (raw["typography"] as unknown[])
          .map((entry) => {
            const item = (entry ?? {}) as Record<string, unknown>;
            const selector = str(item["selector"], 60);
            if (!selector) return null;
            return {
              selector,
              fontFamily: str(item["fontFamily"], 120),
              fontSize: str(item["fontSize"], 40),
              fontWeight: str(item["fontWeight"], 20),
              lineHeight: str(item["lineHeight"], 20),
              letterSpacing: str(item["letterSpacing"], 20),
              textTransform: str(item["textTransform"], 20),
            } satisfies WebsiteTypeStyle;
          })
          .filter((entry): entry is WebsiteTypeStyle => Boolean(entry))
          .slice(0, 12)
      : [],
    logos: Array.isArray(raw["logos"])
      ? (raw["logos"] as unknown[])
          .map((entry) => {
            const item = (entry ?? {}) as Record<string, unknown>;
            const url = str(item["url"], 600);
            if (!url) return null;
            const kind = str(item["kind"], 20) ?? "image";
            return {
              url,
              kind: (["svg", "image", "favicon", "og-image"].includes(kind)
                ? kind
                : "image") as WebsiteLogo["kind"],
              alt: str(item["alt"], 160),
            } satisfies WebsiteLogo;
          })
          .filter((entry): entry is WebsiteLogo => Boolean(entry))
          .slice(0, 8)
      : [],
    components: {
      buttons: strList(components["buttons"], 8, 300),
      borderRadii: strList(components["borderRadii"], 8, 40),
      shadows: strList(components["shadows"], 6, 200),
      borders: strList(components["borders"], 6, 120),
      cards: strList(components["cards"], 6, 300),
      shapes: strList(components["shapes"], 8, 160),
    },
    visualStyle: str(raw["visualStyle"], 1200),
    designPatterns: strList(raw["designPatterns"], 10, 300),
    messaging: {
      tagline: str(messaging["tagline"], 300),
      valueProposition: str(messaging["valueProposition"], 600),
      keyMessages: strList(messaging["keyMessages"], 6, 300),
      productInfo: str(messaging["productInfo"], 900),
    },
    sources: strList(raw["sources"], 16, 500),
    extractedAt: str(raw["extractedAt"], 40),
    model: str(raw["model"], 80),
  };
}

export function hasWebsiteIdentity(identity: WebsiteIdentity): boolean {
  return (
    identity.colors.palette.length > 0 ||
    identity.fonts.length > 0 ||
    identity.logos.length > 0 ||
    Boolean(identity.visualStyle)
  );
}

/** Short badge-style summary used in the UI. */
export function websiteIdentityCounts(identity: WebsiteIdentity) {
  return {
    colors: identity.colors.palette.length,
    fonts: identity.fonts.length,
    logos: identity.logos.length,
    variables: identity.cssVariables.length,
    typeStyles: identity.typography.length,
  };
}

function colorLine(label: string, value: string | null): string {
  return value ? `${label}: ${value}` : "";
}

/**
 * Prompt-ready rendering handed to the image model. Only measured values appear
 * here, so the model can reproduce the real identity instead of inventing one.
 */
export function renderWebsiteIdentity(identity: WebsiteIdentity): string {
  const lines: string[] = [];

  const colors = [
    colorLine("Primary brand colour", identity.colors.primary),
    colorLine("Secondary brand colour", identity.colors.secondary),
    colorLine("Accent colour", identity.colors.accent),
    colorLine("Page background colour", identity.colors.background),
    colorLine("Surface / card colour", identity.colors.surface),
    colorLine("Body text colour", identity.colors.text),
  ].filter(Boolean);
  if (colors.length > 0) {
    lines.push("COLOURS (measured from the live website — use these exact values):");
    lines.push(...colors);
    const others = identity.colors.palette
      .filter((entry) => entry.role === "other")
      .slice(0, 8)
      .map((entry) => entry.hex);
    if (others.length > 0) lines.push(`Supporting palette: ${others.join(", ")}`);
  }

  if (identity.fonts.length > 0) {
    lines.push("");
    lines.push("TYPEFACES (the website's real fonts — set all type in these):");
    for (const font of identity.fonts.slice(0, 6)) {
      lines.push(
        `${font.role === "unknown" ? "Font" : font.role} — ${font.family}${
          font.weights.length ? ` (weights: ${font.weights.join(", ")})` : ""
        }`,
      );
    }
  }

  if (identity.typography.length > 0) {
    lines.push("");
    lines.push("TYPOGRAPHY HIERARCHY (as the site styles it):");
    for (const style of identity.typography.slice(0, 8)) {
      const parts = [
        style.fontFamily ? `family ${style.fontFamily}` : "",
        style.fontSize ? `size ${style.fontSize}` : "",
        style.fontWeight ? `weight ${style.fontWeight}` : "",
        style.lineHeight ? `line-height ${style.lineHeight}` : "",
        style.letterSpacing ? `letter-spacing ${style.letterSpacing}` : "",
        style.textTransform ? `transform ${style.textTransform}` : "",
      ].filter(Boolean);
      if (parts.length > 0) lines.push(`${style.selector}: ${parts.join(", ")}`);
    }
  }

  if (identity.logos.length > 0) {
    lines.push("");
    lines.push(
      `BRAND MARK: the brand's real logo is attached as a reference asset where available (${identity.logos
        .map((logo) => logo.kind)
        .join(", ")}). Reproduce it faithfully — same mark, proportions and colourway. Never invent a different logo or icon.`,
    );
  }

  const componentBits = [
    identity.components.borderRadii.length
      ? `Corner radii used on the site: ${identity.components.borderRadii.join(", ")}`
      : "",
    identity.components.buttons.length
      ? `Button treatment: ${identity.components.buttons.join(" | ")}`
      : "",
    identity.components.cards.length ? `Card treatment: ${identity.components.cards.join(" | ")}` : "",
    identity.components.borders.length ? `Borders: ${identity.components.borders.join(" | ")}` : "",
    identity.components.shadows.length ? `Shadows: ${identity.components.shadows.join(" | ")}` : "",
    identity.components.shapes.length
      ? `Recurring shapes / visual elements: ${identity.components.shapes.join(", ")}`
      : "",
  ].filter(Boolean);
  if (componentBits.length > 0) {
    lines.push("");
    lines.push("UI FURNITURE (match these shapes for buttons, pills, cards and containers):");
    lines.push(...componentBits);
  }

  if (identity.visualStyle) {
    lines.push("");
    lines.push(`OVERALL WEBSITE VISUAL STYLE: ${identity.visualStyle}`);
  }
  if (identity.designPatterns.length > 0) {
    lines.push(`Design patterns: ${identity.designPatterns.join("; ")}`);
  }

  const messaging = [
    identity.messaging.tagline ? `Tagline: ${identity.messaging.tagline}` : "",
    identity.messaging.valueProposition
      ? `Value proposition: ${identity.messaging.valueProposition}`
      : "",
    identity.messaging.keyMessages.length
      ? `Key messages: ${identity.messaging.keyMessages.join("; ")}`
      : "",
    identity.messaging.productInfo ? `Product / service context: ${identity.messaging.productInfo}` : "",
  ].filter(Boolean);
  if (messaging.length > 0) {
    lines.push("");
    lines.push("BRAND / PRODUCT CONTEXT FROM THE WEBSITE:");
    lines.push(...messaging);
  }

  return lines.join("\n");
}
