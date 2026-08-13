import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type WorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

export type WorkspaceContext = {
  workspace: Workspace;
  role: WorkspaceRole;
  profile: Profile | null;
  subscription: (Subscription & { plan: Plan | null }) | null;
  memberCount: number;
};

/** Creates the profile, workspace, owner membership and Free subscription if missing. */
async function bootstrapUser(): Promise<void> {
  const { error } = await supabase.rpc("bootstrap_user", {
    _full_name: null,
    _workspace_name: null,
  });
  if (error) throw error;
}

/**
 * Loads the signed-in user's active workspace context.
 * All reads are enforced server-side by row level security.
 */
export async function fetchWorkspaceContext(): Promise<WorkspaceContext | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;
  const userId = userData.user.id;

  let membership = await fetchPrimaryMembership(userId);
  if (!membership) {
    await bootstrapUser();
    membership = await fetchPrimaryMembership(userId);
  }
  if (!membership || !membership.workspace) return null;

  const [profileResult, subscriptionResult, memberCountResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("*, plan:plans(*)")
      .eq("workspace_id", membership.workspace_id)
      .maybeSingle(),
    supabase
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspace_id),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (subscriptionResult.error) throw subscriptionResult.error;
  if (memberCountResult.error) throw memberCountResult.error;

  return {
    workspace: membership.workspace,
    role: membership.role,
    profile: profileResult.data,
    subscription: subscriptionResult.data as WorkspaceContext["subscription"],
    memberCount: memberCountResult.count ?? 0,
  };
}

async function fetchPrimaryMembership(userId: string) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*, workspace:workspaces(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as (WorkspaceMember & { workspace: Workspace | null }) | null;
}

export type WorkspaceMemberWithProfile = WorkspaceMember & { profile: Profile | null };

export async function fetchWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMemberWithProfile[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*, profile:profiles(*)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WorkspaceMemberWithProfile[];
}

export async function fetchPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function updateWorkspaceName(workspaceId: string, name: string): Promise<void> {
  const { error } = await supabase.from("workspaces").update({ name }).eq("id", workspaceId);
  if (error) throw error;
}

export async function updateProfile(
  userId: string,
  values: { full_name: string },
): Promise<void> {
  const { error } = await supabase.from("profiles").update(values).eq("id", userId);
  if (error) throw error;
}

export const workspaceKeys = {
  context: ["workspace-context"] as const,
  members: (workspaceId: string) => ["workspace-members", workspaceId] as const,
  plans: ["plans"] as const,
};
