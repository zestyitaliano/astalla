import { test, expect } from '@playwright/test';

test('mock dashboard renders tiles and property detail', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Occupancy (Current)')).toBeVisible();
  await expect(page.getByText('Pipeline velocity')).toBeVisible();

  await page.getByRole('link', { name: /view property detail/i }).click();
  await expect(page).toHaveURL(/properties\/prop-1/);
  await expect(page.getByText('Pipeline Events')).toBeVisible();
  await expect(page.getByText('Reviews')).toBeVisible();
});
