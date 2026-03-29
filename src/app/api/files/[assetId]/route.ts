import { NextResponse } from "next/server";
import { z } from "zod";
import { createFileStore } from "@/server/file-store-factory";
import { getStoredTransfer, getTransferCodeByAssetId } from "@/server/transfer-store";
import { isTransferAvailable } from "@/server/transfers";
import { transferSchema } from "@/lib/types";

const normalizedAssetIdSchema = z.string().uuid("assetId must be a valid UUID");
const dispositionSchema = z.enum(["attachment", "inline"]).catch("attachment");
const fileStore = createFileStore();

function getContentDisposition(
  filename: string,
  disposition: "attachment" | "inline"
): string {
  const safeFilename = filename.replace(/["\\]/g, "_");
  const encodedFilename = encodeURIComponent(filename);

  return `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ assetId: string }> }
): Promise<Response> {
  try {
    const { assetId: rawAssetId } = await context.params;
    const assetIdResult = normalizedAssetIdSchema.safeParse(rawAssetId);

    if (!assetIdResult.success) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    try {
      const transferCode = await getTransferCodeByAssetId(assetIdResult.data);

      if (!transferCode) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }

      const transferFromStore = await getStoredTransfer(transferCode);
      const transferResult = transferSchema.safeParse(transferFromStore);

      if (!transferResult.success || !isTransferAvailable(transferResult.data)) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }

      const fileIsReferencedByTransfer = (transferResult.data.payload?.files ?? []).some(
        (file) => file.id === assetIdResult.data
      );

      if (!fileIsReferencedByTransfer) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }

      const asset = await fileStore.getStoredFileAsset({
        assetId: assetIdResult.data,
      });
      const download = await fileStore.downloadStoredFile(asset);
      const responseBody = Buffer.from(download.body);
      const disposition = dispositionSchema.parse(
        new URL(request.url).searchParams.get("disposition")
      );

      // Downloads are streamed through the app so the filename and response
      // headers are consistent for local storage, Supabase, and future drivers.
      return new Response(responseBody, {
        status: 200,
        headers: {
          "content-type": download.contentType,
          "content-length": String(
            download.contentLength ?? responseBody.byteLength
          ),
          "content-disposition": getContentDisposition(asset.name, disposition),
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
