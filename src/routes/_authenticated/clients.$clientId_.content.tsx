import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, Sparkles } from "lucide-react";

import { ContentStudio } from "@/components/content/ContentStudio";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBrandProfile } from "@/hooks/use-brand-profile";
import { useClient } from "@/hooks/use-clients";
import { useWorkspaceContext } from "@/hooks/use-workspace";

export const Route = createFileRoute("/_authenticated/clients/$clientId_/content")({
  head: () => ({
    meta: [
      { title: "Content Studio — GalleyHQ" },
      {
        name: "description",
        content:
          "Generate on-brand social content ideas, captions and creative direction from a client's brand intelligence.",
      },
      { property: "og:title", content: "Content Studio — GalleyHQ" },
      {
        property: "og:description",
        content: "AI content ideas, captions and creative briefs built on your client's brand profile.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContentStudioPage,
});

function ContentStudioPage() {
  const { clientId } = Route.useParams();
  const { data: context } = useWorkspaceContext();
  const { data: client, isLoading, isError, error, refetch } = useClient(clientId);
  const { data: brandProfile } = useBrandProfile(clientId);

  return (
    <DashboardLayout
      title="Content Studio"
      description={
        client ? `AI content for ${client.company_name || client.name}` : "AI content generation"
      }
      actions={
        <Button asChild variant="outline">
          <Link to="/clients/$clientId/brand" params={{ clientId }}>
            <Sparkles className="size-4" />
            Brand Intelligence
          </Link>
        </Button>
      }
    >
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/clients/$clientId" params={{ clientId }}>
          <ArrowLeft className="size-4" />
          Back to client
        </Link>
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError || !client ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <AlertCircle className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message ?? "Couldn't load this client."}
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ContentStudio
          clientId={clientId}
          workspaceId={client.workspace_id ?? context?.workspace.id}
          clientName={client.company_name || client.name}
          brandOnboardingStatus={brandProfile?.onboarding_status ?? "not_started"}
        />
      )}
    </DashboardLayout>
  );
}
