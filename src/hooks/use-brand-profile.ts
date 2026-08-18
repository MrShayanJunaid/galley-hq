import { useQuery } from "@tanstack/react-query";

import { brandProfileKeys, fetchBrandProfile } from "@/lib/api/brand-profile";

export function useBrandProfile(clientId: string) {
  return useQuery({
    queryKey: brandProfileKeys.detail(clientId),
    queryFn: () => fetchBrandProfile(clientId),
    enabled: Boolean(clientId),
  });
}
