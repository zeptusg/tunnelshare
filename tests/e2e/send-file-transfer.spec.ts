import { test, expect } from '@playwright/test';

test('sender-first file transfer can be created from send page', async ({ page }) => {
    await page.goto('/send');

    await page.getByLabel(/select file/i).setInputFiles({
        name: 'playwright-file.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('playwright file upload'),
    });
    await page.getByRole('button', { name: /^send$/i }).click();

    await expect(
        page.getByText(/queued|uploading \d+%|uploaded/i)
    ).toBeVisible();

    const receiveLink = page.getByRole('link', { name: /receive\/[A-Z0-9]{4}-[A-Z0-9]{4}/i });
    await expect(receiveLink).toBeVisible();

    const receiveHref = await receiveLink.getAttribute('href');
    expect(receiveHref).toBeTruthy();
    await page.goto(receiveHref!);
    await expect(page.getByText('playwright-file.txt')).toBeVisible();
    await expect(page.getByLabel('Preview playwright-file.txt')).toBeVisible();
    await expect(page.getByRole('button', { name: /^download$/i })).toBeVisible();
});

test('oversized file is rejected before entering the sender draft list', async ({ page }) => {
    await page.goto('/send');

    await page.getByLabel(/select file/i).setInputFiles({
        name: 'too-large.bin',
        mimeType: 'application/octet-stream',
        buffer: Buffer.alloc(15 * 1024 * 1024 + 1, 1),
    });

    await expect(
        page.getByText(/too-large\.bin is too large\. Keep each file under 15 MB\./i)
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /remove too-large\.bin/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /retry too-large\.bin/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^send$/i })).toBeDisabled();
});
