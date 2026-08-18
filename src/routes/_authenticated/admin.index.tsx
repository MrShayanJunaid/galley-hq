import { createFileRoute } from "@tanstack/react-router";
import { Building2, CreditCard, Users, Briefcase } from "lucide-react";

import { AdminShell, formatDay } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminOverview } from "@/hooks/use-admin";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin overview — GalleyHQ" },
      {
        name: "description",
        content: "Platform admin overview of GalleyHQ users, workspaces and subscriptions.",
      },
      { property: "og:title", content: "Admin overview — GalleyHQ" },
      {
        property: "og:description",
        content: "Platform admin overview of GalleyHQ users, workspaces and subscriptions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const { data, isLoading } = useAdminOverview();

  return (
    <AdminShell title="Admin" description="Platform-wide overview of GalleyHQ.">
      {isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total users" value={data.totals.users} icon={<Users className="size-4" />} />
            <StatCard
              label="Total workspaces"
              value={data.totals.workspaces}
              icon={<Building2 className="size-4" />}
            />
            <StatCard
              label="Active subscriptions"
              value={data.totals.activeSubscriptions}
              icon={<CreditCard className="size-4" />}
            />
            <StatCard label="Clients" value={data.totals.clients} icon={<Briefcase className="size-4" />} />
          </div>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Plan breakdown</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {data.planBreakdown.map((plan) => (
                <div
                  key={plan.code}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <span className="text-sm font-medium">{plan.name}</span>
                  <Badge variant="secondary">{plan.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Recent users</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.fullName ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDay(user.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Recent workspace activity</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentWorkspaces.map((workspace) => (
                      <TableRow key={workspace.id}>
                        <TableCell className="font-medium">{workspace.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {workspace.memberCount}
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
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="py-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-sm">{label}</span>
          {icon}
        </div>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
