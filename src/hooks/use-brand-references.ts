import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  brandReferenceKeys,
  deleteBrandReference,
  fetchBrandReferences,
  updateBrandReferenceDescription,
  uploadBrandReference,
  type UploadReferenceArgs,
} from "@/lib/api/brand-references";

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
