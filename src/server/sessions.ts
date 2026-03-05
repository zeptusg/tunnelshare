import { z } from "zod";
import {
  PublicSession,
  Session,
  publicSessionSchema,
  sessionSchema,
} from "@/lib/types";

const createReadyTextSessionParamsSchema = z.object({
  code: z.string().min(1, "Session code cannot be empty"),
  ttlSeconds: z.number().int().positive("ttlSeconds must be a positive integer"),
  text: z.string(),
  now: z.date().optional(),
});
type CreateReadyTextSessionParams = z.input<typeof createReadyTextSessionParamsSchema>;

export function createReadyTextSession(
  params: CreateReadyTextSessionParams
): Session {
  const { code, ttlSeconds, text, now = new Date() } =
    createReadyTextSessionParamsSchema.parse(params);
  const expires = new Date(now.getTime() + ttlSeconds * 1000);

  return sessionSchema.parse({
    code,
    payload: {
      type: "text",
      content: text,
    },
    expiresAt: expires.toISOString(),
  });
}

/**
 * Is the given session expired at the provided time (or now)?
 */
export function isExpired(session: Session, now: Date = new Date()): boolean {
  const expiresAtMs = Date.parse(session.expiresAt);
  if (Number.isNaN(expiresAtMs)) {
    return true;
  }
  return now.getTime() >= expiresAtMs;
}

/**
 * Return the public-facing subset of session data that clients can see.
 */
export function toPublicSession(session: Session): PublicSession {
  const { code, payload, expiresAt } = session;
  return publicSessionSchema.parse({ code, payload, expiresAt });
}
