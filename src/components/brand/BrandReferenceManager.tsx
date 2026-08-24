import { Images, Loader2, Replace, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { formatDateTime } from "@/components/brand/brand-status";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBrandReferences,
  useDeleteBrandReference,
  useUpdateBrandReference,
  useUploadBrandReference,
} from "@/hooks/use-brand-references";
import { ACCEPTED_REFERENCE_TYPES, type BrandReference } from "@/lib/api/brand-references";

/**
 * Reference images teach the generator what "on brand" looks like. They are
 * stored privately per workspace and passed to the image model at generation
 * time, together with the description entered here.
 */
export function BrandReferenceManager({
  clientId,
  workspaceId,
  disabled,
}: {
  clientId: string;
  workspaceId: string | undefined;
  disabled?: boolean | undefined;
}) {
  const { data: references, isLoading } = useBrandReferences(clientId);
  const upload = useUploadBrandReference(clientId);
  const updateDescription = useUpdateBrandReference(clientId);
  const remove = useDeleteBrandReference(clientId);

  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<BrandReference | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BrandReference | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newDescription, setNewDescription] = useState("");

  async function handleFiles(files: FileList | null, replaceId?: string) {
    if (!files || files.length === 0 || !workspaceId) return;
    for (const file of Array.from(files)) {
      try {
        await upload.mutateAsync({
          clientId,
          workspaceId,
          file,
          ...(replaceId ? { replaceId } : { description: newDescription }),
        });
      } catch (error) {
        toast.error((error as Error)?.message ?? "Couldn't upload this reference image.");
        return;
      }
    }
    setNewDescription("");
    toast.success(replaceId ? "Reference replaced" : "Reference images uploaded");
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Images className="size-4" />
          Reference images
        </CardTitle>
        <CardDescription>
          Upload visuals that represent the style you expect. Every generated creative is matched to
          these references for composition, colour, lighting and visual language.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="reference-description">
              Context for the next upload (optional)
            </label>
            <Input
              id="reference-description"
              value={newDescription}
              placeholder="Why this reference matters — e.g. 'lighting and crop we want'"
              onChange={(event) => setNewDescription(event.target.value)}
              disabled={disabled || !workspaceId}
            />
          </div>
          <Button
            onClick={() => addInput.current?.click()}
            disabled={disabled || !workspaceId || upload.isPending}
          >
            {upload.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Upload references
          </Button>
        </div>

        <input
          ref={addInput}
          type="file"
          accept={ACCEPTED_REFERENCE_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={replaceInput}
          type="file"
          accept={ACCEPTED_REFERENCE_TYPES.join(",")}
          className="hidden"
          onChange={(event) => {
            const target = replaceTarget;
            setReplaceTarget(null);
            if (target) void handleFiles(event.target.files, target.id);
            event.target.value = "";
          }}
        />

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        ) : (references ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="font-medium">No reference images yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Without references, creatives rely on the written visual profile alone. Two to five
              strong references make a noticeable difference.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(references ?? []).map((reference) => (
              <div key={reference.id} className="space-y-2 rounded-xl border p-3">
                <div className="overflow-hidden rounded-lg border bg-muted">
                  {reference.url ? (
                    <img
                      src={reference.url}
                      alt={reference.description ?? "Brand reference image"}
                      className="block aspect-square w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="aspect-square w-full" />
                  )}
                </div>
                <Input
                  value={drafts[reference.id] ?? reference.description ?? ""}
                  placeholder="Describe what this reference shows"
                  disabled={disabled}
                  onChange={(event) =>
                    setDrafts((prev) => ({ ...prev, [reference.id]: event.target.value }))
                  }
                  onBlur={(event) => {
                    const next = event.target.value;
                    if (next === (reference.description ?? "")) return;
                    updateDescription.mutate({ id: reference.id, description: next });
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(reference.createdAt)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={disabled}
                      onClick={() => {
                        setReplaceTarget(reference);
                        replaceInput.current?.click();
                      }}
                      aria-label="Replace reference"
                    >
                      <Replace className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={disabled}
                      onClick={() => setPendingDelete(reference)}
                      aria-label="Delete reference"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this reference?</AlertDialogTitle>
            <AlertDialogDescription>
              The image will be removed from storage and will no longer influence generated
              creatives.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDelete) return;
                try {
                  await remove.mutateAsync({
                    id: pendingDelete.id,
                    storagePath: pendingDelete.storagePath,
                  });
                  toast.success("Reference deleted");
                } catch (error) {
                  toast.error((error as Error)?.message ?? "Couldn't delete this reference.");
                } finally {
                  setPendingDelete(null);
                }
              }}
            >
              {remove.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
