import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Client = Database["public"]["Tables"]["clients"]["Row"];

export type ClientInput = {
  name: string;
  company_name: string;
  email?: string | null;
  website?: string | null;
  notes?: string | null;
  status?: string;
};

export const clientKeys = {
  all: ["clients"] as const,
  list: (workspaceId: string) => ["clients", workspaceId] as const,
  detail: (clientId: string) => ["client", clientId] as const,
};

function normalize(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Lists clients for a workspace. RLS restricts rows to workspace members. */
export async function fetchClients(workspaceId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchClient(clientId: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createClient(
  workspaceId: string,
  values: ClientInput,
): Promise<Client> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("clients")
    .insert({
      workspace_id: workspaceId,
      name: values.name.trim(),
      company_name: values.company_name.trim(),
      email: normalize(values.email),
      website: normalize(values.website),
      notes: normalize(values.notes),
      status: values.status ?? "active",
      created_by: userData.user?.id ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateClient(
  clientId: string,
  values: ClientInput,
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .update({
      name: values.name.trim(),
      company_name: values.company_name.trim(),
      email: normalize(values.email),
      website: normalize(values.website),
      notes: normalize(values.notes),
      ...(values.status ? { status: values.status } : {}),
    })
    .eq("id", clientId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/** Archiving keeps the record but removes it from active client lists. */
export async function setClientStatus(clientId: string, status: string): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .update({ status })
    .eq("id", clientId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClient(clientId: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) throw error;
}
