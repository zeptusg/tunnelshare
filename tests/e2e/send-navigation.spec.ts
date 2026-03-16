import { test, expect } from '@playwright/test';

test('user can navigate to send page from home', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /send/i }).click();

    await expect(page).toHaveURL(/\/send$/);
});