import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const evidence = "data/private/evidence/cp117-visual-adoption/comparison";
const modules = [
  { path: "accounts", lab: "accounts", native: "accounts", heading: "Accounts" },
  { path: "sportsbook-bets", lab: "sportsbook", native: "sportsbook", heading: "Sportsbook Bets" },
  { path: "free-bets", lab: "freeBets", native: "free-bets", heading: "Free Bets" },
  { path: "casino-offers", lab: "casino", native: "casino-offers", heading: "Casino Offers" },
  { path: "each-way-extra-places", lab: "extraPlace", native: "extra-place", heading: "Extra Place" },
  { path: "cash-adjustments", lab: "cash", native: "cash-adjustments", heading: "Cash Adjustments" },
] as const;

test.use({ video: "on" });
test.afterEach(async ({ page }, info) => {
  const recording = page.video();
  if (!recording) return;
  await page.close();
  await mkdir(evidence, { recursive: true });
  await recording.saveAs(join(evidence, `six-ledger-${info.title.includes("390px") ? "390" : "900"}-${info.title.includes("dark") ? "dark" : "light"}.webm`));
});

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
  expect((await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } })).status()).toBe(200);
  await page.route(/\/profiles\/profile-demo-001\/tracker-settings$/, async route => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await route.fetch();
      if (response.ok()) {
        await route.fulfill({ response, json: { ...await response.json(), active_date_preset: "All Dates" } });
        return;
      }
      if (response.status() < 500 || attempt === 2) {
        throw new Error("Synthetic tracker-settings read failed with HTTP " + response.status());
      }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  });
});

for (const width of [900, 390] as const) for (const theme of ["light", "dark"] as const) {
  test(`six complete ledger pages at ${width}px ${theme}: approved Lab, owned and combined`, async ({ page }) => {
    test.setTimeout(180_000);
    await mkdir(evidence, { recursive: true });
    await page.setViewportSize({ width, height: 900 });
    const themePage = async () => page.evaluate(value => {
      localStorage.setItem("openforge-theme", value);
      document.documentElement.dataset.theme = value;
      document.documentElement.style.colorScheme = value;
    }, theme);
    for (const module of modules) {
      await page.goto("/design-lab");
      await expect(page.locator('[data-pd-id="design-lab-connected.root"]')).toBeVisible();
      const nav = page.getByRole("button", { name: "Open navigation" });
      if (await nav.isVisible()) await nav.click();
      await page.locator(`[data-pd-id="lab.nav.${module.lab}"]`).click();
      await expect(page.getByRole("heading", { name: module.heading, exact: true }).first()).toBeVisible();
      await themePage();
      await page.screenshot({ path: join(evidence, `lab-${module.path}-whole-${width}-${theme}.png`), fullPage: true });
      if (width === 390) {
        await page.getByRole("button", { name: "Show Labelled Details" }).click();
        await page.screenshot({ path: join(evidence, `lab-${module.path}-detail-${width}-${theme}.png`), fullPage: true });
      }

      await page.goto(`/profiles/profile-demo-001/tracker/${module.path}`);
      await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
      await expect(page.locator(`[data-pd-id="${module.native}.table-scroll"] tbody tr`).first()).toBeVisible();
      if (module.path !== "accounts") await expect(page.locator('[data-pd-id="tracker.range-card.select"]')).toBeEnabled({ timeout: 45_000 });
      if (module.path === "each-way-extra-places") await expect(page.getByRole("region", { name: "Extra Place quick view" })).toHaveAttribute("aria-busy", "false", { timeout: 45_000 });
      if (module.path === "accounts") await expect(page.locator('[data-pd-id="accounts.table-scroll"] tbody tr').first().getByRole("button", { name: /^(Edit|Review attention for) / }).locator('.material-symbols-outlined')).toHaveText("open_in_new");
      await themePage();
      await expect(page.getByRole("heading", { name: module.heading, exact: true }).first()).toBeVisible();
      await page.screenshot({ path: join(evidence, `v2-owned-${module.path}-whole-${width}-${theme}.png`), fullPage: true });

      await page.goto(`/tracker/${module.path}`);
      const combined = page.locator(`[data-pd-id="combined.${module.path}.table-scroll"]`);
      await expect(combined.locator("tbody tr").first()).toHaveCount(1);
      await themePage();
      await expect(page.getByRole("heading", { name: module.heading, exact: true }).first()).toBeVisible();
      await expect(page.locator(`[data-pd-id="combined.${module.path}.filters"]`)).toBeVisible();
      await expect(page.locator(`[data-pd-id="combined.${module.path}.columns"]`)).toBeVisible();
      await expect(combined.locator("thead th").last()).toHaveCSS("position", "sticky");
      if (width === 390 && module.path !== "accounts") {
        const range = page.locator('[data-pd-id="tracker.range-card.select"]');
        expect((await range.boundingBox())?.width ?? 0).toBeGreaterThan(220);
      }
      await page.screenshot({ path: join(evidence, `v2-combined-${module.path}-whole-${width}-${theme}.png`), fullPage: true });
      if (width === 390) {
        await expect(combined.locator("tbody tr").first()).toBeVisible();
        await page.getByRole("button", { name: "Show Labelled Details" }).click();
        await expect(page.locator(`[data-pd-id="combined.${module.path}.details"] article`).first()).toBeVisible();
        await page.screenshot({ path: join(evidence, `v2-combined-${module.path}-detail-${width}-${theme}.png`), fullPage: true });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
  });
}
