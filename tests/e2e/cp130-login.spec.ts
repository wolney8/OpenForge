import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  for (const width of [1280, 390] as const) {
    test(`real Lab login presentation ${theme} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((value) => localStorage.setItem("openforge-theme", value), theme);
      await page.goto("/login?error=invalid_oauth_state&next=%2Fdesign-lab");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const card = page.locator('[data-pd-id="auth.login.panel"] section');
      await expect(card.getByRole("heading", { name: "Sign-in failed" })).toBeVisible();
      await expect(card.getByRole("alert")).toHaveText("Sign-in couldn't be completed. Please try again.");
      await expect(card.getByRole("link", { name: "Sign in with Google" })).toHaveAttribute(
        "href", "/api/auth/google/login?next=%2Fdesign-lab",
      );
      await expect(card.getByRole("link", { name: "Register for an account" })).toHaveAttribute("href", "/register");
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await card.getByRole("link", { name: "Sign in with Google" }).focus();
      await expect(card.getByRole("link", { name: "Sign in with Google" })).toHaveCSS("outline-style", "solid");
    });
  }
}

test("session expiry retains real sign-in and safe return path", async ({ page }) => {
  await page.goto("/login?error=session_expired&next=%2Fprofiles%2Fdemo");
  await expect(page.getByRole("heading", { name: "Session expired" })).toBeVisible();
  await expect(page.locator('[data-pd-id="auth.login.panel"]').getByRole("alert")).toHaveText("Your session ended. Sign in to continue.");
  await expect(page.getByRole("link", { name: "Sign in with Google" })).toHaveAttribute(
    "href", "/api/auth/google/login?next=%2Fprofiles%2Fdemo",
  );
});
