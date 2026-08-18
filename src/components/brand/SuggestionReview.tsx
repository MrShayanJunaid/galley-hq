import { Check, RotateCcw, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FIELD_LABELS, type BrandFieldValues } from "@/lib/brand/schema";
import { formatDateTime } from "@/components/brand/brand-status";

function currentValue(values: BrandFieldValues, key: string): string {
  if (key.startsWith("voice.")) {
    return values.voice[key.slice(6) as keyof BrandFieldValues["voice"]] ?? "";
  }
  return (values as unknown as Record<string, string>)[key] ?? "";
}

export function SuggestionReview({
  values,
  suggestions,
  sources,
  generatedAt,
  sourceUrl,
  onAccept,
  onReject,
  onAcceptAll,
  onDiscardAll,
  busy,
}: {
  values: BrandFieldValues;
  suggestions: Record<string, string>;
  sources: Record<string, string>;
  generatedAt?: string | null | undefined;
  sourceUrl?: string | null | undefined;
  onAccept: (key: string) => void;
  onReject: (key: string) => void;
  onAcceptAll: () => void;
  onDiscardAll: () => void;
  busy?: boolean | undefined;
}) {
  const keys = Object.keys(suggestions);
  if (keys.length === 0) return null;

  return (
    <Card className="border-primary/40 shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" />
              AI-extracted brand intelligence
            </CardTitle>
            <CardDescription>
              {keys.length} suggestion{keys.length === 1 ? "" : "s"} from {sourceUrl ?? "the website"} ·
              generated {formatDateTime(generatedAt)}. Nothing is saved until you accept it.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onAcceptAll} disabled={busy}>
              <Check className="size-4" />
              Accept all
            </Button>
            <Button size="sm" variant="outline" onClick={onDiscardAll} disabled={busy}>
              <RotateCcw className="size-4" />
              Discard all
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {keys.map((key) => {
          const existing = currentValue(values, key);
          const userOwned = sources[key] === "user" && existing.trim().length > 0;
          return (
            <div key={key} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{FIELD_LABELS[key] ?? key}</p>
                <div className="flex items-center gap-2">
                  {userOwned ? (
                    <Badge variant="outline" className="font-normal">
                      You edited this — accepting replaces it
                    </Badge>
                  ) : null}
                  <Button size="sm" variant="secondary" onClick={() => onAccept(key)} disabled={busy}>
                    <Check className="size-4" />
                    Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onReject(key)} disabled={busy}>
                    <X className="size-4" />
                    Reject
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Current
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                    {existing.trim() || "Empty"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    AI suggestion
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm">{suggestions[key]}</p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
