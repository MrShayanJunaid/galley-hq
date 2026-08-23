import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  FORBIDDEN_RESULT,
  coerceConfig,
  coerceDraft,
  coerceIdea,
  coerceSection,
  type GenerationFailure,
  type StudioConfigInput,
} from "@/lib/api/content-studio-input";
import type { ContentDraft, ContentIdea, CreativePrompt } from "@/lib/content/schema";

export type { GenerationFailure, StudioConfigInput };

export type IdeasResponse =
  | { ok: true; ideas: ContentIdea[]; model: string; generatedAt: string }
  | GenerationFailure;

export type DraftResponse =
  | { ok: true; draft: ContentDraft; model: string; generatedAt: string }
  | GenerationFailure;

export type CreativeResponse =
  | { ok: true; creative: CreativePrompt; model: string; generatedAt: string }
  | GenerationFailure;

/** Generates brand-aware content ideas for a client in the caller's workspace. */
export const generateContentIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { clientId: string; config: StudioConfigInput; count?: number; avoidTitles?: string[] }) => {
      if (!input?.clientId) throw new Error("clientId is required");
      return {
        clientId: String(input.clientId),
        config: coerceConfig(input.config),
        count: Math.min(Math.max(Number(input.count ?? 5), 1), 8),
        avoidTitles: Array.isArray(input.avoidTitles)
          ? input.avoidTitles.filter((v): v is string => typeof v === "string").slice(0, 24)
          : [],
      };
    },
  )
  .handler(async ({ data, context }): Promise<IdeasResponse> => {
    const studio = await import("@/lib/api/content-studio.server");
    const loaded = await studio.loadClientBrand(context.supabase, data.clientId);
    if (!loaded) return FORBIDDEN_RESULT;

    try {
      const result = await studio.generateIdeas({
        brand: loaded.brand,
        config: data.config,
        count: data.count,
        avoidTitles: data.avoidTitles,
      });
      await studio.recordAiUsage(context.supabase, {
        workspaceId: loaded.client.workspace_id,
        clientId: loaded.client.id,
        userId: context.userId,
        generationType: "ideas",
        status: "success",
        provider: result.meta.provider,
        model: result.meta.model,
        durationMs: result.meta.durationMs,
        usage: result.meta.usage,
      });
      return { ok: true, ideas: result.ideas, model: result.meta.model, generatedAt: new Date().toISOString() };
    } catch (error) {
      return studio.mapGenerationFailure(error, context.supabase, {
        workspaceId: loaded.client.workspace_id,
        clientId: loaded.client.id,
        userId: context.userId,
        generationType: "ideas",
      });
    }
  });

/** Generates platform-native copy for a selected idea. */
export const generateContentDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      clientId: string;
      config: StudioConfigInput;
      idea: ContentIdea;
      instructions?: string;
      section?: "hook" | "body" | "cta" | "hashtags" | null;
      current?: ContentDraft | null;
    }) => {
      if (!input?.clientId) throw new Error("clientId is required");
      return {
        clientId: String(input.clientId),
        config: coerceConfig(input.config),
        idea: coerceIdea(input.idea),
        instructions: String(input.instructions ?? "").slice(0, 2000),
        section: coerceSection(input.section),
        current: input.current ? coerceDraft(input.current) : null,
      };
    },
  )
  .handler(async ({ data, context }): Promise<DraftResponse> => {
    const studio = await import("@/lib/api/content-studio.server");
    const loaded = await studio.loadClientBrand(context.supabase, data.clientId);
    if (!loaded) return FORBIDDEN_RESULT;

    try {
      const result = await studio.generateDraft({
        brand: loaded.brand,
        config: data.config,
        idea: data.idea,
        instructions: data.instructions,
        section: data.section,
        current: data.current,
      });
      await studio.recordAiUsage(context.supabase, {
        workspaceId: loaded.client.workspace_id,
        clientId: loaded.client.id,
        userId: context.userId,
        generationType: data.section ? `content_${data.section}` : "content",
        status: "success",
        provider: result.meta.provider,
        model: result.meta.model,
        durationMs: result.meta.durationMs,
        usage: result.meta.usage,
      });
      return { ok: true, draft: result.draft, model: result.meta.model, generatedAt: new Date().toISOString() };
    } catch (error) {
      return studio.mapGenerationFailure(error, context.supabase, {
        workspaceId: loaded.client.workspace_id,
        clientId: loaded.client.id,
        userId: context.userId,
        generationType: "content",
      });
    }
  });

/** Generates the structured creative direction consumed later by Creative Production. */
export const generateContentCreativePrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { clientId: string; config: StudioConfigInput; idea: ContentIdea; draft: ContentDraft }) => {
      if (!input?.clientId) throw new Error("clientId is required");
      return {
        clientId: String(input.clientId),
        config: coerceConfig(input.config),
        idea: coerceIdea(input.idea),
        draft: coerceDraft(input.draft),
      };
    },
  )
  .handler(async ({ data, context }): Promise<CreativeResponse> => {
    const studio = await import("@/lib/api/content-studio.server");
    const loaded = await studio.loadClientBrand(context.supabase, data.clientId);
    if (!loaded) return FORBIDDEN_RESULT;

    try {
      const result = await studio.generateCreativePrompt({
        brand: loaded.brand,
        config: data.config,
        idea: data.idea,
        draft: data.draft,
      });
      await studio.recordAiUsage(context.supabase, {
        workspaceId: loaded.client.workspace_id,
        clientId: loaded.client.id,
        userId: context.userId,
        generationType: "creative_prompt",
        status: "success",
        provider: result.meta.provider,
        model: result.meta.model,
        durationMs: result.meta.durationMs,
        usage: result.meta.usage,
      });
      return {
        ok: true,
        creative: result.creative,
        model: result.meta.model,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      return studio.mapGenerationFailure(error, context.supabase, {
        workspaceId: loaded.client.workspace_id,
        clientId: loaded.client.id,
        userId: context.userId,
        generationType: "creative_prompt",
      });
    }
  });
