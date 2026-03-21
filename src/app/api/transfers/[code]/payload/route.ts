import { NextResponse } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import { transferSchema, transferPayloadSchema } from "@/lib/types";
import { getStoredTransfer, saveTransfer } from "@/server/transfer-store";
import {
  fulfillTransferWithPayload,
  isTransferExpired,
} from "@/server/transfers";

const NOT_FOUND_RESPONSE = { error: "not_found" } as const;
const CONFLICT_RESPONSE = { error: "invalid_transfer_state" } as const;

const normalizedCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(
    z
      .string()
      .regex(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/)
  );

const fulfillTransferRequestSchema = z
  .object({
    payload: transferPayloadSchema,
  })
  .superRefine((value, ctx) => {
    if (
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

const fulfillTransferResponseSchema = z.object({
  code: z.string().min(1),
  status: z.literal("ready"),
  receiveUrl: z.string().url(),
  expiresAt: z.string().datetime({ offset: true }),
});

type FulfillTransferResponse = z.infer<typeof fulfillTransferResponseSchema>;

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> }
): Promise<NextResponse<FulfillTransferResponse | { error: string }>> {
  try {
    const { code: rawCode } = await context.params;
    const codeResult = normalizedCodeSchema.safeParse(rawCode);

    if (!codeResult.success) {
      return NextResponse.json(NOT_FOUND_RESPONSE, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const requestResult = fulfillTransferRequestSchema.safeParse(body);
    if (!requestResult.success) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const transferFromStore = await getStoredTransfer(codeResult.data);
    if (!transferFromStore) {
      return NextResponse.json(NOT_FOUND_RESPONSE, { status: 404 });
    }

    const transferResult = transferSchema.safeParse(transferFromStore);
    if (!transferResult.success || isTransferExpired(transferResult.data)) {
      return NextResponse.json(NOT_FOUND_RESPONSE, { status: 404 });
    }

    if (transferResult.data.status !== "awaiting_payload") {
      return NextResponse.json(CONFLICT_RESPONSE, { status: 409 });
    }

    const fulfilledTransfer = fulfillTransferWithPayload({
      transfer: transferResult.data,
      payload: requestResult.data.payload,
    });

    await saveTransfer(fulfilledTransfer, config.sessionTtlSeconds);

    return NextResponse.json<FulfillTransferResponse>(
      fulfillTransferResponseSchema.parse({
        code: fulfilledTransfer.code,
        status: fulfilledTransfer.status,
        receiveUrl: fulfilledTransfer.receiveUrl,
        expiresAt: fulfilledTransfer.expiresAt,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fulfill transfer", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
