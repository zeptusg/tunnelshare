import { NextResponse } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import {
  normalizeUploadContentType,
  selectedFileSchema,
  uploadTargetSchema,
  validateSelectedFileForUpload,
  type UploadTarget,
} from "@/lib/file-assets";
import { createFileStore } from "@/server/file-store-factory";

const createUploadRequestSchema = z.object({
  file: selectedFileSchema,
});

const fileStore = createFileStore();

export async function POST(
  request: Request
): Promise<
  NextResponse<
    | UploadTarget
    | {
        error: string;
        maxUploadFileBytes?: number;
      }
  >
> {
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

    const normalizedFile = {
      ...requestResult.data.file,
      contentType: normalizeUploadContentType(requestResult.data.file.contentType),
    };

    const fileValidation = validateSelectedFileForUpload(normalizedFile, {
      maxUploadFileBytes: config.maxUploadFileBytes,
    });

    if (!fileValidation.ok) {
      return NextResponse.json(
        {
          error: "file_too_large",
          maxUploadFileBytes: config.maxUploadFileBytes,
        },
        { status: 400 }
      );
    }

    const uploadTarget = await fileStore.createUploadTarget({
      file: normalizedFile,
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
