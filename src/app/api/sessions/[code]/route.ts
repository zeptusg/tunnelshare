import { NextResponse } from "next/server";
import { z } from "zod";
import { getJson } from "@/lib/redis";
import { PublicSession, Session, sessionSchema } from "@/lib/types";
import { isExpired, toPublicSession } from "@/server/sessions";

const SESSION_KEY_PREFIX = "session:";
const NOT_FOUND_RESPONSE = { error: "not_found" } as const;

const normalizedCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/));

function getSessionKey(code: string): string {
  return `${SESSION_KEY_PREFIX}${code}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
): Promise<NextResponse<PublicSession | { error: string }>> {
  try {
    const { code: rawCode } = await context.params;
    const codeResult = normalizedCodeSchema.safeParse(rawCode);

    if (!codeResult.success) {
      return NextResponse.json(NOT_FOUND_RESPONSE, { status: 404 });
    }

    const sessionFromStore = await getJson<Session>(getSessionKey(codeResult.data));
    if (!sessionFromStore) {
      return NextResponse.json(NOT_FOUND_RESPONSE, { status: 404 });
    }

    const sessionResult = sessionSchema.safeParse(sessionFromStore);
    if (!sessionResult.success || isExpired(sessionResult.data)) {
      return NextResponse.json(NOT_FOUND_RESPONSE, { status: 404 });
    }

    return NextResponse.json<PublicSession>(toPublicSession(sessionResult.data));
  } catch (error) {
    console.error("Failed to fetch session", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
