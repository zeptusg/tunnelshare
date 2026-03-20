import { test, expect } from '@playwright/test';

test('user sees unavailable state for invalid transfer code', async ({ page }) => {
    await page.goto('/receive/INVALID');

    await expect(page.getByText(/transfer unavailable/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /try another code/i })).toBeVisible();
});
