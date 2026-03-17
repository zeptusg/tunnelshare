import { test, expect } from '@playwright/test';

test('user sees unavailable state for invalid session code', async ({ page }) => {
    await page.goto('/receive/INVALID');

    await expect(page.getByText(/session unavailable/i)).toBeVisible();
});