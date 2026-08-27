import { expect, test } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:8010";
const sportsbookRoute = "/profiles/profile-demo-001/tracker/sportsbook-bets";
const freeBetRoute = "/profiles/profile-demo-001/tracker/free-bets";
const casinoRoute = "/profiles/profile-demo-001/tracker/casino-offers";
const cashAdjustmentRoute = "/profiles/profile-demo-001/tracker/cash-adjustments";
const settingsRoute = "/profiles/profile-demo-001/tracker/settings";

function colourChannels(value: string) {
  const rgbMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      b: Number(rgbMatch[3]),
      g: Number(rgbMatch[2]),
      r: Number(rgbMatch[1]),
    };
  }

  const srgbMatch = value.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (srgbMatch) {
    return {
      b: Number(srgbMatch[3]) * 255,
      g: Number(srgbMatch[2]) * 255,
      r: Number(srgbMatch[1]) * 255,
    };
  }

  throw new Error(`Unsupported colour format: ${value}`);
}

function expectRedDominant(value: string) {
  const channels = colourChannels(value);
  expect(channels.r).toBeGreaterThan(channels.g);
  expect(channels.r).toBeGreaterThan(channels.b);
}

function normalizeText(value: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function parseApiDate(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;
  const parsed = new Date(normalized.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getLastMonthRange(today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1, 0, 0, 0, 0);
  const end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
  return { end, start };
}

function isWithinRange(value: Date | null, range: { start: Date; end: Date }) {
  return Boolean(value && value >= range.start && value <= range.end);
}

async function expectRangeCardControlContained(page: import("@playwright/test").Page) {
  const rangeCard = page.locator('[data-pd-id="tracker.range-card"]').first();
  const rangeSelect = page.locator('[data-pd-id="tracker.range-card.select"]').first();
  await expect(rangeCard).toBeVisible();
  await expect(rangeSelect).toBeVisible();
  const rangeCardBox = await rangeCard.boundingBox();
  const rangeSelectBox = await rangeSelect.boundingBox();
  expect(rangeCardBox).not.toBeNull();
  expect(rangeSelectBox).not.toBeNull();
  expect(rangeSelectBox!.x).toBeGreaterThanOrEqual(rangeCardBox!.x);
  expect(rangeSelectBox!.x + rangeSelectBox!.width).toBeLessThanOrEqual(
    rangeCardBox!.x + rangeCardBox!.width + 1
  );
  expect(rangeSelectBox!.y).toBeGreaterThanOrEqual(rangeCardBox!.y);
  expect(rangeSelectBox!.y + rangeSelectBox!.height).toBeLessThanOrEqual(
    rangeCardBox!.y + rangeCardBox!.height + 1
  );
}

async function clearLedgerTableState(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const ledgers = ["sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments"];
    for (const ledger of ledgers) {
      window.localStorage.removeItem(`openforge-ledger-table-mode:profile-demo-001:${ledger}`);
      window.localStorage.removeItem(`openforge-ledger-table-filters:profile-demo-001:${ledger}`);
    }
  });
}

async function openProfileCommandRoute(
  page: import("@playwright/test").Page,
  routeId: string
) {
  await page.locator('[data-pd-id="profile-command.trigger"]').evaluate((trigger) => {
    (trigger as HTMLButtonElement).click();
  });
  await page
    .locator('[data-pd-id^="profile-command.profile."][aria-current="page"]')
    .evaluate((profile) => {
      (profile as HTMLButtonElement).click();
    });
  await page.locator(`[data-pd-id="profile-command.route.${routeId}"]`).evaluate((route) => {
    (route as HTMLButtonElement).click();
  });
}

test("unchanged editor navigation is silent while a real edit is protected", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(sportsbookRoute);
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });

  await openProfileCommandRoute(page, "free-bets");
  await expect(page).toHaveURL(new RegExp(`${freeBetRoute}$`));
  await expect(page.getByRole("dialog", { name: "Unsaved tracker changes" })).toHaveCount(0);

  await page.goto(sportsbookRoute);
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });
  const firstSportsbookRow = page.locator(".data-table tbody tr").first();
  await expect(firstSportsbookRow).toBeVisible();
  await firstSportsbookRow.locator("td").nth(1).click();
  await expect(page.getByRole("dialog", { name: "Edit sportsbook row" })).toBeVisible();

  let unchangedDialogCount = 0;
  const unchangedDialogHandler = async (dialog: import("@playwright/test").Dialog) => {
    unchangedDialogCount += 1;
    await dialog.dismiss();
  };
  page.on("dialog", unchangedDialogHandler);
  await openProfileCommandRoute(page, "free-bets");
  await expect(page).toHaveURL(new RegExp(`${freeBetRoute}$`));
  expect(unchangedDialogCount).toBe(0);
  page.off("dialog", unchangedDialogHandler);

  await page.goto(sportsbookRoute);
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });
  await page.getByRole("button", { name: "Add sportsbook row" }).click();
  const createDialog = page.getByRole("dialog", { name: "Create sportsbook row" });
  await createDialog.getByLabel("Offer", { exact: true }).fill("Unsaved guard check");

  await openProfileCommandRoute(page, "free-bets");
  const guardDialog = page.getByRole("dialog", { name: "Unsaved tracker changes" });
  await expect(guardDialog).toBeVisible();
  await expect(guardDialog.getByRole("heading", { name: "Leave this tracker form?" })).toBeVisible();
  await expect(guardDialog).toContainText("Unsaved changes will be discarded.");
  await expect(guardDialog).toHaveAttribute("aria-modal", "true");
  await expect(guardDialog.getByRole("button", { name: "Keep Editing", exact: true })).toBeFocused();

  const bounds = await guardDialog.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport!.height);

  await page.keyboard.press("Escape");
  await expect(guardDialog).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`${sportsbookRoute}$`));
  await expect(createDialog).toBeVisible();

  await openProfileCommandRoute(page, "free-bets");
  const secondGuardDialog = page.getByRole("dialog", { name: "Unsaved tracker changes" });
  await expect(secondGuardDialog).toBeVisible();
  await expect(secondGuardDialog.getByRole("button", { name: "Discard Changes" })).toBeVisible();
  await secondGuardDialog.getByRole("button", { name: "Discard Changes" }).click();
  await expect(page).toHaveURL(new RegExp(`${freeBetRoute}$`));
});

test("tracker controls expose visible focus and an operable theme toggle", async ({ page }) => {
  await page.goto(sportsbookRoute);

  const filterButton = page.getByRole("button", {
    name: "Open sportsbook filter and column controls",
  });
  await expect(filterButton).toBeVisible();
  await filterButton.focus();
  await expect(filterButton).toBeFocused();
  const focusStyle = await filterButton.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });
  expect(
    focusStyle.outlineStyle !== "none" ||
      focusStyle.outlineWidth !== "0px" ||
      focusStyle.boxShadow !== "none"
  ).toBeTruthy();

  const themeToggle = page.getByRole("button", { name: /Switch to (light|dark) mode/ });
  const backLayToggle = page.getByRole("button", { name: "Choose back/lay colour theme" });
  await expect(themeToggle.locator(".theme-mode-icon-stage")).toBeVisible();
  await expect(backLayToggle.locator(".palette-icon")).toBeVisible();
  await expect(backLayToggle.locator("strong")).toHaveCount(0);
  const initialTheme = await page.locator("html").getAttribute("data-theme");
  await themeToggle.click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", initialTheme ?? "");
  await expect(page.getByRole("button", { name: /Switch to (light|dark) mode/ })).toBeVisible();
});

test("top bar profile summary shows profile-wide selected-range P&L across tracker routes", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await clearLedgerTableState(page);
  await page.goto(sportsbookRoute);
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });

  const rangeCard = page.locator('[data-pd-id="tracker.range-card"]').first();
  const rangeSelect = page.locator('[data-pd-id="tracker.range-card.select"]').first();
  await expectRangeCardControlContained(page);
  await expect(rangeCard).toHaveAttribute("title", /Tracker range:/);
  await expect(rangeCard).not.toContainText("Tracker range:");

  const summaryButton = page.locator("button.summary-menu-button");
  await expect(summaryButton).toBeVisible();
  await expect(summaryButton).not.toContainText("Loading profile...", { timeout: 30_000 });
  await expect(summaryButton).not.toContainText("Loading range and P&L...", { timeout: 30_000 });
  await expect(summaryButton).not.toContainText("Tracker range:");
  const summaryValue = summaryButton.locator(".summary-menu-financial-value");
  await expect(summaryValue).toBeVisible({ timeout: 90_000 });
  await expect(summaryValue).toHaveAttribute("data-money-tone", /^(positive|negative|neutral)$/);
  await expect(summaryValue).toContainText(/^£ ((\([0-9,]+\.[0-9]{2}\))|([0-9,]+\.[0-9]{2})|-)$/);
  await expect(summaryButton).toContainText("Total P&L for");
  await expect(summaryButton).toHaveAttribute("title", /Total P&L for .*Tracker range:/);

  await rangeSelect.selectOption("This Month");
  await expect(rangeCard).toHaveAttribute("title", /Tracker range: This Month/, {
    timeout: 30_000,
  });
  await expect(summaryButton).toHaveAttribute("title", /Total P&L for .*Tracker range: This Month/, {
    timeout: 30_000,
  });
  await expect(summaryValue).toBeVisible({ timeout: 30_000 });
  const profileTotalForThisMonth = normalizeText(await summaryValue.textContent());
  await page.goto(freeBetRoute);
  await expect(page.getByText("Loading free-bet ledger")).toBeHidden({ timeout: 90_000 });
  const freeBetSummaryValue = page.locator("button.summary-menu-button .summary-menu-financial-value");
  await expect(freeBetSummaryValue).toBeVisible({ timeout: 30_000 });
  expect(normalizeText(await freeBetSummaryValue.textContent())).toBe(profileTotalForThisMonth);
  await page.goto(settingsRoute);
  const settingsSummaryValue = page.locator("button.summary-menu-button .summary-menu-financial-value");
  await expect(settingsSummaryValue).toBeVisible({ timeout: 30_000 });
  expect(normalizeText(await settingsSummaryValue.textContent())).toBe(profileTotalForThisMonth);

  await page.goto(sportsbookRoute);
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });

  await rangeSelect.selectOption("Last Month");
  await expect(rangeCard).toHaveAttribute("title", /Tracker range: Last Month/, {
    timeout: 30_000,
  });
  const sportsbookRowsResponse = await request.get(
    `${apiBaseUrl}/profiles/profile-demo-001/sportsbook-bets`
  );
  expect(sportsbookRowsResponse.ok()).toBeTruthy();
  const sportsbookRows = (await sportsbookRowsResponse.json()) as Array<{
    created_at?: string | null;
    date_settled?: string | null;
  }>;
  const lastMonthRange = getLastMonthRange();
  const expectedLastMonthRows = sportsbookRows.filter((row) => {
    const anchor = parseApiDate(row.date_settled) ?? parseApiDate(row.created_at);
    return Boolean(
      anchor && anchor >= lastMonthRange.start && anchor <= lastMonthRange.end
    );
  }).length;
  const visibleDataRows = page
    .locator(".data-table tbody tr")
    .filter({ hasNot: page.locator(".empty-cell") });
  await expect
    .poll(async () => visibleDataRows.count())
    .toBe(Math.min(expectedLastMonthRows, 8));
});

test("top bar profile command menu searches profiles and exposes tracker route options", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/profiles/profile-demo-001/tracker/dashboard");
  await expect(page.getByText("Loading tracker summaries")).toBeHidden({ timeout: 90_000 });

  const summaryButton = page.locator("button.summary-menu-button");
  await expect(summaryButton).toBeVisible();
  await summaryButton.click();

  const command = page.locator('[data-pd-id="profile-command.popover"]');
  await expect(command).toBeVisible();
  const search = page.locator('[data-pd-id="profile-command.search"]');
  await expect(search).toBeFocused();
  await expect(page.locator('[data-pd-id="profile-command.close"]')).toContainText("Esc");
  const currentProfileRow = page.locator('[data-pd-id="profile-command.profile.profile-demo-001"]');
  await expect(currentProfileRow).toHaveAttribute(
    "aria-current",
    "page"
  );
  await expect(page.locator('[data-pd-id="profile-command.route.dashboard"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="profile-command.route.sportsbook-bets"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="profile-command.route.free-bets"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="profile-command.route.casino-offers"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="profile-command.route.cash-adjustments"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="profile-command.route.accounts"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="profile-command.route.reports"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="profile-command.route.settings"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="profile-command.view-all"]')).toHaveCount(0);
  await expect(page.locator('[data-pd-id="profile-command.add-profile"]')).toBeVisible();
  const commandGeometry = await page.evaluate(() => {
    const trigger = document.querySelector<HTMLElement>('[data-pd-id="profile-command.trigger"]');
    const popover = document.querySelector<HTMLElement>('[data-pd-id="profile-command.popover"]');
    if (!trigger || !popover) return null;
    const triggerBounds = trigger.getBoundingClientRect();
    const popoverBounds = popover.getBoundingClientRect();
    return {
      popoverWidth: Math.round(popoverBounds.width),
      triggerWidth: Math.round(triggerBounds.width),
    };
  });
  expect(commandGeometry).not.toBeNull();
  expect(Math.abs(commandGeometry!.popoverWidth - commandGeometry!.triggerWidth)).toBeLessThanOrEqual(8);

  const currentProfileName = normalizeText(await currentProfileRow.getAttribute("aria-label"))
    .replace(", current profile", "");
  await search.fill(currentProfileName.split(" ")[0] || currentProfileName);
  await expect(currentProfileRow).toBeVisible();
  await expect(page.locator('[data-pd-id="profile-command.route.dashboard"]')).toBeVisible();
  await search.fill("No matching active profile");
  await expect(page.getByText("No active profiles match this search.")).toBeVisible();
  await expect(page.locator('[data-pd-id="profile-command.route.dashboard"]')).toHaveCount(0);
  await search.fill("");
  await currentProfileRow.click();

  await page.locator('[data-pd-id="profile-command.route.sportsbook-bets"]').click();
  await expect(page).toHaveURL(/\/profiles\/profile-demo-001\/tracker\/sportsbook-bets$/);
  await expect(page.locator(".flexible-nav")).toHaveCount(0);

  await summaryButton.click();
  const alternateProfile = page.locator('[data-pd-id^="profile-command.profile."]:not([aria-current="page"])').first();
  if ((await alternateProfile.count()) > 0) {
    const beforeSelectionUrl = page.url();
    await alternateProfile.click();
    await expect(page).toHaveURL(beforeSelectionUrl);
    await expect(page.locator('[data-pd-id="profile-command.route.sportsbook-bets"]')).toBeVisible();
    await page.locator('[data-pd-id="profile-command.route.sportsbook-bets"]').click();
    await expect(page).toHaveURL(/\/profiles\/(?!profile-demo-001)[^/]+\/tracker\/sportsbook-bets$/);
  } else {
    await expect(page.getByText("Subscriber Alpha")).toBeVisible();
  }

  await summaryButton.click();
  await page.keyboard.press("Escape");
  await expect(command).toBeHidden();
  await expect(summaryButton).toBeFocused();
});

test("tracker range scopes visible rows across ledgers unless the route is an action view", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await clearLedgerTableState(page);
  const lastMonthRange = getLastMonthRange();
  const scenarios = [
    {
      apiPath: "free-bets",
      loadingLabel: "Loading free-bet ledger",
      route: freeBetRoute,
      countExpectedRows: (rows: Array<Record<string, string | null | undefined>>) =>
        rows.filter((row) =>
          isWithinRange(
            parseApiDate(row.date_settled) ??
              parseApiDate(row.expiry_datetime) ??
              parseApiDate(row.created_at),
            lastMonthRange
          )
        ).length,
    },
    {
      apiPath: "casino-offers",
      loadingLabel: "Loading casino-offer ledger",
      route: casinoRoute,
      countExpectedRows: (rows: Array<Record<string, string | null | undefined>>) =>
        rows.filter((row) =>
          isWithinRange(
            parseApiDate(row.date_settling) ??
              parseApiDate(row.date_started) ??
              parseApiDate(row.expiry_datetime),
            lastMonthRange
          )
        ).length,
    },
    {
      apiPath: "cash-adjustments",
      loadingLabel: "Loading cash-adjustment ledger",
      route: cashAdjustmentRoute,
      countExpectedRows: (rows: Array<Record<string, string | null | undefined>>) =>
        rows.filter((row) => isWithinRange(parseApiDate(row.adjustment_date), lastMonthRange))
          .length,
    },
  ];

  for (const scenario of scenarios) {
    await page.goto(scenario.route);
    await expect(page.getByText(scenario.loadingLabel)).toBeHidden({ timeout: 90_000 });
    const rangeSelect = page.locator('[data-pd-id="tracker.range-card.select"]').first();
    await expectRangeCardControlContained(page);
    await rangeSelect.selectOption("Last Month");
    await expect(page.locator('[data-pd-id="tracker.range-card"]').first()).toHaveAttribute(
      "title",
      /Tracker range: Last Month/,
      { timeout: 30_000 }
    );

    const response = await request.get(
      `${apiBaseUrl}/profiles/profile-demo-001/${scenario.apiPath}`
    );
    expect(response.ok()).toBeTruthy();
    const rows = (await response.json()) as Array<Record<string, string | null | undefined>>;
    const expectedVisibleRows = Math.min(scenario.countExpectedRows(rows), 8);
    const visibleDataRows = page
      .locator(".data-table tbody tr")
      .filter({ hasNot: page.locator(".empty-cell") });
    await expect.poll(async () => visibleDataRows.count()).toBe(expectedVisibleRows);
  }

  await page.goto(`${freeBetRoute}?view=issues&issue=all-issues&source=profiles`);
  await expect(page.getByText("Loading free-bet ledger")).toBeHidden({ timeout: 90_000 });
  await expect(page.locator('[data-pd-id="tracker.range-card"]').first()).toContainText(
    "All Dates"
  );
});

test("ledger row delete uses the in-app destructive confirmation", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(sportsbookRoute);
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });

  let browserDialogCount = 0;
  page.on("dialog", async (dialog) => {
    browserDialogCount += 1;
    await dialog.dismiss();
  });

  await page.getByRole("button", { name: /^Delete sportsbook row / }).first().click();

  const confirmation = page.getByRole("dialog", { name: "Delete sportsbook row?" });
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toHaveAttribute("aria-modal", "true");
  await expect(confirmation).toContainText("This will remove it from this profile tracker.");
  await expect(browserDialogCount).toBe(0);

  const deleteButton = confirmation.getByRole("button", { name: "Delete Row" });
  await expect(deleteButton).toBeVisible();
  const deleteIcon = deleteButton.locator(".material-symbols-outlined");
  await expect(deleteIcon).toHaveText("delete");
  const deleteColour = await deleteIcon.evaluate((element) => getComputedStyle(element).color);
  const borderColour = await deleteButton.evaluate((element) => getComputedStyle(element).borderColor);
  expectRedDominant(deleteColour);
  expectRedDominant(borderColour);

  await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(confirmation).toHaveCount(0);
});
