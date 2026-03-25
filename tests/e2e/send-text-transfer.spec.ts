import { test, expect } from '@playwright/test';

test('sender-first text transfer can be created from send page', async ({ page }) => {
    await page.goto('/send');

    const textMessage = 'hello from playwright';

    await page.getByLabel(/text to send/i).fill(textMessage);
    await page.getByRole('button', { name: /^send$/i }).click();

    const transferCode = page.getByLabel(/created transfer code/i);
    await expect(transferCode).toBeVisible();
    await expect(transferCode).toHaveText(/[A-Z0-9]{4}-[A-Z0-9]{4}/);
    const receiveLink = page.getByRole('link', { name: /receive\/[A-Z0-9]{4}-[A-Z0-9]{4}/i });
    await expect(receiveLink).toBeVisible();
    await expect(page.getByText(/expires at:/i)).toBeVisible();

    const receiveHref = await receiveLink.getAttribute('href');
    expect(receiveHref).toBeTruthy();
    await page.goto(receiveHref!);
    await expect(page.getByText(textMessage)).toBeVisible();
});

test('sender-first mixed transfer can include text and file together', async ({ page }) => {
    await page.goto('/send');

    const textMessage = 'mixed payload text';

    await page.getByLabel(/text to send/i).fill(textMessage);
    await page.getByLabel(/select file/i).setInputFiles([
        {
            name: 'mixed-file.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('mixed file upload'),
        },
        {
            name: 'mixed-file-2.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('mixed second file upload'),
        },
    ]);
    await page.getByRole('button', { name: /^send$/i }).click();

    const receiveLink = page.getByRole('link', { name: /receive\/[A-Z0-9]{4}-[A-Z0-9]{4}/i });
    await expect(receiveLink).toBeVisible();

    const receiveHref = await receiveLink.getAttribute('href');
    expect(receiveHref).toBeTruthy();
    await page.goto(receiveHref!);
    await expect(page.getByText(textMessage)).toBeVisible();
    await expect(page.getByText('mixed-file.txt')).toBeVisible();
    await expect(page.getByText('mixed-file-2.txt')).toBeVisible();
    await expect(page.getByRole('button', { name: /download all/i })).toBeVisible();
});
