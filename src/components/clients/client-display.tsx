import { Badge } from "@/components/ui/badge";

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "active" ? "secondary" : "outline"} className="capitalize">
      {status}
    </Badge>
  );
}
