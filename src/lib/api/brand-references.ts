import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type BrandReferenceRow = Database["public"]["Tables"]["client_brand_references"]["Row"];

export const REFERENCES_BUCKET = "brand-references";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
export const MAX_REFERENCE_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_REFERENCE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const brandReferenceKeys = {
  list: (clientId: string) => ["brand-references", clientId] as const,
};

export type BrandReference = {
  id: string;
  clientId: string;
  workspaceId: string;
  storagePath: string;
  description: string | null;
  mimeType: string | null;
  byteSize: number | null;
  createdAt: string;
  /** Short-lived signed URL — the bucket is private and workspace-scoped. */
  url: string | null;
};

function extensionFor(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

/** All reference images for a client, newest first. RLS scopes by workspace. */
export async function fetchBrandReferences(clientId: string): Promise<BrandReference[]> {
  const { data, error } = await supabase
    .from("client_brand_references")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  const urlByPath = new Map<string, string>();
  const paths = rows.map((row) => row.storage_path).filter(Boolean);
  if (paths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from(REFERENCES_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (signError) console.error("[brand-references] signing failed", signError);
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) urlByPath.set(entry.path, entry.signedUrl);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    clientId: row.client_id,
    workspaceId: row.workspace_id,
    storagePath: row.storage_path,
    description: row.description,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    createdAt: row.created_at,
    url: urlByPath.get(row.storage_path) ?? null,
  }));
}

export type UploadReferenceArgs = {
  clientId: string;
  workspaceId: string;
  file: File;
  description?: string | undefined;
  /** When set, the stored file and row are replaced instead of added. */
  replaceId?: string;
};

/**
 * Uploads a reference image into the private bucket under
 * `{workspace_id}/{client_id}/…` — the prefix the storage policies check.
 */
export async function uploadBrandReference(args: UploadReferenceArgs): Promise<void> {
  const { file } = args;
  if (!ACCEPTED_REFERENCE_TYPES.includes(file.type)) {
    throw new Error("Upload a PNG, JPG or WebP image.");
  }
  if (file.size > MAX_REFERENCE_BYTES) {
    throw new Error("Reference images must be 8 MB or smaller.");
  }

  const { data: userData } = await supabase.auth.getUser();
  const id = crypto.randomUUID();
  const storagePath = `${args.workspaceId}/${args.clientId}/${id}.${extensionFor(file.type)}`;

  const { error: uploadError } = await supabase.storage
    .from(REFERENCES_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message || "Couldn't upload this reference image.");

  if (args.replaceId) {
    const previous = await supabase
      .from("client_brand_references")
      .select("storage_path")
      .eq("id", args.replaceId)
      .maybeSingle();

    const { error } = await supabase
      .from("client_brand_references")
      .update({
        storage_path: storagePath,
        mime_type: file.type,
        byte_size: file.size,
        ...(args.description !== undefined ? { description: args.description.trim() || null } : {}),
      })
      .eq("id", args.replaceId);

    if (error) {
      await supabase.storage.from(REFERENCES_BUCKET).remove([storagePath]);
      throw error;
    }
    if (previous.data?.storage_path && previous.data.storage_path !== storagePath) {
      await supabase.storage.from(REFERENCES_BUCKET).remove([previous.data.storage_path]);
    }
    return;
  }

  const { error } = await supabase.from("client_brand_references").insert({
    client_id: args.clientId,
    workspace_id: args.workspaceId,
    storage_bucket: REFERENCES_BUCKET,
    storage_path: storagePath,
    description: args.description?.trim() || null,
    mime_type: file.type,
    byte_size: file.size,
    created_by: userData.user?.id ?? null,
  });

  if (error) {
    await supabase.storage.from(REFERENCES_BUCKET).remove([storagePath]);
    throw error;
  }
}

export async function updateBrandReferenceDescription(
  id: string,
  description: string,
): Promise<void> {
  const { error } = await supabase
    .from("client_brand_references")
    .update({ description: description.trim() || null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteBrandReference(reference: {
  id: string;
  storagePath: string;
}): Promise<void> {
  const { error: removeError } = await supabase.storage
    .from(REFERENCES_BUCKET)
    .remove([reference.storagePath]);
  if (removeError) console.error("[brand-references] file remove failed", removeError);

  const { error } = await supabase
    .from("client_brand_references")
    .delete()
    .eq("id", reference.id);
  if (error) throw error;
}
