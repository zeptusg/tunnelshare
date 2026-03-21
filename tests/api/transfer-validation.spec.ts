import { expect, test } from "@playwright/test";

const oversizedText = "x".repeat(51201);

test("create transfer rejects invalid request body", async ({ request }) => {
  const response = await request.post("/api/transfers", {
    data: {
      text: "legacy request body",
    },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: "invalid_request",
  });
});

test("create transfer rejects oversized text payload", async ({ request }) => {
  const response = await request.post("/api/transfers", {
    data: {
      payload: {
        text: oversizedText,
      },
    },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: "invalid_request",
  });
});

test("fulfill transfer rejects invalid request body", async ({ request }) => {
  const createResponse = await request.post("/api/transfers", {
    data: {
      intent: "receive",
    },
  });
  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();

  const fulfillResponse = await request.post(`/api/transfers/${created.code}/payload`, {
    data: {
      text: "legacy fulfill body",
    },
  });

  expect(fulfillResponse.status()).toBe(400);
  await expect(fulfillResponse.json()).resolves.toMatchObject({
    error: "invalid_request",
  });
});

test("fulfill transfer rejects oversized text payload", async ({ request }) => {
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
        text: oversizedText,
      },
    },
  });

  expect(fulfillResponse.status()).toBe(400);
  await expect(fulfillResponse.json()).resolves.toMatchObject({
    error: "invalid_request",
  });
});
