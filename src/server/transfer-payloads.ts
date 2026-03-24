import { z } from "zod";
import { config } from "@/lib/config";
import type { TransferPayload } from "@/lib/types";
import type { FileStore } from "@/server/file-store";
import { resolveUploadedFiles } from "@/server/file-assets";

export const transferPayloadInputSchema = z
  .object({
    text: z.string().optional(),
    uploadedAssetIds: z
      .array(z.string().min(1, "Asset id cannot be empty"))
      .min(1, "At least one uploaded asset id is required")
      .max(
        config.maxUploadFiles,
        `No more than ${config.maxUploadFiles} uploaded files are allowed`
      )
      .optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((payload, ctx) => {
    const hasText = typeof payload.text === "string" && payload.text.length > 0;
    const hasUploadedAssets =
      Array.isArray(payload.uploadedAssetIds) &&
      payload.uploadedAssetIds.length > 0;

    if (!hasText && !hasUploadedAssets) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Transfer payload must include text, uploaded files, or both",
      });
    }
  });
export type TransferPayloadInput = z.infer<typeof transferPayloadInputSchema>;

export async function resolveTransferPayload(
  fileStore: FileStore,
  payload: TransferPayloadInput
): Promise<TransferPayload> {
  const validatedPayload = transferPayloadInputSchema.parse(payload);
  // Clients send uploaded asset ids, not file references. The server resolves
  // them into transfer-safe metadata so storage details stay server-owned.
  const files = validatedPayload.uploadedAssetIds
    ? await resolveUploadedFiles(fileStore, {
        assetIds: validatedPayload.uploadedAssetIds,
      })
    : undefined;

  return {
    text: validatedPayload.text,
    files,
    metadata: validatedPayload.metadata,
  };
}
