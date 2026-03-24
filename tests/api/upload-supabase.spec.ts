import { expect, test } from "@playwright/test";

test("supabase upload target accepts bytes and finalizes a stored asset", async ({
  request,
}) => {
  const fileContent = "supabase upload pipeline check";
  const fileSize = Buffer.byteLength(fileContent, "utf8");

  const createResponse = await request.post("/api/uploads", {
    data: {
      file: {
        name: "supabase-sample.txt",
        sizeBytes: fileSize,
        contentType: "text/plain",
      },
    },
  });

  expect(createResponse.status()).toBe(201);
  const uploadTarget = await createResponse.json();

  test.skip(
    new URL(uploadTarget.uploadUrl).hostname === "localhost",
    "Supabase storage driver is not active for this run."
  );

  expect(new URL(uploadTarget.uploadUrl).hostname).toContain("supabase");
  expect(uploadTarget.storageKey).toMatch(
    /^uploads\/[0-9a-f-]+\/supabase-sample\.txt$/i
  );

  const uploadResponse = await request.fetch(uploadTarget.uploadUrl, {
    method: uploadTarget.uploadMethod,
    headers: uploadTarget.headers,
    data: Buffer.from(fileContent, "utf8"),
  });

  expect(uploadResponse.status()).toBe(200);

  const finalizeResponse = await request.post(uploadTarget.completeUrl);
  expect(finalizeResponse.status()).toBe(200);

  const storedAsset = await finalizeResponse.json();
  expect(storedAsset).toMatchObject({
    id: uploadTarget.assetId,
    name: "supabase-sample.txt",
    sizeBytes: fileSize,
    contentType: "text/plain",
    storageKey: uploadTarget.storageKey,
  });
});
