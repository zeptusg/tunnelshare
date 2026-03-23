import { NextResponse } from "next/server";
import { z } from "zod";
import { storedFileAssetSchema } from "@/lib/file-assets";
import { createFileStore } from "@/server/file-store-factory";

const normalizedAssetIdSchema = z.string().uuid("assetId must be a valid UUID");

const fileStore = createFileStore();

export async function POST(
  _request: Request,
  context: { params: Promise<{ assetId: string }> }
): Promise<NextResponse<ReturnType<typeof storedFileAssetSchema.parse> | { error: string }>> {
  try {
    const { assetId: rawAssetId } = await context.params;
    const assetIdResult = normalizedAssetIdSchema.safeParse(rawAssetId);

    if (!assetIdResult.success) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    try {
      const storedAsset = await fileStore.finalizeUpload({
        assetId: assetIdResult.data,
      });

      return NextResponse.json(storedFileAssetSchema.parse(storedAsset), {
        status: 200,
      });
    } catch {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Failed to finalize uploaded file asset", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
