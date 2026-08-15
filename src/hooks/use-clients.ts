import { useQuery } from "@tanstack/react-query";

import { clientKeys, fetchClient, fetchClients } from "@/lib/api/clients";

export function useClients(workspaceId: string | undefined) {
  return useQuery({
    queryKey: clientKeys.list(workspaceId ?? "none"),
    queryFn: () => fetchClients(workspaceId!),
    enabled: Boolean(workspaceId),
  });
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: clientKeys.detail(clientId),
    queryFn: () => fetchClient(clientId),
    enabled: Boolean(clientId),
  });
}
