import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AdminSearch, AdminShell, formatDay } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminClients } from "@/hooks/use-admin";
import type { AdminClientRow } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/clients")({
  head: () => ({
    meta: [
      { title: "Admin clients — GalleyHQ" },
      {
        name: "description",
        content: "Search every client across all GalleyHQ workspaces and see which workspace owns each one.",
      },
      { property: "og:title", content: "Admin clients — GalleyHQ" },
      {
        property: "og:description",
        content: "Platform-wide client and brand visibility for GalleyHQ administrators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminClientsPage,
});

function AdminClientsPage() {
  const { data, isLoading } = useAdminClients();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminClientRow | null>(null);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((client) =>
      [client.name, client.companyName, client.email, client.website, client.workspaceName, client.workspaceSlug]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term)),
    );
  }, [data, query]);

  return (
    <AdminShell
      title="Clients"
      description="Every client across the platform, with the workspace that owns it."
    >
      <AdminSearch
        value={query}
        onChange={setQuery}
        placeholder="Search client, company or workspace"
      />
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            No clients match your search.
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-none">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Company / brand</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Brand onboarding</TableHead>
                  <TableHead>Website analysis</TableHead>
                  <TableHead>Brand updated</TableHead>
                  <TableHead className="text-right">Brand</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.companyName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.workspaceName}
                      <span className="ml-1 text-xs">/{client.workspaceSlug}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={client.status === "active" ? "secondary" : "outline"}
                        className="capitalize"
                      >
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          client.brand?.onboardingStatus === "completed" ? "default" : "outline"
                        }
                      >
                        {client.brand?.onboardingStatus?.replace("_", " ") ?? "not started"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {client.brand?.websiteAnalysisStatus === "completed"
                        ? `Yes · ${formatDay(client.brand.websiteAnalyzedAt)}`
                        : (client.brand?.websiteAnalysisStatus ?? "not run")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.brand ? formatDay(client.brand.updatedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelected(client)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              Owned by {selected?.workspaceName} — read-only platform view.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-3 text-sm">
            <Row label="Company / brand" value={selected?.companyName ?? null} />
            <Row label="Email" value={selected?.email ?? null} />
            <Row label="Website" value={selected?.brand?.websiteUrl ?? selected?.website ?? null} />
            <Row label="Industry" value={selected?.brand?.industry ?? null} />
            <Row label="Description" value={selected?.brand?.description ?? null} />
            <Row label="Target audience" value={selected?.brand?.targetAudience ?? null} />
            <Row label="Positioning" value={selected?.brand?.brandPositioning ?? null} />
            <Row label="Brand voice" value={selected?.brand?.brandVoice ?? null} />
            <Row
              label="Voice configuration"
              value={
                selected?.brand?.voice && Object.keys(selected.brand.voice).length > 0
                  ? Object.entries(selected.brand.voice)
                      .filter(([, value]) => Boolean(value))
                      .map(([key, value]) => `${key}: ${value}`)
                      .join("\n")
                  : null
              }
            />
            <Row
              label="Onboarding"
              value={
                selected?.brand
                  ? `${selected.brand.onboardingStatus.replace("_", " ")}${selected.brand.completedAt ? ` · completed ${formatDay(selected.brand.completedAt)}` : ""}`
                  : "not started"
              }
            />
          </dl>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-line">{value ?? "—"}</dd>
    </div>
  );
}
