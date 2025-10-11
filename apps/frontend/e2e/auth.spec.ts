import { expect, test } from "@playwright/test";

const SHOULD_RUN = process.env.CI === "true" || process.env.NEXTAUTH_E2E === "true";

test.describe("NextAuth credentials flow", () => {
  test.skip(!SHOULD_RUN, "Set NEXTAUTH_E2E=true to run the credentials smoke test locally.");

  test("signs in and exposes session claims", async ({ page, request, context }) => {
    const identifier = process.env.ADMIN_TEST_LOGIN_EMAIL || "admin@astalla.com";
    const password = process.env.ADMIN_TEST_LOGIN_PASSWORD || "Astalla2025!";

    await page.goto("/auth/signin");

    await page.fill('input[name="identifier"]', identifier);
    await page.fill('input[name="password"]', password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("**/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);

    const sessionResponse = await request.get("/api/auth/session");
    expect(sessionResponse.ok()).toBeTruthy();

    const session = (await sessionResponse.json()) as Record<string, unknown>;
    expect(typeof session).toBe("object");
    expect(typeof session.accessToken).toBe("string");

    const user = session.user as Record<string, unknown> | undefined;
    expect(user).toBeTruthy();
    expect(user?.email).toBe(identifier.toLowerCase());
    expect(typeof user?.role === "string" || user?.role === null || user?.role === undefined).toBeTruthy();

    const cookies = await context.cookies();
    expect(cookies.some((cookie) => cookie.name.startsWith("next-auth.session-token"))).toBeTruthy();
  });
});
