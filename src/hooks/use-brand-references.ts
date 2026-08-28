import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { brandProfileKeys } from "@/lib/api/brand-profile";
import { analyzeBrandReferences } from "@/lib/api/brand-visual.functions";
import {
  brandReferenceKeys,
  deleteBrandReference,
  fetchBrandReferences,
  updateBrandReferenceDescription,
  uploadBrandReference,
  type UploadReferenceArgs,
} from "@/lib/api/brand-references";

/**
 * Learns the client's visual design language from their uploaded reference
 * creatives and stores it against the brand for every future generation.
 */
export function useAnalyzeBrandReferences(clientId: string) {
  const analyze = useServerFn(analyzeBrandReferences);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => analyze({ data: { clientId } }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: brandProfileKeys.detail(clientId) });
    },
  });
}


export function useBrandReferences(clientId: string) {
  return useQuery({
    queryKey: brandReferenceKeys.list(clientId),
    queryFn: () => fetchBrandReferences(clientId),
    enabled: Boolean(clientId),
  });
}

export function useUploadBrandReference(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: UploadReferenceArgs) => uploadBrandReference(args),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: brandReferenceKeys.list(clientId) });
    },
  });
}

export function useUpdateBrandReference(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; description: string }) =>
      updateBrandReferenceDescription(args.id, args.description),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: brandReferenceKeys.list(clientId) });
    },
  });
}

export function useDeleteBrandReference(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; storagePath: string }) => deleteBrandReference(args),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: brandReferenceKeys.list(clientId) });
    },
  });
}
