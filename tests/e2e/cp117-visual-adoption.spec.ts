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
const ledgerSearchRoutes = [
  { key: "accounts", lab: "Accounts", path: `${profile}/accounts` },
  { key: "sportsbook", lab: "Sportsbook Bets", path: `${profile}/sportsbook-bets` },
  { key: "free-bets", lab: "Free Bets", path: `${profile}/free-bets`, labKey: "freeBets" },
  { key: "casino-offers", lab: "Casino Offers", path: `${profile}/casino-offers`, labKey: "casino" },
  { key: "extra-place", lab: "Extra Place", path: `${profile}/each-way-extra-places`, labKey: "extraPlace" },
  { key: "cash-adjustments", lab: "Cash Adjustments", path: `${profile}/cash-adjustments`, labKey: "cash" },
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
        const labTodayRowStyle = route.name === "today" ? await page.locator('[data-pd-id^="lab.task."]:not([class*="urgent"])').first().evaluate((element) => ({
          className: element.className.split(" ")[0],
          fontFamily: getComputedStyle(element).fontFamily,
          fontSize: getComputedStyle(element).fontSize,
          padding: getComputedStyle(element).padding,
          minimumHeight: getComputedStyle(element).minHeight,
        })) : null;
        const labTodayCollectionStyle = route.name === "today" ? await page.locator('[aria-label="Needs Action"]').first().evaluate((element) => ({
          className: element.className,
          radius: getComputedStyle(element).borderRadius,
          padding: getComputedStyle(element).padding,
        })) : null;
        await page.screenshot({ path: join(evidence, `lab-${route.name}-${width}-${theme}.png`), fullPage: true });
        if (route.name === "today") {
          await page.locator('[data-pd-id="lab.today.layout"]').getByRole("button", { name: "Board" }).click();
          await expect(page.locator('[data-pd-id="lab.today.board"]')).toBeVisible();
          await page.screenshot({ path: join(evidence, `lab-today-board-${width}-${theme}.png`), fullPage: true });
        }

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
          const cashPresentation = await page.locator('[data-pd-id="position.metrics.cash"]').evaluate((element) => {
            const label = element.querySelector("span")!;
            const value = element.querySelector(".financial-value-canonical-text")!;
            return { labelColor: getComputedStyle(label).color, valueColor: getComputedStyle(value).color, valueSize: parseFloat(getComputedStyle(value).fontSize) };
          });
          expect(cashPresentation.valueSize).toBeGreaterThanOrEqual(28);
          expect(cashPresentation.valueColor).not.toBe(cashPresentation.labelColor);
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
          const realTodayRowStyle = await page.locator('[data-pd-id^="tasks.v2.row."]:not([class*="urgent"])').first().evaluate((element) => ({
            className: element.className.split(" ")[0],
            fontFamily: getComputedStyle(element).fontFamily,
            fontSize: getComputedStyle(element).fontSize,
            padding: getComputedStyle(element).padding,
            minimumHeight: getComputedStyle(element).minHeight,
          }));
          expect(realTodayRowStyle).toEqual(labTodayRowStyle);
          const realCollectionStyle = await page.locator('[data-pd-id="tasks.v2.collection"]').evaluate((element) => ({
            className: element.className,
            radius: getComputedStyle(element).borderRadius,
            padding: getComputedStyle(element).padding,
          }));
          expect(realCollectionStyle).toEqual(labTodayCollectionStyle);
          await page.locator('[data-pd-id="tasks.v2.layout-toggle"]').getByRole("button", { name: "Board" }).click();
          const board = page.locator('[data-pd-id="tasks.v2.board"]');
          await expect(board).toBeVisible();
          await expect(board).toHaveAttribute("aria-label", "Task Board");
          await expect(board.locator("section")).toHaveCount(3);
          await page.screenshot({ path: join(evidence, `v2-today-board-${width}-${theme}.png`), fullPage: true });
          await board.locator('[data-pd-id^="tasks.v2.row."]').first().click();
          const inspector = page.locator('[data-pd-id="tasks.v2.inspector"]');
          await expect(inspector).toBeVisible();
          await expect(inspector.getByRole("link", { name: "Open Source" })).toBeVisible();
          await noPageOverflow(page);
          await page.screenshot({ path: join(evidence, `v2-today-detail-${width}-${theme}.png`), fullPage: true });
          if (width === 390) {
            await expect(inspector).toHaveAttribute("role", "dialog");
            await page.keyboard.press("Escape");
          } else {
            await inspector.getByRole("button", { name: "Close Task Details" }).click();
          }
          await expect(inspector).toHaveCount(0);
          await page.locator('[data-pd-id="tasks.v2.layout-toggle"]').getByRole("button", { name: "List" }).click();
          await expect(page.locator('[data-pd-id="tasks.v2.collection"]')).toBeVisible();
        }
      });
    }
  }
}

for (const width of [1440, 390] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`six ledger searches ${width} ${theme}: shared Lab input geometry`, async ({ page }) => {
      test.setTimeout(120_000);
      await mkdir(evidence, { recursive: true });
      await page.setViewportSize({ width, height: 900 });
      for (const ledger of ledgerSearchRoutes) {
        await page.goto("/design-lab");
        await page.locator('[data-pd-id="design-lab-connected.root"]').waitFor();
        const cookie = page.getByRole("button", { name: "Understood" });
        if (await cookie.isVisible()) await cookie.click();
        if (width < 761) await page.getByRole("button", { name: "Open navigation" }).click();
        await page.getByRole("button", { name: ledger.lab, exact: true }).first().click();
        await setTheme(page, theme);
        const labSearch = page.locator(`[data-pd-id="lab.ledger.search.${"labKey" in ledger ? ledger.labKey : ledger.key}"]`);
        await expect(labSearch).toBeVisible();
        const labStyle = await labSearch.evaluate(element => ({ className: element.className.split(" ")[0], height: getComputedStyle(element).height, radius: getComputedStyle(element).borderRadius, padding: getComputedStyle(element).padding }));
        await page.screenshot({ path: join(evidence, `lab-${ledger.key}-search-${width}-${theme}.png`), fullPage: true });

        await page.goto(ledger.path);
        await page.locator(".ledger-loading-overlay").first().waitFor({ state: "hidden", timeout: 45_000 });
        await setTheme(page, theme);
        const realSearch = page.locator(`[data-pd-id="${ledger.key}.toolbar.search"]`);
        await expect(realSearch).toBeVisible();
        const realStyle = await realSearch.evaluate(element => ({ className: element.className.split(" ")[0], height: getComputedStyle(element).height, radius: getComputedStyle(element).borderRadius, padding: getComputedStyle(element).padding }));
        expect(realStyle).toEqual(labStyle);
        await noPageOverflow(page);
        await page.screenshot({ path: join(evidence, `v2-${ledger.key}-search-${width}-${theme}.png`), fullPage: true });
      }
    });
  }
}

for (const width of [1440, 390] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`notifications ${width} ${theme}: shared Lab surface and source actions`, async ({ page }) => {
      await mkdir(evidence, { recursive: true });
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/design-lab");
      await page.locator('[data-pd-id="design-lab-connected.root"]').waitFor();
      const cookie = page.getByRole("button", { name: "Understood" });
      if (await cookie.isVisible()) await cookie.click();
      await setTheme(page, theme);
      await page.locator('[data-pd-id="lab.header-trigger.notifications"]').click();
      await page.screenshot({ path: join(evidence, `lab-notifications-dropdown-${width}-${theme}.png`), fullPage: true });
      await page.locator('[data-pd-id="lab.notifications"]').getByRole("button", { name: "View All Notifications" }).click();
      const labPanel = page.locator('[data-pd-id="lab.notifications"]');
      const labRow = labPanel.locator('[data-pd-id^="lab.notification."]').first();
      await expect(labRow).toBeVisible();
      const labStyle = await labRow.evaluate(element => ({
        className: element.className,
        radius: getComputedStyle(element).borderRadius,
        padding: getComputedStyle(element).padding,
      }));
      const labTabsClass = await labPanel.getByRole("tablist", { name: "Notification Views" }).getAttribute("class");
      await noPageOverflow(page);
      await page.screenshot({ path: join(evidence, `lab-notifications-page-${width}-${theme}.png`), fullPage: true });

      await page.goto("/notifications");
      await page.locator('[data-pd-id="notifications.history.loading-shell"]').waitFor({ state: "hidden", timeout: 45_000 });
      await setTheme(page, theme);
      const realPanel = page.locator('[data-pd-id="notifications.history"]');
      const realRow = realPanel.locator('[data-pd-id^="notifications.history.item."]').first();
      await expect(realRow).toBeVisible();
      const realStyle = await realRow.evaluate(element => ({
        className: element.className,
        radius: getComputedStyle(element).borderRadius,
        padding: getComputedStyle(element).padding,
      }));
      expect(realStyle).toEqual(labStyle);
      expect(await realPanel.getByRole("tablist", { name: "Notification Views" }).getAttribute("class")).toBe(labTabsClass);
      await expect(realRow.getByRole("link", { name: "Open Source" })).toHaveAttribute("href", /\S+/);
      await expect(realPanel.getByRole("combobox", { name: "Filter notifications by type" })).toBeVisible();
      await noPageOverflow(page);
      await page.screenshot({ path: join(evidence, `v2-notifications-page-${width}-${theme}.png`), fullPage: true });
      const allTab = realPanel.getByRole("tab", { name: "All", exact: true });
      await allTab.focus();
      await page.keyboard.press("ArrowRight");
      await expect(realPanel.getByRole("tab", { name: "Action Required" })).toHaveAttribute("aria-selected", "true");
      await expect(realPanel.getByRole("tabpanel").locator('[data-pd-id^="notifications.history.item."]')).not.toHaveCount(0);
      await realPanel.getByRole("tab", { name: "System & Results" }).click();
      await expect(realPanel.getByRole("tab", { name: "System & Results" })).toHaveAttribute("aria-selected", "true");
      await noPageOverflow(page);
    });
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
  const labChart = explorer.locator('[data-pd-id="reports.lab-chart"]');
  await expect(labChart).toBeVisible();
  await page.screenshot({ path: join(evidence, "v2-reports-real-points-1440-light.png"), fullPage: true });
  await labChart.getByRole("button", { name: /Open .* source records/ }).first().click();
  await expect(explorer.locator(".v2-report-source-detail")).toHaveAttribute("open", "");
  await expect(explorer.locator('[data-pd-id="reports.explorer.sources"]')).toBeVisible();
  await explorer.getByRole("combobox", { name: "Explorer metric" }).selectOption("count");
  await expect(explorer.locator('[data-pd-id="reports.lab-chart"]')).toHaveCount(0);
  await noPageOverflow(page);
});

for (const width of [1440, 390] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`reports ${width} ${theme}: shared Lab chart with governed points`, async ({ page }) => {
      await mkdir(evidence, { recursive: true });
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/design-lab");
      await page.locator('[data-pd-id="design-lab-connected.root"]').waitFor();
      const cookie = page.getByRole("button", { name: "Understood" });
      if (await cookie.isVisible()) await cookie.click();
      if (width < 761) await page.getByRole("button", { name: "Open navigation" }).click();
      await page.getByRole("button", { name: "Reports", exact: true }).first().click();
      await setTheme(page, theme);
      const lab = page.locator('[data-pd-id="lab.report-chart"]');
      await expect(lab).toBeVisible();
      const labStyle = await lab.evaluate(element => ({ className: element.className, radius: getComputedStyle(element).borderRadius, padding: getComputedStyle(element).padding }));
      await page.screenshot({ path: join(evidence, `lab-reports-chart-${width}-${theme}.png`), fullPage: true });
      await page.goto("/reports");
      const explorer = page.locator('[data-pd-id="reports.explorer"]');
      await explorer.getByRole("button", { name: "Custom", exact: true }).click();
      await explorer.getByLabel("Explorer start").fill("2026-01-01");
      await explorer.getByLabel("Explorer end").fill("2026-12-31");
      await setTheme(page, theme);
      const real = explorer.locator('[data-pd-id="reports.lab-chart"]');
      await expect(real).toBeVisible();
      const realStyle = await real.evaluate(element => ({ className: element.className, radius: getComputedStyle(element).borderRadius, padding: getComputedStyle(element).padding }));
      expect(realStyle).toEqual(labStyle);
      await real.getByRole("radio", { name: "Line" }).click();
      await expect(real.getByRole("radio", { name: "Line" })).toHaveAttribute("aria-checked", "true");
      await expect(real.getByRole("img", { name: /Line chart of authoritative daily realised P&L/ })).toBeVisible();
      await noPageOverflow(page);
      await page.screenshot({ path: join(evidence, `v2-reports-chart-${width}-${theme}.png`), fullPage: true });
    });
  }
}
