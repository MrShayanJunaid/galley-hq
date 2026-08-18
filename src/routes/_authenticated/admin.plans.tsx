import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AdminSearch, AdminShell } from "@/components/admin/AdminShell";
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
import { useAdminPlans } from "@/hooks/use-admin";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  head: () => ({
    meta: [
      { title: "Admin plans — GalleyHQ" },
      { name: "description", content: "Review GalleyHQ subscription plans and their subscribers." },
      { property: "og:title", content: "Admin plans — GalleyHQ" },
      {
        property: "og:description",
        content: "Review GalleyHQ subscription plans and their subscribers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPlansPage,
});

function formatPrice(cents: number, currency: string, interval: string) {
  if (cents === 0) return "Free";
  return `${new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100)} / ${interval}`;
}

function AdminPlansPage() {
  const { data, isLoading } = useAdminPlans();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((plan) =>
      [plan.name, plan.code].some((field) => field.toLowerCase().includes(term)),
    );
  }, [data, query]);

  return (
    <AdminShell title="Plans" description="Subscription plans available on GalleyHQ.">
      <AdminSearch value={query} onChange={setQuery} placeholder="Search plan name or code" />
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card className="shadow-none">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Max clients</TableHead>
                  <TableHead>Max members</TableHead>
                  <TableHead>Subscribers</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell className="text-muted-foreground">{plan.code}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatPrice(plan.priceCents, plan.currency, plan.billingInterval)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {plan.maxClients ?? "Unlimited"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {plan.maxMembers ?? "Unlimited"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{plan.subscriberCount}</TableCell>
                    <TableCell>
                      <Badge variant={plan.isActive ? "secondary" : "outline"}>
                        {plan.isActive ? "Active" : "Inactive"}
                      </Badge>
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
