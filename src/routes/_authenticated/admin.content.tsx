import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { AdminShell } from "@/components/admin/AdminShell";
import { ContentStatusBadge, formatDateTime } from "@/components/content/content-display";
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
import { getAdminContentActivity } from "@/lib/api/admin.functions";
import { PLATFORMS, labelFor } from "@/lib/content/schema";

export const Route = createFileRoute("/_authenticated/admin/content")({
  head: () => ({
    meta: [
      { title: "Content activity — GalleyHQ Admin" },
      {
        name: "description",
        content: "Platform-wide AI content generation activity per workspace and client.",
      },
      { property: "og:title", content: "Content activity — GalleyHQ Admin" },
      {
        property: "og:description",
        content: "Monitor AI content generation across every GalleyHQ workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminContentPage,
});

function AdminContentPage() {
  const fetchActivity = useServerFn(getAdminContentActivity);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "content-activity"],
    queryFn: () => fetchActivity(),
  });

  return (
    <AdminShell
      title="Content activity"
      description="AI content generation across all workspaces and clients."
    >
      {isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <Stat label="Content items" value={data.totals.contentItems} />
            <Stat label="Ready for review" value={data.totals.readyForReview} />
            <Stat label="AI generations" value={data.totals.generations} />
            <Stat label="Failed generations" value={data.totals.failedGenerations} />
            <Stat label="Tokens used" value={data.totals.totalTokens} />
            <Stat label="Creatives generated" value={data.totals.creativesGenerated} />
            <Stat label="Creatives failed" value={data.totals.creativesFailed} />
          </div>


          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">By workspace</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Content items</TableHead>
                    <TableHead>Generations</TableHead>
                    <TableHead>Failures</TableHead>
                    <TableHead>Last activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byWorkspace.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No content generated yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.byWorkspace.map((row) => (
                      <TableRow key={row.workspaceId}>
                        <TableCell className="font-medium">{row.workspaceName}</TableCell>
                        <TableCell>{row.contentItems}</TableCell>
                        <TableCell>{row.generations}</TableCell>
                        <TableCell>{row.failures}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(row.lastActivityAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Most active clients</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Content items</TableHead>
                    <TableHead>Generations</TableHead>
                    <TableHead>Last activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byClient.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No client activity yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.byClient.map((row) => (
                      <TableRow key={row.clientId}>
                        <TableCell className="font-medium">{row.clientName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.workspaceName}
                        </TableCell>
                        <TableCell>{row.contentItems}</TableCell>
                        <TableCell>{row.generations}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(row.lastActivityAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Recent content</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentContent.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        Nothing saved yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentContent.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.clientName} · {row.workspaceName}
                        </TableCell>
                        <TableCell className="text-sm">{labelFor(PLATFORMS, row.platform)}</TableCell>
                        <TableCell>
                          <ContentStatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(row.updatedAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="shadow-none">
      <CardContent className="py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-display mt-2 text-2xl font-semibold">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
