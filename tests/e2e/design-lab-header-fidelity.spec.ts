import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const evidenceDir = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;

async function enterLab(page: Page, theme: "light" | "dark" = "dark") {
  await page.route("**/api/**", async route => {
    if (route.request().url().endsWith("/api/auth/session")) {
      await route.fulfill({ json: { authenticated: true, email: "demo@example.invalid", expires_at: 4102444800, name: "Synthetic Fund Manager", role: "fund_manager", session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true } } });
      return;
    }
    if (route.request().url().endsWith("/api/auth/activity")) { await route.fulfill({ json: { ok: true } }); return; }
    throw new Error(`Unexpected API request from synthetic lab: ${route.request().url()}`);
  });
  await page.addInitScript(value => localStorage.setItem("openforge-theme", value), theme);
  await page.goto("/design-lab");
  await expect(page.locator('[data-pd-id="design-lab-connected.root"]')).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

async function geometry(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
      header: rect('[data-pd-id="lab.header"]'),
      search: rect('[data-pd-id="lab.search"]'),
      notifications: rect('[data-pd-id="lab.header-trigger.notifications"]'),
      help: rect('[data-pd-id="lab.header-trigger.help"]'),
      workspace: rect('[data-pd-id="lab.header-trigger.workspace"]'),
      avatar: rect('[data-pd-id="lab.header-trigger.identity"]'),
      menu: rect('[data-pd-id="lab.header-menu"]'),
      switch: rect('[data-pd-id="lab.identity.dark-mode"] .material-switch-track'),
    };
  });
}

test("desktop header cluster and account menu track the avatar", async ({ page }) => {
  await page.setViewportSize({ width: 2048, height: 1152 });
  await enterLab(page);
  const avatar = page.locator('[data-pd-id="lab.header-trigger.identity"]');
  await avatar.click();
  const menu = page.locator('[data-pd-id="lab.header-menu"]');
  await expect(menu).toBeVisible();
  await expect(menu).toContainText("Lab Manager");
  await expect(menu.getByRole("switch", { name: "Dark Mode" })).toHaveAttribute("aria-checked", "true");
  await expect(menu.getByRole("button", { name: /Sign Out/ })).toBeDisabled();
  const g = await geometry(page);
  expect(g.viewport.scrollWidth).toBeLessThanOrEqual(g.viewport.width);
  expect(g.avatar!.right).toBeGreaterThan(1999);
  expect(Math.abs(g.menu!.right - g.avatar!.right)).toBeLessThanOrEqual(3);
  expect(g.menu!.y).toBeGreaterThanOrEqual(g.avatar!.bottom);
  expect(g.search!.right).toBeLessThan(g.notifications!.x);
  expect(g.notifications!.right).toBeLessThan(g.help!.x);
  expect(g.help!.right).toBeLessThan(g.workspace!.x);
  expect(g.workspace!.right).toBeLessThan(g.avatar!.x);
  if (evidenceDir) {
    await mkdir(evidenceDir, { recursive: true });
    await page.screenshot({ path: join(evidenceDir, "after-2048-account-dark.png"), fullPage: false, style: "nextjs-portal { display: none !important; }" });
    await writeFile(join(evidenceDir, "after-2048-geometry.json"), JSON.stringify(g, null, 2));
  }
  await menu.getByRole("switch", { name: "Dark Mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(menu.getByRole("switch", { name: "Dark Mode" })).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(avatar).toBeFocused();
});

test("each header overlay follows its trigger, search stays beneath the field", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterLab(page);
  for (const id of ["notifications", "help", "workspace", "identity"]) {
    const trigger = page.locator(`[data-pd-id="lab.header-trigger.${id}"]`);
    await trigger.click();
    const g = await geometry(page);
    const box = await trigger.boundingBox();
    expect(g.menu!.y).toBeGreaterThanOrEqual(box!.y + box!.height);
    expect(g.menu!.x).toBeGreaterThanOrEqual(0);
    expect(g.menu!.right).toBeLessThanOrEqual(g.viewport.width);
    expect(Math.abs(g.menu!.right - (box!.x + box!.width))).toBeLessThanOrEqual(3);
    if (evidenceDir) {
      await mkdir(evidenceDir, { recursive: true });
      await page.screenshot({ path: join(evidenceDir, `after-1440-${id}-dark.png`), fullPage: false, style: "nextjs-portal { display: none !important; }" });
    }
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
  await page.locator('[data-pd-id="lab.header-trigger.identity"]').click();
  await page.setViewportSize({ width: 900, height: 900 });
  await expect.poll(async () => (await geometry(page)).menu?.right ?? Infinity).toBeLessThanOrEqual(900);
  const moved = await geometry(page);
  expect(moved.menu!.right).toBeLessThanOrEqual(900);
  expect(moved.menu!.y).toBeGreaterThanOrEqual(moved.avatar!.bottom);
  await page.locator('[data-pd-id="lab.main"]').click({ position: { x: 10, y: 10 } });
  await expect(page.locator('[data-pd-id="lab.header-menu"]')).toHaveCount(0);
  await expect(page.locator('[data-pd-id="lab.header-trigger.identity"]')).toBeFocused();
  const search = page.locator('[data-pd-id="lab.search"]');
  await search.fill("Bookmaker");
  const results = page.locator('[data-pd-id="lab.search-results"]');
  await expect(results).toBeVisible();
  const searchBox = await page.locator('[role="search"]').boundingBox();
  const resultBox = await results.boundingBox();
  expect(Math.abs(searchBox!.x - resultBox!.x)).toBeLessThanOrEqual(2);
  expect(resultBox!.y).toBeGreaterThanOrEqual(searchBox!.y + searchBox!.height);
  if (evidenceDir) await page.screenshot({ path: join(evidenceDir, "after-900-search-dark.png"), fullPage: false, style: "nextjs-portal { display: none !important; }" });
  await search.press("ArrowDown");
  await expect(results.locator("button").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(search).toBeFocused();
  await expect(results).toHaveCount(0);
});

test("responsive shell contains header controls, menus and search in both themes", async ({ page }) => {
  for (const theme of ["dark", "light"] as const) {
    for (const width of [1440, 900, 768, 430, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await enterLab(page, theme);
      const avatar = page.locator('[data-pd-id="lab.header-trigger.identity"]');
      await avatar.click();
      const g = await geometry(page);
      expect(g.viewport.scrollWidth, `${theme} ${width}px overflow`).toBeLessThanOrEqual(width);
      expect(g.menu!.x).toBeGreaterThanOrEqual(0);
      expect(g.menu!.right).toBeLessThanOrEqual(width);
      expect(g.menu!.y).toBeGreaterThanOrEqual(g.avatar!.bottom);
      if (evidenceDir) {
        await mkdir(evidenceDir, { recursive: true });
        await page.screenshot({ path: join(evidenceDir, `after-${width}-account-${theme}.png`), fullPage: false, style: "nextjs-portal { display: none !important; }" });
        await writeFile(join(evidenceDir, `after-${width}-geometry-${theme}.json`), JSON.stringify(g, null, 2));
      }
      await page.keyboard.press("Escape");
      if (width <= 700) {
        await page.getByRole("button", { name: "Open search" }).click();
        const search = page.locator('[data-pd-id="lab.search"]');
        await expect(search).toBeFocused();
        await search.fill("Sportsbook");
        await expect(page.locator('[data-pd-id="lab.search-results"]')).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.locator('[data-pd-id="lab.search-results"]')).toHaveCount(0);
      }
    }
  }
});
