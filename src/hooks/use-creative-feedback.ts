import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCreativeFeedback,
  creativeFeedbackKeys,
  deleteCreativeFeedback,
  fetchCreativeFeedback,
  fetchWorkspaceCreativeFeedback,
} from "@/lib/api/creative-feedback";

export function useCreativeFeedback(contentItemId: string | null) {
  return useQuery({
    queryKey: creativeFeedbackKeys.forContentItem(contentItemId ?? "none"),
    queryFn: () => fetchCreativeFeedback(contentItemId as string),
    enabled: Boolean(contentItemId),
  });
}

/** Workspace-scoped refinement history; the learning system will build on this. */
export function useWorkspaceCreativeFeedback(workspaceId: string | undefined) {
  return useQuery({
    queryKey: creativeFeedbackKeys.forWorkspace(workspaceId ?? "none"),
    queryFn: () => fetchWorkspaceCreativeFeedback(workspaceId as string),
    enabled: Boolean(workspaceId),
  });
}

export function useRecordCreativeFeedback(contentItemId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCreativeFeedback,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: creativeFeedbackKeys.forContentItem(contentItemId ?? "none"),
      });
    },
  });
}

export function useDeleteCreativeFeedback(contentItemId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCreativeFeedback(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: creativeFeedbackKeys.forContentItem(contentItemId ?? "none"),
      });
    },
  });
}
