import { expect, test } from "@playwright/test";

test("local upload target accepts bytes and returns stored file asset", async ({
  request,
}) => {
  const fileContent = "local upload pipeline check";
  const fileSize = Buffer.byteLength(fileContent, "utf8");

  const createResponse = await request.post("/api/uploads", {
    data: {
      file: {
        name: "sample.txt",
        sizeBytes: fileSize,
        contentType: "text/plain",
      },
    },
  });

  expect(createResponse.status()).toBe(201);
  const uploadTarget = await createResponse.json();
  expect(uploadTarget.assetId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
  expect(uploadTarget.uploadMethod).toBe("PUT");
  expect(uploadTarget.uploadUrl).toContain(
    `/api/uploads/local/${uploadTarget.assetId}`
  );
  expect(uploadTarget.completeUrl).toContain(
    `/api/uploads/${uploadTarget.assetId}/complete`
  );
  expect(uploadTarget.storageKey).toMatch(
    /^uploads\/[0-9a-f-]+\/sample\.txt$/i
  );

  const uploadResponse = await request.fetch(uploadTarget.uploadUrl, {
    method: uploadTarget.uploadMethod,
    headers: uploadTarget.headers,
    data: Buffer.from(fileContent, "utf8"),
  });

  expect(uploadResponse.status()).toBe(200);
  await expect(uploadResponse.json()).resolves.toMatchObject({ ok: true });

  const finalizeResponse = await request.post(uploadTarget.completeUrl);
  expect(finalizeResponse.status()).toBe(200);
  const storedAsset = await finalizeResponse.json();
  expect(storedAsset).toMatchObject({
    id: uploadTarget.assetId,
    name: "sample.txt",
    sizeBytes: fileSize,
    contentType: "text/plain",
    storageKey: uploadTarget.storageKey,
  });

  const downloadResponse = await request.get(`/api/files/${storedAsset.id}`);
  expect(downloadResponse.status()).toBe(200);
  expect(downloadResponse.headers()["content-disposition"]).toContain(
    'filename="sample.txt"'
  );
  expect(await downloadResponse.text()).toBe(fileContent);
});

test("upload target rejects files that exceed the configured size limit", async ({
  request,
}) => {
  const createResponse = await request.post("/api/uploads", {
    data: {
      file: {
        name: "too-large.txt",
        sizeBytes: 15 * 1024 * 1024 + 1,
        contentType: "text/plain",
      },
    },
  });

  expect(createResponse.status()).toBe(400);
  await expect(createResponse.json()).resolves.toMatchObject({
    error: "file_too_large",
    maxUploadFileBytes: 15 * 1024 * 1024,
  });
});

test("upload target accepts office document metadata", async ({ request }) => {
  const createResponse = await request.post("/api/uploads", {
    data: {
      file: {
        name: "report.docx",
        sizeBytes: 1024,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    },
  });

  expect(createResponse.status()).toBe(201);
  await expect(createResponse.json()).resolves.toMatchObject({
    uploadMethod: "PUT",
  });
});
