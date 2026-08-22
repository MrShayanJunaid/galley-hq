import { createFileRoute } from "@tanstack/react-router";
import { Building2, Images, Sparkles, Users } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaceContext } from "@/hooks/use-workspace";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — GalleyHQ" },
      {
        name: "description",
        content: "Your agency workspace overview: plan, team and upcoming content modules.",
      },
      { property: "og:title", content: "Dashboard — GalleyHQ" },
      { property: "og:description", content: "Your agency workspace overview in GalleyHQ." },
    ],
  }),
  component: DashboardPage,
});

const modules = [
  {
    title: "Brand intelligence",
    description: "Capture each client's tone, audience and visual identity.",
    icon: Sparkles,
    to: "/brand" as const,
    cta: "Open Brand Intelligence",
  },
  {
    title: "Idea & caption studio",
    description: "Generate content ideas and on-brand captions.",
    icon: Users,
  },
  {
    title: "Creative production",
    description: "Produce visuals that match the client's brand kit.",
    icon: Images,
  },
  {
    title: "Review & approvals",
    description: "Internal review, then client sign-off before publishing.",
    icon: Building2,
  },
];


function DashboardPage() {
  const { data: context } = useWorkspaceContext();

  return (
    <DashboardLayout
      title="Dashboard"
      description={context ? `Workspace: ${context.workspace.name}` : undefined}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Current plan" value={context?.subscription?.plan?.name ?? "Free"} />
        <StatCard label="Team members" value={String(context?.memberCount ?? 0)} />
        <StatCard label="Your role" value={context?.role ?? "—"} />
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Product modules
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {modules.map((module) => (
            <Card key={module.title} className="shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <module.icon className="size-4" />
                  </span>
                  <Badge variant="secondary">Coming soon</Badge>
                </div>
                <CardTitle className="mt-3 text-base">{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-none">
      <CardContent className="pt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-display mt-2 text-2xl font-semibold capitalize">{value}</p>
      </CardContent>
    </Card>
  );
}
