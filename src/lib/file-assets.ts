import { z } from "zod";
import { fileReferenceSchema } from "@/lib/types";

const isoDatetimeSchema = z.string().datetime({ offset: true });

// Browser-selected file metadata before any upload target or stored asset exists.
export const selectedFileSchema = z.object({
  name: z.string().min(1, "File name cannot be empty"),
  sizeBytes: z.number().int().nonnegative("sizeBytes must be a non-negative integer"),
  contentType: z.string().min(1, "contentType cannot be empty"),
});
export type SelectedFile = z.infer<typeof selectedFileSchema>;

export const uploadTargetSchema = z.object({
  assetId: z.string().min(1, "Asset id cannot be empty"),
  storageKey: z.string().min(1, "storageKey cannot be empty"),
  uploadUrl: z.string().url("uploadUrl must be a valid URL"),
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
