import { NextResponse } from "next/server";
import { z } from "zod";
import { storedFileAssetSchema } from "@/lib/file-assets";
import { createLocalFileStore, writeLocalUploadBytes } from "@/server/file-store-local";

const normalizedAssetIdSchema = z.string().uuid("assetId must be a valid UUID");

const fileStore = createLocalFileStore();

export async function PUT(
  request: Request,
  context: { params: Promise<{ assetId: string }> }
): Promise<NextResponse<ReturnType<typeof storedFileAssetSchema.parse> | { error: string }>> {
  try {
    const { assetId: rawAssetId } = await context.params;
    const assetIdResult = normalizedAssetIdSchema.safeParse(rawAssetId);

    if (!assetIdResult.success) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    try {
      const body = await request.arrayBuffer();
      const uploadBytes = new Uint8Array(body);

      await writeLocalUploadBytes(assetIdResult.data, uploadBytes);
      const storedAsset = await fileStore.finalizeUpload({ assetId: assetIdResult.data });

      return NextResponse.json(storedFileAssetSchema.parse(storedAsset), { status: 200 });
    } catch {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Failed to upload local file asset", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
