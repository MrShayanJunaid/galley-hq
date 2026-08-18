import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
import { StatusBadge, formatDate } from "@/components/clients/client-display";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClients } from "@/hooks/use-clients";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import { clientKeys, createClient, type ClientInput } from "@/lib/api/clients";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({
    meta: [
      { title: "Clients — GalleyHQ" },
      {
        name: "description",
        content:
          "Manage your agency clients and keep their brand information organized in one place.",
      },
      { property: "og:title", content: "Clients — GalleyHQ" },
      {
        property: "og:description",
        content: "Manage your agency clients inside your GalleyHQ workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const queryClient = useQueryClient();
  const { data: context } = useWorkspaceContext();
  const workspaceId = context?.workspace.id;
  const { data: clients, isLoading, isError, error, refetch } = useClients(workspaceId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const maxClients = context?.subscription?.plan?.max_clients ?? null;
  const activeCount = (clients ?? []).filter((client) => client.status !== "archived").length;
  const atLimit = maxClients !== null && activeCount >= maxClients;

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (clients ?? []).filter((client) => {
      if (statusFilter !== "all" && client.status !== statusFilter) return false;
      if (!term) return true;
      return [client.name, client.company_name, client.email, client.website]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term));
    });
  }, [clients, query, statusFilter]);

  const createMutation = useMutation({
    mutationFn: (values: ClientInput) => createClient(workspaceId!, values),
    onSuccess: (client) => {
      toast.success(`${client.name} added`);
      setIsFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: clientKeys.list(workspaceId!) });
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const hasAnyClients = (clients?.length ?? 0) > 0;

  return (
    <DashboardLayout
      title="Clients"
      description="Manage your clients and keep their brand information organized in one place."
      actions={
        <Button
          onClick={() => setIsFormOpen(true)}
          disabled={!workspaceId || atLimit}
          title={atLimit ? "Your plan's client limit has been reached." : undefined}
        >
          <Plus className="size-4" />
          Add client
        </Button>
      }
    >
      {maxClients !== null ? (
        <p className="mb-4 text-sm text-muted-foreground">
          {activeCount} of {maxClients} active clients on the{" "}
          {context?.subscription?.plan?.name ?? "current"} plan.
          {atLimit ? " Upgrade your plan to add more clients." : ""}
        </p>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <AlertCircle className="size-5" />
            </span>
            <div>
              <p className="font-medium">Couldn't load clients</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {(error as Error)?.message ?? "Something went wrong."}
              </p>
            </div>
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : !hasAnyClients ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Users className="size-5" />
            </span>
            <div>
              <p className="font-medium">No clients yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first client to start building their brand profile.
              </p>
            </div>
            <Button onClick={() => setIsFormOpen(true)} disabled={!workspaceId || atLimit}>
              <Plus className="size-4" />
              Add client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search clients"
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rows.length === 0 ? (
            <Card className="shadow-none">
              <CardContent className="py-14 text-center text-sm text-muted-foreground">
                No clients match your search or filter.
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden shadow-none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Company / brand</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        <Link
                          to="/clients/$clientId"
                          params={{ clientId: client.id }}
                          className="hover:underline"
                        >
                          {client.name}
                        </Link>
                      </TableCell>
                      <TableCell>{client.company_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.website ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={client.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(client.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link to="/clients/$clientId" params={{ clientId: client.id }}>
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}

      <ClientFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        isSubmitting={createMutation.isPending}
        onSubmit={(values) => createMutation.mutate(values)}
      />
    </DashboardLayout>
  );
}
