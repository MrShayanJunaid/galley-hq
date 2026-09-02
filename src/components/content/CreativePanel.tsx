import {
  AlertCircle,
  Check,
  Compass,
  Download,
  ImageIcon,
  Images,
  Loader2,
  MessageSquare,
  Palette,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { formatDateTime } from "@/components/content/content-display";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBrandProfile } from "@/hooks/use-brand-profile";
import { useBrandReferences } from "@/hooks/use-brand-references";
import { useContentCreatives, useDeleteCreative, useGenerateCreativeVariant } from "@/hooks/use-creatives";
import type { CreativeFeedback } from "@/lib/api/creative-feedback";
import { groupByVariant, type CreativeAsset } from "@/lib/api/creatives";
import { useCreativeFeedback, useRecordCreativeFeedback } from "@/hooks/use-creative-feedback";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatDateTime as formatFeedbackDate } from "@/components/brand/brand-status";
import {
  creativeStyleById,
  directionModeLabel,
  isDirectionConfigured,
  toCreativeDirection,
} from "@/lib/brand/creative-direction";
import { toVisualConfig, visualCompletion } from "@/lib/brand/visual-schema";
import { CREATIVE_VARIANTS, type CreativeVariant } from "@/lib/content/creative-variants";
import { creativeFormatById, defaultFormatFor, formatsForPlatform } from "@/lib/content/schema";

/** Per-creative generation state, surfaced individually on each card. */
type Stage = "idle" | "preparing" | "generating" | "uploading" | "completed" | "failed";

const STAGE_COPY: Record<Exclude<Stage, "idle" | "completed" | "failed">, string> = {
  preparing: "Preparing brand brief…",
  generating: "Generating…",
  uploading: "Saving asset…",
};

type VariantState = {
  stage: Stage;
  error?: { message: string; retryable: boolean } | undefined;
};

export function CreativePanel({
  clientId,
  contentItemId,
  platform,
  hasCreativeBrief,
  onSaveFirst,
  saving,
}: {
  clientId: string;
  contentItemId: string | null;
  platform: string;
  hasCreativeBrief: boolean;
  onSaveFirst: () => void;
  saving: boolean;
}) {
  const formats = useMemo(() => formatsForPlatform(platform), [platform]);
  const [formatId, setFormatId] = useState(() => defaultFormatFor(platform));
  const [states, setStates] = useState<Record<number, VariantState>>({});
  const [pendingDelete, setPendingDelete] = useState<CreativeAsset | null>(null);

  const { data: assets, isLoading } = useContentCreatives(contentItemId);
  const { data: feedbackHistory } = useCreativeFeedback(contentItemId);
  const recordFeedback = useRecordCreativeFeedback(contentItemId);
  const { data: profile } = useBrandProfile(clientId);
  const { data: workspace } = useWorkspace();
  const workspaceId = workspace?.workspace?.id;
  const { data: references } = useBrandReferences(clientId);
  const generate = useGenerateCreativeVariant(clientId, contentItemId);
  const deleteMutation = useDeleteCreative(clientId, contentItemId);

  useEffect(() => {
    if (!formats.some((format) => format.id === formatId)) setFormatId(defaultFormatFor(platform));
  }, [formats, formatId, platform]);

  const grouped = useMemo(() => groupByVariant(assets ?? []), [assets]);
  const visual = useMemo(() => toVisualConfig(profile?.visual_config), [profile?.visual_config]);
  const direction = useMemo(
    () =>
      toCreativeDirection(
        (profile as unknown as Record<string, unknown> | null | undefined)?.["creative_direction"],
      ),
    [profile],
  );
  const visualState = useMemo(() => visualCompletion(visual), [visual]);
  const referenceCount = references?.length ?? 0;
  const directionReady = isDirectionConfigured(direction, referenceCount);
  const styleLabels = direction.creativeStyleIds
    .map((id) => creativeStyleById(id)?.label)
    .filter((label): label is string => Boolean(label));

  const busyCount = Object.values(states).filter(
    (state) => state.stage !== "idle" && state.stage !== "completed" && state.stage !== "failed",
  ).length;
  const anyBusy = busyCount > 0;

  function setStage(variantIndex: number, stage: Stage, error?: VariantState["error"]) {
    setStates((prev) => ({ ...prev, [variantIndex]: { stage, error } }));
  }

  async function runVariant(
    variantIndex: number,
    refinement?: { feedback: string; feedbackId: string | null },
  ) {
    if (!contentItemId) return;
    setStage(variantIndex, "preparing");
    const timer = window.setTimeout(() => setStage(variantIndex, "generating"), 1500);
    try {
      const result = await generate.mutateAsync({
        variantIndex,
        formatId,
        feedback: refinement?.feedback ?? null,
        feedbackId: refinement?.feedbackId ?? null,
      });
      window.clearTimeout(timer);
      if (!result.ok) {
        setStage(variantIndex, "failed", { message: result.message, retryable: result.retryable });
        toast.error(`Creative ${variantIndex}: ${result.message}`);
        return false;
      }
      setStage(variantIndex, "uploading");
      window.setTimeout(() => setStage(variantIndex, "completed"), 400);
      return true;
    } catch (thrown) {
      window.clearTimeout(timer);
      const message = (thrown as Error)?.message ?? "Creative generation failed.";
      setStage(variantIndex, "failed", { message, retryable: true });
      toast.error(`Creative ${variantIndex}: ${message}`);
      return false;
    }
  }

  /** Four independent requests — one asset per variant, never a collage. */
  async function generateAll() {
    if (!contentItemId) return;
    const results = await Promise.all(CREATIVE_VARIANTS.map((variant) => runVariant(variant.index)));
    const done = results.filter(Boolean).length;
    if (done === CREATIVE_VARIANTS.length) toast.success("4 brand creatives generated");
    else if (done > 0) toast.warning(`${done} of 4 creatives generated — retry the failed ones`);
  }

  /**
   * Layer 4 — output refinement. The feedback is stored against this agency
   * workspace first (so a later learning system can read the history), then
   * applied to this single regeneration.
   */
  async function refineVariant(args: {
    variantIndex: number;
    creativeId: string | null;
    feedback: string;
  }) {
    if (!contentItemId) return false;
    const text = args.feedback.trim();
    if (text.length < 4) {
      toast.error("Add a little more detail so the regeneration can act on it.");
      return false;
    }

    let feedbackId: string | null = null;
    if (workspaceId) {
      try {
        const saved = await recordFeedback.mutateAsync({
          workspaceId,
          clientId,
          contentItemId,
          creativeId: args.creativeId,
          variantIndex: args.variantIndex,
          feedback: text,
        });
        feedbackId = saved.id;
      } catch (error) {
        console.error("[creative] feedback not stored", error);
      }
    }

    return runVariant(args.variantIndex, { feedback: text, feedbackId });
  }

  const anyGenerated = (assets ?? []).some((asset) => asset.status === "succeeded");

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">5. Brand creatives</CardTitle>
        <CardDescription>
          Four individual, brand-consistent visuals generated from this client's visual brand
          profile, reference images and the creative brief above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Brand inputs the generator will use */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Palette className="size-4" />
              Visual brand profile
              {visualState.isComplete ? (
                <Badge variant="secondary" className="gap-1">
                  <Check className="size-3" />
                  Ready
                </Badge>
              ) : (
                <Badge variant="outline">{visualState.percent}%</Badge>
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {visualState.isComplete
                ? visual.visual_style.slice(0, 140) || "Visual rules saved for this brand."
                : `Missing: ${visualState.missing.join(", ")}`}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Compass className="size-4" />
              Creative direction
              {directionReady ? (
                <Badge variant="secondary" className="gap-1">
                  <Check className="size-3" />
                  Set
                </Badge>
              ) : (
                <Badge variant="outline">Not set</Badge>
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {directionModeLabel(direction.visualDirectionMode)}
              {styleLabels.length > 0 ? ` · ${styleLabels.join(", ")}` : ""}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Images className="size-4" />
              Reference images
              <Badge variant={referenceCount > 0 ? "secondary" : "outline"}>{referenceCount}</Badge>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {referenceCount > 0
                ? "Attached to every generation for visual language, colour and lighting."
                : "No references yet — output will rely on the written visual profile alone."}
            </p>
          </div>
        </div>

        {!visualState.isComplete || referenceCount === 0 ? (
          <Alert>
            <Palette className="size-4" />
            <AlertTitle>Sharpen the brand visual inputs</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>
                Brand-specific creatives need the visual brand profile and a few reference images.
              </span>
              <Button asChild size="sm" variant="outline">
                <Link to="/clients/$clientId/brand" params={{ clientId }}>
                  Open visual identity
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {!hasCreativeBrief ? (
          <Alert>
            <Sparkles className="size-4" />
            <AlertTitle>Creative direction needed</AlertTitle>
            <AlertDescription>
              Generate the creative direction above first — it is the instruction for the visuals.
            </AlertDescription>
          </Alert>
        ) : null}

        {!contentItemId ? (
          <Alert>
            <ImageIcon className="size-4" />
            <AlertTitle>Save this content first</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>Creatives are stored against a saved content record so they survive a refresh.</span>
              <Button size="sm" variant="outline" onClick={onSaveFirst} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Save content &amp; continue
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-[minmax(0,260px)_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="creative-format">Platform format</Label>
            <Select value={formatId} onValueChange={setFormatId} disabled={anyBusy}>
              <SelectTrigger id="creative-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formats.map((format) => (
                  <SelectItem key={format.id} value={format.id}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => void generateAll()}
            disabled={anyBusy || !contentItemId || !hasCreativeBrief}
          >
            {anyBusy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating {busyCount} of 4…
              </>
            ) : (
              <>
                <ImageIcon className="size-4" />
                {anyGenerated ? "Generate a new set of 4" : "Generate 4 creatives"}
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {CREATIVE_VARIANTS.map((variant) => (
            <VariantCard
              key={variant.index}
              variant={variant}
              versions={grouped.get(variant.index) ?? []}
              state={states[variant.index] ?? { stage: "idle" }}
              loading={isLoading && Boolean(contentItemId)}
              disabled={!contentItemId || !hasCreativeBrief}
              fallbackRatio={creativeFormatById(formatId)?.cssRatio ?? "1 / 1"}
              onGenerate={() => void runVariant(variant.index)}
              onRefine={(feedback, creativeId) =>
                void refineVariant({ variantIndex: variant.index, creativeId, feedback })
              }
              refining={recordFeedback.isPending}
              feedbackHistory={(feedbackHistory ?? []).filter(
                (entry) => entry.variantIndex === variant.index,
              )}
              onDelete={(asset) => setPendingDelete(asset)}
            />
          ))}
        </div>

        {(assets ?? []).some((asset) => asset.status === "failed") ? (
          <p className="text-xs text-muted-foreground">
            Failed attempts are kept for troubleshooting and never replace a stored creative.
          </p>
        ) : null}
      </CardContent>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this version?</AlertDialogTitle>
            <AlertDialogDescription>
              Creative {pendingDelete?.variantIndex} v{pendingDelete?.version} and its stored image
              will be permanently removed. Other creatives are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDelete) return;
                try {
                  const result = await deleteMutation.mutateAsync(pendingDelete.id);
                  if (!result.ok) throw new Error(result.message ?? "Couldn't delete this version.");
                  toast.success("Version deleted");
                } catch (error) {
                  toast.error((error as Error)?.message ?? "Couldn't delete this version.");
                } finally {
                  setPendingDelete(null);
                }
              }}
            >
              {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function VariantCard({
  variant,
  versions,
  state,
  loading,
  disabled,
  fallbackRatio,
  onGenerate,
  onRefine,
  refining,
  feedbackHistory,
  onDelete,
}: {
  variant: CreativeVariant;
  versions: CreativeAsset[];
  state: VariantState;
  loading: boolean;
  disabled: boolean;
  fallbackRatio: string;
  onGenerate: () => void;
  onRefine: (feedback: string, creativeId: string | null) => void;
  refining: boolean;
  feedbackHistory: CreativeFeedback[];
  onDelete: (asset: CreativeAsset) => void;
}) {
  const [feedback, setFeedback] = useState("");
  const successful = versions.filter((asset) => asset.status === "succeeded");
  const latest = successful[0] ?? null;
  const busy = state.stage !== "idle" && state.stage !== "completed" && state.stage !== "failed";
  const ratio = creativeFormatById(latest?.formatId)?.cssRatio ?? fallbackRatio;

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            Creative {variant.index} — {variant.label}
          </p>
          <p className="text-xs text-muted-foreground">{variant.summary}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onGenerate}
          disabled={disabled || busy}
          aria-label={`Generate creative ${variant.index}`}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {latest ? "Regenerate" : "Generate"}
        </Button>
      </div>

      {busy ? (
        <div className="space-y-2">
          <div className="w-full animate-pulse rounded-lg border bg-muted" style={{ aspectRatio: ratio }} />
          <p className="text-xs text-muted-foreground">
            {STAGE_COPY[state.stage as Exclude<Stage, "idle" | "completed" | "failed">]}
          </p>
        </div>
      ) : loading && versions.length === 0 ? (
        <Skeleton className="h-48 w-full rounded-lg" />
      ) : latest ? (
        <div className="space-y-2">
          <figure className="overflow-hidden rounded-lg border bg-muted">
            <img
              src={latest.url ?? ""}
              alt={`${variant.label} creative, version ${latest.version}`}
              className="block h-auto w-full"
              style={{ aspectRatio: ratio }}
              loading="lazy"
            />
          </figure>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">v{latest.version}</Badge>
            {latest.aspectRatio ? <Badge variant="outline">{latest.aspectRatio}</Badge> : null}
            <span>{formatDateTime(latest.createdAt)}</span>
            {latest.url ? (
              <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                <a href={latest.url} download target="_blank" rel="noreferrer">
                  <Download className="size-3.5" />
                  Download
                </a>
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-destructive"
              onClick={() => onDelete(latest)}
              aria-label={`Delete creative ${variant.index} version ${latest.version}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="flex items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground"
          style={{ aspectRatio: ratio }}
        >
          Not generated yet
        </div>
      )}

      {latest ? (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <p className="flex items-center gap-2 text-xs font-medium">
            <MessageSquare className="size-3.5" />
            Refine this creative
          </p>
          <Textarea
            rows={2}
            value={feedback}
            placeholder="e.g. Move the headline to the top, warmer light, tighter crop on the product, stronger CTA contrast."
            onChange={(event) => setFeedback(event.target.value)}
            disabled={disabled || busy}
            aria-label={`Feedback for creative ${variant.index}`}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Saved to your agency account and applied to the next version.
            </p>
            <Button
              size="sm"
              variant="secondary"
              disabled={disabled || busy || refining || feedback.trim().length < 4}
              onClick={() => {
                onRefine(feedback, latest.id);
                setFeedback("");
              }}
            >
              {busy || refining ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Regenerate with feedback
            </Button>
          </div>
          {feedbackHistory.length > 0 ? (
            <ul className="space-y-1 border-t pt-2">
              {feedbackHistory.slice(0, 3).map((entry) => (
                <li key={entry.id} className="text-[11px] text-muted-foreground">
                  <span className="text-foreground">{entry.feedback}</span>{" "}
                  <span>· {formatFeedbackDate(entry.createdAt)}</span>
                  {entry.applied ? <span> · applied</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {state.stage === "failed" && state.error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Generation failed</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{state.error.message}</span>
            {state.error.retryable ? (
              <Button size="sm" variant="outline" onClick={onGenerate}>
                <RefreshCw className="size-4" />
                Retry creative {variant.index}
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {successful.length > 1 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium">Version history</p>
          <div className="flex flex-wrap gap-2">
            {successful.slice(1).map((asset) => (
              <div key={asset.id} className="w-20 space-y-1">
                <div className="overflow-hidden rounded-md border bg-muted">
                  {asset.url ? (
                    <img
                      src={asset.url}
                      alt={`${variant.label} version ${asset.version}`}
                      className="block h-auto w-full"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-16" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">v{asset.version}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1 text-destructive"
                    onClick={() => onDelete(asset)}
                    aria-label={`Delete version ${asset.version}`}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
