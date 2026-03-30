import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import "../helpers/load-test-env";
import { generateCode } from "@/lib/code";
import { config } from "@/lib/config";
import type { FileReference } from "@/lib/types";
import { closeRedis } from "@/lib/redis";
import {
  saveTransfer,
  saveTransferFileReference,
} from "@/server/transfer-store";
import { createReadyTransfer } from "@/server/transfers";

async function createStoredTextAsset(
  request: APIRequestContext,
  fileName: string,
  fileContent: string
): Promise<{
  id: string;
  storageKey: string;
  sizeBytes: number;
}> {
  const sizeBytes = Buffer.byteLength(fileContent, "utf8");

  const uploadTargetResponse = await request.post("/api/uploads", {
    data: {
      file: {
        name: fileName,
        sizeBytes,
        contentType: "text/plain",
      },
    },
  });
  expect(uploadTargetResponse.status()).toBe(201);
  const uploadTarget = await uploadTargetResponse.json();

  const uploadResponse = await request.fetch(uploadTarget.uploadUrl, {
    method: uploadTarget.uploadMethod,
    headers: uploadTarget.headers,
    data: Buffer.from(fileContent, "utf8"),
  });
  expect(uploadResponse.status()).toBe(200);

  const finalizeResponse = await request.post(uploadTarget.completeUrl);
  expect(finalizeResponse.status()).toBe(200);

  const storedAsset = await finalizeResponse.json();
  return {
    id: storedAsset.id,
    storageKey: storedAsset.storageKey,
    sizeBytes,
  };
}

function createExpiredReadyTransfer(params: {
  code: string;
  receiveUrl: string;
  files?: FileReference[];
  text?: string;
}) {
  return createReadyTransfer({
    code: params.code,
    ttlSeconds: 60,
    receiveUrl: params.receiveUrl,
    now: new Date(Date.now() - 2 * 60 * 1000),
    payload: {
      text: params.text,
      files: params.files,
    },
  });
}

test.afterAll(async () => {
  await closeRedis();
});

test("ready transfers and their files stay accessible until expiry", async ({
  request,
}) => {
  const fileContent = "lifecycle multi-read file";
  const storedAsset = await createStoredTextAsset(
    request,
    "lifecycle-ready.txt",
    fileContent
  );

  const createResponse = await request.post("/api/transfers", {
    data: {
      payload: {
        text: "lifecycle ready text",
        uploadedAssetIds: [storedAsset.id],
      },
    },
  });
  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();

  const firstTransferResponse = await request.get(`/api/transfers/${created.code}`);
  expect(firstTransferResponse.status()).toBe(200);
  await expect(firstTransferResponse.json()).resolves.toMatchObject({
    code: created.code,
    status: "ready",
    payload: {
      text: "lifecycle ready text",
      files: [{ id: storedAsset.id }],
    },
  });

  const secondTransferResponse = await request.get(`/api/transfers/${created.code}`);
  expect(secondTransferResponse.status()).toBe(200);
  await expect(secondTransferResponse.json()).resolves.toMatchObject({
    code: created.code,
    status: "ready",
    payload: {
      text: "lifecycle ready text",
      files: [{ id: storedAsset.id }],
    },
  });

  const firstDownloadResponse = await request.get(`/api/files/${storedAsset.id}`);
  expect(firstDownloadResponse.status()).toBe(200);
  expect(await firstDownloadResponse.text()).toBe(fileContent);

  const secondDownloadResponse = await request.get(`/api/files/${storedAsset.id}`);
  expect(secondDownloadResponse.status()).toBe(200);
  expect(await secondDownloadResponse.text()).toBe(fileContent);
});

test("expired transfers and their files are unavailable even if records still exist", async ({
  request,
}) => {
  const code = generateCode();
  const receiveUrl = new URL(`/receive/${code}`, config.appUrl).toString();
  const fileContent = "expired lifecycle file";
  const storedAsset = await createStoredTextAsset(
    request,
    `expired-${randomUUID()}.txt`,
    fileContent
  );

  const fileReference: FileReference = {
    id: storedAsset.id,
    name: "expired-lifecycle.txt",
    sizeBytes: storedAsset.sizeBytes,
    contentType: "text/plain",
    storageKey: storedAsset.storageKey,
  };
  const expiredTransfer = createExpiredReadyTransfer({
    code,
    receiveUrl,
    text: "expired lifecycle text",
    files: [fileReference],
  });

  await saveTransfer(expiredTransfer, 60);
  await saveTransferFileReference(storedAsset.id, code, 60);

  const transferResponse = await request.get(`/api/transfers/${code}`);
  expect(transferResponse.status()).toBe(404);
  await expect(transferResponse.json()).resolves.toMatchObject({
    error: "not_found",
  });

  const fileResponse = await request.get(`/api/files/${storedAsset.id}`);
  expect(fileResponse.status()).toBe(404);
  await expect(fileResponse.json()).resolves.toMatchObject({
    error: "not_found",
  });
});
