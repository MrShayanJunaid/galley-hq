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
import { useAdminSubscriptions } from "@/hooks/use-admin";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  head: () => ({
    meta: [
      { title: "Admin subscriptions — GalleyHQ" },
      { name: "description", content: "Review every workspace subscription on GalleyHQ." },
      { property: "og:title", content: "Admin subscriptions — GalleyHQ" },
      { property: "og:description", content: "Review every workspace subscription on GalleyHQ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminSubscriptionsPage,
});

function AdminSubscriptionsPage() {
  const { data, isLoading } = useAdminSubscriptions();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((sub) =>
      [sub.workspaceName, sub.planName, sub.status]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term)),
    );
  }, [data, query]);

  return (
    <AdminShell title="Subscriptions" description="Read-only view of every workspace subscription.">
      <AdminSearch value={query} onChange={setQuery} placeholder="Search workspace, plan or status" />
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            No subscriptions match your search.
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-none">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Period start</TableHead>
                  <TableHead>Period end</TableHead>
                  <TableHead>Cancels</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.workspaceName}</TableCell>
                    <TableCell className="text-muted-foreground">{sub.planName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{sub.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{sub.billingProvider}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDay(sub.currentPeriodStart)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDay(sub.currentPeriodEnd)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sub.cancelAtPeriodEnd ? "At period end" : "No"}
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
