import { useQuery } from "@tanstack/react-query";

import {
  brandProfileKeys,
  fetchAnalysisRuns,
  fetchBrandProfile,
  fetchWorkspaceBrandOverview,
} from "@/lib/api/brand-profile";

export function useWorkspaceBrandOverview(workspaceId: string | undefined) {
  return useQuery({
    queryKey: brandProfileKeys.overview(workspaceId ?? "none"),
    queryFn: () => fetchWorkspaceBrandOverview(workspaceId!),
    enabled: Boolean(workspaceId),
  });
}


export function useBrandProfile(clientId: string) {
  return useQuery({
    queryKey: brandProfileKeys.detail(clientId),
    queryFn: () => fetchBrandProfile(clientId),
    enabled: Boolean(clientId),
  });
}

export function useBrandAnalysisRuns(clientId: string) {
  return useQuery({
    queryKey: brandProfileKeys.runs(clientId),
    queryFn: () => fetchAnalysisRuns(clientId),
    enabled: Boolean(clientId),
  });
}
