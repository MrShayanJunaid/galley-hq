import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  creativeKeys,
  fetchClientCreativeThumbnails,
  fetchCreativesForContentItem,
} from "@/lib/api/creatives";
import { contentKeys } from "@/lib/api/content-items";
import { deleteCreativeImage, generateCreativeImage } from "@/lib/api/creatives.functions";

export function useContentCreatives(contentItemId: string | null) {
  return useQuery({
    queryKey: creativeKeys.list(contentItemId ?? "none"),
    queryFn: () => fetchCreativesForContentItem(contentItemId as string),
    enabled: Boolean(contentItemId),
  });
}

export function useClientCreativeThumbnails(clientId: string) {
  return useQuery({
    queryKey: creativeKeys.latestForClient(clientId),
    queryFn: () => fetchClientCreativeThumbnails(clientId),
    enabled: Boolean(clientId),
  });
}

export function useGenerateCreative(clientId: string, contentItemId: string | null) {
  const generate = useServerFn(generateCreativeImage);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { formatId?: string | null }) =>
      generate({
        data: { contentItemId: contentItemId as string, formatId: args.formatId ?? null },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: creativeKeys.list(contentItemId ?? "none") });
      void queryClient.invalidateQueries({ queryKey: creativeKeys.latestForClient(clientId) });
      void queryClient.invalidateQueries({ queryKey: contentKeys.list(clientId) });
    },
  });
}

export function useDeleteCreative(clientId: string, contentItemId: string | null) {
  const remove = useServerFn(deleteCreativeImage);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (creativeId: string) => remove({ data: { creativeId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: creativeKeys.list(contentItemId ?? "none") });
      void queryClient.invalidateQueries({ queryKey: creativeKeys.latestForClient(clientId) });
    },
  });
}
