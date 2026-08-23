import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CreativeRow = Database["public"]["Tables"]["content_creatives"]["Row"];

export const creativeKeys = {
  list: (contentItemId: string) => ["content-creatives", contentItemId] as const,
  latestForClient: (clientId: string) => ["content-creatives-client", clientId] as const,
};

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type CreativeAsset = {
  id: string;
  contentItemId: string;
  clientId: string;
  workspaceId: string;
  version: number;
  status: "pending" | "succeeded" | "failed";
  provider: string | null;
  model: string | null;
  prompt: string | null;
  formatId: string | null;
  aspectRatio: string | null;
  storagePath: string | null;
  mimeType: string | null;
  byteSize: number | null;
  errorMessage: string | null;
  createdAt: string;
  /** Short-lived signed URL; the bucket is private and workspace-scoped. */
  url: string | null;
};

function mapRow(row: CreativeRow, url: string | null): CreativeAsset {
  return {
    id: row.id,
    contentItemId: row.content_item_id,
    clientId: row.client_id,
    workspaceId: row.workspace_id,
    version: row.version,
    status: (row.status as CreativeAsset["status"]) ?? "pending",
    provider: row.provider,
    model: row.model,
    prompt: row.prompt,
    formatId: row.format_id,
    aspectRatio: row.aspect_ratio,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    url,
  };
}

/** Signs every stored file in one request so the library renders without regenerating. */
async function withSignedUrls(rows: CreativeRow[]): Promise<CreativeAsset[]> {
  const paths = rows
    .map((row) => row.storage_path)
    .filter((path): path is string => Boolean(path));

  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data, error } = await supabase.storage
      .from("creatives")
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (error) console.error("[creatives] signing failed", error);
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl) urlByPath.set(entry.path, entry.signedUrl);
    }
  }

  return rows.map((row) => mapRow(row, row.storage_path ? urlByPath.get(row.storage_path) ?? null : null));
}

/** All generated versions for one content item, newest first. RLS scopes by workspace. */
export async function fetchCreativesForContentItem(contentItemId: string): Promise<CreativeAsset[]> {
  const { data, error } = await supabase
    .from("content_creatives")
    .select("*")
    .eq("content_item_id", contentItemId)
    .order("version", { ascending: false });

  if (error) throw error;
  return withSignedUrls(data ?? []);
}

/** Latest successful visual per content item, for the client's content library. */
export async function fetchClientCreativeThumbnails(
  clientId: string,
): Promise<Record<string, CreativeAsset>> {
  const { data, error } = await supabase
    .from("content_creatives")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "succeeded")
    .order("version", { ascending: false });

  if (error) throw error;

  const newestPerItem: CreativeRow[] = [];
  const seen = new Set<string>();
  for (const row of data ?? []) {
    if (seen.has(row.content_item_id)) continue;
    seen.add(row.content_item_id);
    newestPerItem.push(row);
  }

  const assets = await withSignedUrls(newestPerItem);
  return Object.fromEntries(assets.map((asset) => [asset.contentItemId, asset]));
}
