import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const profileId = "profile-demo-001";
const evidence = path.resolve("data/private/evidence/cp082-owner-smoke-20261024");

test("cash readiness route activates the governed Needs attention view", async ({ page }) => {
  await fs.mkdir(evidence, { recursive: true });
  await page.route("**/api/auth/session", route => route.fulfill({ json: { authenticated: true, email: "synthetic@example.invalid", linked_profile_ids: [profileId], name: "Synthetic Owner", role: "fund_manager" } }));
  await page.route("**/api/auth/activity", route => route.fulfill({ status: 204 }));
  await page.route("**/api/auth/security-preference", route => route.fulfill({ json: { configured: false } }));
  await page.route(`**/api/profiles/${profileId}/accounts`, async (route) => {
    const response = await route.fetch();
    const rows = await response.json() as Array<Record<string, unknown>>;
    await route.fulfill({ json: rows.map((row, index) => ({
      ...row,
      current_balance: index === 0 ? "" : row.current_balance,
    })) });
  });
  await page.goto(`/profiles/${profileId}/tracker/accounts?view=issues&issue=needs-attention&source=dashboard`);
  await expect(page.getByRole("button", { name: /Needs attention/ })).toHaveAttribute("aria-pressed", "true");
  const rows = page.locator('[data-pd-id="accounts.filtered-results"] tbody tr');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Current Balance needs review");
  await expect(rows.first().getByRole("button", { name: /Review attention for/ })).toBeVisible();
  await page.screenshot({ path: path.join(evidence, "E-accounts-needs-attention.png"), fullPage: true });
  const geometry = await page.evaluate(() => ({ fits: document.documentElement.scrollWidth <= innerWidth + 1, scroll: document.documentElement.scrollWidth, viewport: innerWidth, offenders: [...document.querySelectorAll<HTMLElement>("body *")].filter(element => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map(element => ({ tag: element.tagName, className: element.className, id: element.id, right: element.getBoundingClientRect().right, width: element.getBoundingClientRect().width, display: getComputedStyle(element).display, grid: getComputedStyle(element).gridTemplateColumns })) }));
  expect(geometry, JSON.stringify(geometry)).toMatchObject({ fits: true });
});
