import { AlertCircle, Globe, Loader2, RefreshCw } from "lucide-react";

import { formatDateTime } from "@/components/brand/brand-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BrandAnalysisRun, BrandProfile } from "@/lib/api/brand-profile";

export type AnalysisPhase = "idle" | "fetching" | "extracting" | "failed" | "completed";

const phaseCopy: Record<AnalysisPhase, string> = {
  idle: "",
  fetching: "Retrieving website content…",
  extracting: "Generating brand intelligence…",
  failed: "Analysis failed",
  completed: "Analysis complete",
};

function insightList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function WebsiteAnalysisPanel({
  websiteUrl,
  onWebsiteUrlChange,
  onAnalyze,
  phase,
  error,
  profile,
  runs,
  disabled,
}: {
  websiteUrl: string;
  onWebsiteUrlChange: (value: string) => void;
  onAnalyze: () => void;
  phase: AnalysisPhase;
  error: string | null;
  profile: BrandProfile | null | undefined;
  runs: BrandAnalysisRun[];
  disabled?: boolean;
}) {
  const running = phase === "fetching" || phase === "extracting";
  const analysis = (profile?.website_analysis ?? null) as Record<string, unknown> | null;
  const lastRun = runs[0];

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="size-4" />
          Website analysis
        </CardTitle>
        <CardDescription>
          We read the publicly available pages of the client's site and turn them into reviewable brand
          intelligence. Nothing is saved to the profile until you accept it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1 space-y-2">
            <Label htmlFor="analysis-website">Website URL</Label>
            <Input
              id="analysis-website"
              value={websiteUrl}
              onChange={(event) => onWebsiteUrlChange(event.target.value)}
              placeholder="northwind.com"
              disabled={disabled || running}
            />
          </div>
          <Button onClick={onAnalyze} disabled={disabled || running || !websiteUrl.trim()}>
            {running ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {profile?.website_analyzed_at ? "Re-run analysis" : "Analyze website"}
          </Button>
        </div>

        {running ? (
          <div className="flex items-center gap-2 rounded-lg border bg-secondary/40 px-3 py-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            {phaseCopy[phase]}
          </div>
        ) : null}

        {error ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
            <AlertCircle className="size-4 text-destructive" />
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="outline" onClick={onAnalyze} disabled={disabled || running}>
              Retry
            </Button>
          </div>
        ) : null}

        {analysis ? (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Website-derived insights</p>
              <span className="text-xs text-muted-foreground">
                Last analyzed {formatDateTime(profile?.website_analyzed_at)}
              </span>
            </div>
            {typeof analysis["value_proposition"] === "string" ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Main value proposition
                </p>
                <p className="mt-1 text-sm">{analysis["value_proposition"] as string}</p>
              </div>
            ) : null}
            {[
              ["Key messaging", insightList(analysis["key_messaging"])],
              ["Brand terminology", insightList(analysis["brand_terminology"])],
              ["Audience signals", insightList(analysis["audience_signals"])],
              ["Important sections", insightList(analysis["important_sections"])],
            ].map(([label, items]) =>
              (items as string[]).length > 0 ? (
                <div key={label as string}>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {label as string}
                  </p>
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {(items as string[]).map((item) => (
                      <li key={item}>
                        <Badge variant="secondary" className="font-normal">
                          {item}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
            {insightList((analysis["pages"] as Array<{ url: string }> | undefined)?.map((p) => p.url))
              .length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Pages read:{" "}
                {(analysis["pages"] as Array<{ url: string }>).map((page) => page.url).join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}

        {lastRun ? (
          <p className="text-xs text-muted-foreground">
            Last run: {lastRun.status} · {formatDateTime(lastRun.created_at)}
            {lastRun.error_message ? ` · ${lastRun.error_message}` : ""}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
