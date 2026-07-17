import { expect, test } from "@playwright/test";

const trackerRoute = "/profiles/profile-demo-001/tracker/sportsbook-bets";

test("Plum Duff branding is consistent across the public shell", async ({ page, request }) => {
  const apiSchema = await request.get("http://127.0.0.1:8010/openapi.json");
  expect(apiSchema.ok()).toBeTruthy();
  expect((await apiSchema.json()).info.title).toBe("Plum Duff API");
  const logoResponse = await request.get(
    "http://127.0.0.1:3010/brand/plum-duff-wordmark-cropped-v2.png",
  );
  expect(logoResponse.ok()).toBeTruthy();
  expect(logoResponse.headers()["content-type"]).toContain("image/png");

  for (const route of ["/login", "/profiles", trackerRoute]) {
    await page.goto(route);
    await expect(page).toHaveTitle("Plum Duff");
    await expect(page.locator(".brand-mark .brand-logo-mark")).toBeVisible();
    await expect(page.getByAltText("Plum Duff").first()).toBeVisible();
    await expect(page.getByText("Plum Duff", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("OpenForge", { exact: true })).toHaveCount(0);
  }

  await page.goto("/login");
  await expect(page.locator("main .brand-logo-full")).toBeVisible();
});
