import { Badge } from "@/components/ui/badge";
import { CONTENT_STATUSES, type ContentStatus } from "@/lib/content/schema";

export function ContentStatusBadge({ status }: { status: string }) {
  const found = CONTENT_STATUSES.find((entry) => entry.id === status);
  const variant =
    status === "ready_for_review"
      ? "default"
      : status === "ready_for_creative"
        ? "secondary"
        : "outline";
  return <Badge variant={variant}>{found?.label ?? status}</Badge>;
}

export function statusLabel(status: ContentStatus | string): string {
  return CONTENT_STATUSES.find((entry) => entry.id === status)?.label ?? String(status);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
