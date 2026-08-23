import {
  AlertCircle,
  Download,
  ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useContentCreatives, useDeleteCreative, useGenerateCreative } from "@/hooks/use-creatives";
import type { CreativeAsset } from "@/lib/api/creatives";
import { creativeFormatById, defaultFormatFor, formatsForPlatform } from "@/lib/content/schema";

type Stage = "idle" | "preparing" | "generating" | "finalizing";

const STAGE_COPY: Record<Exclude<Stage, "idle">, string> = {
  preparing: "Preparing the creative brief…",
  generating: "Generating the visual…",
  finalizing: "Finalizing and saving…",
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
  const [stage, setStage] = useState<Stage>("idle");
  const [failure, setFailure] = useState<{ message: string; retryable: boolean } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CreativeAsset | null>(null);
  const timers = useRef<number[]>([]);

  const { data: assets, isLoading } = useContentCreatives(contentItemId);
  const generateMutation = useGenerateCreative(clientId, contentItemId);
  const deleteMutation = useDeleteCreative(clientId, contentItemId);

  useEffect(() => {
    if (!formats.some((format) => format.id === formatId)) setFormatId(defaultFormatFor(platform));
  }, [formats, formatId, platform]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const successful = (assets ?? []).filter((asset) => asset.status === "succeeded");
  const latest = successful[0] ?? null;
  const busy = stage !== "idle";

  function startStages() {
    timers.current.forEach((id) => window.clearTimeout(id));
    setStage("preparing");
    timers.current = [
      window.setTimeout(() => setStage("generating"), 1200),
    ];
  }

  async function handleGenerate() {
    if (!contentItemId) return;
    setFailure(null);
    startStages();
    try {
      const result = await generateMutation.mutateAsync({ formatId });
      if (!result.ok) {
        setFailure({ message: result.message, retryable: result.retryable });
        toast.error(result.message);
        return;
      }
      setStage("finalizing");
      toast.success("Creative generated");
    } catch (thrown) {
      const message = (thrown as Error)?.message ?? "Creative generation failed.";
      setFailure({ message, retryable: true });
      toast.error(message);
    } finally {
      timers.current.forEach((id) => window.clearTimeout(id));
      setStage("idle");
    }
  }

  const selectedFormat = creativeFormatById(formatId);

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">5. Creative visual</CardTitle>
        <CardDescription>
          Generates the actual image from the creative brief and stores it with this content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!hasCreativeBrief ? (
          <Alert>
            <Sparkles className="size-4" />
            <AlertTitle>Creative direction needed</AlertTitle>
            <AlertDescription>
              Generate the creative direction above first — it is the instruction for the image.
            </AlertDescription>
          </Alert>
        ) : null}

        {!contentItemId ? (
          <Alert>
            <ImageIcon className="size-4" />
            <AlertTitle>Save this content first</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>Visuals are stored against a saved content record so they survive a refresh.</span>
              <Button size="sm" variant="outline" onClick={onSaveFirst} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Save content &amp; continue
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {failure ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Creative generation failed</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>{failure.message}</span>
              {failure.retryable ? (
                <Button size="sm" variant="outline" onClick={() => void handleGenerate()}>
                  <RefreshCw className="size-4" />
                  Try again
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-[minmax(0,260px)_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="creative-format">Format</Label>
            <Select value={formatId} onValueChange={setFormatId} disabled={busy}>
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
            onClick={() => void handleGenerate()}
            disabled={busy || !contentItemId || !hasCreativeBrief}
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {STAGE_COPY[stage as Exclude<Stage, "idle">]}
              </>
            ) : (
              <>
                <ImageIcon className="size-4" />
                {latest ? "Regenerate visual" : "Generate creative"}
              </>
            )}
          </Button>
        </div>

        {busy ? (
          <div
            className="w-full max-w-md animate-pulse rounded-xl border bg-muted"
            style={{ aspectRatio: selectedFormat?.cssRatio ?? "1 / 1" }}
          />
        ) : isLoading && contentItemId ? (
          <Skeleton className="h-64 w-full max-w-md rounded-xl" />
        ) : latest ? (
          <div className="space-y-3">
            <figure className="w-full max-w-md overflow-hidden rounded-xl border bg-muted">
              <img
                src={latest.url ?? ""}
                alt={`Generated creative version ${latest.version}`}
                className="block h-auto w-full"
                style={{ aspectRatio: creativeFormatById(latest.formatId)?.cssRatio ?? undefined }}
                loading="lazy"
              />
            </figure>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">v{latest.version}</Badge>
              {latest.aspectRatio ? <Badge variant="outline">{latest.aspectRatio}</Badge> : null}
              <span>{formatDateTime(latest.createdAt)}</span>
              {latest.url ? (
                <Button asChild size="sm" variant="outline">
                  <a href={latest.url} download target="_blank" rel="noreferrer">
                    <Download className="size-4" />
                    Download
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {successful.length > 1 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Previous versions</p>
            <div className="flex flex-wrap gap-3">
              {successful.slice(1).map((asset) => (
                <div key={asset.id} className="w-32 space-y-1">
                  <div className="overflow-hidden rounded-lg border bg-muted">
                    {asset.url ? (
                      <img
                        src={asset.url}
                        alt={`Creative version ${asset.version}`}
                        className="block h-auto w-full"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-24" />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-muted-foreground">v{asset.version}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-1.5 text-destructive"
                      onClick={() => setPendingDelete(asset)}
                      aria-label={`Delete version ${asset.version}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {(assets ?? []).some((asset) => asset.status === "failed") ? (
          <p className="text-xs text-muted-foreground">
            Failed attempts are kept in the record for troubleshooting and do not affect saved visuals.
          </p>
        ) : null}
      </CardContent>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this version?</AlertDialogTitle>
            <AlertDialogDescription>
              Version {pendingDelete?.version} and its stored image will be permanently removed.
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
