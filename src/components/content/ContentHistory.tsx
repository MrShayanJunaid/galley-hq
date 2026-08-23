import { FileText, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ContentStatusBadge, formatDateTime } from "@/components/content/content-display";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClientContent, useDeleteContent } from "@/hooks/use-content";
import { useClientCreativeThumbnails } from "@/hooks/use-creatives";
import type { ContentItem } from "@/lib/api/content-items";
import { CONTENT_TYPES, OBJECTIVES, PLATFORMS, labelFor } from "@/lib/content/schema";

export function ContentHistory({
  clientId,
  activeId,
  onOpen,
}: {
  clientId: string;
  activeId: string | null;
  onOpen: (item: ContentItem) => void;
}) {
  const { data: items, isLoading } = useClientContent(clientId);
  const { data: thumbnails } = useClientCreativeThumbnails(clientId);
  const deleteMutation = useDeleteContent(clientId);
  const [pendingDelete, setPendingDelete] = useState<ContentItem | null>(null);

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Content history</CardTitle>
        <CardDescription>Everything saved for this client. Open a record to keep editing.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 px-6 pb-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (items ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 pb-10 pt-2 text-center">
            <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <FileText className="size-5" />
            </span>
            <p className="font-medium">No saved content yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Generate ideas above, write the content and save it — it will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Visual</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Type / objective</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items ?? []).map((item) => (
                <TableRow key={item.id} data-state={item.id === activeId ? "selected" : undefined}>
                  <TableCell>
                    {thumbnails?.[item.id]?.url ? (
                      <img
                        src={thumbnails[item.id]!.url as string}
                        alt={`Creative for ${item.title}`}
                        className="size-12 rounded-md border object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex size-12 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                        <ImageIcon className="size-4" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onOpen(item)}
                      className="text-left font-medium hover:underline"
                    >
                      {item.title}
                    </button>
                    {item.id === activeId ? (
                      <Badge variant="outline" className="ml-2 font-normal">
                        Editing
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">{labelFor(PLATFORMS, item.platform)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {labelFor(CONTENT_TYPES, item.contentType)} · {labelFor(OBJECTIVES, item.objective)}
                  </TableCell>
                  <TableCell>
                    <ContentStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(item.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => onOpen(item)}>
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-1 text-destructive"
                      onClick={() => setPendingDelete(item)}
                      aria-label={`Delete ${item.title}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this content?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDelete) return;
                try {
                  await deleteMutation.mutateAsync(pendingDelete.id);
                  toast.success("Content deleted");
                } catch (error) {
                  toast.error((error as Error)?.message ?? "Couldn't delete this content.");
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
