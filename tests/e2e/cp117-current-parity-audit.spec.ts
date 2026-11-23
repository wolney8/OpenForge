import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const evidence = "data/private/evidence/cp117-current-parity";
const routes = [
  { name: "position", lab: "home", real: "/", heading: "Position" },
  { name: "today", lab: "tasks", real: "/tasks", heading: "Today" },
  { name: "opportunities", lab: "opportunities", real: "/opportunities", heading: "Opportunities" },
  { name: "tracker", lab: "tracker", real: "/tracker", heading: "Tracker" },
  { name: "reports", lab: "reports", real: "/reports", heading: "Reports" },
  { name: "profiles", lab: "profiles", real: "/profiles", heading: "Profiles" },
  { name: "notifications", lab: "notifications", real: "/notifications", heading: "Notifications" },
] as const;

async function shell(page: Page, lab: boolean) {
  return page.evaluate((reference) => {
    const box = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        background: style.backgroundColor, color: style.color, padding: style.padding };
    };
    return {
      header: box(reference ? '[data-pd-id="lab.header"]' : '[data-pd-id="app-shell.top-bar"]'),
      sidebar: box(reference ? 'aside[aria-label="Design Lab navigation"]' : '[data-pd-id="ux-v2.sidebar"]'),
      breadcrumb: box(reference ? '[data-pd-id="lab.breadcrumb"]' : '[data-pd-id="ux-v2.breadcrumbs"]'),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  }, lab);
}

for (const { width, theme } of [
  { width: 2048, theme: "dark" },
  { width: 1440, theme: "light" },
  { width: 390, theme: "dark" },
] as const) {
  test(`current full-page route comparison at ${width}px ${theme}`, async ({ page }) => {
    test.setTimeout(180_000);
    await mkdir(evidence, { recursive: true });
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(value => {
      localStorage.setItem("pd-required-storage-notice", "acknowledged");
      localStorage.setItem("openforge-theme", value);
    }, theme);
    await page.goto(authURL);
    for (const route of routes) {
      await test.step(`Compare ${route.name}`, async () => {
      await page.goto("/design-lab");
      if (route.lab !== "home") {
        const destination = page.locator(`[data-pd-id="lab.nav.${route.lab}"]`);
        const openNav = page.getByRole("button", { name: "Open navigation" });
        if (width <= 700) {
          await expect(openNav).toBeVisible();
          await openNav.click();
        }
        if (!await destination.isVisible()) await page.getByRole("button", { name: "See More" }).click({ timeout: 5_000 });
        await destination.click();
      }
      await expect(page.getByRole("heading", { name: route.heading, exact: true, level: 1 })).toBeVisible();
      const reference = await shell(page, true);
      await page.screenshot({ path: join(evidence, `lab-${route.name}-${width}-${theme}.png`), fullPage: true });

      await page.goto(route.real);
      await expect(page.getByRole("heading", { name: route.heading, exact: true, level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expect(page.locator('main[aria-busy="true"]')).toHaveCount(0, { timeout: 45_000 });
      await expect(page.locator('[data-pd-id="v2.active-task.loading"]')).toHaveCount(0, { timeout: 45_000 });
      if (route.name === "position") {
        await expect(page.locator('[data-pd-id="position.selected-range"]')).toBeVisible();
      }
      if (route.name === "reports") await expect(page.locator('[data-pd-id="reports.selected-range"]')).toBeVisible();
      if (route.name === "position" || route.name === "reports") {
        await expect(page.locator('[data-pd-id="combined-reporting.loading"]')).toHaveCount(0, { timeout: 45_000 });
      }
      if (route.name === "opportunities") await expect(page.getByText("Loading authorised opportunities…")).toHaveCount(0, { timeout: 45_000 });
      if (route.name === "today") await expect(page.locator('[data-pd-id="tasks.loading-shell"]')).toHaveCount(0, { timeout: 45_000 });
      if (route.name === "notifications") await expect(page.locator('[data-pd-id="notifications.history.loading-shell"]')).toHaveCount(0, { timeout: 45_000 });
      if (route.name === "today") await expect(page.locator('[data-pd-id="tasks.v2.collection"]')).toBeVisible();
      const actual = await shell(page, false);
      await page.screenshot({ path: join(evidence, `pd-${route.name}-${width}-${theme}.png`), fullPage: true });
      expect(actual.header, route.name).not.toBeNull();
      expect(actual.breadcrumb, route.name).not.toBeNull();
      expect(actual.overflow, route.name).toBeLessThanOrEqual(1);
      expect(reference.overflow, route.name).toBeLessThanOrEqual(1);
      expect(Math.abs(actual.header!.height - reference.header!.height), route.name).toBeLessThanOrEqual(6);
      if (width > 700) expect(Math.abs(actual.sidebar!.width - reference.sidebar!.width), route.name).toBeLessThanOrEqual(2);
      expect(Math.abs(actual.breadcrumb!.y - reference.breadcrumb!.y), route.name).toBeLessThanOrEqual(6);
      });
    }
  });
}
