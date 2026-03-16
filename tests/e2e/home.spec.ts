import { test, expect } from '@playwright/test';

test('home page shows Send and Receive links', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: /send/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /receive/i })).toBeVisible();
});