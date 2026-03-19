import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCode } from "@/lib/code";
import { config } from "@/lib/config";
import { transferPayloadSchema } from "@/lib/types";
import { saveTransfer } from "@/server/transfer-store";
import {
  createAwaitingTransfer,
  createReadyTransfer,
} from "@/server/transfers";

const createTransferResponseSchema = z.object({
  code: z.string().min(1),
  status: z.enum(["awaiting_payload", "ready"]),
  receiveUrl: z.string().url(),
  sendUrl: z.string().url().optional(),
  expiresAt: z.string().datetime({ offset: true }),
});

type CreateTransferResponse = z.infer<typeof createTransferResponseSchema>;

const createTransferRequestSchema = z
  .union([
    z.object({
      payload: transferPayloadSchema,
    }),
    z.object({
      intent: z.literal("receive"),
    }),
  ])
  .superRefine((value, ctx) => {
    if (
      "payload" in value &&
      value.payload.type === "text" &&
      Buffer.byteLength(value.payload.content, "utf8") > config.maxTextBytes
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payload", "content"],
        message: `text exceeds MAX_TEXT_BYTES (${config.maxTextBytes})`,
      });
    }
  });

export async function POST(
  request: Request
): Promise<NextResponse<CreateTransferResponse | { error: string }>> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const requestResult = createTransferRequestSchema.safeParse(body);
    if (!requestResult.success) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const code = generateCode();
    const receiveUrl = new URL(`/receive/${code}`, config.appUrl).toString();

    if ("payload" in requestResult.data) {
      const transfer = createReadyTransfer({
        code,
        ttlSeconds: config.sessionTtlSeconds,
        receiveUrl,
        payload: requestResult.data.payload,
      });

      await saveTransfer(transfer, config.sessionTtlSeconds);

      return NextResponse.json<CreateTransferResponse>(
        createTransferResponseSchema.parse({
          code: transfer.code,
          status: transfer.status,
          receiveUrl: transfer.receiveUrl,
          expiresAt: transfer.expiresAt,
        }),
        { status: 201 }
      );
    }

    const sendUrl = new URL(`/send?code=${code}`, config.appUrl).toString();
    const transfer = createAwaitingTransfer({
      code,
      ttlSeconds: config.sessionTtlSeconds,
      receiveUrl,
      sendUrl,
    });

    await saveTransfer(transfer, config.sessionTtlSeconds);

    return NextResponse.json<CreateTransferResponse>(
      createTransferResponseSchema.parse({
        code: transfer.code,
        status: transfer.status,
        receiveUrl: transfer.receiveUrl,
        sendUrl: transfer.sendUrl,
        expiresAt: transfer.expiresAt,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create transfer", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
