import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Search, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { OnboardingStatusBadge, formatDateTime } from "@/components/brand/brand-status";
import { StatusBadge } from "@/components/clients/client-display";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspaceBrandOverview } from "@/hooks/use-brand-profile";
import { useWorkspaceContext } from "@/hooks/use-workspace";

export const Route = createFileRoute("/_authenticated/brand")({
  head: () => ({
    meta: [
      { title: "Brand Intelligence — GalleyHQ" },
      {
        name: "description",
        content:
          "Pick a client to open its brand intelligence: positioning, voice, content preferences and website-derived insights.",
      },
      { property: "og:title", content: "Brand Intelligence — GalleyHQ" },
      {
        property: "og:description",
        content: "Structured brand profiles for every client in your GalleyHQ workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrandIntelligencePage,
});

function BrandIntelligencePage() {
  const { data: context } = useWorkspaceContext();
  const workspaceId = context?.workspace.id;
  const { data: rows, isLoading, isError, error, refetch } = useWorkspaceBrandOverview(workspaceId);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows ?? [];
    return (rows ?? []).filter((row) =>
      [row.clientName, row.companyName, row.brandName, row.website]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [rows, search]);

  return (
    <DashboardLayout
      title="Brand Intelligence"
      description="Select a client to open its complete brand profile."
      actions={
        <Button asChild variant="outline">
          <Link to="/clients">
            <Users className="size-4" />
            Manage clients
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <AlertCircle className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message ?? "Couldn't load your clients."}
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (rows ?? []).length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Sparkles className="size-5" />
            </span>
            <p className="font-medium">No clients yet</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Brand Intelligence builds a structured brand profile per client. Add your first
              client to get started.
            </p>
            <Button asChild>
              <Link to="/clients">Add Client</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search clients or brands"
              className="pl-9"
              aria-label="Search clients"
            />
          </div>

          <Card className="shadow-none">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Brand onboarding</TableHead>
                    <TableHead>Client status</TableHead>
                    <TableHead>Last updated</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        No clients match “{search}”.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((row) => (
                      <TableRow key={row.clientId}>
                        <TableCell>
                          <Link
                            to="/clients/$clientId"
                            params={{ clientId: row.clientId }}
                            className="font-medium hover:underline"
                          >
                            {row.clientName}
                          </Link>
                          <p className="text-xs text-muted-foreground">{row.companyName}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.brandName ?? row.companyName ?? "—"}
                        </TableCell>
                        <TableCell>
                          <OnboardingStatusBadge status={row.onboardingStatus} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.clientStatus} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(row.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link to="/clients/$clientId/brand" params={{ clientId: row.clientId }}>
                              View Brand
                              <ArrowRight className="size-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
