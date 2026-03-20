import { expect, test } from "@playwright/test";

test("receiver-first transfer create returns awaiting transfer with send url and no payload", async ({
  request,
}) => {
  const createResponse = await request.post("/api/transfers", {
    data: {
      intent: "receive",
    },
  });

  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();
  expect(created).toMatchObject({
    status: "awaiting_payload",
  });
  expect(created.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  expect(created.receiveUrl).toMatch(/\/receive\/[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  expect(created.sendUrl).toMatch(/\/send\?code=[A-Z0-9]{4}-[A-Z0-9]{4}$/);

  const getResponse = await request.get(`/api/transfers/${created.code}`);
  expect(getResponse.status()).toBe(200);

  const transfer = await getResponse.json();
  expect(transfer).toMatchObject({
    code: created.code,
    status: "awaiting_payload",
    sendUrl: created.sendUrl,
  });
  expect(transfer.payload).toBeUndefined();
});
