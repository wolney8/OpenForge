import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const evidence = "data/private/evidence/cp117-visual-adoption/comparison";
const profile = "/profiles/profile-demo-001/tracker";
const routes = [
  { name: "position", lab: "Position", path: "/", heading: "Position" },
  { name: "today", lab: "Today", path: "/tasks", heading: "Today" },
  { name: "reports", lab: "Reports", path: "/reports", heading: "Reports" },
  { name: "accounts", lab: "Accounts", path: `${profile}/accounts`, heading: "Accounts" },
  { name: "sportsbook", lab: "Sportsbook Bets", path: `${profile}/sportsbook-bets`, heading: "Sportsbook Bets" },
] as const;

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((value) => { document.documentElement.dataset.theme = value; document.documentElement.style.colorScheme = value; }, theme);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await page.waitForTimeout(250); // Allow the established 160 ms surface transition to settle.
}

async function noPageOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  const session = await (await page.request.get("/api/auth/session")).json();
  expect(session.email).toBe("demo@example.invalid");
});

for (const route of routes) {
  for (const width of [1440, 390] as const) {
    for (const theme of ["light", "dark"] as const) {
      test(`${route.name} ${width} ${theme}: Lab versus integrated V2`, async ({ page }) => {
        await mkdir(evidence, { recursive: true });
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/design-lab");
        await page.locator('[data-pd-id="design-lab-connected.root"]').waitFor();
        const cookie = page.getByRole("button", { name: "Understood" });
        if (await cookie.isVisible()) await cookie.click();
        if (route.lab !== "Position") {
          if (width < 761) await page.getByRole("button", { name: "Open navigation" }).click();
          await page.getByRole("button", { name: route.lab, exact: true }).first().click();
        }
        await expect(page.getByRole("heading", { name: route.heading, exact: true }).first()).toBeVisible();
        await setTheme(page, theme);
        await noPageOverflow(page);
        const labPositionStyle = route.name === "position" ? await page.locator('[data-pd-id="lab.metrics"]').evaluate((element) => {
          const item = element.firstElementChild!;
          const label = item.querySelector("span")!;
          return {
            className: element.className,
            radius: getComputedStyle(element).borderRadius,
            padding: getComputedStyle(item).padding,
            labelSize: getComputedStyle(label).fontSize,
          };
        }) : null;
        const labTodayRowStyle = route.name === "today" ? await page.locator('[data-pd-id^="lab.task."]').first().evaluate((element) => ({
          className: element.className.split(" ")[0],
          fontFamily: getComputedStyle(element).fontFamily,
          fontSize: getComputedStyle(element).fontSize,
          padding: getComputedStyle(element).padding,
          minimumHeight: getComputedStyle(element).minHeight,
        })) : null;
        await page.screenshot({ path: join(evidence, `lab-${route.name}-${width}-${theme}.png`), fullPage: true });

        await page.goto(route.path);
        await expect(page.getByRole("heading", { name: route.heading, exact: true }).first()).toBeVisible();
        if (route.name === "position" || route.name === "reports") {
          await expect(page.locator(`[data-pd-id="${route.name}.overview"]`)).toBeVisible();
          await expect(page.locator(`[data-pd-id="${route.name}.metrics"]`)).not.toContainText(/Loading|Updating/, { timeout: 45_000 });
          await page.locator('[data-pd-id="combined-reporting.loading"]').waitFor({ state: "hidden" });
        } else if (route.name === "accounts" || route.name === "sportsbook") {
          await page.locator(".ledger-loading-overlay").first().waitFor({ state: "hidden" });
        } else if (route.name === "today") {
          await page.locator('[data-pd-id="tasks.loading-shell"]').waitFor({ state: "hidden", timeout: 45_000 });
        }
        await setTheme(page, theme);
        await noPageOverflow(page);
        await page.screenshot({ path: join(evidence, `v2-${route.name}-${width}-${theme}.png`), fullPage: true });

        if (route.name === "position") {
          await expect(page.locator('[data-pd-id="position.metrics"] > div')).toHaveCount(3);
          const realPositionStyle = await page.locator('[data-pd-id="position.metrics"]').evaluate((element) => {
            const item = element.firstElementChild!;
            const label = item.querySelector("span")!;
            return {
              className: element.className,
              radius: getComputedStyle(element).borderRadius,
              padding: getComputedStyle(item).padding,
              labelSize: getComputedStyle(label).fontSize,
            };
          });
          expect(realPositionStyle).toEqual(labPositionStyle);
          await expect(page.locator(".v2-position-table tbody tr")).toHaveCount(2);
          await page.locator(".v2-position-detail > summary").click();
          await expect(page.locator('[data-pd-id="reports.profile-performance"]')).toBeVisible();
        }
        if (route.name === "reports") {
          await expect(page.locator('[data-pd-id="reports.explorer"]')).toBeVisible();
          await page.locator(".v2-position-detail > summary").click();
          const source = page.locator('[data-pd-id="reports.period-pnl.records"]');
          if (await source.count()) await expect(source).toHaveCSS("position", "static");
        }
        if (route.name === "today") {
          const realTodayRowStyle = await page.locator('[data-pd-id^="tasks.v2.row."]').first().evaluate((element) => ({
            className: element.className.split(" ")[0],
            fontFamily: getComputedStyle(element).fontFamily,
            fontSize: getComputedStyle(element).fontSize,
            padding: getComputedStyle(element).padding,
            minimumHeight: getComputedStyle(element).minHeight,
          }));
          expect(realTodayRowStyle).toEqual(labTodayRowStyle);
        }
      });
    }
  }
}

test("Sportsbook floating and full editor use the integrated V2 surfaces", async ({ page }) => {
  await mkdir(evidence, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  const range = await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } });
  expect(range.status()).toBe(200);
  await page.goto(`${profile}/sportsbook-bets`);
  await page.locator(".ledger-loading-overlay").first().waitFor({ state: "hidden" });
  await setTheme(page, "light");
  const cell = page.locator('td[data-ledger-row="CP117-CELL-001"][data-ledger-column="event_name"]');
  await expect(cell).toBeVisible();
  await cell.click();
  await page.keyboard.press("F2");
  const floating = page.locator('[data-pd-id="ledger.floating-editor"]');
  await expect(floating).toBeVisible();
  await noPageOverflow(page);
  await page.screenshot({ path: join(evidence, "v2-sportsbook-floating-1440-light.png"), fullPage: true });
  await floating.getByRole("button", { name: "Open full editor" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await noPageOverflow(page);
  await page.screenshot({ path: join(evidence, "v2-sportsbook-full-editor-1440-light.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 900 });
  await setTheme(page, "dark");
  const bounds = await dialog.boundingBox();
  expect(bounds).toBeTruthy();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await noPageOverflow(page);
  await page.screenshot({ path: join(evidence, "v2-sportsbook-full-editor-390-dark.png"), fullPage: true });
});

const integratedRoutes = [
  { name: "free-bets", path: `${profile}/free-bets` },
  { name: "casino-offers", path: `${profile}/casino-offers` },
  { name: "extra-place", path: `${profile}/each-way-extra-places` },
  { name: "cash-adjustments", path: `${profile}/cash-adjustments` },
  { name: "notifications", path: "/notifications" },
  { name: "profiles", path: "/profiles" },
  { name: "settings", path: "/settings" },
  { name: "profit-tracker", path: `${profile}/profit-tracker` },
  { name: "calculators", path: "/fund-manager/calculators" },
  { name: "oddsmatcher", path: "/oddsmatcher" },
] as const;
for (const route of integratedRoutes) {
  for (const width of [1440, 390] as const) {
    for (const theme of ["light", "dark"] as const) {
      test(`${route.name} ${width} ${theme}: integrated route presentation`, async ({ page }) => {
        await mkdir(evidence, { recursive: true });
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route.path);
        await page.locator("main").first().waitFor();
        if (route.name === "profiles") {
          await expect(page.locator('[data-pd-id="profiles.directory.panel"]')).toBeVisible({ timeout: 45_000 });
          await expect(page.locator('[data-pd-id="profiles.directory.panel"] .stat-strip')).not.toContainText(/Loading|Updating/, { timeout: 45_000 });
        }
        if (route.name === "settings") {
          await expect(page.locator('[data-pd-id="account-catalogue.section"]')).toHaveAttribute("aria-busy", "false", { timeout: 45_000 });
        }
        if (route.name === "notifications") {
          await page.locator('[data-pd-id="notifications.history.loading-shell"]').waitFor({ state: "hidden", timeout: 45_000 });
        }
        await setTheme(page, theme);
        await page.waitForTimeout(400);
        await noPageOverflow(page);
        await page.screenshot({ path: join(evidence, `v2-${route.name}-${width}-${theme}.png`), fullPage: true });
      });
    }
  }
}

test("Reports uses governed integrated points and source drilldown", async ({ page }) => {
  await mkdir(evidence, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/reports");
  await expect(page.locator('[data-pd-id="reports.explorer"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="reports.metrics"]')).not.toContainText(/Loading|Updating/, { timeout: 45_000 });
  await setTheme(page, "light");
  const explorer = page.locator('[data-pd-id="reports.explorer"]');
  await explorer.getByRole("button", { name: "Custom", exact: true }).click();
  await explorer.getByLabel("Explorer start").fill("2025-01-01");
  await explorer.getByLabel("Explorer end").fill("2026-12-31");
  await expect(explorer.locator('[data-pd-id="reports.explorer.total"]')).not.toContainText(/Loading|Unavailable/);
  await page.screenshot({ path: join(evidence, "v2-reports-real-points-1440-light.png"), fullPage: true });
  await explorer.locator(".v2-report-source-detail > summary").click();
  await expect(explorer.locator('[data-pd-id="reports.explorer.sources"]')).toBeVisible();
  await noPageOverflow(page);
});
