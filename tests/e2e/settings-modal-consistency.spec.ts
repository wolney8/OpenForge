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

test("Fund Manager data tabs share panel and search-filter geometry", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  const settingsTabs = [
    ["catalogue", "account-catalogue.section", "Add Account"],
    ["lists", "fund-manager-authorities.section", "Add Value"],
    ["database", "database-backups.section", "Manage Database Backups"],
    ["quick-actions", "common-bet-combos.section", "Add Combo"],
  ] as const;
  let canonicalActionStyle: { height: string; radius: string; background: string; color: string } | null = null;

  for (const [hash, sectionId, actionLabel] of settingsTabs) {
    await page.goto(`/settings#${hash}`);
    const section = page.locator(`[data-pd-id="${sectionId}"]`);
    await expect(section).toBeVisible();
    await expect(section).toHaveClass(/content-panel/);
    await expect(section).not.toHaveClass(/content-subpanel/);
    const toolbar = section.locator(".settings-table-toolbar");
    await expect(toolbar).toBeVisible();
    const geometry = await toolbar.evaluate((element) => {
      const search = element.querySelector<HTMLElement>(".table-search-field");
      const filters = element.querySelector<HTMLElement>(".settings-table-filter-group");
      if (!search || !filters) return null;
      const toolbarRect = element.getBoundingClientRect();
      const searchRect = search.getBoundingClientRect();
      const filterRect = filters.getBoundingClientRect();
      return {
        searchBeforeFilters: searchRect.right <= filterRect.left + 1,
        searchShare: searchRect.width / toolbarRect.width,
        filterShare: filterRect.width / toolbarRect.width,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.searchBeforeFilters, `${hash}: ${JSON.stringify(geometry)}`).toBe(true);
    expect(geometry!.searchShare, `${hash}: ${JSON.stringify(geometry)}`).toBeGreaterThan(0.44);
    expect(geometry!.searchShare, `${hash}: ${JSON.stringify(geometry)}`).toBeLessThan(0.52);
    expect(geometry!.filterShare, `${hash}: ${JSON.stringify(geometry)}`).toBeGreaterThan(0.44);

    const primaryAction = section.getByRole("button", { name: actionLabel, exact: true });
    await expect(primaryAction).toHaveClass(/modal-primary-button/);
    await expect(primaryAction.locator("xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' settings-table-filter-group ')][1]")).toHaveCount(1);
    const actionStyle = await primaryAction.evaluate((element) => {
      const style = getComputedStyle(element);
      return { height: style.height, radius: style.borderRadius, background: style.backgroundColor, color: style.color };
    });
    if (!canonicalActionStyle) canonicalActionStyle = actionStyle;
    else expect(actionStyle, `${hash}: ${JSON.stringify(actionStyle)}`).toEqual(canonicalActionStyle);
  }

  await page.goto("/settings#site-settings");
  const siteSettings = page.locator('[data-pd-id="fund-manager-site-settings.section"]');
  await expect(siteSettings).toHaveClass(/content-panel/);
  await expect(siteSettings).not.toHaveClass(/content-subpanel/);
  await expect(siteSettings.getByLabel("Production persistence status")).toBeVisible();
  await expect(siteSettings.getByRole("cell", { name: "Profile import runs" })).toBeVisible();
  await expect(siteSettings.getByRole("cell", { name: "Import review decisions" })).toBeVisible();
});

test("Fund Manager Quick Actions uses an inline paginated table and bounded editor", async ({ page }) => {
  await page.goto("/settings#quick-actions");
  const section = page.locator('[data-pd-id="common-bet-combos.section"]');
  await expect(section.getByLabel("Search common bet combos")).toBeVisible();
  await expect(section.getByLabel("Quick Actions top controls")).toBeVisible();
  await expect(section.getByLabel("Quick Actions bottom controls")).toBeVisible();
  await page.getByRole("button", { name: "Add Combo" }).click();
  const dialog = page.getByRole("dialog", { name: "Add common bet combo" });
  await expect(page.getByRole("button", { name: "Add Combo" })).toHaveClass(/modal-primary-button/);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Combo ledger")).toBeVisible();

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
  await page.getByRole("button", { name: "Add Combo" }).click();
  const dialog = page.getByRole("dialog", { name: "Add common bet combo" });
  await expect(dialog.getByLabel("Combo ledger")).toBeVisible();

  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const body = element.querySelector<HTMLElement>(".workflow-editor-modal-body");
    return {
      bounds: { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left },
      insideViewport: rect.top >= 20 && rect.left >= 16 && rect.bottom <= innerHeight - 20 && rect.right <= innerWidth - 16,
      localBodyScroll: Boolean(body && body.scrollHeight >= body.clientHeight),
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(geometry.insideViewport, JSON.stringify(geometry)).toBe(true);
  expect(geometry.localBodyScroll, JSON.stringify(geometry)).toBe(true);
  expect(geometry.pageOverflow, JSON.stringify(geometry)).toBe(false);
});
