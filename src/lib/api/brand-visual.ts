import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { BrandProfile } from "@/lib/api/brand-profile";
import { toVisualConfig, type BrandVisualConfig } from "@/lib/brand/visual-schema";

/**
 * The Visual Brand Profile is stored alongside the written brand profile so
 * the creative prompt engine reads one row. RLS restricts the row to members
 * of the owning workspace.
 */
export async function saveVisualProfile(args: {
  clientId: string;
  workspaceId: string;
  visual: BrandVisualConfig;
}): Promise<BrandProfile> {
  const { data, error } = await supabase
    .from("client_brand_profiles")
    .upsert(
      {
        client_id: args.clientId,
        workspace_id: args.workspaceId,
        visual_config: toVisualConfig(args.visual) as unknown as Json,
      },
      { onConflict: "client_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
