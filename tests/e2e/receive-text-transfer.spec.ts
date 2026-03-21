import { test, expect } from '@playwright/test';

test('receiver-first text transfer waits and becomes ready after sender fulfillment', async ({ browser }) => {
    const receiverPage = await browser.newPage();
    const senderPage = await browser.newPage();
    const textMessage = 'hello from receiver-first flow';

    await receiverPage.goto('/receive');
    await receiverPage.getByRole('button', { name: /start receive request/i }).click();

    await expect(receiverPage).toHaveURL(/\/receive\/[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    await expect(receiverPage.getByText(/waiting for sender/i)).toBeVisible();
    await expect(receiverPage.getByRole('link', { name: /\/send\?code=/i })).toBeVisible();

    const code = receiverPage.url().split('/').pop()!;

    await senderPage.goto(`/send?code=${code}`);
    await senderPage.getByLabel(/text to send/i).fill(textMessage);
    await senderPage.getByRole('button', { name: /^send$/i }).click();
    await expect(senderPage.getByLabel(/created transfer code/i)).toHaveText(code);

    await expect(receiverPage.getByText(textMessage)).toBeVisible();

    await receiverPage.close();
    await senderPage.close();
});
