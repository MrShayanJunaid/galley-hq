import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  creativeKeys,
  fetchClientCreativeThumbnails,
  fetchCreativesForContentItem,
} from "@/lib/api/creatives";
import { contentKeys } from "@/lib/api/content-items";
import {
  deleteCreativeImage,
  generateCreativeVariantImage,
} from "@/lib/api/creatives.functions";

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

/**
 * Generates a single creative variant. Each variant is its own request, so the
 * four creatives succeed, fail and retry independently.
 */
export function useGenerateCreativeVariant(clientId: string, contentItemId: string | null) {
  const generate = useServerFn(generateCreativeVariantImage);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      variantIndex: number;
      formatId?: string | null;
      /** Layer 4 refinement feedback for this regeneration. */
      feedback?: string | null;
      feedbackId?: string | null;
    }) =>
      generate({
        data: {
          contentItemId: contentItemId as string,
          variantIndex: args.variantIndex,
          formatId: args.formatId ?? null,
          feedback: args.feedback ?? null,
          feedbackId: args.feedbackId ?? null,
        },
      }),
    onSettled: () => {
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
