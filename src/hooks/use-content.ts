import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  contentKeys,
  deleteContentItem,
  fetchClientContent,
  saveContentItem,
  updateContentStatus,
  type SaveContentArgs,
} from "@/lib/api/content-items";
import type { ContentStatus } from "@/lib/content/schema";

export function useClientContent(clientId: string) {
  return useQuery({
    queryKey: contentKeys.list(clientId),
    queryFn: () => fetchClientContent(clientId),
    enabled: Boolean(clientId),
  });
}

export function useSaveContent(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: SaveContentArgs) => saveContentItem(args),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.list(clientId) });
    },
  });
}

export function useUpdateContentStatus(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; status: ContentStatus }) =>
      updateContentStatus(args.id, args.status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.list(clientId) });
    },
  });
}

export function useDeleteContent(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteContentItem(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.list(clientId) });
    },
  });
}
