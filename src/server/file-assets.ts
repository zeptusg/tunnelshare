import { z } from "zod";
import { toFileReference } from "@/lib/file-assets";
import type { FileReference } from "@/lib/types";
import type { FileStore } from "@/server/file-store";

const uploadedAssetIdsSchema = z
  .array(z.string().min(1, "Asset id cannot be empty"))
  .min(1, "At least one uploaded asset id is required");

const resolveUploadedFilesParamsSchema = z.object({
  assetIds: uploadedAssetIdsSchema,
});
type ResolveUploadedFilesParams = z.input<
  typeof resolveUploadedFilesParamsSchema
>;

// Uploaded assets become transfer file references only after server-side lookup.
// This keeps clients from fabricating file metadata directly into a transfer payload.
export async function resolveUploadedFiles(
  fileStore: FileStore,
  params: ResolveUploadedFilesParams
): Promise<FileReference[]> {
  const { assetIds } = resolveUploadedFilesParamsSchema.parse(params);

  const storedAssets = await Promise.all(
    assetIds.map((assetId) => fileStore.getStoredFileAsset({ assetId }))
  );

  return storedAssets.map((asset) => toFileReference(asset));
}
