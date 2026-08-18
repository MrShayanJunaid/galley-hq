import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AdminSearch, AdminShell, formatDay } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminWorkspaces } from "@/hooks/use-admin";

export const Route = createFileRoute("/_authenticated/admin/workspaces")({
  head: () => ({
    meta: [
      { title: "Admin workspaces — GalleyHQ" },
      { name: "description", content: "Review every workspace and its plan on GalleyHQ." },
      { property: "og:title", content: "Admin workspaces — GalleyHQ" },
      { property: "og:description", content: "Review every workspace and its plan on GalleyHQ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminWorkspacesPage,
});

function AdminWorkspacesPage() {
  const { data, isLoading } = useAdminWorkspaces();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((workspace) =>
      [workspace.name, workspace.slug, workspace.planName]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term)),
    );
  }, [data, query]);

  return (
    <AdminShell title="Workspaces" description="All tenant workspaces across the platform.">
      <AdminSearch value={query} onChange={setQuery} placeholder="Search workspace, slug or plan" />
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            No workspaces match your search.
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-none">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Clients</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((workspace) => (
                  <TableRow key={workspace.id}>
                    <TableCell className="font-medium">{workspace.name}</TableCell>
                    <TableCell className="text-muted-foreground">{workspace.slug}</TableCell>
                    <TableCell className="text-muted-foreground">{workspace.memberCount}</TableCell>
                    <TableCell className="text-muted-foreground">{workspace.clientCount}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {workspace.planName ?? "—"}
                    </TableCell>
                    <TableCell>
                      {workspace.subscriptionStatus ? (
                        <Badge variant="secondary">{workspace.subscriptionStatus}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDay(workspace.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AdminShell>
  );
}
