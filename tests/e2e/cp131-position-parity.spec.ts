import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const evidence = "data/private/evidence/cp131/paired";

async function theme(page: Page, value: "light" | "dark") {
  await page.evaluate((next) => {
    localStorage.setItem("openforge-theme", next);
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
  }, value);
  await expect(page.locator("html")).toHaveAttribute("data-theme", value);
}

async function geometry(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  });
}

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.goto(authURL);
  const session = await (await page.request.get("/api/auth/session")).json();
  expect(session.email).toBe("demo@example.invalid");
});

for (const width of [1024, 1440, 390] as const) {
  for (const mode of ["light", "dark"] as const) {
    test(`CP-131 whole Position and shell parity: ${width} ${mode}`, async ({ page }) => {
      await mkdir(evidence, { recursive: true });
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/design-lab");
      await expect(page.locator('[data-pd-id="lab.metrics"]')).toBeVisible();
      await theme(page, mode);
      const cookie = page.locator('[data-pd-id="cookie-notice.acknowledge"]');
      if (await cookie.isVisible()) await cookie.click();
      const lab = {
        sidebar: await geometry(page, 'aside[aria-label="Design Lab navigation"]'),
        header: await geometry(page, '[data-pd-id="lab.header"]'),
        profile: await geometry(page, '[data-pd-id="lab.profile"]'),
        search: width > 700 ? await geometry(page, '[data-pd-id="lab.header"] [role="search"]') : null,
        breadcrumb: await geometry(page, '[data-pd-id="lab.breadcrumb"]'),
        head: await geometry(page, 'main[data-pd-id="lab.main"] h1'),
        metrics: await geometry(page, '[data-pd-id="lab.metrics"]'),
      };
      await page.screenshot({ path: join(evidence, `lab-${width}-${mode}.png`), fullPage: true });

      await page.goto("/");
      await expect(page.locator('[data-pd-id="position.metrics"]')).toBeVisible();
      await page.locator('[data-pd-id="combined-reporting.loading"]').waitFor({ state: "hidden", timeout: 45_000 });
      await expect(page.locator('[data-pd-id="position.metrics"]')).not.toContainText(/Loading|Updating/);
      await page.locator('.fund-manager-control-slot-range select').selectOption("Last Month");
      await expect(page.locator('.fund-manager-control-slot-range select')).toHaveValue("Last Month");
      await page.locator('[data-pd-id="combined-reporting.loading"]').waitFor({ state: "hidden", timeout: 45_000 });
      await theme(page, mode);
      const real = {
        sidebar: await geometry(page, '[data-pd-id="ux-v2.sidebar"]'),
        header: await geometry(page, '[data-pd-id="app-shell.top-bar"]'),
        profile: await geometry(page, '[data-pd-id="app-shell.top-bar"] .top-bar-profile-context'),
        search: width > 700 ? await geometry(page, '[data-pd-id="global-search.root"]') : null,
        breadcrumb: await geometry(page, '[data-pd-id="ux-v2.breadcrumbs"]'),
        head: await geometry(page, '[data-pd-id="position.page-head"] h1'),
        metrics: await geometry(page, '[data-pd-id="position.metrics"]'),
      };
      await page.screenshot({ path: join(evidence, `v2-${width}-${mode}.png`), fullPage: true });

      expect(Math.abs(real.header.x - lab.header.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(real.header.height - lab.header.height)).toBeLessThanOrEqual(5);
      expect(Math.abs(real.sidebar.width - lab.sidebar.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(real.profile.y - lab.profile.y)).toBeLessThanOrEqual(8);
      if (lab.search && real.search) {
        expect(Math.abs(real.search.x - lab.search.x)).toBeLessThanOrEqual(45);
        expect(Math.abs(real.search.y - lab.search.y)).toBeLessThanOrEqual(8);
      }
      expect(Math.abs(real.breadcrumb.y - lab.breadcrumb.y)).toBeLessThanOrEqual(5);
      expect(Math.abs(real.head.y - lab.head.y)).toBeLessThanOrEqual(12);
      expect(Math.abs(real.metrics.x - lab.metrics.x)).toBeLessThanOrEqual(3);
      expect(Math.abs(real.metrics.y - lab.metrics.y)).toBeLessThanOrEqual(20);
      expect(Math.abs(real.metrics.width - lab.metrics.width)).toBeLessThanOrEqual(4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

      const head = await geometry(page, '[data-pd-id="position.page-head"]');
      const controls = await geometry(page, '[data-pd-id="position.page-head"] .fund-manager-control-bar');
      const next = await geometry(page, '#position-next-actions');
      const work = await geometry(page, '#position-continue-work');
      const workSurfaces = await page.locator('#position-next-actions, #position-continue-work').evaluateAll((headings) => headings.map((heading) => {
        const box = heading.closest("section")!.getBoundingClientRect();
        return { x: box.x, y: box.y };
      }));
      const profiles = await geometry(page, '[data-pd-id="position.profile-table"]');
      expect(head.y).toBeLessThan(real.metrics.y);
      expect(controls.x).toBeGreaterThanOrEqual(head.x - 1);
      expect(controls.x + controls.width).toBeLessThanOrEqual(width + 1);
      expect(real.metrics.y + real.metrics.height).toBeLessThan(next.y);
      if (width === 1440) {
        expect(Math.abs(workSurfaces[0].y - workSurfaces[1].y)).toBeLessThanOrEqual(2);
        expect(workSurfaces[1].x).toBeGreaterThan(workSurfaces[0].x);
      } else {
        expect(next.y).toBeLessThan(work.y);
      }
      expect(Math.max(next.y, work.y)).toBeLessThan(profiles.y);
      await expect(page.locator('[data-pd-id="position.metrics"] > div')).toHaveCount(3);
      await expect(page.locator('[data-pd-id="reports.profile-scope"] > summary')).toHaveAccessibleName(/Profile scope:/);

      const completeness = page.locator('[data-pd-id="position.financial-completeness"]');
      if (await completeness.count()) {
        expect((await geometry(page, '[data-pd-id="position.financial-completeness"]')).y).toBeGreaterThan(profiles.y);
        await completeness.locator("summary").click();
        await expect(completeness).toHaveAttribute("open", "");
      }
      if (width === 390) {
        await page.getByRole("button", { name: "Open navigation" }).click();
        await expect(page.locator('[data-pd-id="ux-v2.sidebar"]')).toBeVisible();
        await page.getByRole("button", { name: "Close navigation" }).click();
      }
      if (width === 1440 && mode === "light") {
        await page.getByRole("button", { name: "Collapse navigation" }).click();
        expect((await geometry(page, '[data-pd-id="ux-v2.sidebar"]')).width).toBe(72);
        expect((await geometry(page, '[data-pd-id="app-shell.top-bar"]')).x).toBe(72);
        await page.getByRole("button", { name: "Expand navigation" }).click();
        expect((await geometry(page, '[data-pd-id="ux-v2.sidebar"]')).width).toBe(232);
        await page.locator('[data-pd-id="position.overview"]').getByRole("link", { name: /All tasks/ }).click();
        await expect(page.getByRole("heading", { name: "Today", exact: true }).first()).toBeVisible();
      }
    });
  }
}
