import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GalleyHQ — Social content workflow for marketing agencies" },
      {
        name: "description",
        content:
          "GalleyHQ gives marketing agencies one workspace for brand intelligence, content ideas, creatives, captions, approvals and publishing.",
      },
      { property: "og:title", content: "GalleyHQ — Social content workflow for agencies" },
      {
        property: "og:description",
        content: "One workspace for your agency's entire social content workflow.",
      },
    ],
  }),
  component: LandingPage,
});

const pillars = [
  "Workspace-isolated client data",
  "Roles for owners, admins and members",
  "Free, Pro and Agency plans",
];

function LandingPage() {
  const { isAuthenticated } = useSession();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-display text-lg font-semibold">GalleyHQ</span>
        <nav className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button asChild>
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/auth">Log in</Link>
              </Button>
              <Button asChild>
                <Link to="/auth">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          For marketing agencies
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] sm:text-6xl">
          One workspace for your agency's entire social content workflow.
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground">
          Understand each client's brand, generate ideas and creatives, write captions, run
          approvals and publish — without juggling five tools. The foundation is live today.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
              {isAuthenticated ? "Open your workspace" : "Create your workspace"}
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>

        <ul className="mt-16 grid gap-4 sm:grid-cols-3">
          {pillars.map((pillar) => (
            <li key={pillar} className="surface-panel flex items-start gap-3 p-5">
              <CheckCircle2 className="mt-0.5 size-4 text-accent" />
              <span className="text-sm font-medium">{pillar}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
