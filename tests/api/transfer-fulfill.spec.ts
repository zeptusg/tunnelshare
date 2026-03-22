import { expect, test } from "@playwright/test";

test("awaiting transfer can be fulfilled and becomes ready", async ({ request }) => {
  const createResponse = await request.post("/api/transfers", {
    data: {
      intent: "receive",
    },
  });
  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();

  const fulfillResponse = await request.post(`/api/transfers/${created.code}/payload`, {
    data: {
      payload: {
        text: "fulfilled through api test",
      },
    },
  });

  expect(fulfillResponse.status()).toBe(200);
  const fulfilled = await fulfillResponse.json();
  expect(fulfilled).toMatchObject({
    code: created.code,
    status: "ready",
  });

  const getResponse = await request.get(`/api/transfers/${created.code}`);
  expect(getResponse.status()).toBe(200);

  const transfer = await getResponse.json();
  expect(transfer).toMatchObject({
    code: created.code,
    status: "ready",
    payload: {
      text: "fulfilled through api test",
    },
  });
});

test("awaiting transfer can be fulfilled from uploaded asset ids", async ({
  request,
}) => {
  const fileContent = "receiver-first file fulfillment";
  const fileSize = Buffer.byteLength(fileContent, "utf8");

  const createResponse = await request.post("/api/transfers", {
    data: {
      intent: "receive",
    },
  });
  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();

  const uploadTargetResponse = await request.post("/api/uploads", {
    data: {
      file: {
        name: "receiver-file.txt",
        sizeBytes: fileSize,
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
  const storedAsset = await uploadResponse.json();

  const fulfillResponse = await request.post(`/api/transfers/${created.code}/payload`, {
    data: {
      payload: {
        uploadedAssetIds: [storedAsset.id],
      },
    },
  });

  expect(fulfillResponse.status()).toBe(200);
  const fulfilled = await fulfillResponse.json();
  expect(fulfilled).toMatchObject({
    code: created.code,
    status: "ready",
  });

  const getResponse = await request.get(`/api/transfers/${created.code}`);
  expect(getResponse.status()).toBe(200);
  const transfer = await getResponse.json();

  expect(transfer).toMatchObject({
    code: created.code,
    status: "ready",
    payload: {
      files: [
        {
          id: storedAsset.id,
          name: "receiver-file.txt",
          sizeBytes: fileSize,
          contentType: "text/plain",
          storageKey: storedAsset.storageKey,
        },
      ],
    },
  });
});
