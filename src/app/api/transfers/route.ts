import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCode } from "@/lib/code";
import { config } from "@/lib/config";
import { createFileStore } from "@/server/file-store-factory";
import { saveTransfer } from "@/server/transfer-store";
import {
  resolveTransferPayload,
  transferPayloadInputSchema,
} from "@/server/transfer-payloads";
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
      payload: transferPayloadInputSchema,
    }),
    z.object({
      intent: z.literal("receive"),
    }),
  ])
  .superRefine((value, ctx) => {
    if (
      "payload" in value &&
      typeof value.payload.text === "string" &&
      Buffer.byteLength(value.payload.text, "utf8") > config.maxTextBytes
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payload", "text"],
        message: `text exceeds MAX_TEXT_BYTES (${config.maxTextBytes})`,
      });
    }
  });

const fileStore = createFileStore();

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
      // Sender-first transfers become ready immediately after the server
      // resolves any uploaded asset ids into transfer-safe file references.
      const resolvedPayload = await resolveTransferPayload(
        fileStore,
        requestResult.data.payload
      );
      const transfer = createReadyTransfer({
        code,
        ttlSeconds: config.sessionTtlSeconds,
        receiveUrl,
        payload: resolvedPayload,
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
    // Receiver-first transfers reserve a code first and wait for the sender to
    // attach the payload later through the fulfill route.
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
