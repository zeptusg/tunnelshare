import { test, expect } from '@playwright/test';

test('user can receive a created text session by code', async ({ page }) => {
    await page.goto('/send');
    await page.getByLabel(/text to send/i).fill('hello from playwright');
    await page.getByRole('button', { name: /^send$/i }).click();

    const sessionCode = page.locator('p').filter({ hasText: /^[A-Z0-9]{4}-[A-Z0-9]{4}$/ });
    await expect(sessionCode).toBeVisible();
    const code = await sessionCode.textContent();

    await page.goto(`/receive/${code}`);
    await expect(page.getByText('hello from playwright')).toBeVisible();
});