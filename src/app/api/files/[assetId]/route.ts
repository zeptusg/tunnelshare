import { NextResponse } from "next/server";
import { z } from "zod";
import { createFileStore } from "@/server/file-store-factory";

const normalizedAssetIdSchema = z.string().uuid("assetId must be a valid UUID");
const fileStore = createFileStore();

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
      const asset = await fileStore.getStoredFileAsset({
        assetId: assetIdResult.data,
      });
      const downloadUrl = await fileStore.getDownloadUrl(asset);

      return NextResponse.redirect(downloadUrl, { status: 307 });
    } catch {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Failed to resolve file download URL", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
