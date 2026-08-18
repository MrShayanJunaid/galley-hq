import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Building2,
  Images,
  Pencil,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { BrandProfileForm } from "@/components/clients/BrandProfileForm";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
import { StatusBadge, formatDate } from "@/components/clients/client-display";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClient } from "@/hooks/use-clients";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import {
  clientKeys,
  deleteClient,
  setClientStatus,
  updateClient,
  type ClientInput,
} from "@/lib/api/clients";

export const Route = createFileRoute("/_authenticated/clients/$clientId")({
  head: () => ({
    meta: [
      { title: "Client details — GalleyHQ" },
      {
        name: "description",
        content: "Client overview, brand details and the client workspace for future modules.",
      },
      { property: "og:title", content: "Client details — GalleyHQ" },
      {
        property: "og:description",
        content: "Client overview and workspace inside GalleyHQ.",
      },
    ],
  }),
  component: ClientDetailPage,
});

const futureModules = [
  {
    title: "Brand intelligence",
    description: "Tone of voice, audience and visual identity for this client.",
    icon: Sparkles,
  },
  {
    title: "Ideas & captions",
    description: "On-brand content ideas and captions.",
    icon: Users,
  },
  {
    title: "Creative production",
    description: "Visuals built from this client's brand kit.",
    icon: Images,
  },
  {
    title: "Review & approvals",
    description: "Internal review and client sign-off.",
    icon: Building2,
  },
];

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: context } = useWorkspaceContext();
  const workspaceId = context?.workspace.id;
  const { data: client, isLoading, isError, error, refetch } = useClient(clientId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (values: ClientInput) => updateClient(clientId, values),
    onSuccess: (updated) => {
      toast.success("Client updated");
      setIsFormOpen(false);
      queryClient.setQueryData(clientKeys.detail(clientId), updated);
      if (workspaceId) {
        void queryClient.invalidateQueries({ queryKey: clientKeys.list(workspaceId) });
      }
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (status: string) => setClientStatus(clientId, status),
    onSuccess: (updated) => {
      toast.success(updated.status === "archived" ? "Client archived" : "Client restored");
      queryClient.setQueryData(clientKeys.detail(clientId), updated);
      if (workspaceId) {
        void queryClient.invalidateQueries({ queryKey: clientKeys.list(workspaceId) });
      }
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteClient(clientId),
    onSuccess: () => {
      toast.success("Client deleted");
      setIsDeleteOpen(false);
      if (workspaceId) {
        void queryClient.invalidateQueries({ queryKey: clientKeys.list(workspaceId) });
      }
      navigate({ to: "/clients", replace: true });
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  return (
    <DashboardLayout
      title={client?.name ?? "Client"}
      description={client?.company_name ?? undefined}
      actions={
        client ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsFormOpen(true)}>
              <Pencil className="size-4" />
              Edit client
            </Button>
            <Button
              variant="outline"
              disabled={archiveMutation.isPending}
              onClick={() =>
                archiveMutation.mutate(client.status === "archived" ? "active" : "archived")
              }
            >
              {client.status === "archived" ? (
                <ArchiveRestore className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
              {client.status === "archived" ? "Restore client" : "Archive client"}
            </Button>
            <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete client
            </Button>
          </div>
        ) : undefined
      }
    >
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/clients">
          <ArrowLeft className="size-4" />
          Back to clients
        </Link>
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-40 w-full" />
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
        <>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Client overview</CardTitle>
              <CardDescription>Core details for this client.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Client name" value={client.name} />
              <Field label="Company / brand" value={client.company_name} />
              <Field label="Email" value={client.email ?? "—"} />
              <Field label="Website" value={client.website ?? "—"} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </p>
                <div className="mt-2">
                  <StatusBadge status={client.status} />
                </div>
              </div>
              <Field label="Created" value={formatDate(client.created_at)} />
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Notes
                </p>
                <p className="mt-2 whitespace-pre-line text-sm">
                  {client.notes ?? "No notes yet."}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6">
            <BrandProfileForm
              clientId={client.id}
              workspaceId={workspaceId}
              clientName={client.company_name}
              clientWebsite={client.website}
              disabled={client.status === "archived"}
            />
          </div>

          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Client workspace
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {futureModules.map((module) => (
                <Card key={module.title} className="shadow-none">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <module.icon className="size-4" />
                      </span>
                      <Badge variant="secondary">Coming soon</Badge>
                    </div>
                    <CardTitle className="mt-3 text-base">{module.title}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}

      <ClientFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        client={client ?? undefined}
        isSubmitting={updateMutation.isPending}
        onSubmit={(values) => updateMutation.mutate(values)}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this client from your workspace. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm">{value}</p>
    </div>
  );
}
