import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import { supabase } from "@/integrations/supabase/client";

type DashboardLayoutProps = {
  title: string;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
};

export function DashboardLayout({
  title,
  description,
  actions,
  children,
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data: context, isLoading } = useWorkspaceContext();

  async function handleSignOut() {
    setIsSigningOut(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = (context?.profile?.full_name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        workspaceName={context?.workspace.name ?? "Loading…"}
        planName={context?.subscription?.plan?.name ?? "Free"}
        onSignOut={handleSignOut}
        isSigningOut={isSigningOut}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-8 py-5">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{title}</h1>
            {description ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <Avatar className="size-9">
              <AvatarFallback className="bg-secondary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 px-8 py-8">
          {isLoading ? <LayoutSkeleton /> : children}
        </main>
      </div>
    </div>
  );
}

function LayoutSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
