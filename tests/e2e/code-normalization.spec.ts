import { test, expect } from '@playwright/test';

test('manual lowercase code entry normalizes and retrieves transfer payload', async ({ page }) => {
    await page.goto('/send');
    await page.getByLabel(/text to send/i).fill('normalization check');
    await page.getByRole('button', { name: /^send$/i }).click();

    const transferCode = page.getByLabel(/created transfer code/i);
    await expect(transferCode).toBeVisible();

    const code = (await transferCode.textContent())!;
    const lowerCode = code.toLowerCase();

    await page.goto('/receive');
    await page.getByLabel(/transfer code/i).fill(lowerCode);
    await page.getByRole('button', { name: /use existing code/i }).click();

    await expect(page).toHaveURL(new RegExp(`/receive/${code}$`));
    await expect(page.getByText('normalization check')).toBeVisible();
});
