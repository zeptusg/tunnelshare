import { expect, test } from "@playwright/test";

test("ready transfer cannot be fulfilled again", async ({ request }) => {
  const createResponse = await request.post("/api/transfers", {
    data: {
      payload: {
        type: "text",
        content: "already ready",
      },
    },
  });
  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();

  const fulfillResponse = await request.post(`/api/transfers/${created.code}/payload`, {
    data: {
      payload: {
        type: "text",
        content: "second payload should fail",
      },
    },
  });

  expect(fulfillResponse.status()).toBe(409);
  await expect(fulfillResponse.json()).resolves.toMatchObject({
    error: "invalid_transfer_state",
  });
});

test("missing transfer cannot be fulfilled", async ({ request }) => {
  const fulfillResponse = await request.post("/api/transfers/ABCD-EFGH/payload", {
    data: {
      payload: {
        type: "text",
        content: "missing transfer",
      },
    },
  });

  expect(fulfillResponse.status()).toBe(404);
  await expect(fulfillResponse.json()).resolves.toMatchObject({
    error: "not_found",
  });
});
