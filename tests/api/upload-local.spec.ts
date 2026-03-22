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
  expect(uploadTarget.storageKey).toMatch(
    /^local\/[0-9a-f-]+\/sample\.txt$/i
  );
  expect(uploadTarget.uploadMethod).toBe("PUT");

  const uploadResponse = await request.fetch(uploadTarget.uploadUrl, {
    method: uploadTarget.uploadMethod,
    headers: uploadTarget.headers,
    data: Buffer.from(fileContent, "utf8"),
  });

  expect(uploadResponse.status()).toBe(200);
  const storedAsset = await uploadResponse.json();
  expect(storedAsset).toMatchObject({
    id: uploadTarget.assetId,
    name: "sample.txt",
    sizeBytes: fileSize,
    contentType: "text/plain",
    storageKey: uploadTarget.storageKey,
  });
});
