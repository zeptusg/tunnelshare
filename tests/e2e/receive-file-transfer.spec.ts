import { test, expect } from '@playwright/test';

test('receiver-first file transfer waits and becomes ready after sender upload', async ({ browser }) => {
    const receiverPage = await browser.newPage();
    const senderPage = await browser.newPage();

    await receiverPage.goto('/receive');
    await receiverPage.getByRole('button', { name: /start receive request/i }).click();

    await expect(receiverPage).toHaveURL(/\/receive\/[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    await expect(receiverPage.getByText(/waiting for sender/i)).toBeVisible();

    const code = receiverPage.url().split('/').pop()!;

    await senderPage.goto(`/send?code=${code}`);
    await senderPage.getByLabel(/select file/i).setInputFiles({
        name: 'receiver-file.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('receiver-first file upload'),
    });
    await senderPage.getByRole('button', { name: /^send$/i }).click();
    await expect(senderPage.getByLabel(/created transfer code/i)).toHaveText(code);

    await expect(receiverPage.getByText('receiver-file.txt')).toBeVisible();
    await expect(receiverPage.getByLabel('Preview receiver-file.txt')).toBeVisible();
    await expect(receiverPage.getByRole('button', { name: /^download$/i })).toBeVisible();

    await receiverPage.close();
    await senderPage.close();
});
