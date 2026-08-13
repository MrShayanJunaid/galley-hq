import { useQuery } from "@tanstack/react-query";

import {
  fetchPlans,
  fetchWorkspaceContext,
  fetchWorkspaceMembers,
  workspaceKeys,
} from "@/lib/api/workspace";

export function useWorkspaceContext() {
  return useQuery({
    queryKey: workspaceKeys.context,
    queryFn: fetchWorkspaceContext,
    staleTime: 30_000,
  });
}

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId ?? "none"),
    queryFn: () => fetchWorkspaceMembers(workspaceId!),
    enabled: Boolean(workspaceId),
  });
}

export function usePlans() {
  return useQuery({
    queryKey: workspaceKeys.plans,
    queryFn: fetchPlans,
    staleTime: 5 * 60_000,
  });
}
