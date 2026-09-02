import { useMutation, useQueryClient } from "@tanstack/react-query";

import { brandProfileKeys } from "@/lib/api/brand-profile";
import { saveCreativeDirection } from "@/lib/api/creative-direction";
import type { CreativeDirection } from "@/lib/brand/creative-direction";

/** Saves layers 2 + 3 (visual direction and creative style) for a client. */
export function useSaveCreativeDirection(clientId: string, workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (direction: CreativeDirection) => {
      if (!workspaceId) throw new Error("Workspace not ready");
      return saveCreativeDirection({ clientId, workspaceId, direction });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(brandProfileKeys.detail(clientId), saved);
    },
  });
}
