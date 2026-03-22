import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createLocalFileStore } from "@/server/file-store-local";

const normalizedAssetIdSchema = z.string().uuid("assetId must be a valid UUID");

const fileStore = createLocalFileStore();

async function getLocalMetadataPath(assetId: string): Promise<string> {
  return path.join(process.cwd(), ".tunnelshare", "uploads", "metadata", `${assetId}.json`);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ assetId: string }> }
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  try {
    const { assetId: rawAssetId } = await context.params;
    const assetIdResult = normalizedAssetIdSchema.safeParse(rawAssetId);

    if (!assetIdResult.success) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const metadataPath = await getLocalMetadataPath(assetIdResult.data);
    let metadataRaw: string;
    try {
      metadataRaw = await readFile(metadataPath, "utf8");
    } catch {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const metadata = JSON.parse(metadataRaw) as {
      uploadPath?: string;
    };

    if (typeof metadata.uploadPath !== "string" || metadata.uploadPath.length === 0) {
      return NextResponse.json({ error: "invalid_upload_target" }, { status: 400 });
    }

    const body = await request.arrayBuffer();
    const uploadBytes = Buffer.from(body);

    await mkdir(path.dirname(metadata.uploadPath), { recursive: true });
    await writeFile(metadata.uploadPath, uploadBytes);
    await fileStore.finalizeUpload({ assetId: assetIdResult.data });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to upload local file asset", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
