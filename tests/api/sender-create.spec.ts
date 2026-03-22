import { expect, test } from "@playwright/test";

test("sender-first transfer create returns ready transfer and can be fetched", async ({
  request,
}) => {
  const createResponse = await request.post("/api/transfers", {
    data: {
      payload: {
        text: "api sender-first coverage",
      },
    },
  });

  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();
  expect(created).toMatchObject({
    status: "ready",
  });
  expect(created.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  expect(created.receiveUrl).toMatch(/\/receive\/[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  expect(created.sendUrl).toBeUndefined();

  const getResponse = await request.get(`/api/transfers/${created.code.toLowerCase()}`);
  expect(getResponse.status()).toBe(200);

  const transfer = await getResponse.json();
  expect(transfer).toMatchObject({
    code: created.code,
    status: "ready",
    payload: {
      text: "api sender-first coverage",
    },
  });
  expect(transfer.sendUrl).toBeUndefined();
});

test("sender-first transfer create can resolve uploaded asset ids into file references", async ({
  request,
}) => {
  const fileContent = "sender-first file transfer";
  const fileSize = Buffer.byteLength(fileContent, "utf8");

  const uploadTargetResponse = await request.post("/api/uploads", {
    data: {
      file: {
        name: "sender-file.txt",
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

  const createResponse = await request.post("/api/transfers", {
    data: {
      payload: {
        uploadedAssetIds: [storedAsset.id],
      },
    },
  });

  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();
  expect(created).toMatchObject({
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
          name: "sender-file.txt",
          sizeBytes: fileSize,
          contentType: "text/plain",
          storageKey: storedAsset.storageKey,
        },
      ],
    },
  });
});
