import { Link } from "@tanstack/react-router";
import {
  Building2,
  Calendar,
  Images,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  soon?: boolean;
};

const primaryNav: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Workspace", to: "/workspace", icon: Building2 },
  { label: "Settings", to: "/settings", icon: Settings },
];

const upcomingNav: NavItem[] = [
  { label: "Clients", to: "/dashboard", icon: Users, soon: true },
  { label: "Ideas", to: "/dashboard", icon: Sparkles, soon: true },
  { label: "Creatives", to: "/dashboard", icon: Images, soon: true },
  { label: "Calendar", to: "/dashboard", icon: Calendar, soon: true },
];

type AppSidebarProps = {
  workspaceName: string;
  planName: string;
  onSignOut: () => void;
  isSigningOut?: boolean;
};

export function AppSidebar({
  workspaceName,
  planName,
  onSignOut,
  isSigningOut,
}: AppSidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-6">
        <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <span className="text-display text-base font-semibold text-sidebar-accent-foreground">
          Cadence
        </span>
      </div>

      <div className="mx-3 rounded-xl bg-sidebar-accent px-3 py-3">
        <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
          {workspaceName}
        </p>
        <p className="mt-0.5 text-xs text-sidebar-foreground/70">{planName} plan</p>
      </div>

      <nav className="mt-6 flex-1 space-y-1 px-3">
        {primaryNav.map((item) => (
          <SidebarLink key={item.label} item={item} />
        ))}

        <p className="px-3 pt-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          Coming next
        </p>
        {upcomingNav.map((item) => (
          <div
            key={item.label}
            className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/40"
          >
            <item.icon className="size-4" />
            <span className="flex-1">{item.label}</span>
            <Badge
              variant="outline"
              className="border-sidebar-border text-[10px] text-sidebar-foreground/50"
            >
              Soon
            </Badge>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          onClick={onSignOut}
          disabled={isSigningOut}
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" />
          {isSigningOut ? "Signing out…" : "Log out"}
        </Button>
      </div>
    </aside>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <Link
      to={item.to}
      activeProps={{ "data-active": "true" }}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium",
      )}
    >
      <item.icon className="size-4" />
      {item.label}
    </Link>
  );
}
