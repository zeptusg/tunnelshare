import { test, expect } from '@playwright/test';

test('sender-first transfer can be created from send page', async ({ page }) => {
    await page.goto('/send');

    await page.getByLabel(/text to send/i).fill('hello from playwright');
    await page.getByRole('button', { name: /^send$/i }).click();

    const transferCode = page.getByLabel(/created transfer code/i);
    await expect(transferCode).toBeVisible();
    await expect(transferCode).toHaveText(/[A-Z0-9]{4}-[A-Z0-9]{4}/);
    await expect(page.getByRole('link', { name: /receive\/[A-Z0-9]{4}-[A-Z0-9]{4}/i })).toBeVisible();
    await expect(page.getByText(/expires at:/i)).toBeVisible();
});
