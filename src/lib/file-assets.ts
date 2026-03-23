import { z } from "zod";
import { fileReferenceSchema } from "@/lib/types";

const isoDatetimeSchema = z.string().datetime({ offset: true });

// Browser-selected file metadata before any upload target or stored asset exists.
export const selectedFileSchema = z.object({
  name: z.string().min(1, "File name cannot be empty"),
  sizeBytes: z.number().int().nonnegative("sizeBytes must be a non-negative integer"),
  // Browsers sometimes provide an empty type for unknown file kinds.
  contentType: z.string(),
});
export type SelectedFile = z.infer<typeof selectedFileSchema>;

export function normalizeUploadContentType(contentType: string): string {
  const normalizedContentType = contentType.trim();
  return normalizedContentType || "application/octet-stream";
}

export function validateSelectedFileForUpload(
  file: SelectedFile,
  options: {
    maxUploadFileBytes: number;
  }
):
  | { ok: true }
  | {
      ok: false;
      error: "file_too_large";
    } {
  if (file.sizeBytes > options.maxUploadFileBytes) {
    return { ok: false, error: "file_too_large" };
  }

  return { ok: true };
}

export const uploadTargetSchema = z.object({
  assetId: z.string().min(1, "Asset id cannot be empty"),
  storageKey: z.string().min(1, "storageKey cannot be empty"),
  uploadUrl: z.string().url("uploadUrl must be a valid URL"),
  completeUrl: z.string().url("completeUrl must be a valid URL"),
  uploadMethod: z.enum(["PUT", "POST"]),
  headers: z.record(z.string(), z.string()),
  expiresAt: isoDatetimeSchema,
});
export type UploadTarget = z.infer<typeof uploadTargetSchema>;

export const storedFileAssetSchema = fileReferenceSchema.extend({
  createdAt: isoDatetimeSchema,
  expiresAt: isoDatetimeSchema,
});
export type StoredFileAsset = z.infer<typeof storedFileAssetSchema>;

// Transfers only need stable file references, not the extra upload/storage lifecycle fields.
export function toFileReference(asset: StoredFileAsset) {
  return fileReferenceSchema.parse({
    id: asset.id,
    name: asset.name,
    sizeBytes: asset.sizeBytes,
    contentType: asset.contentType,
    storageKey: asset.storageKey,
  });
}
