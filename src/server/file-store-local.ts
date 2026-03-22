import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { config } from "@/lib/config";
import { storedFileAssetSchema, uploadTargetSchema } from "@/lib/file-assets";
import type { StoredFileAsset, UploadTarget } from "@/lib/file-assets";
import type {
  CreateUploadTargetParams,
  DeleteStoredFileParams,
  FileStore,
  FinalizeUploadParams,
  GetStoredFileAssetParams,
} from "@/server/file-store";
import {
  createUploadTargetParamsSchema,
  deleteStoredFileParamsSchema,
  finalizeUploadParamsSchema,
  getStoredFileAssetParamsSchema,
} from "@/server/file-store";

const LOCAL_UPLOAD_ROOT = path.join(process.cwd(), ".tunnelshare", "uploads");

const localAssetRecordSchema = storedFileAssetSchema.extend({
  uploadPath: z.string().min(1, "uploadPath cannot be empty"),
  hasBytes: z.boolean(),
});
type LocalAssetRecord = z.infer<typeof localAssetRecordSchema>;

function sanitizeFileName(name: string): string {
  const baseName = path.basename(name).trim();
  return baseName.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
}

function getLocalUploadPath(storageKey: string): string {
  return path.join(LOCAL_UPLOAD_ROOT, ...storageKey.split("/"));
}

function getLocalAssetMetadataPath(assetId: string): string {
  return path.join(LOCAL_UPLOAD_ROOT, "metadata", `${assetId}.json`);
}

function getExpiresAtIso(ttlSeconds: number, now: Date): string {
  return new Date(now.getTime() + ttlSeconds * 1000).toISOString();
}

async function writeLocalAssetRecord(record: LocalAssetRecord): Promise<void> {
  const metadataPath = getLocalAssetMetadataPath(record.id);
  await mkdir(path.dirname(metadataPath), { recursive: true });
  await writeFile(metadataPath, JSON.stringify(record, null, 2), "utf8");
}

export async function readLocalAssetRecord(assetId: string): Promise<LocalAssetRecord> {
  const metadataPath = getLocalAssetMetadataPath(assetId);
  const raw = await readFile(metadataPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  return localAssetRecordSchema.parse(parsed) as LocalAssetRecord;
}

export async function writeLocalUploadBytes(
  assetId: string,
  bytes: Uint8Array
): Promise<void> {
  const record = await readLocalAssetRecord(assetId);
  await mkdir(path.dirname(record.uploadPath), { recursive: true });
  await writeFile(record.uploadPath, bytes);
}

export async function readLocalUploadBytes(assetId: string): Promise<Uint8Array> {
  const record = await readLocalAssetRecord(assetId);
  const fileBytes = await readFile(record.uploadPath);
  return new Uint8Array(fileBytes);
}

function buildStoredFileAsset(record: LocalAssetRecord): StoredFileAsset {
  return storedFileAssetSchema.parse({
    id: record.id,
    name: record.name,
    sizeBytes: record.sizeBytes,
    contentType: record.contentType,
    storageKey: record.storageKey,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  });
}

// This adapter is intentionally local-development oriented. It keeps the same
// interface a cloud/object-storage adapter will use later, but persists bytes
// and metadata in a project-local folder.
export function createLocalFileStore(): FileStore {
  return {
    async createUploadTarget(params: CreateUploadTargetParams): Promise<UploadTarget> {
      const { file, ttlSeconds, now = new Date() } =
        createUploadTargetParamsSchema.parse(params);

      const assetId = randomUUID();
      const storageKey = `local/${assetId}/${sanitizeFileName(file.name)}`;
      const uploadPath = getLocalUploadPath(storageKey);
      const createdAt = now.toISOString();
      const expiresAt = getExpiresAtIso(ttlSeconds, now);

      await mkdir(path.dirname(uploadPath), { recursive: true });

      await writeLocalAssetRecord({
        id: assetId,
        name: file.name,
        sizeBytes: file.sizeBytes,
        contentType: file.contentType,
        storageKey,
        createdAt,
        expiresAt,
        uploadPath,
        hasBytes: false,
      });

      return uploadTargetSchema.parse({
        assetId,
        storageKey,
        uploadUrl: new URL(`/api/uploads/local/${assetId}`, config.appUrl).toString(),
        uploadMethod: "PUT",
        headers: {
          "content-type": file.contentType,
        },
        expiresAt,
      });
    },

    async finalizeUpload(params: FinalizeUploadParams): Promise<StoredFileAsset> {
      const { assetId } = finalizeUploadParamsSchema.parse(params);
      const record = await readLocalAssetRecord(assetId);
      const fileStats = await stat(record.uploadPath);

      if (!fileStats.isFile()) {
        throw new Error(`Uploaded asset "${assetId}" is not a file`);
      }

      if (fileStats.size !== record.sizeBytes) {
        throw new Error(
          `Uploaded asset "${assetId}" size mismatch: expected ${record.sizeBytes}, received ${fileStats.size}`
        );
      }

      if (!record.hasBytes) {
        await writeLocalAssetRecord({
          ...record,
          hasBytes: true,
        });
      }

      return buildStoredFileAsset(record);
    },

    async getStoredFileAsset(
      params: GetStoredFileAssetParams
    ): Promise<StoredFileAsset> {
      const { assetId } = getStoredFileAssetParamsSchema.parse(params);
      const record = await readLocalAssetRecord(assetId);
      return buildStoredFileAsset(record);
    },

    async getDownloadUrl(asset: StoredFileAsset): Promise<string> {
      return new URL(`/api/files/local/${asset.id}`, config.appUrl).toString();
    },

    async deleteStoredFile(params: DeleteStoredFileParams): Promise<void> {
      const { storageKey } = deleteStoredFileParamsSchema.parse(params);
      const uploadPath = getLocalUploadPath(storageKey);
      const pathParts = storageKey.split("/");
      const assetId = pathParts[1];

      await rm(uploadPath, { force: true });

      if (assetId) {
        await rm(getLocalAssetMetadataPath(assetId), { force: true });
      }
    },
  };
}
