import { test, expect } from '@playwright/test';

test('user can receive a session even with lowercase code', async ({ page }) => {
    await page.goto('/send');
    await page.getByLabel(/text to send/i).fill('normalization check');
    await page.getByRole('button', { name: /^send$/i }).click();

    const sessionCode = page.locator('p').filter({ hasText: /^[A-Z0-9]{4}-[A-Z0-9]{4}$/ });
    await expect(sessionCode).toBeVisible();

    const code = (await sessionCode.textContent())!;
    const lowerCode = code.toLowerCase();

    await page.goto('/receive');
    await page.getByLabel(/session code/i).fill(lowerCode);
    await page.getByRole('button', { name: /receive/i }).click();

    await expect(page).toHaveURL(new RegExp(`/receive/${code}$`));
    await expect(page.getByText('normalization check')).toBeVisible();
});