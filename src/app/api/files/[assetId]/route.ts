import { NextResponse } from "next/server";
import { z } from "zod";
import { createFileStore } from "@/server/file-store-factory";

const normalizedAssetIdSchema = z.string().uuid("assetId must be a valid UUID");
const fileStore = createFileStore();

function getContentDisposition(filename: string): string {
  const safeFilename = filename.replace(/["\\]/g, "_");
  const encodedFilename = encodeURIComponent(filename);

  return `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`;
}

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
      const download = await fileStore.downloadStoredFile(asset);
      const responseBody = Buffer.from(download.body);

      // Downloads are streamed through the app so the filename and response
      // headers are consistent for local storage, Supabase, and future drivers.
      return new Response(responseBody, {
        status: 200,
        headers: {
          "content-type": "application/octet-stream",
          "content-length": String(
            download.contentLength ?? responseBody.byteLength
          ),
          "content-disposition": getContentDisposition(asset.name),
          "x-content-type-options": "nosniff",
        },
      });
    } catch {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Failed to resolve file download URL", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
