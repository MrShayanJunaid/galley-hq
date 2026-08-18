import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { BrandOnboarding } from "@/components/brand/BrandOnboarding";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClient } from "@/hooks/use-clients";
import { useWorkspaceContext } from "@/hooks/use-workspace";

export const Route = createFileRoute("/_authenticated/clients/$clientId_/brand")({
  head: () => ({
    meta: [
      { title: "Brand setup — GalleyHQ" },
      {
        name: "description",
        content:
          "Onboard a client's brand: positioning, audience, brand voice and website-derived brand intelligence.",
      },
      { property: "og:title", content: "Brand setup — GalleyHQ" },
      {
        property: "og:description",
        content: "Build a structured brand profile that powers GalleyHQ content generation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrandSetupPage,
});

function BrandSetupPage() {
  const { clientId } = Route.useParams();
  const { data: context } = useWorkspaceContext();
  const { data: client, isLoading, isError, error, refetch } = useClient(clientId);

  return (
    <DashboardLayout
      title="Brand setup"
      description={
        client ? `Brand intelligence for ${client.company_name || client.name}` : "Brand onboarding"
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
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError ? (
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
      ) : !client ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <p className="font-medium">Client not found</p>
            <p className="text-sm text-muted-foreground">
              This client may have been deleted or belongs to another workspace.
            </p>
            <Button asChild variant="outline">
              <Link to="/clients">Back to clients</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <BrandOnboarding
          clientId={client.id}
          workspaceId={context?.workspace.id}
          clientName={client.company_name || client.name}
          clientWebsite={client.website}
          disabled={client.status === "archived"}
        />
      )}
    </DashboardLayout>
  );
}
