import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  checkAdminAccess,
  getAdminOverview,
  listAdminPlans,
  listAdminClients,
  listAdminSubscriptions,
  listAdminUsers,
  listAdminWorkspaces,
} from "@/lib/api/admin.functions";

export const adminKeys = {
  access: ["admin", "access"] as const,
  overview: ["admin", "overview"] as const,
  users: ["admin", "users"] as const,
  workspaces: ["admin", "workspaces"] as const,
  plans: ["admin", "plans"] as const,
  subscriptions: ["admin", "subscriptions"] as const,
  clients: ["admin", "clients"] as const,
};

export function useAdminAccess() {
  const fn = useServerFn(checkAdminAccess);
  return useQuery({
    queryKey: adminKeys.access,
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}

export function useAdminOverview() {
  const fn = useServerFn(getAdminOverview);
  return useQuery({ queryKey: adminKeys.overview, queryFn: () => fn(), staleTime: 30_000 });
}

export function useAdminUsers() {
  const fn = useServerFn(listAdminUsers);
  return useQuery({ queryKey: adminKeys.users, queryFn: () => fn(), staleTime: 30_000 });
}

export function useAdminWorkspaces() {
  const fn = useServerFn(listAdminWorkspaces);
  return useQuery({ queryKey: adminKeys.workspaces, queryFn: () => fn(), staleTime: 30_000 });
}

export function useAdminPlans() {
  const fn = useServerFn(listAdminPlans);
  return useQuery({ queryKey: adminKeys.plans, queryFn: () => fn(), staleTime: 60_000 });
}

export function useAdminSubscriptions() {
  const fn = useServerFn(listAdminSubscriptions);
  return useQuery({
    queryKey: adminKeys.subscriptions,
    queryFn: () => fn(),
    staleTime: 30_000,
  });
}

export function useAdminClients() {
  const fn = useServerFn(listAdminClients);
  return useQuery({ queryKey: adminKeys.clients, queryFn: () => fn(), staleTime: 30_000 });
}
