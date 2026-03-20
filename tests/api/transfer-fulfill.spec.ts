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
        type: "text",
        content: "fulfilled through api test",
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
      type: "text",
      content: "fulfilled through api test",
    },
  });
});
