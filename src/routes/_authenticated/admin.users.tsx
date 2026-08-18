import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AdminSearch, AdminShell, formatDateTime, formatDay } from "@/components/admin/AdminShell";
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
import { useAdminUsers } from "@/hooks/use-admin";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Admin users — GalleyHQ" },
      { name: "description", content: "Search and review every GalleyHQ user account." },
      { property: "og:title", content: "Admin users — GalleyHQ" },
      { property: "og:description", content: "Search and review every GalleyHQ user account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { data, isLoading } = useAdminUsers();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((user) =>
      [user.email, user.fullName, ...user.workspaces]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term)),
    );
  }, [data, query]);

  return (
    <AdminShell title="Users" description="Every account registered on GalleyHQ.">
      <AdminSearch value={query} onChange={setQuery} placeholder="Search name, email or workspace" />
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            No users match your search.
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-none">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Workspaces</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last sign-in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {user.fullName ?? "—"}
                        {user.isAdmin ? <Badge variant="secondary">Admin</Badge> : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.workspaces.length ? user.workspaces.join(", ") : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDay(user.createdAt)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(user.lastSignInAt)}
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
