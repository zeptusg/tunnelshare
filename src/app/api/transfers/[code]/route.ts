import { NextResponse } from "next/server";
import { z } from "zod";
import { transferSchema } from "@/lib/types";
import type { PublicTransfer } from "@/lib/types";
import { getStoredTransfer } from "@/server/transfer-store";
import { isTransferAvailable, toPublicTransfer } from "@/server/transfers";

export const dynamic = "force-dynamic";

const NOT_FOUND_RESPONSE = { error: "not_found" } as const;

const normalizedCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(
    z
      .string()
      .regex(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/)
  );

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
): Promise<NextResponse<PublicTransfer | { error: string }>> {
  try {
    const { code: rawCode } = await context.params;
    const codeResult = normalizedCodeSchema.safeParse(rawCode);

    if (!codeResult.success) {
      return NextResponse.json(NOT_FOUND_RESPONSE, { status: 404 });
    }

    const transferFromStore = await getStoredTransfer(codeResult.data);
    if (!transferFromStore) {
      return NextResponse.json(NOT_FOUND_RESPONSE, { status: 404 });
    }

    const transferResult = transferSchema.safeParse(transferFromStore);
    if (!transferResult.success || !isTransferAvailable(transferResult.data)) {
      return NextResponse.json(NOT_FOUND_RESPONSE, { status: 404 });
    }

    return NextResponse.json<PublicTransfer>(
      toPublicTransfer(transferResult.data)
    );
  } catch (error) {
    console.error("Failed to fetch transfer", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
