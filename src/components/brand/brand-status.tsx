import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const labels: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

export function OnboardingStatusBadge({ status }: { status: string | null | undefined }) {
  const value = status ?? "not_started";
  const variant =
    value === "completed" ? "default" : value === "in_progress" ? "secondary" : "outline";
  return <Badge variant={variant}>{labels[value] ?? value}</Badge>;
}

export function CompletionMeter({
  percent,
  missing,
}: {
  percent: number;
  missing: string[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Brand setup {percent}% complete</span>
        <span className="text-muted-foreground">
          {missing.length === 0 ? "All required information provided" : `${missing.length} required item(s) missing`}
        </span>
      </div>
      <Progress value={percent} />
      {missing.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {missing.map((item) => (
            <li key={item}>
              <Badge variant="outline" className="font-normal">
                Missing: {item}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
