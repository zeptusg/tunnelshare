import { z } from "zod";

export const sessionTypeSchema = z.literal("text");
export type SessionType = z.infer<typeof sessionTypeSchema>;

export const sessionStatusSchema = z.enum(["CREATED", "READY", "OPENED", "EXPIRED"]);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const sessionSchema = z.object({
  code: z.string().min(1, "Session code cannot be empty"),
  type: sessionTypeSchema,
  status: sessionStatusSchema,
  payload: z.string().nullable(),
  expiresAt: z.string().datetime({ offset: true }),
});
export type Session = z.infer<typeof sessionSchema>;

export const publicSessionSchema = sessionSchema.pick({
  code: true,
  type: true,
  status: true,
  expiresAt: true,
});
export type PublicSession = z.infer<typeof publicSessionSchema>;
