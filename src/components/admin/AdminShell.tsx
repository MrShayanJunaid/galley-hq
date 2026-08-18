import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const adminNav = [
  { label: "Overview", to: "/admin" },
  { label: "Users", to: "/admin/users" },
  { label: "Workspaces", to: "/admin/workspaces" },
  { label: "Clients", to: "/admin/clients" },
  { label: "Plans", to: "/admin/plans" },
  { label: "Subscriptions", to: "/admin/subscriptions" },
] as const;

type AdminShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function AdminShell({ title, description, children }: AdminShellProps) {
  return (
    <DashboardLayout title={title} {...(description ? { description } : {})}>
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-border pb-3">
        {adminNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === "/admin" }}
            activeProps={{ "data-active": "true" }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              "data-[active=true]:bg-secondary data-[active=true]:font-medium data-[active=true]:text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </DashboardLayout>
  );
}

export function AdminSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="mb-4 max-w-sm"
    />
  );
}

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
