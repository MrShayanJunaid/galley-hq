import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/**
 * Layer 4 — OUTPUT REFINEMENT.
 *
 * Feedback the agency gives on a generated creative. It is stored against the
 * agency's own workspace (never shared across accounts) so a later
 * feedback-learning system can read this history and apply learned preferences
 * to future generations. Nothing here trains anything yet: right now the
 * feedback is only applied to the regeneration it was written for.
 */
export type CreativeFeedbackRow = Database["public"]["Tables"]["creative_feedback"]["Row"];

export const creativeFeedbackKeys = {
  forContentItem: (contentItemId: string) => ["creative-feedback", contentItemId] as const,
  forWorkspace: (workspaceId: string) => ["creative-feedback-workspace", workspaceId] as const,
};

export type CreativeFeedback = {
  id: string;
  workspaceId: string;
  clientId: string | null;
  contentItemId: string | null;
  creativeId: string | null;
  variantIndex: number | null;
  feedback: string;
  applied: boolean;
  createdAt: string;
};

function mapRow(row: CreativeFeedbackRow): CreativeFeedback {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    contentItemId: row.content_item_id,
    creativeId: row.creative_id,
    variantIndex: row.variant_index,
    feedback: row.feedback,
    applied: row.applied,
    createdAt: row.created_at,
  };
}

/** Feedback history for one content item, newest first. */
export async function fetchCreativeFeedback(contentItemId: string): Promise<CreativeFeedback[]> {
  const { data, error } = await supabase
    .from("creative_feedback")
    .select("*")
    .eq("content_item_id", contentItemId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

/** Workspace-wide refinement history — the future learning system's input. */
export async function fetchWorkspaceCreativeFeedback(
  workspaceId: string,
  limit = 50,
): Promise<CreativeFeedback[]> {
  const { data, error } = await supabase
    .from("creative_feedback")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function createCreativeFeedback(args: {
  workspaceId: string;
  clientId: string;
  contentItemId: string;
  creativeId: string | null;
  variantIndex: number;
  feedback: string;
}): Promise<CreativeFeedback> {
  const { data, error } = await supabase
    .from("creative_feedback")
    .insert({
      workspace_id: args.workspaceId,
      client_id: args.clientId,
      content_item_id: args.contentItemId,
      creative_id: args.creativeId,
      variant_index: args.variantIndex,
      feedback: args.feedback.trim().slice(0, 2000),
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapRow(data);
}

export async function deleteCreativeFeedback(id: string): Promise<void> {
  const { error } = await supabase.from("creative_feedback").delete().eq("id", id);
  if (error) throw error;
}
