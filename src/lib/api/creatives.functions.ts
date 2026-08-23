import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CreativeAssetRecord, GenerateCreativeResult } from "@/lib/api/creative-image.server";

export type { CreativeAssetRecord, GenerateCreativeResult };

/** Generates a visual for a saved content item and stores it in the creatives bucket. */
export const generateCreativeImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { contentItemId: string; formatId?: string | null; promptOverride?: string | null }) => {
    if (!input?.contentItemId) throw new Error("contentItemId is required");
    return {
      contentItemId: String(input.contentItemId),
      formatId: input.formatId ? String(input.formatId) : null,
      promptOverride:
        typeof input.promptOverride === "string" ? input.promptOverride.slice(0, 6000) : null,
    };
  })
  .handler(async ({ data, context }): Promise<GenerateCreativeResult> => {
    const creative = await import("@/lib/api/creative-image.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    return creative.generateAndStoreCreative({
      supabase: context.supabase,
      admin: supabaseAdmin,
      userId: context.userId,
      contentItemId: data.contentItemId,
      formatId: data.formatId,
      promptOverride: data.promptOverride,
    });
  });

/** Deletes one generated visual (row + stored file) for the caller's workspace. */
export const deleteCreativeImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { creativeId: string }) => {
    if (!input?.creativeId) throw new Error("creativeId is required");
    return { creativeId: String(input.creativeId) };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    // RLS scopes this read to the caller's workspaces, so a foreign id finds nothing.
    const { data: row, error } = await context.supabase
      .from("content_creatives")
      .select("id, storage_bucket, storage_path")
      .eq("id", data.creativeId)
      .maybeSingle();

    if (error || !row) return { ok: false, message: "This creative is not available." };

    if (row.storage_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: removeError } = await supabaseAdmin.storage
        .from(row.storage_bucket ?? "creatives")
        .remove([row.storage_path]);
      if (removeError) console.error("[creative] file remove failed", removeError);
    }

    const { error: deleteError } = await context.supabase
      .from("content_creatives")
      .delete()
      .eq("id", data.creativeId);
    if (deleteError) return { ok: false, message: "Couldn't delete this creative." };

    return { ok: true };
  });
