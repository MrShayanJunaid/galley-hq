/**
 * Server-only helpers for website retrieval and AI brand extraction.
 * Never imported by client code (blocked by the *.server.ts guard).
 */

export type FetchedPage = {
  url: string;
  title: string | null;
  text: string;
};

export class BrandAnalysisError extends Error {
  code:
    | "invalid_url"
    | "website_not_found"
    | "unreachable"
    | "blocked"
    | "empty"
    | "ai_unavailable"
    | "ai_auth"
    | "ai_rate_limited"
    | "ai_credits"
    | "ai_failed"
    | "timeout";

  constructor(code: BrandAnalysisError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

/** Server-side, credential-free stage logging so failures can be traced. */
function logStage(stage: string, detail: Record<string, unknown>) {
  console.log(`[brand-analysis] ${stage}`, JSON.stringify(detail));
}


const USER_AGENT =
  "Mozilla/5.0 (compatible; GalleyHQBrandBot/1.0; +https://galleyhq.com/bot)";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|section|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function titleOf(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match ? stripHtml(match[1] ?? "").slice(0, 200) : null;
}

function metaDescription(html: string): string | null {
  const match =
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i.exec(html) ??
    /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']description["']/i.exec(html);
  return match ? stripHtml(match[1] ?? "").slice(0, 400) : null;
}

async function fetchPage(url: string, timeoutMs = 15000): Promise<FetchedPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en",
      },
    });

    logStage("fetch", { url, finalUrl: response.url, status: response.status });

    if (response.status === 404 || response.status === 410) {
      throw new BrandAnalysisError(
        "website_not_found",
        `The website returned "404 Not Found" for ${response.url || url}. This is the client's site responding, not a GalleyHQ error — check the URL or whether the site is live.`,
      );
    }
    if (response.status === 401 || response.status === 403 || response.status === 429) {
      throw new BrandAnalysisError(
        "blocked",
        `The website blocked our automated request (HTTP ${response.status}). Paste the brand details manually or try a page that allows crawlers.`,
      );
    }
    if (response.status >= 500) {
      throw new BrandAnalysisError(
        "unreachable",
        `The website is temporarily unavailable (HTTP ${response.status}). Try again shortly.`,
      );
    }
    if (!response.ok) {
      throw new BrandAnalysisError("unreachable", `The website returned HTTP ${response.status}.`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !contentType.includes("html") && !contentType.includes("text")) {
      throw new BrandAnalysisError("empty", "That URL does not return a readable web page.");
    }

    const html = (await response.text()).slice(0, 400_000);
    const description = metaDescription(html);
    const text = [description, stripHtml(html)].filter(Boolean).join("\n\n");
    return { url, title: titleOf(html), text: text.slice(0, 18_000) };
  } catch (error) {
    if (error instanceof BrandAnalysisError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new BrandAnalysisError("timeout", "The website took too long to respond.");
    }
    logStage("fetch_failed", { url, error: error instanceof Error ? error.message : "unknown" });
    throw new BrandAnalysisError(
      "unreachable",
      `We couldn't reach ${url}. Check that the domain is spelled correctly and publicly reachable.`,
    );
  } finally {
    clearTimeout(timer);
  }
}


function discoverInternalLinks(html: string, origin: string): string[] {
  const wanted = /(about|services|product|solutions|pricing|who-we-are|what-we-do|shop)/i;
  const found = new Set<string>();
  for (const match of html.matchAll(/href=["']([^"'#?]+)["']/gi)) {
    const href = match[1];
    if (!href || !wanted.test(href)) continue;
    try {
      const url = new URL(href, origin);
      if (url.origin !== origin) continue;
      found.add(url.toString().replace(/\/$/, ""));
    } catch {
      /* ignore malformed hrefs */
    }
    if (found.size >= 8) break;
  }
  return [...found];
}

/** Builds candidate entry URLs: the given URL, then www/non-www variants of the same host. */
function entryCandidates(websiteUrl: string): string[] {
  const candidates = [websiteUrl];
  try {
    const url = new URL(websiteUrl);
    const alt = new URL(websiteUrl);
    alt.hostname = url.hostname.startsWith("www.")
      ? url.hostname.slice(4)
      : `www.${url.hostname}`;
    candidates.push(alt.toString());
    if (url.pathname !== "/" && url.pathname !== "") {
      candidates.push(`${url.origin}/`);
    }
  } catch {
    /* normalizeWebsiteUrl already validated the shape */
  }
  return [...new Set(candidates)];
}

/** Retrieves the home page plus up to 2 relevant internal pages. */
export async function retrieveWebsite(websiteUrl: string): Promise<FetchedPage[]> {
  const candidates = entryCandidates(websiteUrl);
  let home: FetchedPage | null = null;
  let lastError: unknown = null;
  for (const candidate of candidates) {
    try {
      home = await fetchPage(candidate);
      websiteUrl = candidate;
      break;
    } catch (error) {
      lastError = error;
      // Only worth trying an alternate host for not-found / unreachable hosts.
      if (error instanceof BrandAnalysisError && error.code === "blocked") break;
    }
  }
  if (!home) throw lastError instanceof Error ? lastError : new BrandAnalysisError("unreachable", "We couldn't reach that website.");
  const pages: FetchedPage[] = [home];


  let rawHtml = "";
  try {
    const response = await fetch(websiteUrl, { headers: { "user-agent": USER_AGENT } });
    rawHtml = (await response.text()).slice(0, 300_000);
  } catch {
    rawHtml = "";
  }

  if (rawHtml) {
    const origin = new URL(websiteUrl).origin;
    const candidates = discoverInternalLinks(rawHtml, origin)
      .filter((url) => url !== websiteUrl.replace(/\/$/, ""))
      .slice(0, 2);
    for (const candidate of candidates) {
      try {
        const page = await fetchPage(candidate, 10_000);
        if (page.text.length > 200) pages.push(page);
      } catch {
        /* secondary pages are best-effort */
      }
    }
  }

  const totalText = pages.reduce((sum, page) => sum + page.text.length, 0);
  if (totalText < 250) {
    throw new BrandAnalysisError(
      "empty",
      "The website loaded but contained too little readable text to analyze.",
    );
  }
  return pages;
}

export type BrandInsights = {
  value_proposition: string | null;
  key_messaging: string[];
  brand_terminology: string[];
  important_sections: string[];
  audience_signals: string[];
  notes: string | null;
};

export type ExtractedBrand = {
  suggestions: Record<string, string>;
  insights: BrandInsights;
  model: string;
};

const LOVABLE_AI_MODEL = "openai/gpt-5.6-sol";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_DEFAULT_MODEL = "gpt-4.1-mini";

type AiProvider = { url: string; key: string; model: string; label: "openai" | "lovable" };

/**
 * Prefers a workspace-provided OPENAI_API_KEY (server-side secret) and falls back
 * to the managed Lovable AI Gateway. Keys are only ever read inside server code.
 */
function resolveAiProvider(): AiProvider {
  const openaiKey = process.env["OPENAI_API_KEY"];
  if (openaiKey) {
    return {
      url: OPENAI_URL,
      key: openaiKey,
      model: process.env["OPENAI_MODEL"] ?? OPENAI_DEFAULT_MODEL,
      label: "openai",
    };
  }
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (lovableKey) {
    return { url: LOVABLE_AI_URL, key: lovableKey, model: LOVABLE_AI_MODEL, label: "lovable" };
  }
  throw new BrandAnalysisError(
    "ai_unavailable",
    "No AI provider is configured. Add an OPENAI_API_KEY server secret to enable brand extraction.",
  );
}


const SUGGESTION_KEYS = [
  "industry",
  "description",
  "products_services",
  "target_audience",
  "brand_positioning",
  "usp",
  "key_differentiators",
  "customer_problems",
  "desired_perception",
  "content_topics",
  "cta_preferences",
  "voice.tone",
  "voice.formality",
  "voice.personality",
  "voice.writing_style",
  "voice.words_to_use",
  "voice.words_to_avoid",
];

function stringArray(value: unknown, limit = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, limit);
}

/** Calls the configured AI provider (streamed, consumed server-side) and returns structured brand data. */
export async function extractBrandFromPages(
  pages: FetchedPage[],
  hints: { brandName?: string | null; websiteUrl: string },
): Promise<ExtractedBrand> {
  const provider = resolveAiProvider();
  logStage("ai_request", {
    provider: provider.label,
    model: provider.model,
    pages: pages.length,
    url: hints.websiteUrl,
  });


  const corpus = pages
    .map((page) => `--- PAGE: ${page.url}\nTITLE: ${page.title ?? "n/a"}\n${page.text}`)
    .join("\n\n")
    .slice(0, 40_000);

  const system = [
    "You are a brand strategist extracting structured brand intelligence for a marketing agency.",
    "Use ONLY evidence from the supplied website text. Never invent facts, awards, or numbers.",
    "Summarize in your own words; do not copy long passages from the site.",
    "Respond with a single JSON object and nothing else.",
    "Every string value: max 600 characters, plain text, no markdown.",
    "Omit any key you cannot support with evidence rather than guessing.",
    `JSON keys allowed: ${SUGGESTION_KEYS.join(", ")}, value_proposition, key_messaging (array of max 5 strings), brand_terminology (array of max 8 strings), important_sections (array of max 6 strings), audience_signals (array of max 5 strings), notes.`,
  ].join("\n");

  const user = [
    `Website: ${hints.websiteUrl}`,
    hints.brandName ? `Known brand name: ${hints.brandName}` : "",
    "",
    "Website content:",
    corpus,
  ]
    .filter(Boolean)
    .join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  let raw = "";

  try {
    const response = await fetch(provider.url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${provider.key}`,
      },
      body: JSON.stringify({
        model: provider.model,
        stream: true,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      const body = (await response.text()).slice(0, 800);
      // Never log the key itself — only provider, status and provider message.
      console.error(`[brand-analysis] ai_error provider=${provider.label} status=${response.status}: ${body}`);
      if (response.status === 401) {
        throw new BrandAnalysisError(
          "ai_auth",
          "The AI provider rejected the configured API key. Update the key and try again.",
        );
      }
      if (response.status === 404) {
        throw new BrandAnalysisError(
          "ai_failed",
          `The AI model "${provider.model}" is not available for this key. Set OPENAI_MODEL to a model your account can access.`,
        );
      }
      if (response.status === 429) {
        throw new BrandAnalysisError("ai_rate_limited", "The AI service is rate limited. Try again in a moment.");
      }
      if (response.status === 402 || response.status === 403) {
        throw new BrandAnalysisError(
          "ai_credits",
          "AI credits are exhausted or AI access is blocked for this workspace.",
        );
      }
      throw new BrandAnalysisError("ai_failed", `The AI service failed (HTTP ${response.status}).`);
    }

    if (!response.body) {
      throw new BrandAnalysisError("ai_failed", "The AI service returned an empty response.");
    }


    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
          };
          const delta = chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content ?? "";
          raw += delta;
        } catch {
          /* ignore keep-alive / partial frames */
        }
      }
    }
  } catch (error) {
    if (error instanceof BrandAnalysisError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new BrandAnalysisError("timeout", "The AI analysis timed out. Please retry.");
    }
    console.error("AI gateway request failed", error);
    throw new BrandAnalysisError("ai_failed", "The AI analysis failed unexpectedly.");
  } finally {
    clearTimeout(timer);
  }

  const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    throw new BrandAnalysisError("ai_failed", "The AI returned an unreadable response. Please retry.");
  }

  const suggestions: Record<string, string> = {};
  for (const key of SUGGESTION_KEYS) {
    const value = parsed[key];
    if (typeof value === "string" && value.trim().length > 1) {
      suggestions[key] = value.trim().slice(0, 1200);
    }
  }

  return {
    suggestions,
    insights: {
      value_proposition:
        typeof parsed["value_proposition"] === "string" ? (parsed["value_proposition"] as string).slice(0, 800) : null,
      key_messaging: stringArray(parsed["key_messaging"], 5),
      brand_terminology: stringArray(parsed["brand_terminology"], 8),
      important_sections: stringArray(parsed["important_sections"], 6),
      audience_signals: stringArray(parsed["audience_signals"], 5),
      notes: typeof parsed["notes"] === "string" ? (parsed["notes"] as string).slice(0, 800) : null,
    },
    model: AI_MODEL,
  };
}
