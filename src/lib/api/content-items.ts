import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  toContentIdea,
  toCreativePrompt,
  type ContentConfig,
  type ContentDraft,
  type ContentIdea,
  type ContentStatus,
  type CreativePrompt,
} from "@/lib/content/schema";

export type ContentItemRow = Database["public"]["Tables"]["content_items"]["Row"];

export const contentKeys = {
  list: (clientId: string) => ["content-items", clientId] as const,
  workspaceList: (workspaceId: string) => ["content-items-workspace", workspaceId] as const,
};

export type ContentItem = {
  id: string;
  clientId: string;
  workspaceId: string;
  title: string;
  platform: string;
  contentType: string;
  objective: string;
  topic: string;
  status: ContentStatus;
  draft: ContentDraft;
  idea: ContentIdea | null;
  creative: CreativePrompt;
  createdAt: string;
  updatedAt: string;
};

function mapItem(row: ContentItemRow): ContentItem {
  return {
    id: row.id,
    clientId: row.client_id,
    workspaceId: row.workspace_id,
    title: row.title ?? "Untitled content",
    platform: row.platform,
    contentType: row.content_type,
    objective: row.objective,
    topic: row.topic ?? "",
    status: (row.status as ContentStatus) ?? "draft",
    draft: {
      hook: row.hook ?? "",
      body: row.body ?? "",
      cta: row.cta ?? "",
      hashtags: row.hashtags ?? [],
    },
    idea: toContentIdea(row.idea),
    creative: toCreativePrompt(row.creative_prompt),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** RLS restricts content to members of the owning workspace. */
export async function fetchClientContent(clientId: string): Promise<ContentItem[]> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapItem);
}

export type SaveContentArgs = {
  id?: string | null;
  clientId: string;
  workspaceId: string;
  config: ContentConfig;
  title: string;
  status: ContentStatus;
  draft: ContentDraft;
  idea: ContentIdea | null;
  creative: CreativePrompt;
  generationMeta?: Record<string, unknown>;
};

export async function saveContentItem(args: SaveContentArgs): Promise<ContentItem> {
  const { data: userData } = await supabase.auth.getUser();

  const payload: Database["public"]["Tables"]["content_items"]["Insert"] = {
    client_id: args.clientId,
    workspace_id: args.workspaceId,
    platform: args.config.platform,
    content_type: args.config.contentType,
    objective: args.config.objective,
    topic: args.config.topic.trim() || null,
    title: args.title.trim() || args.idea?.title || "Untitled content",
    status: args.status,
    hook: args.draft.hook.trim() || null,
    body: args.draft.body.trim() || null,
    cta: args.draft.cta.trim() || null,
    hashtags: args.draft.hashtags,
    idea: (args.idea ?? {}) as unknown as Json,
    creative_prompt: args.creative as unknown as Json,
    generation_meta: (args.generationMeta ?? {}) as unknown as Json,
    created_by: userData.user?.id ?? null,
  };

  if (args.id) {
    const { data, error } = await supabase
      .from("content_items")
      .update(payload)
      .eq("id", args.id)
      .select("*")
      .single();
    if (error) throw error;
    return mapItem(data);
  }

  const { data, error } = await supabase
    .from("content_items")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return mapItem(data);
}

export async function updateContentStatus(id: string, status: ContentStatus): Promise<void> {
  const { error } = await supabase.from("content_items").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteContentItem(id: string): Promise<void> {
  const { error } = await supabase.from("content_items").delete().eq("id", id);
  if (error) throw error;
}
