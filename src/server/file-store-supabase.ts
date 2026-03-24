import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";
import { getJson, setJson } from "@/lib/redis";
import { storedFileAssetSchema, uploadTargetSchema } from "@/lib/file-assets";
import type { StoredFileAsset, UploadTarget } from "@/lib/file-assets";
import type {
  CreateUploadTargetParams,
  DeleteStoredFileParams,
  FileStore,
  FinalizeUploadParams,
  GetStoredFileAssetParams,
  StoredFileDownload,
} from "@/server/file-store";
import {
  createUploadTargetParamsSchema,
  deleteStoredFileParamsSchema,
  finalizeUploadParamsSchema,
  getStoredFileAssetParamsSchema,
} from "@/server/file-store";

const SUPABASE_ASSET_KEY_PREFIX = "asset:";
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60;

function getSupabaseAssetKey(assetId: string): string {
  return `${SUPABASE_ASSET_KEY_PREFIX}${assetId}`;
}

function sanitizeFileName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
}

function getExpiresAtIso(ttlSeconds: number, now: Date): string {
  return new Date(now.getTime() + ttlSeconds * 1000).toISOString();
}

function createSupabaseStorageClient(): SupabaseClient {
  return createClient(config.supabaseUrl!, config.supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function saveSupabaseAssetRecord(
  asset: StoredFileAsset,
  ttlSeconds: number
): Promise<void> {
  await setJson(getSupabaseAssetKey(asset.id), asset, ttlSeconds);
}

async function getSupabaseAssetRecord(
  assetId: string
): Promise<StoredFileAsset | null> {
  const storedAsset = await getJson<StoredFileAsset>(getSupabaseAssetKey(assetId));
  return storedAsset ? storedFileAssetSchema.parse(storedAsset) : null;
}

// Supabase keeps the file bytes; Redis only holds short-lived metadata until a
// future DB-backed asset model is introduced.
export function createSupabaseFileStore(): FileStore {
  const supabase = createSupabaseStorageClient();

  return {
    async createUploadTarget(params: CreateUploadTargetParams): Promise<UploadTarget> {
      const { file, ttlSeconds, now = new Date() } =
        createUploadTargetParamsSchema.parse(params);

      const assetId = randomUUID();
      const storageKey = `uploads/${assetId}/${sanitizeFileName(file.name)}`;
      const createdAt = now.toISOString();
      const expiresAt = getExpiresAtIso(ttlSeconds, now);

      const uploadTargetResponse = await supabase.storage
        .from(config.supabaseBucket!)
        .createSignedUploadUrl(storageKey, { upsert: false });

      if (uploadTargetResponse.error || !uploadTargetResponse.data) {
        throw new Error(
          `Failed to create Supabase signed upload URL: ${uploadTargetResponse.error?.message ?? "unknown_error"}`
        );
      }

      const storedAsset = storedFileAssetSchema.parse({
        id: assetId,
        name: file.name,
        sizeBytes: file.sizeBytes,
        contentType: file.contentType,
        storageKey,
        createdAt,
        expiresAt,
      });

      await saveSupabaseAssetRecord(storedAsset, ttlSeconds);

      return uploadTargetSchema.parse({
        assetId,
        storageKey,
        uploadUrl: uploadTargetResponse.data.signedUrl,
        completeUrl: new URL(
          `/api/uploads/${assetId}/complete`,
          config.appUrl
        ).toString(),
        uploadMethod: "PUT",
        headers: {
          "content-type": file.contentType,
        },
        expiresAt,
      });
    },

    async finalizeUpload(params: FinalizeUploadParams): Promise<StoredFileAsset> {
      const { assetId } = finalizeUploadParamsSchema.parse(params);
      const storedAsset = await getSupabaseAssetRecord(assetId);

      if (!storedAsset) {
        throw new Error(`Supabase asset "${assetId}" metadata was not found`);
      }

      const fileInfoResponse = await supabase.storage
        .from(config.supabaseBucket!)
        .info(storedAsset.storageKey);

      if (fileInfoResponse.error || !fileInfoResponse.data) {
        throw new Error(
          `Supabase asset "${assetId}" was not uploaded: ${fileInfoResponse.error?.message ?? "unknown_error"}`
        );
      }

      if (fileInfoResponse.data.size !== storedAsset.sizeBytes) {
        throw new Error(
          `Supabase asset "${assetId}" size mismatch: expected ${storedAsset.sizeBytes}, received ${fileInfoResponse.data.size}`
        );
      }

      return storedFileAssetSchema.parse(storedAsset);
    },

    async getStoredFileAsset(
      params: GetStoredFileAssetParams
    ): Promise<StoredFileAsset> {
      const { assetId } = getStoredFileAssetParamsSchema.parse(params);
      const storedAsset = await getSupabaseAssetRecord(assetId);

      if (!storedAsset) {
        throw new Error(`Supabase asset "${assetId}" metadata was not found`);
      }

      return storedFileAssetSchema.parse(storedAsset);
    },

    async downloadStoredFile(asset: StoredFileAsset): Promise<StoredFileDownload> {
      const downloadResponse = await supabase.storage
        .from(config.supabaseBucket!)
        .download(asset.storageKey);

      if (downloadResponse.error || !downloadResponse.data) {
        throw new Error(
          `Failed to download Supabase object "${asset.storageKey}": ${downloadResponse.error?.message ?? "unknown_error"}`
        );
      }

      const fileBytes = new Uint8Array(await downloadResponse.data.arrayBuffer());

      return {
        body: fileBytes,
        contentType: asset.contentType,
        contentLength: fileBytes.byteLength,
      };
    },

    async getDownloadUrl(asset: StoredFileAsset): Promise<string> {
      const signedUrlResponse = await supabase.storage
        .from(config.supabaseBucket!)
        .createSignedUrl(asset.storageKey, DOWNLOAD_URL_TTL_SECONDS, {
          download: asset.name,
        });

      if (signedUrlResponse.error || !signedUrlResponse.data) {
        throw new Error(
          `Failed to create Supabase signed download URL: ${signedUrlResponse.error?.message ?? "unknown_error"}`
        );
      }

      return signedUrlResponse.data.signedUrl;
    },

    async deleteStoredFile(params: DeleteStoredFileParams): Promise<void> {
      const { storageKey } = deleteStoredFileParamsSchema.parse(params);
      const deleteResponse = await supabase.storage
        .from(config.supabaseBucket!)
        .remove([storageKey]);

      if (deleteResponse.error) {
        throw new Error(
          `Failed to delete Supabase object "${storageKey}": ${deleteResponse.error.message}`
        );
      }
    },
  };
}
