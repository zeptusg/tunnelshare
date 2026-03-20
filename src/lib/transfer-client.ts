import { z } from "zod";
import { publicTransferSchema } from "@/lib/types";

export const createTransferResponseSchema = z.object({
  code: z.string().min(1),
});
export type CreateTransferResponse = z.infer<typeof createTransferResponseSchema>;

export const transferActionResponseSchema = z.object({
  code: z.string().min(1),
  status: z.enum(["awaiting_payload", "ready"]),
  receiveUrl: z.string().url(),
  expiresAt: z.string().datetime({ offset: true }),
});
export type TransferActionResponse = z.infer<typeof transferActionResponseSchema>;

export const publicTransferResponseSchema = publicTransferSchema;
export type PublicTransferResponse = z.infer<typeof publicTransferResponseSchema>;
