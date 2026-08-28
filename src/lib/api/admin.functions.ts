import { createServerFn } from "@tanstack/react-start";

import { adminDb, assertAdmin, isPlatformAdmin } from "@/lib/api/admin-guard";
import { requireVerifiedSupabaseAuth } from "@/integrations/supabase/verified-auth";

export type AdminOverview = {
  totals: {
    users: number;
    workspaces: number;
    activeSubscriptions: number;
    clients: number;
  };
  planBreakdown: Array<{ code: string; name: string; count: number }>;
  recentUsers: Array<{ id: string; email: string | null; fullName: string | null; createdAt: string }>;
  recentWorkspaces: Array<{ id: string; name: string; slug: string; createdAt: string; memberCount: number }>;
};

export type AdminUserRow = {
  id: string;
  email: string | null;
  fullName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  workspaces: string[];
  isAdmin: boolean;
};

export type AdminWorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  memberCount: number;
  clientCount: number;
  planName: string | null;
  subscriptionStatus: string | null;
};

export type AdminPlanRow = {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  currency: string;
  billingInterval: string;
  maxClients: number | null;
  maxMembers: number | null;
  isActive: boolean;
  subscriberCount: number;
};

export type AdminSubscriptionRow = {
  id: string;
  workspaceName: string;
  planName: string | null;
  status: string;
  billingProvider: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
};

export const checkAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireVerifiedSupabaseAuth])
  .handler(async ({ context }) => {
    return { isAdmin: await isPlatformAdmin(context.supabase) };
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireVerifiedSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    await assertAdmin(context.supabase);
    const db = await adminDb();

    const [workspaces, subscriptions, plans, members, profiles, clients] = await Promise.all([
      db.from("workspaces").select("id,name,slug,created_at").order("created_at", { ascending: false }),
      db.from("subscriptions").select("id,status,plan_id,workspace_id"),
      db.from("plans").select("id,code,name"),
      db.from("workspace_members").select("workspace_id,user_id"),
      db.from("profiles").select("id,full_name,created_at").order("created_at", { ascending: false }).limit(8),
      db.from("clients").select("id"),
    ]);

    const planById = new Map((plans.data ?? []).map((p) => [p.id, p]));
    const counts = new Map<string, number>();
    for (const sub of subscriptions.data ?? []) {
      if (sub.status !== "active" && sub.status !== "trialing") continue;
      const plan = planById.get(sub.plan_id);
      if (!plan) continue;
      counts.set(plan.code, (counts.get(plan.code) ?? 0) + 1);
    }

    const memberCount = new Map<string, number>();
    for (const member of members.data ?? []) {
      memberCount.set(member.workspace_id, (memberCount.get(member.workspace_id) ?? 0) + 1);
    }

    const { data: userList } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
    const emailById = new Map((userList?.users ?? []).map((u) => [u.id, u.email ?? null]));

    return {
      totals: {
        users: userList?.users.length ?? 0,
        workspaces: workspaces.data?.length ?? 0,
        activeSubscriptions: (subscriptions.data ?? []).filter(
          (s) => s.status === "active" || s.status === "trialing",
        ).length,
        clients: clients.data?.length ?? 0,
      },
      planBreakdown: (plans.data ?? []).map((plan) => ({
        code: plan.code,
        name: plan.name,
        count: counts.get(plan.code) ?? 0,
      })),
      recentUsers: (profiles.data ?? []).map((profile) => ({
        id: profile.id,
        email: emailById.get(profile.id) ?? null,
        fullName: profile.full_name,
        createdAt: profile.created_at,
      })),
      recentWorkspaces: (workspaces.data ?? []).slice(0, 8).map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        createdAt: workspace.created_at,
        memberCount: memberCount.get(workspace.id) ?? 0,
      })),
    };
  });

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireVerifiedSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRow[]> => {
    await assertAdmin(context.supabase);
    const db = await adminDb();

    const [{ data: userList }, profiles, members, workspaces, roles] = await Promise.all([
      db.auth.admin.listUsers({ page: 1, perPage: 200 }),
      db.from("profiles").select("id,full_name"),
      db.from("workspace_members").select("user_id,workspace_id"),
      db.from("workspaces").select("id,name"),
      db.from("user_roles").select("user_id,role"),
    ]);

    const nameById = new Map((profiles.data ?? []).map((p) => [p.id, p.full_name]));
    const workspaceName = new Map((workspaces.data ?? []).map((w) => [w.id, w.name]));
    const byUser = new Map<string, string[]>();
    for (const member of members.data ?? []) {
      const list = byUser.get(member.user_id) ?? [];
      list.push(workspaceName.get(member.workspace_id) ?? "Unknown");
      byUser.set(member.user_id, list);
    }
    const admins = new Set(
      (roles.data ?? []).filter((r) => r.role === "admin").map((r) => r.user_id),
    );

    return (userList?.users ?? []).map((user) => ({
      id: user.id,
      email: user.email ?? null,
      fullName: nameById.get(user.id) ?? null,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      workspaces: byUser.get(user.id) ?? [],
      isAdmin: admins.has(user.id),
    }));
  });

export const listAdminWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireVerifiedSupabaseAuth])
  .handler(async ({ context }): Promise<AdminWorkspaceRow[]> => {
    await assertAdmin(context.supabase);
    const db = await adminDb();

    const [workspaces, members, clients, subscriptions] = await Promise.all([
      db.from("workspaces").select("id,name,slug,created_at").order("created_at", { ascending: false }),
      db.from("workspace_members").select("workspace_id"),
      db.from("clients").select("workspace_id"),
      db.from("subscriptions").select("workspace_id,status,plan:plans(name)"),
    ]);

    const memberCount = new Map<string, number>();
    for (const m of members.data ?? []) memberCount.set(m.workspace_id, (memberCount.get(m.workspace_id) ?? 0) + 1);
    const clientCount = new Map<string, number>();
    for (const c of clients.data ?? []) clientCount.set(c.workspace_id, (clientCount.get(c.workspace_id) ?? 0) + 1);
    const subByWorkspace = new Map(
      (subscriptions.data ?? []).map((s) => [
        s.workspace_id,
        { status: s.status as string, planName: (s.plan as { name: string } | null)?.name ?? null },
      ]),
    );

    return (workspaces.data ?? []).map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      createdAt: workspace.created_at,
      memberCount: memberCount.get(workspace.id) ?? 0,
      clientCount: clientCount.get(workspace.id) ?? 0,
      planName: subByWorkspace.get(workspace.id)?.planName ?? null,
      subscriptionStatus: subByWorkspace.get(workspace.id)?.status ?? null,
    }));
  });

export const listAdminPlans = createServerFn({ method: "GET" })
  .middleware([requireVerifiedSupabaseAuth])
  .handler(async ({ context }): Promise<AdminPlanRow[]> => {
    await assertAdmin(context.supabase);
    const db = await adminDb();

    const [plans, subscriptions] = await Promise.all([
      db.from("plans").select("*").order("sort_order", { ascending: true }),
      db.from("subscriptions").select("plan_id,status"),
    ]);

    const counts = new Map<string, number>();
    for (const sub of subscriptions.data ?? []) {
      if (sub.status !== "active" && sub.status !== "trialing") continue;
      counts.set(sub.plan_id, (counts.get(sub.plan_id) ?? 0) + 1);
    }

    return (plans.data ?? []).map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      priceCents: plan.price_cents,
      currency: plan.currency,
      billingInterval: plan.billing_interval,
      maxClients: plan.max_clients,
      maxMembers: plan.max_members,
      isActive: plan.is_active,
      subscriberCount: counts.get(plan.id) ?? 0,
    }));
  });

export const listAdminSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireVerifiedSupabaseAuth])
  .handler(async ({ context }): Promise<AdminSubscriptionRow[]> => {
    await assertAdmin(context.supabase);
    const db = await adminDb();

    const { data } = await db
      .from("subscriptions")
      .select("*, plan:plans(name), workspace:workspaces(name)")
      .order("created_at", { ascending: false });

    return (data ?? []).map((sub) => ({
      id: sub.id,
      workspaceName: (sub.workspace as { name: string } | null)?.name ?? "Unknown",
      planName: (sub.plan as { name: string } | null)?.name ?? null,
      status: sub.status as string,
      billingProvider: sub.billing_provider as string,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      createdAt: sub.created_at,
    }));
  });

export type AdminClientRow = {
  id: string;
  name: string;
  companyName: string;
  email: string | null;
  website: string | null;
  status: string;
  createdAt: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  brand: {
    onboardingStatus: string;
    completedAt: string | null;
    updatedAt: string;
    websiteAnalysisStatus: string;
    websiteAnalyzedAt: string | null;
    voice: Record<string, string>;
    industry: string | null;
    websiteUrl: string | null;
    description: string | null;
    targetAudience: string | null;
    brandPositioning: string | null;
    brandVoice: string | null;
  } | null;
};

/** Read-only, platform-wide client visibility. Admin role is verified from the caller's session. */
export const listAdminClients = createServerFn({ method: "GET" })
  .middleware([requireVerifiedSupabaseAuth])
  .handler(async ({ context }): Promise<AdminClientRow[]> => {
    await assertAdmin(context.supabase);
    const db = await adminDb();

    const [clients, workspaces, profiles] = await Promise.all([
      db.from("clients").select("*").order("created_at", { ascending: false }),
      db.from("workspaces").select("id,name,slug"),
      db.from("client_brand_profiles").select("*"),
    ]);

    const workspaceById = new Map((workspaces.data ?? []).map((w) => [w.id, w]));
    const brandByClient = new Map((profiles.data ?? []).map((p) => [p.client_id, p]));

    return (clients.data ?? []).map((client) => {
      const workspace = workspaceById.get(client.workspace_id);
      const brand = brandByClient.get(client.id);
      return {
        id: client.id,
        name: client.name,
        companyName: client.company_name,
        email: client.email,
        website: client.website,
        status: client.status,
        createdAt: client.created_at,
        workspaceId: client.workspace_id,
        workspaceName: workspace?.name ?? "Unknown",
        workspaceSlug: workspace?.slug ?? "—",
        brand: brand
          ? {
              onboardingStatus: brand.onboarding_status,
              completedAt: brand.completed_at,
              updatedAt: brand.updated_at,
              websiteAnalysisStatus: brand.website_analysis_status,
              websiteAnalyzedAt: brand.website_analyzed_at,
              voice: (brand.voice_config ?? {}) as Record<string, string>,
              industry: brand.industry,
              websiteUrl: brand.website_url,
              description: brand.description,
              targetAudience: brand.target_audience,
              brandPositioning: brand.brand_positioning,
              brandVoice: brand.brand_voice,
            }
          : null,
      };
    });
  });

export type AdminContentActivity = {
  totals: {
    contentItems: number;
    readyForReview: number;
    generations: number;
    failedGenerations: number;
    totalTokens: number;
    creativesGenerated: number;
    creativesFailed: number;
  };
  byWorkspace: Array<{
    workspaceId: string;
    workspaceName: string;
    contentItems: number;
    generations: number;
    failures: number;
    lastActivityAt: string | null;
  }>;
  byClient: Array<{
    clientId: string;
    clientName: string;
    workspaceName: string;
    contentItems: number;
    generations: number;
    lastActivityAt: string | null;
  }>;
  recentContent: Array<{
    id: string;
    title: string;
    platform: string;
    status: string;
    workspaceName: string;
    clientName: string;
    updatedAt: string;
  }>;
};

/** Read-only, platform-wide AI content activity. Admin role is verified from the caller's session. */
export const getAdminContentActivity = createServerFn({ method: "GET" })
  .middleware([requireVerifiedSupabaseAuth])
  .handler(async ({ context }): Promise<AdminContentActivity> => {
    await assertAdmin(context.supabase);
    const db = await adminDb();

    const [items, events, workspaces, clients] = await Promise.all([
      db
        .from("content_items")
        .select("id,title,platform,status,workspace_id,client_id,updated_at")
        .order("updated_at", { ascending: false }),
      db
        .from("ai_generation_events")
        .select("workspace_id,client_id,status,total_tokens,created_at")
        .order("created_at", { ascending: false })
        .limit(5000),
      db.from("workspaces").select("id,name"),
      db.from("clients").select("id,name,company_name,workspace_id"),
    ]);

    const creatives = await db.from("content_creatives").select("status");

    const workspaceName = new Map((workspaces.data ?? []).map((w) => [w.id, w.name]));
    const clientById = new Map((clients.data ?? []).map((c) => [c.id, c]));

    type Bucket = { contentItems: number; generations: number; failures: number; lastActivityAt: string | null };
    const newBucket = (): Bucket => ({ contentItems: 0, generations: 0, failures: 0, lastActivityAt: null });
    const workspaceBuckets = new Map<string, Bucket>();
    const clientBuckets = new Map<string, Bucket>();

    const touch = (map: Map<string, Bucket>, key: string | null, at: string | null) => {
      if (!key) return null;
      const bucket = map.get(key) ?? newBucket();
      if (at && (!bucket.lastActivityAt || at > bucket.lastActivityAt)) bucket.lastActivityAt = at;
      map.set(key, bucket);
      return bucket;
    };

    for (const item of items.data ?? []) {
      const ws = touch(workspaceBuckets, item.workspace_id, item.updated_at);
      if (ws) ws.contentItems += 1;
      const cl = touch(clientBuckets, item.client_id, item.updated_at);
      if (cl) cl.contentItems += 1;
    }

    let totalTokens = 0;
    let failedGenerations = 0;
    for (const event of events.data ?? []) {
      totalTokens += event.total_tokens ?? 0;
      const failed = event.status !== "success";
      if (failed) failedGenerations += 1;
      const ws = touch(workspaceBuckets, event.workspace_id, event.created_at);
      if (ws) {
        ws.generations += 1;
        if (failed) ws.failures += 1;
      }
      const cl = touch(clientBuckets, event.client_id, event.created_at);
      if (cl) {
        cl.generations += 1;
        if (failed) cl.failures += 1;
      }
    }

    return {
      totals: {
        contentItems: items.data?.length ?? 0,
        readyForReview: (items.data ?? []).filter((item) => item.status === "ready_for_review").length,
        generations: events.data?.length ?? 0,
        failedGenerations,
        totalTokens,
        creativesGenerated: (creatives.data ?? []).filter((row) => row.status === "succeeded").length,
        creativesFailed: (creatives.data ?? []).filter((row) => row.status === "failed").length,
      },
      byWorkspace: [...workspaceBuckets.entries()]
        .map(([workspaceId, bucket]) => ({
          workspaceId,
          workspaceName: workspaceName.get(workspaceId) ?? "Unknown",
          contentItems: bucket.contentItems,
          generations: bucket.generations,
          failures: bucket.failures,
          lastActivityAt: bucket.lastActivityAt,
        }))
        .sort((a, b) => b.generations - a.generations),
      byClient: [...clientBuckets.entries()]
        .map(([clientId, bucket]) => {
          const client = clientById.get(clientId);
          return {
            clientId,
            clientName: client?.company_name || client?.name || "Unknown client",
            workspaceName: client ? (workspaceName.get(client.workspace_id) ?? "Unknown") : "Unknown",
            contentItems: bucket.contentItems,
            generations: bucket.generations,
            lastActivityAt: bucket.lastActivityAt,
          };
        })
        .sort((a, b) => b.generations - a.generations)
        .slice(0, 25),
      recentContent: (items.data ?? []).slice(0, 15).map((item) => {
        const client = clientById.get(item.client_id);
        return {
          id: item.id,
          title: item.title ?? "Untitled content",
          platform: item.platform,
          status: item.status,
          workspaceName: workspaceName.get(item.workspace_id) ?? "Unknown",
          clientName: client?.company_name || client?.name || "Unknown client",
          updatedAt: item.updated_at,
        };
      }),
    };
  });
