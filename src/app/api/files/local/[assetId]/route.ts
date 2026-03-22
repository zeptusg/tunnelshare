import { NextResponse } from "next/server";
import { z } from "zod";
import { readLocalAssetRecord, readLocalUploadBytes } from "@/server/file-store-local";

const normalizedAssetIdSchema = z.string().uuid("assetId must be a valid UUID");

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> }
): Promise<Response> {
  try {
    const { assetId: rawAssetId } = await context.params;
    const assetIdResult = normalizedAssetIdSchema.safeParse(rawAssetId);

    if (!assetIdResult.success) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    try {
      const record = await readLocalAssetRecord(assetIdResult.data);
      const fileBytes = await readLocalUploadBytes(assetIdResult.data);
      const responseBody = Buffer.from(fileBytes);

      return new Response(responseBody, {
        status: 200,
        headers: {
          "content-type": record.contentType,
          "content-length": String(responseBody.byteLength),
          "content-disposition": `inline; filename="${record.name}"`,
        },
      });
    } catch {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Failed to fetch local file asset", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
