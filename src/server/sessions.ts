import { z } from "zod";
import {
  PublicSession,
  Session,
  publicSessionSchema,
  sessionSchema,
  sessionTypeSchema,
} from "@/lib/types";

const createSessionParamsSchema = z.object({
  code: z.string().min(1, "Session code cannot be empty"),
  type: sessionTypeSchema.optional(),
  ttlSeconds: z.number().int().positive("ttlSeconds must be a positive integer"),
  now: z.date().optional(),
});
type CreateSessionParams = z.input<typeof createSessionParamsSchema>;

const createReadyTextSessionParamsSchema = createSessionParamsSchema.extend({
  text: z.string(),
});
type CreateReadyTextSessionParams = z.input<typeof createReadyTextSessionParamsSchema>;

/**
 * Create a new session object. Does not persist anywhere; just shapes the domain data.
 */
export function createSession(
  params: CreateSessionParams
): Session {
  const { code, type = "text", ttlSeconds, now = new Date() } =
    createSessionParamsSchema.parse(params);
  const expires = new Date(now.getTime() + ttlSeconds * 1000);

  return sessionSchema.parse({
    code,
    type,
    status: "CREATED",
    payload: null,
    expiresAt: expires.toISOString(),
  });
}

export function createReadyTextSession(
  params: CreateReadyTextSessionParams
): Session {
  const { code, type = "text", ttlSeconds, text, now = new Date() } =
    createReadyTextSessionParamsSchema.parse(params);
  const expires = new Date(now.getTime() + ttlSeconds * 1000);

  return sessionSchema.parse({
    code,
    type,
    status: "READY",
    payload: text,
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
  const { code, type, status, expiresAt } = session;
  return publicSessionSchema.parse({ code, type, status, expiresAt });
}
