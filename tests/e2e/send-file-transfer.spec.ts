import { test, expect } from '@playwright/test';

test('sender-first file transfer can be created from send page', async ({ page }) => {
    await page.goto('/send');

    await page.getByLabel(/select file/i).setInputFiles({
        name: 'playwright-file.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('playwright file upload'),
    });
    await page.getByRole('button', { name: /^send$/i }).click();

    const receiveLink = page.getByRole('link', { name: /receive\/[A-Z0-9]{4}-[A-Z0-9]{4}/i });
    await expect(receiveLink).toBeVisible();

    await receiveLink.click();
    await expect(page.getByText('playwright-file.txt')).toBeVisible();
});
