import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalyzeBrandReferences } from "@/hooks/use-brand-references";
import {
  REFERENCE_PROFILE_FIELDS,
  hasReferenceProfile,
  toReferenceProfile,
  toReferenceStatus,
} from "@/lib/brand/reference-profile";

/**
 * Shows the design language GalleyHQ has learned from the client's reference
 * creatives. This is derived intelligence — it sits alongside Brand
 * Intelligence and the written visual profile, and never overwrites either.
 */
export function ReferenceDesignLanguage({
  clientId,
  profileRow,
  referenceCount,
  disabled,
}: {
  clientId: string;
  profileRow: Record<string, unknown> | null | undefined;
  referenceCount: number;
  disabled?: boolean | undefined;
}) {
  const analyze = useAnalyzeBrandReferences(clientId);
  const profile = toReferenceProfile(profileRow?.["reference_visual_profile"]);
  const status = toReferenceStatus(profileRow?.["reference_visual_status"]);
  const error = (profileRow?.["reference_visual_error"] as string | null) ?? null;
  const analyzedAt = (profileRow?.["reference_visual_analyzed_at"] as string | null) ?? null;
  const learned = hasReferenceProfile(profile);

  async function run() {
    try {
      const result = await analyze.mutateAsync();
      if (result.ok) {
        toast.success(`Design language learned from ${result.referenceCount} reference(s)`);
      } else {
        toast.error(result.message);
      }
    } catch (mutationError) {
      toast.error((mutationError as Error)?.message ?? "Couldn't analyse the references.");
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4" />
          Learned design language
          {learned ? <Badge variant="secondary">Ready</Badge> : null}
        </CardTitle>
        <CardDescription>
          GalleyHQ visually analyses the reference creatives above — composition, hierarchy,
          typography, colour roles, CTA and logo placement — and reuses that design system for every
          creative it generates for this brand.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => void run()}
            disabled={disabled || analyze.isPending || referenceCount === 0}
          >
            {analyze.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            {learned ? "Re-analyse references" : "Analyse references"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {referenceCount === 0
              ? "Upload at least one reference creative to analyse."
              : analyzedAt
                ? `Last analysed ${new Date(analyzedAt).toLocaleString()}`
                : "Not analysed yet — generation will analyse them automatically."}
          </span>
        </div>

        {status === "error" && error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {learned ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            {REFERENCE_PROFILE_FIELDS.filter((field) => profile[field.key]).map((field) => (
              <div key={field.key} className="rounded-lg border bg-muted/30 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {field.label}
                </dt>
                <dd className="mt-1 text-sm leading-relaxed">{profile[field.key]}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing learned yet. Once analysed, the extracted design rules appear here and drive
            every generated creative.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
