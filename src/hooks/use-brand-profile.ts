import { useQuery } from "@tanstack/react-query";

import {
  brandProfileKeys,
  fetchAnalysisRuns,
  fetchBrandProfile,
} from "@/lib/api/brand-profile";

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
