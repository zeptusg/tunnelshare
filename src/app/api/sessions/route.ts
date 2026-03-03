import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCode } from "@/lib/code";
import { config } from "@/lib/config";
import { setJson } from "@/lib/redis";
import { createSession } from "@/server/sessions";

const createSessionResponseSchema = z.object({
  code: z.string().min(1),
  receiveUrl: z.string().url(),
  expiresAt: z.string().datetime({ offset: true }),
});

type CreateSessionResponse = z.infer<typeof createSessionResponseSchema>;

const SESSION_KEY_PREFIX = "session:";

function getSessionKey(code: string): string {
  return `${SESSION_KEY_PREFIX}${code}`;
}

export async function POST(): Promise<NextResponse<CreateSessionResponse | { error: string }>> {
  try {
    const code = generateCode();
    const session = createSession({
      code,
      type: "text",
      ttlSeconds: config.sessionTtlSeconds,
    });

    await setJson(getSessionKey(code), session, config.sessionTtlSeconds);

    const receiveUrl = new URL("/receive", config.appUrl);
    receiveUrl.searchParams.set("code", code);

    const responsePayload = createSessionResponseSchema.parse({
      code,
      receiveUrl: receiveUrl.toString(),
      expiresAt: session.expiresAt,
    });

    return NextResponse.json<CreateSessionResponse>(responsePayload, { status: 201 });
  } catch (error) {
    console.error("Failed to create session", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
