import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCode } from "@/lib/code";
import { config } from "@/lib/config";
import { setJson } from "@/lib/redis";
import { createReadyTextSession } from "@/server/sessions";

const createSessionResponseSchema = z.object({
  code: z.string().min(1),
  receiveUrl: z.string().url(),
  expiresAt: z.string().datetime({ offset: true }),
});

type CreateSessionResponse = z.infer<typeof createSessionResponseSchema>;

const SESSION_KEY_PREFIX = "session:";
const createSessionRequestSchema = z.object({
  text: z.string().min(1, "text is required"),
}).superRefine((value, ctx) => {
  if (Buffer.byteLength(value.text, "utf8") > config.maxTextBytes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["text"],
      message: `text exceeds MAX_TEXT_BYTES (${config.maxTextBytes})`,
    });
  }
});

function getSessionKey(code: string): string {
  return `${SESSION_KEY_PREFIX}${code}`;
}

export async function POST(request: Request): Promise<NextResponse<CreateSessionResponse | { error: string }>> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const requestResult = createSessionRequestSchema.safeParse(body);
    if (!requestResult.success) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const code = generateCode();
    const session = createReadyTextSession({
      code,
      ttlSeconds: config.sessionTtlSeconds,
      text: requestResult.data.text,
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
