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

    await receiveLink.click();
    await expect(page.getByText(textMessage)).toBeVisible();
});
