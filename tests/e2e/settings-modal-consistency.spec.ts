import { expect, test } from "@playwright/test";

test("Fund Manager settings sections render proper summary cards", async ({ page }) => {
  const expected = [
    ["catalogue", "Account Catalogue summary", ["Bookmakers", "Exchanges", "Banks", "Active Providers"]],
    ["lists", "Tracker List summary", ["Active Values", "Archived Values", "List Types", "Current List"]],
    ["quick-actions", "Quick Action summary", ["Active Actions", "Required", "Ledger Coverage", "Archived"]],
    ["database", "Database Backup summary", ["Total Backups", "Verified", "Failed Checks", "Stored Size"]],
  ] as const;

  for (const [hash, label, cardNames] of expected) {
    await page.goto(`/settings#${hash}`);
    const summary = page.getByLabel(label);
    await expect(summary).toBeVisible();
    await expect(summary.locator(".stat-card")).toHaveCount(4);
    for (const cardName of cardNames) await expect(summary.getByText(cardName, { exact: true })).toBeVisible();
  }
});

test("Fund Manager Quick Actions dialog is content-sized after loading", async ({ page }) => {
  await page.goto("/settings#quick-actions");
  await page.getByRole("button", { name: "Manage Templates" }).click();
  const dialog = page.getByRole("dialog", { name: "Manage common bet combos" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Search common bet combos")).toBeVisible();

  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      centred: Math.abs((rect.top + rect.bottom) / 2 - innerHeight / 2) < 8,
      insideViewport: rect.top >= 24 && rect.bottom <= innerHeight - 24,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(geometry.centred, JSON.stringify(geometry)).toBe(true);
  expect(geometry.insideViewport, JSON.stringify(geometry)).toBe(true);
  expect(geometry.pageOverflow, JSON.stringify(geometry)).toBe(false);
});

test("Fund Manager Database dialog keeps its content inside a centred modal", async ({ page }) => {
  await page.goto("/settings#database");
  await page.getByRole("button", { name: "Manage Database Backups" }).click();
  const dialog = page.getByRole("dialog", { name: "Database Backups" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-pd-id="database-backups.status"]')).toBeVisible();

  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      centred: Math.abs((rect.top + rect.bottom) / 2 - innerHeight / 2) < 8,
      insideViewport: rect.top >= 24 && rect.bottom <= innerHeight - 24,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(geometry.centred, JSON.stringify(geometry)).toBe(true);
  expect(geometry.insideViewport, JSON.stringify(geometry)).toBe(true);
  expect(geometry.pageOverflow, JSON.stringify(geometry)).toBe(false);
});

test("Settings dialogs remain bounded in a reduced dark viewport", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 680 });
  await page.goto("/settings#quick-actions");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.getByRole("button", { name: "Manage Templates" }).click();
  const dialog = page.getByRole("dialog", { name: "Manage common bet combos" });
  await expect(dialog.getByLabel("Search common bet combos")).toBeVisible();

  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const viewport = element.querySelector<HTMLElement>('[data-pd-id="common-bet-combos.table-scroll"]');
    return {
      bounds: { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left },
      insideViewport: rect.top >= 20 && rect.left >= 16 && rect.bottom <= innerHeight - 20 && rect.right <= innerWidth - 16,
      localTableScroll: Boolean(viewport && viewport.scrollHeight >= viewport.clientHeight),
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(geometry.insideViewport, JSON.stringify(geometry)).toBe(true);
  expect(geometry.localTableScroll, JSON.stringify(geometry)).toBe(true);
  expect(geometry.pageOverflow, JSON.stringify(geometry)).toBe(false);
});
