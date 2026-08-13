import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePlans, useWorkspaceContext, useWorkspaceMembers } from "@/hooks/use-workspace";
import { updateWorkspaceName, workspaceKeys } from "@/lib/api/workspace";

export const Route = createFileRoute("/_authenticated/workspace")({
  head: () => ({
    meta: [
      { title: "Workspace — GalleyHQ" },
      {
        name: "description",
        content: "Manage your agency workspace details, team members and current plan.",
      },
      { property: "og:title", content: "Workspace — GalleyHQ" },
      { property: "og:description", content: "Manage your GalleyHQ workspace and team." },
    ],
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const queryClient = useQueryClient();
  const { data: context } = useWorkspaceContext();
  const { data: members } = useWorkspaceMembers(context?.workspace.id);
  const { data: plans } = usePlans();
  const [name, setName] = useState("");

  useEffect(() => {
    if (context?.workspace.name) setName(context.workspace.name);
  }, [context?.workspace.name]);

  const canManage = context?.role === "owner" || context?.role === "admin";

  const renameMutation = useMutation({
    mutationFn: () => updateWorkspaceName(context!.workspace.id, name.trim()),
    onSuccess: () => {
      toast.success("Workspace updated");
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.context });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <DashboardLayout title="Workspace" description="Account, team and plan">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Workspace details</CardTitle>
            <CardDescription>
              {canManage
                ? "Owners and admins can rename the workspace."
                : "Only owners and admins can change these details."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Name</Label>
              <Input
                id="workspace-name"
                value={name}
                disabled={!canManage}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Workspace URL slug</Label>
              <Input value={context?.workspace.slug ?? ""} readOnly disabled />
            </div>
            {canManage ? (
              <Button
                onClick={() => renameMutation.mutate()}
                disabled={
                  renameMutation.isPending ||
                  !name.trim() ||
                  name.trim() === context?.workspace.name
                }
              >
                {renameMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan & billing</CardTitle>
            <CardDescription>Billing provider connects later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Plan" value={context?.subscription?.plan?.name ?? "Free"} />
            <Row label="Status" value={context?.subscription?.status ?? "—"} />
            <Row
              label="Started"
              value={formatDate(context?.subscription?.current_period_start)}
            />
            <Row label="Renews" value={formatDate(context?.subscription?.current_period_end)} />
            <Row label="Provider" value={context?.subscription?.billing_provider ?? "none"} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Team members</CardTitle>
          <CardDescription>Everyone with access to this workspace's data.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(members ?? []).map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.profile?.full_name ?? "Team member"}</TableCell>
                  <TableCell className="capitalize">{member.role}</TableCell>
                  <TableCell>{formatDate(member.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Available plans
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(plans ?? []).map((plan) => {
            const isCurrent = plan.id === context?.subscription?.plan_id;
            return (
              <Card key={plan.id} className={isCurrent ? "border-accent" : undefined}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    {isCurrent ? <Badge>Current</Badge> : null}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-display text-2xl font-semibold">
                    ${(plan.price_cents / 100).toFixed(0)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{plan.billing_interval}
                    </span>
                  </p>
                  <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    {(plan.features as string[]).map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </DashboardLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}
