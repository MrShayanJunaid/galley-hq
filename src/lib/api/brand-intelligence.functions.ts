import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeWebsiteUrl } from "@/lib/brand/schema";

export type AnalyzeWebsiteInput = {
  clientId: string;
  websiteUrl: string;
};

export type AnalyzeWebsiteResult =
  | {
      ok: true;
      runId: string;
      websiteUrl: string;
      pages: Array<{ url: string; title: string | null }>;
      suggestions: Record<string, string>;
      insights: Record<string, unknown>;
      model: string;
      generatedAt: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
      runId: string | null;
    };

/**
 * Retrieves the client's public website and derives structured brand intelligence.
 * Results are stored as *suggestions* — never written over the saved profile.
 */
export const analyzeClientWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AnalyzeWebsiteInput) => {
    if (!input?.clientId) throw new Error("clientId is required");
    return { clientId: String(input.clientId), websiteUrl: String(input.websiteUrl ?? "") };
  })
  .handler(async ({ data, context }): Promise<AnalyzeWebsiteResult> => {
    const { supabase, userId } = context;
    const websiteUrl = normalizeWebsiteUrl(data.websiteUrl);
    if (!websiteUrl) {
      return {
        ok: false,
        code: "invalid_url",
        message: "Enter a valid website URL, for example northwind.com.",
        runId: null,
      };
    }

    // RLS scopes this read to clients inside the caller's workspaces.
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, workspace_id, name, company_name")
      .eq("id", data.clientId)
      .maybeSingle();

    if (clientError) {
      return { ok: false, code: "db_error", message: clientError.message, runId: null };
    }
    if (!client) {
      return {
        ok: false,
        code: "forbidden",
        message: "This client is not available in your workspace.",
        runId: null,
      };
    }

    const startedAt = Date.now();
    const { data: run } = await supabase
      .from("brand_analysis_runs")
      .insert({
        workspace_id: client.workspace_id,
        client_id: client.id,
        website_url: websiteUrl,
        status: "running",
        created_by: userId,
      })
      .select("id")
      .single();

    const runId = run?.id ?? null;

    await supabase
      .from("client_brand_profiles")
      .upsert(
        {
          client_id: client.id,
          workspace_id: client.workspace_id,
          website_url: websiteUrl,
          website_analysis_status: "running",
          website_analysis_error: null,
        },
        { onConflict: "client_id" },
      );

    const { retrieveWebsite, extractBrandFromPages, BrandAnalysisError } = await import(
      "@/lib/api/brand-intelligence.server"
    );

    try {
      const pages = await retrieveWebsite(websiteUrl);
      const extracted = await extractBrandFromPages(pages, {
        brandName: client.company_name ?? client.name,
        websiteUrl,
      });

      const generatedAt = new Date().toISOString();
      const insights = {
        ...extracted.insights,
        pages: pages.map((page) => ({ url: page.url, title: page.title })),
        analyzedAt: generatedAt,
        model: extracted.model,
      };

      if (runId) {
        await supabase
          .from("brand_analysis_runs")
          .update({
            status: "completed",
            pages: pages.map((page) => ({ url: page.url, title: page.title })),
            extracted: { suggestions: extracted.suggestions, insights: extracted.insights },
            duration_ms: Date.now() - startedAt,
          })
          .eq("id", runId);
      }

      await supabase
        .from("client_brand_profiles")
        .upsert(
          {
            client_id: client.id,
            workspace_id: client.workspace_id,
            website_url: websiteUrl,
            website_analysis: insights,
            website_analysis_status: "completed",
            website_analysis_error: null,
            website_analyzed_at: generatedAt,
            ai_suggestions: {
              values: extracted.suggestions,
              generatedAt,
              model: extracted.model,
              sourceUrl: websiteUrl,
            },
            ai_suggestions_at: generatedAt,
          },
          { onConflict: "client_id" },
        );

      return {
        ok: true,
        runId: runId ?? "",
        websiteUrl,
        pages: pages.map((page) => ({ url: page.url, title: page.title })),
        suggestions: extracted.suggestions,
        insights,
        model: extracted.model,
        generatedAt,
      };
    } catch (error) {
      const code = error instanceof BrandAnalysisError ? error.code : "unknown";
      const message =
        error instanceof Error ? error.message : "Website analysis failed. Please try again.";
      console.error("Brand website analysis failed", { code, message });

      if (runId) {
        await supabase
          .from("brand_analysis_runs")
          .update({ status: "failed", error_message: message, duration_ms: Date.now() - startedAt })
          .eq("id", runId);
      }

      await supabase
        .from("client_brand_profiles")
        .upsert(
          {
            client_id: client.id,
            workspace_id: client.workspace_id,
            website_url: websiteUrl,
            website_analysis_status: "failed",
            website_analysis_error: message,
          },
          { onConflict: "client_id" },
        );

      return { ok: false, code, message, runId };
    }
  });
