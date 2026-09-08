import { AlertCircle, Paintbrush, Type } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/components/brand/brand-status";
import {
  hasWebsiteIdentity,
  toWebsiteIdentity,
  websiteIdentityCounts,
  type WebsiteIdentity,
} from "@/lib/brand/website-identity";

function Swatch({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border px-2 py-1.5">
      <span
        className="size-6 shrink-0 rounded-md border"
        style={{ backgroundColor: value }}
        aria-hidden
      />
      <span className="leading-tight">
        <span className="block text-xs font-medium">{label}</span>
        <span className="block font-mono text-[11px] text-muted-foreground">{value}</span>
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/**
 * Verification surface for the website brand-identity extraction: shows exactly
 * what was detected from the live site before any creative is generated.
 */
export function WebsiteIdentityPanel({
  profileRow,
  compact,
}: {
  profileRow: Record<string, unknown> | null | undefined;
  /** Inline variant used inside the creative generation flow. */
  compact?: boolean;
}) {
  const identity: WebsiteIdentity = toWebsiteIdentity(profileRow?.["website_identity"]);
  const detected = hasWebsiteIdentity(identity);
  const counts = websiteIdentityCounts(identity);

  const body = (
    <div className="space-y-4">
      {!detected ? (
        <div className="flex items-start gap-2 rounded-lg border bg-secondary/40 px-3 py-2 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>
            No website brand identity has been detected yet. Run the website analysis on the brand
            setup page — colours, fonts, logos and UI shapes are read from the live site and used for
            creative generation.
          </span>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary" className="font-normal">
              {counts.colors} colours
            </Badge>
            <Badge variant="secondary" className="font-normal">
              {counts.fonts} fonts
            </Badge>
            <Badge variant="secondary" className="font-normal">
              {counts.logos} brand marks
            </Badge>
            <Badge variant="secondary" className="font-normal">
              {counts.variables} design tokens
            </Badge>
            <Badge variant="secondary" className="font-normal">
              {counts.typeStyles} type styles
            </Badge>
          </div>

          <Section title="Colours detected on the website">
            <div className="flex flex-wrap gap-2">
              <Swatch label="Primary" value={identity.colors.primary} />
              <Swatch label="Secondary" value={identity.colors.secondary} />
              <Swatch label="Accent" value={identity.colors.accent} />
              <Swatch label="Background" value={identity.colors.background} />
              <Swatch label="Surface" value={identity.colors.surface} />
              <Swatch label="Text" value={identity.colors.text} />
            </div>
            {identity.colors.palette.filter((entry) => entry.role === "other").length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {identity.colors.palette
                  .filter((entry) => entry.role === "other")
                  .slice(0, 10)
                  .map((entry) => (
                    <span
                      key={entry.hex}
                      title={`${entry.hex} · ${entry.source}`}
                      className="size-5 rounded border"
                      style={{ backgroundColor: entry.hex }}
                    />
                  ))}
              </div>
            ) : null}
          </Section>

          {identity.fonts.length > 0 ? (
            <Section title="Fonts detected">
              <ul className="space-y-1 text-sm">
                {identity.fonts.map((font) => (
                  <li key={font.family} className="flex flex-wrap items-center gap-2">
                    <Type className="size-3.5 text-muted-foreground" />
                    <span className="font-medium">{font.family}</span>
                    {font.role !== "unknown" ? (
                      <Badge variant="outline" className="font-normal">
                        {font.role}
                      </Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {font.weights.length ? `weights ${font.weights.join(", ")} · ` : ""}
                      {font.source}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {!compact && identity.typography.length > 0 ? (
            <Section title="Typography hierarchy">
              <ul className="space-y-1 font-mono text-xs text-muted-foreground">
                {identity.typography.map((style) => (
                  <li key={style.selector}>
                    <span className="text-foreground">{style.selector}</span>{" "}
                    {[
                      style.fontFamily,
                      style.fontSize,
                      style.fontWeight,
                      style.lineHeight,
                      style.letterSpacing,
                      style.textTransform,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {identity.logos.length > 0 ? (
            <Section title="Logo & brand marks found">
              <div className="flex flex-wrap items-center gap-3">
                {identity.logos.map((logo) => (
                  <span
                    key={logo.url}
                    className="flex items-center gap-2 rounded-lg border bg-background px-2 py-1.5"
                  >
                    <img
                      src={logo.url}
                      alt={logo.alt ?? "Brand mark detected on the website"}
                      loading="lazy"
                      className="h-6 max-w-[120px] object-contain"
                    />
                    <Badge variant="outline" className="font-normal">
                      {logo.kind}
                    </Badge>
                  </span>
                ))}
              </div>
            </Section>
          ) : null}

          {!compact &&
          (identity.components.borderRadii.length > 0 ||
            identity.components.shapes.length > 0 ||
            identity.components.buttons.length > 0) ? (
            <Section title="Buttons, shapes & recurring elements">
              <div className="space-y-1 text-sm">
                {identity.components.borderRadii.length > 0 ? (
                  <p className="text-muted-foreground">
                    Corner radii: {identity.components.borderRadii.join(", ")}
                  </p>
                ) : null}
                {identity.components.shapes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {identity.components.shapes.map((shape) => (
                      <Badge key={shape} variant="secondary" className="font-normal">
                        {shape}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {identity.components.buttons.map((rule) => (
                  <p key={rule} className="font-mono text-xs text-muted-foreground">
                    {rule}
                  </p>
                ))}
              </div>
            </Section>
          ) : null}

          {identity.visualStyle ? (
            <Section title="Overall website visual style">
              <p className="text-sm">{identity.visualStyle}</p>
              {identity.designPatterns.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {identity.designPatterns.map((pattern) => (
                    <li key={pattern}>
                      <Badge variant="outline" className="font-normal">
                        {pattern}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Section>
          ) : null}

          {!compact && identity.messaging.valueProposition ? (
            <Section title="Brand & product messaging from the website">
              <p className="text-sm">{identity.messaging.valueProposition}</p>
              {identity.messaging.keyMessages.length > 0 ? (
                <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                  {identity.messaging.keyMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
            </Section>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Extracted {formatDateTime(identity.extractedAt)} from {identity.sources.length} source
            {identity.sources.length === 1 ? "" : "s"} (page HTML, stylesheets and font files). These
            exact values are passed into creative generation.
          </p>
        </>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="rounded-lg border bg-secondary/20 p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Paintbrush className="size-4" />
          Brand identity detected from the website
        </p>
        {body}
      </div>
    );
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Paintbrush className="size-4" />
          Website brand identity (extracted)
        </CardTitle>
        <CardDescription>
          Read directly from the live site's HTML, stylesheets, CSS variables, font declarations and
          image assets — not guessed. This is what creative generation will use when no reference
          creatives are supplied.
        </CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
