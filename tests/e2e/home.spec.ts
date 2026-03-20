import { test, expect } from '@playwright/test';

test('home page exposes direct send, receive, and manual code entry actions', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /tunnelshare/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^send/i })).toBeVisible();
    await expect(page.getByText(/to another device/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^receive/i })).toBeVisible();
    await expect(page.getByText(/on this device/i)).toBeVisible();
    await expect(page.getByText(/manual entry/i)).toBeVisible();
    await expect(page.getByText(/enter existing code/i)).toBeVisible();
    await expect(page.getByLabel(/existing transfer code/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /use existing code/i })).toBeVisible();
});
