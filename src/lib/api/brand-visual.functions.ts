import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ReferenceVisualProfile } from "@/lib/brand/reference-profile";

export type AnalyzeReferencesResult =
  | {
      ok: true;
      profile: ReferenceVisualProfile;
      referenceCount: number;
      provider: string;
      model: string;
    }
  | { ok: false; code: string; message: string };

/**
 * Visually analyses the client's uploaded reference creatives and stores the
 * derived design-language profile against the brand. Brand Intelligence and the
 * hand-written visual profile are left untouched.
 */
export const analyzeBrandReferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string }) => {
    if (!input?.clientId) throw new Error("clientId is required");
    return { clientId: String(input.clientId) };
  })
  .handler(async ({ data, context }): Promise<AnalyzeReferencesResult> => {
    const analysis = await import("@/lib/api/reference-analysis.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: client, error: clientError } = await context.supabase
      .from("clients")
      .select("id, workspace_id")
      .eq("id", data.clientId)
      .maybeSingle();

    if (clientError || !client) {
      return { ok: false, code: "forbidden", message: "This client is not available." };
    }

    const references = await analysis.loadClientReferences({
      supabase: context.supabase,
      admin: supabaseAdmin,
      clientId: data.clientId,
    });

    if (references.length === 0) {
      return {
        ok: false,
        code: "no_references",
        message: "Upload at least one reference creative first.",
      };
    }

    await analysis.markReferenceStatus({
      supabase: context.supabase,
      clientId: data.clientId,
      workspaceId: client.workspace_id,
      status: "running",
    });

    try {
      const { data: profileRow } = await context.supabase
        .from("client_brand_profiles")
        .select("*")
        .eq("client_id", data.clientId)
        .maybeSingle();

      let brandSummary: string | null = null;
      if (profileRow) {
        const { buildBrandContext, renderBrandContext } = await import("@/lib/brand/context");
        brandSummary = renderBrandContext(
          buildBrandContext(profileRow as unknown as Record<string, unknown>),
        );
      }

      const outcome = await analysis.analyzeReferences({ references, brandSummary });
      await analysis.saveReferenceProfile({
        supabase: context.supabase,
        clientId: data.clientId,
        workspaceId: client.workspace_id,
        outcome,
      });

      return {
        ok: true,
        profile: outcome.profile,
        referenceCount: outcome.referenceCount,
        provider: outcome.provider,
        model: outcome.model,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Couldn't analyse the reference creatives.";
      console.error("[references] analysis failed", message);
      await analysis.markReferenceStatus({
        supabase: context.supabase,
        clientId: data.clientId,
        workspaceId: client.workspace_id,
        status: "error",
        message,
      });
      return { ok: false, code: "analysis_failed", message };
    }
  });
