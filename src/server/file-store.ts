import { z } from "zod";
import {
  selectedFileSchema,
  storedFileAssetSchema,
  type StoredFileAsset,
  uploadTargetSchema,
  type UploadTarget,
} from "@/lib/file-assets";

export const createUploadTargetParamsSchema = z.object({
  file: selectedFileSchema,
  ttlSeconds: z.number().int().positive("ttlSeconds must be a positive integer"),
  now: z.date().optional(),
});
export type CreateUploadTargetParams = z.input<
  typeof createUploadTargetParamsSchema
>;

export const finalizeUploadParamsSchema = z.object({
  assetId: z.string().min(1, "Asset id cannot be empty"),
});
export type FinalizeUploadParams = z.input<typeof finalizeUploadParamsSchema>;

export const getStoredFileAssetParamsSchema = z.object({
  assetId: z.string().min(1, "Asset id cannot be empty"),
});
export type GetStoredFileAssetParams = z.input<
  typeof getStoredFileAssetParamsSchema
>;

export const deleteStoredFileParamsSchema = z.object({
  storageKey: z.string().min(1, "storageKey cannot be empty"),
});
export type DeleteStoredFileParams = z.input<
  typeof deleteStoredFileParamsSchema
>;

// Storage backends implement this interface so transfer logic stays independent
// from the actual file provider, whether local or cloud-based.
export interface FileStore {
  createUploadTarget(params: CreateUploadTargetParams): Promise<UploadTarget>;
  finalizeUpload(params: FinalizeUploadParams): Promise<StoredFileAsset>;
  getStoredFileAsset(params: GetStoredFileAssetParams): Promise<StoredFileAsset>;
  getDownloadUrl(asset: StoredFileAsset): Promise<string>;
  deleteStoredFile(params: DeleteStoredFileParams): Promise<void>;
}

export function assertUploadTarget(value: unknown): UploadTarget {
  return uploadTargetSchema.parse(value);
}

export function assertStoredFileAsset(value: unknown): StoredFileAsset {
  return storedFileAssetSchema.parse(value);
}
