import { NextResponse } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import {
  selectedFileSchema,
  uploadTargetSchema,
  type UploadTarget,
} from "@/lib/file-assets";
import { createLocalFileStore } from "@/server/file-store-local";

const createUploadRequestSchema = z.object({
  file: selectedFileSchema,
});

const fileStore = createLocalFileStore();

export async function POST(
  request: Request
): Promise<NextResponse<UploadTarget | { error: string }>> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const requestResult = createUploadRequestSchema.safeParse(body);
    if (!requestResult.success) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const uploadTarget = await fileStore.createUploadTarget({
      file: requestResult.data.file,
      ttlSeconds: config.sessionTtlSeconds,
    });

    return NextResponse.json(uploadTargetSchema.parse(uploadTarget), {
      status: 201,
    });
  } catch (error) {
    console.error("Failed to create upload target", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
