import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { BrandProfile } from "@/lib/api/brand-profile";
import { toCreativeDirection, type CreativeDirection } from "@/lib/brand/creative-direction";

/**
 * Layers 2 + 3 of the Brand Voice system live on the same brand-profile row as
 * Brand Intelligence and the visual identity, so the prompt engine reads one
 * row. RLS restricts the row to members of the owning workspace.
 */
export async function saveCreativeDirection(args: {
  clientId: string;
  workspaceId: string;
  direction: CreativeDirection;
}): Promise<BrandProfile> {
  const { data, error } = await supabase
    .from("client_brand_profiles")
    .upsert(
      {
        client_id: args.clientId,
        workspace_id: args.workspaceId,
        creative_direction: toCreativeDirection(args.direction) as unknown as Json,
      },
      { onConflict: "client_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
