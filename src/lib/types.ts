import { z } from "zod";

const codeSchema = z.string().min(1, "Code cannot be empty");
const isoDatetimeSchema = z.string().datetime({ offset: true });

export const fileReferenceSchema = z.object({
  id: z.string().min(1, "File id cannot be empty"),
  name: z.string().min(1, "File name cannot be empty"),
  sizeBytes: z.number().int().nonnegative("sizeBytes must be a non-negative integer"),
  contentType: z.string().min(1, "contentType cannot be empty"),
  storageKey: z.string().min(1, "storageKey cannot be empty"),
});
export type FileReference = z.infer<typeof fileReferenceSchema>;

export const transferStatusSchema = z.enum([
  "awaiting_payload",
  "ready",
  "consumed",
  "expired",
]);
export type TransferStatus = z.infer<typeof transferStatusSchema>;

export const transferInitiatedBySchema = z.enum(["sender", "receiver"]);
export type TransferInitiatedBy = z.infer<typeof transferInitiatedBySchema>;

export const transferPayloadSchema = z
  .object({
    text: z.string().optional(),
    files: z
      .array(fileReferenceSchema)
      .min(1, "At least one file is required")
      .optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((payload, ctx) => {
    const hasText = typeof payload.text === "string" && payload.text.length > 0;
    const hasFiles = Array.isArray(payload.files) && payload.files.length > 0;

    if (!hasText && !hasFiles) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Transfer payload must include text, files, or both",
      });
    }
  });
export type TransferPayload = z.infer<typeof transferPayloadSchema>;

export const transferBaseSchema = z.object({
  code: codeSchema,
  status: transferStatusSchema,
  initiatedBy: transferInitiatedBySchema,
  payload: transferPayloadSchema.optional(),
  receiveUrl: z.string().url(),
  sendUrl: z.string().url().optional(),
  expiresAt: isoDatetimeSchema,
});

export const publicTransferSchema = transferBaseSchema.pick({
  code: true,
  status: true,
  payload: true,
  sendUrl: true,
  expiresAt: true,
});
export type PublicTransfer = z.infer<typeof publicTransferSchema>;

export const transferSchema = transferBaseSchema.superRefine((transfer, ctx) => {
  if (transfer.status === "awaiting_payload" && transfer.payload) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["payload"],
      message: "Awaiting payload transfers cannot contain a payload",
    });
  }

  if (
    (transfer.status === "ready" || transfer.status === "consumed") &&
    !transfer.payload
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["payload"],
      message: `${transfer.status} transfers must contain a payload`,
    });
  }

  if (transfer.status === "awaiting_payload" && !transfer.sendUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sendUrl"],
      message: "Awaiting payload transfers must include a sendUrl",
    });
  }
});
export type Transfer = z.infer<typeof transferSchema>;
