import { expect, test } from "@playwright/test";

test("sender-first transfer create returns ready transfer and can be fetched", async ({
  request,
}) => {
  const createResponse = await request.post("/api/transfers", {
    data: {
      payload: {
        type: "text",
        content: "api sender-first coverage",
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
      type: "text",
      content: "api sender-first coverage",
    },
  });
  expect(transfer.sendUrl).toBeUndefined();
});
