import { z } from "zod";

export const sessionPayloadTypeSchema = z.enum(["text", "file"]);
export type SessionPayloadType = z.infer<typeof sessionPayloadTypeSchema>;

export const sessionPayloadSchema = z.object({
  type: sessionPayloadTypeSchema,
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

export const sessionSchema = z.object({
  code: z.string().min(1, "Session code cannot be empty"),
  payload: sessionPayloadSchema,
  expiresAt: z.string().datetime({ offset: true }),
});
export type Session = z.infer<typeof sessionSchema>;

export const publicSessionSchema = sessionSchema.pick({
  code: true,
  payload: true,
  expiresAt: true,
});
export type PublicSession = z.infer<typeof publicSessionSchema>;
