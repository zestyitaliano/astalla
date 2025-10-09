import { expect, test } from "@playwright/test";

test("user can log in and view property metrics", async ({ page }) => {
  await page.goto("/auth/signin");

  await page.fill('input[name="identifier"]', "demo@example.com");
  await page.fill('input[name="password"]', "password");
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByText(/property insights/i)).toBeVisible();

  await expect(page.getByTestId("metric-occupancy")).toContainText("%");

  await page.selectOption("#property-select", "prop-harbor");
  await expect(page.getByText(/Harbor Tower reviews/)).toBeVisible();
  await expect(page.getByTestId("metric-occupancy")).toContainText("%");
  await expect(page.getByTestId("metric-pipeline")).not.toContainText("--");
});
