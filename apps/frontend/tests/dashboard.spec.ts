import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('shows metrics and navigates to property detail', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Use mock account' }).click();
    await page.waitForURL('**/dashboard');

    await expect(page.getByText('Occupancy')).toBeVisible();
    await expect(page.getByText('Pipeline velocity')).toBeVisible();

    await page.getByRole('link', { name: 'Weekly Report' }).click();
    await page.waitForURL('**/reports/weekly');
    await expect(page.getByText('Weekly report')).toBeVisible();
  });
});
