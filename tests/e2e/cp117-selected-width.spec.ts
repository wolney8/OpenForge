import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const ownedLedger = "/profiles/profile-demo-001/tracker/sportsbook-bets";

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
});

for (const theme of ["light", "dark"] as const) {
  test(`selected Today row and inspector share one accent in ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tasks");
    await page.evaluate(value => {
      localStorage.setItem("openforge-theme", value);
      document.documentElement.dataset.theme = value;
    }, theme);
    const rows = page.locator('[data-pd-id^="tasks.v2.row."]');
    await expect(rows.first()).toBeVisible();
    await rows.first().click();
    await expect(rows.first()).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toBeVisible();
    const selected = await page.evaluate(() => {
      const row = document.querySelector<HTMLElement>('[data-pd-id^="tasks.v2.row."][aria-expanded="true"]')!;
      const inspector = document.querySelector<HTMLElement>('[data-pd-id="tasks.v2.inspector"]')!;
      const arrow = row.lastElementChild as HTMLElement;
      return { rowShadow: getComputedStyle(row).boxShadow, inspectorShadow: getComputedStyle(inspector).boxShadow,
        arrowColor: getComputedStyle(arrow).color, background: getComputedStyle(row).backgroundColor };
    });
    expect(selected.rowShadow).toMatch(/3px 0px 0px 0px inset/);
    expect(selected.inspectorShadow).toMatch(/3px 0px 0px 0px inset/);
    expect(selected.arrowColor).not.toBe("rgb(160, 165, 175)");
    expect(selected.background).not.toBe("rgba(0, 0, 0, 0)");
    if (await rows.count() > 1) {
      const quietArrow = await rows.nth(1).evaluate(node => getComputedStyle(node.lastElementChild!).color);
      expect(selected.arrowColor).not.toBe(quietArrow);
    }
    await page.screenshot({ path: info.outputPath(`today-task-selected-${theme}.png`) });

    if (await rows.count() > 1) {
      await rows.nth(1).click();
      await expect(rows.first()).toHaveAttribute("aria-expanded", "false");
      await expect(rows.nth(1)).toHaveAttribute("aria-expanded", "true");
    }
    await page.getByRole("button", { name: "Close Task Details" }).click();
    await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toHaveCount(0);
    await expect(page.locator('[data-pd-id^="tasks.v2.row."][aria-expanded="true"]')).toHaveCount(0);
    await rows.first().focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    expect(await rows.first().evaluate(node => getComputedStyle(node).outlineStyle)).toBe("solid");

    await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
    const opportunity = page.locator('[data-pd-id^="opportunities.item."]').first();
    await opportunity.click();
    await expect(opportunity).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toBeVisible();
    await page.screenshot({ path: info.outputPath(`today-opportunity-selected-${theme}.png`) });
    await page.getByRole("button", { name: "Close Opportunity Details" }).click();
    await expect(opportunity).toHaveAttribute("aria-expanded", "false");
  });
}

test("Lab pressed selection and real expanded selection use the same shared row treatment", async ({ page }) => {
  await page.goto("/design-lab");
  const navigation = page.getByRole("button", { name: "Open navigation" });
  if (await navigation.isVisible()) await navigation.click();
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  const row = page.locator('[data-pd-id^="lab.task."]').first();
  await row.click();
  await expect(row).toHaveAttribute("aria-pressed", "true");
  expect(await row.evaluate(node => getComputedStyle(node).boxShadow)).toMatch(/3px 0px 0px 0px inset/);
  await expect(page.locator('[data-pd-id="lab.today.detail"]')).toBeVisible();
});

test("tracked Today rows reuse selection without changing tracking membership", async ({ page }) => {
  await page.goto("/tasks");
  const source = page.locator('[data-pd-id^="tasks.v2.row."]').first();
  const identity = await source.getAttribute("data-pd-id");
  const track = page.locator(`[data-pd-id="${identity?.replace("tasks.v2.row.", "tasks.v2.track.")}"]`);
  await expect(track).toBeVisible();
  if (await track.getAttribute("aria-pressed") === "false") await track.click();
  await page.getByRole("button", { name: /Tracked Tasks \(/ }).click();
  const row = page.locator(`[data-pd-id="${identity}"]`);
  await expect(row).toBeVisible();
  await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "true");
  expect(await row.evaluate(node => getComputedStyle(node).boxShadow)).toMatch(/3px 0px 0px 0px inset/);
  await page.getByRole("button", { name: "Close Task Details" }).click();
  await expect(row).toHaveAttribute("aria-expanded", "false");
  await page.locator(`[data-pd-id="${identity?.replace("tasks.v2.row.", "tasks.v2.track.")}"]`).click();
});

test("selected task context remains clear in Split View and the mobile drawer", async ({ page }) => {
  for (const width of [900, 390]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto("/tasks");
    const row = page.locator('[data-pd-id^="tasks.v2.row."]').first();
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    const inspector = page.locator('[data-pd-id="tasks.v2.inspector"]');
    await expect(inspector).toBeVisible();
    if (width === 390) await expect(inspector).toHaveAttribute("role", "dialog");
    expect(await inspector.evaluate(node => getComputedStyle(node).boxShadow)).toMatch(/3px 0px 0px 0px inset/);
    expect(await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth))).toBe(0);
    await page.getByRole("button", { name: "Close Task Details" }).click();
    await expect(page.locator('[data-pd-id^="tasks.v2.row."][aria-expanded="true"]')).toHaveCount(0);
  }
});

test("desktop V2 page width halves visible gutters and narrow routes stay contained", async ({ page }, info) => {
  await page.setViewportSize({ width: 2000, height: 1000 });
  expect((await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } })).status()).toBe(200);
  const measurements: Record<string, unknown> = {};
  for (const [name, route] of [["position", "/"], ["ledger", "/tracker/sportsbook-bets"]] as const) {
    await page.goto(route);
    const shell = page.locator(".ux-v2-main > .page-shell");
    await expect(shell).toBeVisible();
    if (name === "position") await expect(page.locator('[data-pd-id="position.metrics"]')).not.toContainText(/Loading|Updating/, { timeout: 45_000 });
    else await expect(page.locator('[data-pd-id="combined.sportsbook-bets.table-scroll"] tbody tr').first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("Loading tracked tasks…")).toHaveCount(0, { timeout: 45_000 });
    const measure = () => shell.evaluate(node => {
      const main = document.querySelector<HTMLElement>(".ux-v2-main")!.getBoundingClientRect();
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { available: main.width, actual: rect.width, left: rect.left - main.left,
        right: main.right - rect.right, visibleLeft: rect.left - main.left + parseFloat(style.paddingLeft),
        overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth) };
    });
    const oldCap = await page.addStyleTag({ content: ".ux-v2-main > .page-shell { max-width: 1500px !important; }" });
    const before = await measure();
    await page.screenshot({ path: info.outputPath(`before-${name}.png`) });
    await oldCap.evaluate(node => node.remove());
    const after = await measure();
    measurements[name] = { before, after };
    expect(after.actual).toBeGreaterThanOrEqual(1635);
    expect(after.left).toBeGreaterThanOrEqual(24);
    expect(Math.abs(after.left - after.right)).toBeLessThan(1);
    expect(after.visibleLeft / before.visibleLeft).toBeLessThanOrEqual(0.55);
    expect(after.overflow).toBe(0);
    await page.screenshot({ path: info.outputPath(`after-${name}.png`) });
  }
  await writeFile(info.outputPath("desktop-gutters.json"), JSON.stringify(measurements, null, 2));
  for (const width of [1600, 1280, 900, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/tasks", ownedLedger]) {
      await page.goto(route);
      await expect(page.locator(".ux-v2-main > .page-shell")).toBeVisible();
      expect(await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth))).toBe(0);
    }
  }
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/tasks");
  await page.evaluate(() => { document.documentElement.style.zoom = "200%"; });
  expect(await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth))).toBe(0);
  await page.screenshot({ path: info.outputPath("chromium-200-percent-reflow.png") });
  await page.evaluate(() => { document.documentElement.style.zoom = ""; });
  const chromium = await page.context().newCDPSession(page);
  await chromium.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
  expect(await page.evaluate(() => visualViewport.scale)).toBe(2);
  await chromium.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
  expect((await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "Week (Mon-Sun)", selected_range_custom_start: null, selected_range_custom_end: null,
  } })).status()).toBe(200);
});
