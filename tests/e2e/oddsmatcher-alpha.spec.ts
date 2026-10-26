import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const profileId = "profile-demo-001";
const evidenceDirectory = path.resolve(
  "data/private/evidence/cp086-oddsmatcher-filter-parity-20261026",
);

let preferences = {
  version: 1 as const,
  default_back_stake: "10.00",
  exchange_commission_overrides: {},
  excluded_bookmaker_identities: [] as string[],
  excluded_exchange_identities: [] as string[],
  show_arbs_default: false,
  default_advanced: false,
  saved_filters: [] as Array<{ id: string; name: string; description?: string; filters: unknown }>,
};
let providerRequests = 0;

function opportunity(index: number) {
  const selection = index % 3 === 0 ? "DRAW" : index % 3 === 1 ? "HOME" : "AWAY";
  const backProviders = [
    { key: "williamhill", name: "William Hill" },
    { key: "betfred", name: "Betfred" },
    { key: "bet365", name: "Bet365" },
    { key: "888sport", name: "888sport" },
  ];
  const layProviders = [
    { key: "smarkets", name: "Smarkets" },
    { key: "matchbook", name: "Matchbook" },
    { key: "betfair", name: "Betfair Exchange" },
  ];
  const backProvider = backProviders[index % backProviders.length];
  const layProvider = layProviders[index % layProviders.length];
  return {
    opportunity_id: `soccer_epl:event-${index}:h2h:${selection}`,
    provider: "The Odds API",
    competition_key: index > 20 ? "soccer_uefa_champs_league" : "soccer_epl",
    competition: index > 20 ? "UEFA Champions League" : "Premier League",
    event_id: `event-${index}`,
    event_name: `Demo City ${index} v Demo United ${index}`,
    starts_at: `2026-10-${String(24 + (index % 5)).padStart(2, "0")}T15:00:00Z`,
    selection_key: selection,
    selection: selection === "DRAW" ? "Draw" : `${selection === "HOME" ? "Demo City" : "Demo United"} ${index}`,
    market_key: "h2h",
    market: "Match Odds / 1X2",
    back: { provider_key: backProvider.key, provider_name: backProvider.name, account_name: backProvider.name, odds: "4.50", observed_at: "2026-10-23T14:00:00Z", link: "https://example.invalid/back" },
    lay: { provider_key: layProvider.key, provider_name: layProvider.name, account_name: layProvider.name, odds: "4.70", observed_at: "2026-10-23T14:00:05Z", link: "https://example.invalid/lay" },
    display_rating: String(95 + index / 100),
    commission_aware_rating: "94.00",
    exchange_commission: "0.02",
    standard_lay_stake: "9.62",
    liability: "35.59",
    pnl_if_back_wins: "-1.09",
    pnl_if_lay_wins: "-0.57",
    conservative_result: "-1.09",
    liquidity_state: "UNKNOWN",
    freshness: index === 0 ? "stale" : "fresh",
    age_seconds: index === 0 ? 600 : 30,
    back_eligibility: { state: "eligible", reason: "Bookmaker A has no recorded blocker for this Profile.", account_id: "account-b" },
    lay_eligibility: { state: "eligible", reason: "Smarkets has no recorded blocker for this Profile.", account_id: "account-l" },
    can_create_prospecting_draft: true,
  };
}

const feed = {
  provider: "The Odds API",
  fetched_at: "2026-10-23T14:00:10Z",
  state: "fresh",
  warning: null,
  manual_refresh_only: true,
  competitions: ["Premier League", "Championship", "UEFA Champions League"],
  event_count: 12,
  bookmaker_count: 9,
  exchange_count: 3,
  credits_used_today: 3,
  provider_credits_used: 6,
  provider_credits_remaining: 494,
  daily_credit_ceiling: 25,
  opportunities: Array.from({ length: 34 }, (_, index) => opportunity(index)),
  excluded: Array.from({ length: 19 }, (_, index) => ({
    competition: "Premier League",
    event_id: `excluded-${index}`,
    provider_key: "provider-demo",
    market_key: "h2h",
    reason: "Exact HOME, DRAW or AWAY quote pair is unavailable.",
  })),
};

async function mockRuntime(page: Page) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/fund-manager/preferences/oddsmatcher")) {
      if (route.request().method() === "PUT") preferences = JSON.parse(route.request().postData() ?? "{}");
      return route.fulfill({ json: preferences });
    }
    if (url.includes(`/profiles/${profileId}/oddsmatcher/prospecting-drafts`)) {
      return route.fulfill({ status: 201, json: { created: true, sportsbook_bet: { sportsbook_bet_id: "ODD-DEMO-001" } } });
    }
    if (url.includes("/fund-manager/calculators/matched-betting/preview")) {
      return route.fulfill({ json: { selected_lay_stake: "9.62", liability: "35.59", pnl_if_back_wins: "-1.09", pnl_if_lay_wins: "-0.57", matched_result: "-1.09" } });
    }
    if (url.includes("/oddsmatcher")) {
      providerRequests += 1;
      return route.fulfill({ json: feed });
    }
    if (url.includes("/account-catalogue/source")) {
      return route.fulfill({ json: { schema_version: "1.0", records: [
        { catalogue_id: "williamhill", account_type: "Bookmaker", brand_name: "William Hill", short_display_name: "WH", foreground_colour: "#ffffff", background_colour: "#204a87", status: "Active" },
        { catalogue_id: "betfred", account_type: "Bookmaker", brand_name: "Betfred", short_display_name: "BF", foreground_colour: "#ffffff", background_colour: "#b00020", status: "Active" },
        { catalogue_id: "bet365", account_type: "Bookmaker", brand_name: "Bet365", short_display_name: "Bet365", foreground_colour: "#ffffff", background_colour: "#178d68", status: "Active" },
        { catalogue_id: "888sport", account_type: "Bookmaker", brand_name: "888sport", short_display_name: "888sport", foreground_colour: "#ffffff", background_colour: "#e35f17", status: "Active" },
        { catalogue_id: "smarkets", account_type: "Exchange", brand_name: "Smarkets", short_display_name: "Smarkets", foreground_colour: "#13233a", background_colour: "#8bd3ff", status: "Active" },
        { catalogue_id: "matchbook", account_type: "Exchange", brand_name: "Matchbook", short_display_name: "Matchbook", foreground_colour: "#ffffff", background_colour: "#d31d24", status: "Active" },
        { catalogue_id: "betfair", account_type: "Exchange", brand_name: "Betfair Exchange", short_display_name: "Betfair", foreground_colour: "#111111", background_colour: "#ffb80c", status: "Active" },
      ] } });
    }
    if (/\/profiles\/?$/.test(new URL(url).pathname)) {
      return route.fulfill({ json: [{ profile_id: profileId, display_name: "ALPHA-001 Synthetic", status: "active" }] });
    }
    if (url.includes("/auth/session")) {
      return route.fulfill({ json: { authenticated: true, email: "alpha-owner@example.invalid", linked_profile_ids: [profileId], name: "Alpha Owner", role: "fund_manager" } });
    }
    if (url.includes("/auth/activity")) return route.fulfill({ status: 204 });
    if (url.includes("/auth/security-preference")) return route.fulfill({ json: { configured: false } });
    if (url.includes("/fund-manager/notifications")) return route.fulfill({ json: [] });
    if (url.includes("/fund-manager/import-executions")) return route.fulfill({ json: [] });
    return route.continue();
  });
}

test("renders, filters, paginates and inspects the bounded Alpha", async ({ page }) => {
  test.setTimeout(90_000);
  providerRequests = 0;
  await fs.mkdir(evidenceDirectory, { recursive: true });
  await mockRuntime(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/oddsmatcher");

  await expect(page.getByRole("heading", { name: "Oddsmatcher" })).toBeVisible();
  await expect(page.getByLabel("Oddsmatcher Profile context")).toHaveValue("");
  await page.screenshot({ path: path.join(evidenceDirectory, "F-oddsmatcher-global-desktop.png"), fullPage: true });
  await page.getByLabel("Oddsmatcher Profile context").selectOption(profileId);
  await expect(page).toHaveURL(new RegExp(`profileId=${profileId}`));
  await expect(page.getByText("Page 1 of 3 · 34 rows").first()).toBeVisible();
  await expect(page.getByText("Liquidity unknown").first()).toBeVisible();
  const refreshButton = page.getByRole("button", { name: "Refresh opportunities" });
  await expect(refreshButton.locator(".material-symbols-outlined")).toHaveText("refresh");
  await expect(refreshButton.locator("span")).toHaveCount(1);
  for (const heading of ["Date", "Event", "Bet", "Back Odds", "Lay Odds", "Rating", "Actions"]) {
    await expect(page.locator(".oddsmatcher-table thead").getByText(heading, { exact: true })).toBeVisible();
  }
  await expect(page.locator(".oddsmatcher-table tbody tr").first().locator(".oddsmatcher-event-icon")).toBeVisible();
  await expect(page.locator(".oddsmatcher-table tbody tr").first().locator(".oddsmatcher-quote-block")).toHaveCount(2);
  await expect(page.locator(".oddsmatcher-table tbody tr").first()).not.toContainText(/^WH$|^BF$/);
  await expect(page.locator(".oddsmatcher-table tbody tr").first().locator(".oddsmatcher-rating-pill")).toBeVisible();
  await expect(page.locator(".oddsmatcher-table tbody tr").first().locator(".oddsmatcher-rating-pill")).toHaveText(/^[0-9]+\.[0-9]{2}%$/);
  await page.locator(".oddsmatcher-table tbody tr").first().screenshot({ path: path.join(evidenceDirectory, "L-quote-block-close-up.png") });
  await expect(page.locator(".oddsmatcher-table tbody tr").first().locator(".table-action-row .table-action-button")).toHaveCount(2);
  expect((await page.locator(".oddsmatcher-table tbody tr").first().locator(".table-action-row").boundingBox())?.width ?? 999).toBeLessThan(100);
  await page.locator(".oddsmatcher-table tbody tr").first().locator("td:nth-child(2)").click();
  await expect(page.getByRole("dialog", { name: "Oddsmatcher Bet Summary" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator(".oddsmatcher-table tbody tr").first().getByRole("button", { name: /^Copy/ }).click();
  await expect(page.getByRole("dialog", { name: "Oddsmatcher Bet Summary" })).toHaveCount(0);
  const requestsBeforeClientFilters = providerRequests;
  const desktopMeasurements = await page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
    };
    const headers = [...document.querySelectorAll(".oddsmatcher-table thead th")].map((node) => {
      const rect = node.getBoundingClientRect();
      return { label: node.textContent?.trim() ?? "", width: rect.width };
    });
    const quoteBoxes = [...document.querySelectorAll(".oddsmatcher-table tbody tr:first-child .oddsmatcher-quote-block")].map((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    const actionIcons = [...document.querySelectorAll(".oddsmatcher-table tbody tr:first-child .table-action-button .material-symbols-outlined")].map((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    const providerName = document.querySelector(".oddsmatcher-table tbody tr:first-child .oddsmatcher-quote-provider strong");
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      row: box(".oddsmatcher-table tbody tr"),
      quote: box(".oddsmatcher-table tbody tr .oddsmatcher-quote-block"),
      quoteHeader: box(".oddsmatcher-table tbody tr .oddsmatcher-quote-provider"),
      quoteBody: box(".oddsmatcher-table tbody tr .oddsmatcher-quote-price"),
      rating: box(".oddsmatcher-table tbody tr .oddsmatcher-rating-pill"),
      actions: box(".oddsmatcher-table tbody tr .table-action-row"),
      quoteBoxes,
      quoteGap: quoteBoxes.length === 2 ? quoteBoxes[1].x - (quoteBoxes[0].x + quoteBoxes[0].width) : null,
      providerNameFontSize: providerName ? getComputedStyle(providerName).fontSize : null,
      externalIcon: box(".oddsmatcher-table tbody tr .oddsmatcher-quote-link .material-symbols-outlined"),
      actionIcons,
      headers,
    };
  });
  const liquidityLabel = page.getByText("Liquidity unknown", { exact: true }).first();
  await expect(liquidityLabel).toBeVisible();
  expect((await liquidityLabel.boundingBox())?.height).toBeLessThan(44);
  await expect(page.getByRole("button", { name: "Add Prospecting Draft" })).toHaveCount(0);
  await page.screenshot({ path: path.join(evidenceDirectory, "G-oddsmatcher-profile-context-desktop.png"), fullPage: true });
  await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
  await page.screenshot({ path: path.join(evidenceDirectory, "01b-table-shell-light.png"), fullPage: true });
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });

  await page.getByRole("searchbox", { name: "Search Oddsmatcher events" }).fill("Demo City 33");
  await expect(page.getByText("Page 1 of 1 · 1 row").first()).toBeVisible();
  expect(providerRequests).toBe(requestsBeforeClientFilters);
  await page.getByRole("searchbox", { name: "Search Oddsmatcher events" }).fill("");
  await expect(page.getByText("Page 1 of 3 · 34 rows").first()).toBeVisible();

  const toolbar = page.locator('[data-pd-id="oddsmatcher.filters"]');
  const closeDesktopFilter = async () => {
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
  };

  await toolbar.getByRole("button", { name: /^Back/ }).click();
  const backPopover = page.getByRole("dialog", { name: "Back filter" });
  expect((await backPopover.boundingBox())?.width ?? 999).toBeLessThanOrEqual(440);
  await expect(backPopover.getByRole("heading")).toHaveCount(0);
  const bookmakerCombo = backPopover.getByRole("combobox", { name: "Bookmakers" });
  await bookmakerCombo.fill("will");
  await expect(backPopover.getByRole("option", { name: /William Hill/ })).toBeVisible();
  await expect(backPopover.getByRole("option", { name: /Betfred/ })).toHaveCount(0);
  await page.screenshot({ path: path.join(evidenceDirectory, "01-back-search-results.png"), fullPage: true });
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await bookmakerCombo.fill("bet");
  await backPopover.getByRole("option", { name: /Betfred/ }).click();
  await expect(backPopover.getByRole("button", { name: "Remove William Hill" })).toBeVisible();
  await expect(backPopover.getByRole("button", { name: "Remove Betfred" })).toBeVisible();
  await bookmakerCombo.fill("");
  await backPopover.getByRole("option", { name: /William Hill/ }).click();
  await expect(backPopover.getByRole("button", { name: /^Remove / })).toHaveCount(2);
  await page.screenshot({ path: path.join(evidenceDirectory, "02-back-multiple-selections.png"), fullPage: true });
  await bookmakerCombo.focus();
  await bookmakerCombo.press("Backspace");
  await expect(backPopover.getByRole("button", { name: "Remove Betfred" })).toHaveCount(0);
  await bookmakerCombo.fill("betfred");
  await bookmakerCombo.press("Enter");
  await backPopover.getByLabel("Min. back odds").fill("2");
  const backButton = toolbar.getByRole("button", { name: /^Back/ });
  await expect(backButton.locator(".table-filter-badge")).toHaveText("3");
  await backPopover.getByRole("button", { name: "Remove Betfred" }).click();
  await expect(backButton.locator(".table-filter-badge")).toHaveText("2");
  await backPopover.getByRole("button", { name: "Clear all bookmakers" }).click();
  await expect(backButton.locator(".table-filter-badge")).toHaveText("1");
  await backPopover.getByRole("button", { name: "Reset" }).click();
  await expect(backButton.locator(".table-filter-badge")).toHaveCount(0);
  await bookmakerCombo.fill("will");
  await page.keyboard.press("Enter");
  await bookmakerCombo.fill("betfred");
  await page.keyboard.press("Enter");
  await closeDesktopFilter();
  await expect(backButton).toBeFocused();

  await toolbar.getByRole("button", { name: /^Lay/ }).click();
  const layPopover = page.getByRole("dialog", { name: "Lay filter" });
  const exchangeCombo = layPopover.getByRole("combobox", { name: "Exchanges" });
  await exchangeCombo.fill("match");
  await page.keyboard.press("Enter");
  await exchangeCombo.fill("smarket");
  await page.keyboard.press("Enter");
  await expect(layPopover.getByRole("button", { name: /^Remove / })).toHaveCount(2);
  await page.screenshot({ path: path.join(evidenceDirectory, "03-lay-multiple-selections.png"), fullPage: true });
  await layPopover.getByLabel("Min. lay liquidity").fill("10");
  await expect(page.getByText(/Page 1 of 1 · 0 rows/).first()).toBeVisible();
  await layPopover.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByText(/Page 1 of \d+ · [1-9]\d* rows/).first()).toBeVisible();
  await expect(toolbar.getByRole("button", { name: /^Lay/ }).locator(".table-filter-badge")).toHaveCount(0);
  await exchangeCombo.fill("match");
  await page.keyboard.press("Enter");
  await exchangeCombo.fill("smarket");
  await page.keyboard.press("Enter");
  await closeDesktopFilter();

  await toolbar.getByRole("button", { name: /^Selection/ }).click();
  const selectionPopover = page.getByRole("dialog", { name: "Selection filter" });
  const competitionCombo = selectionPopover.getByRole("combobox", { name: "Competition" });
  await competitionCombo.fill("champ");
  await selectionPopover.getByRole("option", { name: "UEFA Champions League" }).click();
  const eventCombo = selectionPopover.getByRole("combobox", { name: "Event" });
  await eventCombo.fill("Demo City 33");
  await selectionPopover.getByRole("option", { name: "Demo City 33 v Demo United 33" }).click();
  const selectionCombo = selectionPopover.getByRole("combobox", { name: "Selection" });
  await selectionCombo.fill("draw");
  await selectionPopover.getByRole("option", { name: "Draw" }).click();
  await expect(selectionPopover.getByRole("button", { name: "Remove UEFA Champions League" })).toBeVisible();
  await expect(selectionPopover.getByRole("button", { name: "Remove Demo City 33 v Demo United 33" })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDirectory, "04-selection-panel.png"), fullPage: true });
  const selectionButton = toolbar.getByRole("button", { name: /^Selection/ });
  await expect(selectionButton.locator(".table-filter-badge")).toHaveText("3");
  const badgeAndLabel = await selectionButton.evaluate((node) => {
    const label = node.querySelector("span:first-child")?.getBoundingClientRect();
    const badge = node.querySelector(".table-filter-badge")?.getBoundingClientRect();
    return label && badge ? { badgeTop: badge.top, labelTop: label.top } : null;
  });
  expect(badgeAndLabel).not.toBeNull();
  expect(Math.abs((badgeAndLabel?.badgeTop ?? 0) - (badgeAndLabel?.labelTop ?? 0))).toBeLessThan(10);
  await competitionCombo.fill("premier");
  await selectionPopover.getByRole("option", { name: "Premier League" }).click();
  await selectionPopover.getByRole("button", { name: "Remove UEFA Champions League" }).click();
  await expect(selectionPopover.getByText("Demo City 33 v Demo United 33", { exact: true })).toHaveCount(0);
  await expect(selectionButton.locator(".table-filter-badge")).toHaveText("2");
  await selectionPopover.getByRole("button", { name: "Reset" }).click();
  await competitionCombo.fill("champ");
  await selectionPopover.getByRole("option", { name: "UEFA Champions League" }).click();
  await closeDesktopFilter();

  await toolbar.getByRole("button", { name: /^Start time/ }).click();
  const startPopover = page.getByRole("dialog", { name: "Start time filter" });
  const startCombo = startPopover.getByRole("combobox", { name: "Event start time" });
  await startCombo.focus();
  for (const group of ["Starting soon", "By day", "Custom"]) await expect(startPopover.getByRole("group", { name: group })).toBeVisible();
  for (const option of ["Any time", "Within 30 mins", "Within 1 hour", "Within 2 hours", "Within 4 hours", "Within 8 hours", "Within 12 hours", "Within 24 hours", "Today", "Tomorrow", "Next 3 days", "Custom range"]) {
    await expect(startPopover.getByRole("option", { name: option })).toBeVisible();
  }
  await page.screenshot({ path: path.join(evidenceDirectory, "05-start-time-grouped-list.png"), fullPage: true });
  await startPopover.getByRole("option", { name: "Custom range" }).click();
  await startPopover.getByRole("textbox", { name: "From" }).fill("2026-10-25T10:00");
  await startPopover.getByRole("textbox", { name: "To" }).fill("2026-10-26T18:00");
  await startPopover.getByRole("button", { name: "Reset" }).click();
  await startCombo.focus();
  await startPopover.getByRole("option", { name: "Within 24 hours" }).click();
  await expect(startCombo).toHaveValue("Within 24 hours");
  await expect(toolbar.getByRole("button", { name: /^Start time/ }).locator(".table-filter-badge")).toHaveText("1");
  await page.screenshot({ path: path.join(evidenceDirectory, "06-start-time-selected-preset.png"), fullPage: true });
  await closeDesktopFilter();

  await toolbar.getByRole("button", { name: /^Rating/ }).click();
  const ratingPopover = page.getByRole("dialog", { name: "Rating filter" });
  await ratingPopover.getByLabel("Min. rating").fill("95");
  await ratingPopover.getByLabel("Show arbs").check();
  await expect(toolbar.getByRole("button", { name: /^Rating/ }).locator(".table-filter-badge")).toHaveText("2");
  await closeDesktopFilter();
  expect(providerRequests).toBe(requestsBeforeClientFilters);

  await page.getByRole("button", { name: /^Open Bet Summary/ }).first().click();
  const dialog = page.getByRole("dialog", { name: "Oddsmatcher Bet Summary" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Liquidity unknown");
  await expect(dialog).toContainText("Required lay stake");
  await expect(dialog.getByRole("button", { name: "Add Prospecting Draft" })).toBeEnabled();
  await expect(dialog).not.toContainText("Place Bet");
  await dialog.getByRole("checkbox", { name: /Advanced/ }).check();
  await expect(dialog.getByRole("group", { name: "Lay strategy" })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDirectory, "J-bet-summary-desktop.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  const settingsButton = page.locator('[data-pd-id="oddsmatcher.settings.open"]');
  await settingsButton.click();
  await expect(page.getByRole("dialog", { name: "Oddsmatcher settings" })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDirectory, "10-settings.png"), fullPage: true });
  await page.getByLabel("Default back stake").fill("12.50");
  await page.getByLabel("Smarkets commission (%)").fill("2");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(settingsButton).toBeFocused();
  expect(preferences.default_back_stake).toBe("12.50");
  expect(preferences.exchange_commission_overrides).toEqual({ smarkets: "0.02" });
  expect(providerRequests).toBe(requestsBeforeClientFilters);

  await page.getByRole("button", { name: "My Filters" }).click();
  expect((await page.getByRole("dialog", { name: "My Filters" }).boundingBox())?.width ?? 999).toBeLessThanOrEqual(440);
  await page.getByRole("button", { name: "Save as…" }).click();
  await page.getByRole("dialog", { name: "Save filter preset" }).getByLabel("Name").fill("Championship value");
  await page.getByRole("dialog", { name: "Save filter preset" }).getByLabel(/Description/).fill("Champions League with selected providers and rating controls");
  await page.getByRole("button", { name: "Save preset" }).click();
  await expect(page.getByText("Championship value", { exact: true })).toBeVisible();
  await expect(page.getByText("Champions League with selected providers and rating controls", { exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDirectory, "11-my-filters.png"), fullPage: true });
  await page.getByRole("button", { name: "Edit Championship value" }).click();
  await page.getByRole("dialog", { name: "Edit Championship value" }).getByLabel("Name").fill("Championship value renamed");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog", { name: "Edit Championship value" })).toHaveCount(0);
  await expect(page.getByText("Championship value renamed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close My Filters" }).click();
  expect(providerRequests).toBe(requestsBeforeClientFilters);
  await page.reload();
  await settingsButton.click();
  await expect(page.getByLabel("Smarkets commission (%)")).toHaveValue("2");
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "My Filters" }).click();
  await expect(page.getByText("Championship value renamed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.locator('[data-pd-id="oddsmatcher.filters"]').getByRole("button", { name: /Selection 1/ })).toBeVisible();
  await toolbar.getByRole("button", { name: /^Back/ }).click();
  await expect(page.getByRole("dialog", { name: "Back filter" }).getByRole("button", { name: "Remove William Hill" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Back filter" }).getByRole("button", { name: "Remove Betfred" })).toBeVisible();
  await closeDesktopFilter();
  await toolbar.getByRole("button", { name: /^Lay/ }).click();
  await expect(page.getByRole("dialog", { name: "Lay filter" }).getByRole("button", { name: "Remove Matchbook" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Lay filter" }).getByRole("button", { name: "Remove Smarkets" })).toBeVisible();
  await closeDesktopFilter();
  await toolbar.getByRole("button", { name: /^Start time/ }).click();
  await expect(page.getByRole("combobox", { name: "Event start time" })).toHaveValue("Within 24 hours");
  await closeDesktopFilter();
  await page.locator('[data-pd-id="oddsmatcher.filters"]').getByRole("button", { name: /^Rating/ }).click();
  await page.getByLabel("Min. rating").fill("96");
  await closeDesktopFilter();
  await page.getByRole("button", { name: "My Filters" }).click();
  await expect(page.getByText("Active preset · modified")).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect((preferences.saved_filters[0].filters as { minRating: string }).minRating).toBe("96");
  await page.getByRole("button", { name: "Close My Filters" }).click();
  await page.getByRole("button", { name: "My Filters" }).click();
  await page.getByRole("button", { name: "Delete Championship value renamed" }).click();
  await expect(page.getByText("No saved filters", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close My Filters" }).click();
  const requestsBeforeClear = providerRequests;
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByText("Page 1 of 3 · 34 rows").first()).toBeVisible();
  await expect(page.getByLabel("Oddsmatcher Profile context")).toHaveValue(profileId);
  expect(providerRequests).toBe(requestsBeforeClear);

  const desktopGeometry = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    tableScrollWidth: document.querySelector('.oddsmatcher-desktop-results')?.scrollWidth ?? 0,
    tableClientWidth: document.querySelector('.oddsmatcher-desktop-results')?.clientWidth ?? 0,
  }));
  expect(desktopGeometry.bodyWidth).toBeLessThanOrEqual(desktopGeometry.viewportWidth);

  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(page.locator(".oddsmatcher-desktop-results")).toBeVisible();
  const containedColumns = await page.evaluate(() => {
    const table = document.querySelector(".oddsmatcher-table")?.getBoundingClientRect();
    const rating = document.querySelector(".oddsmatcher-table tbody td:nth-child(6)")?.getBoundingClientRect();
    const actions = document.querySelector(".oddsmatcher-table tbody td:nth-child(7)")?.getBoundingClientRect();
    return table && rating && actions ? { tableRight: table.right, ratingRight: rating.right, actionsRight: actions.right } : null;
  });
  expect(containedColumns).not.toBeNull();
  expect(containedColumns?.ratingRight).toBeLessThanOrEqual(containedColumns?.tableRight ?? 0);
  expect(containedColumns?.actionsRight).toBeLessThanOrEqual(containedColumns?.tableRight ?? 0);

  await page.setViewportSize({ width: 1150, height: 900 });
  await expect(page.locator(".oddsmatcher-mobile-results")).toBeVisible();
  await expect(page.locator(".oddsmatcher-desktop-results")).toBeHidden();

  await page.setViewportSize({ width: 760, height: 900 });
  await expect(page.locator(".oddsmatcher-mobile-results")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDirectory, "G2-oddsmatcher-compact-desktop.png"), fullPage: true });
  const compactMeasurements = await page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
    };
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      card: box(".oddsmatcher-opportunity-card"),
      quoteGroup: box(".oddsmatcher-opportunity-card .oddsmatcher-card-quotes"),
      quote: box(".oddsmatcher-opportunity-card .oddsmatcher-quote-block"),
      actions: box(".oddsmatcher-opportunity-card .oddsmatcher-card-topline .table-action-row"),
      rating: box(".oddsmatcher-opportunity-card .oddsmatcher-rating-pill"),
    };
  });
  await page.setViewportSize({ width: 600, height: 900 });
  await expect(page.locator(".oddsmatcher-mobile-results")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Oddsmatcher" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Filters(?: \d+)?$/ })).toBeVisible();
  await expect(page.locator(".oddsmatcher-opportunity-card").first()).toBeVisible();
  const firstCard = page.locator(".oddsmatcher-opportunity-card").first();
  const topActions = await firstCard.locator(".oddsmatcher-card-topline .table-action-row").boundingBox();
  const quotes = await firstCard.locator(".oddsmatcher-card-quotes").boundingBox();
  expect(topActions?.y ?? 9999).toBeLessThan(quotes?.y ?? 0);
  expect(topActions?.width ?? 999).toBeLessThan(100);
  await expect(firstCard.locator(".oddsmatcher-card-quotes .oddsmatcher-quote-block")).toHaveCount(2);
  const narrowGeometry = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(narrowGeometry.bodyWidth).toBeLessThanOrEqual(narrowGeometry.viewportWidth);
  const narrowMeasurements = await page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
    };
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      card: box(".oddsmatcher-opportunity-card"),
      quoteGroup: box(".oddsmatcher-opportunity-card .oddsmatcher-card-quotes"),
      quote: box(".oddsmatcher-opportunity-card .oddsmatcher-quote-block"),
      actions: box(".oddsmatcher-opportunity-card .oddsmatcher-card-topline .table-action-row"),
      rating: box(".oddsmatcher-opportunity-card .oddsmatcher-rating-pill"),
    };
  });
  await fs.writeFile(
    path.join(evidenceDirectory, "pd-measurements.json"),
    `${JSON.stringify({ desktop: desktopMeasurements, compact: compactMeasurements, narrow: narrowMeasurements }, null, 2)}\n`,
  );
  await page.screenshot({ path: path.join(evidenceDirectory, "I-oddsmatcher-narrow-stacked.png"), fullPage: true });
  const narrowFiltersButton = page.getByRole("button", { name: /^Filters(?: \d+)?$/ });
  await narrowFiltersButton.click();
  await expect(page.getByRole("dialog", { name: "Oddsmatcher filters" })).toBeVisible();
  const narrowBookmakerCombo = page.getByRole("dialog", { name: "Oddsmatcher filters" }).getByRole("combobox", { name: "Bookmakers" });
  await narrowBookmakerCombo.fill("will");
  await expect(page.getByRole("dialog", { name: "Oddsmatcher filters" }).getByRole("option", { name: /William Hill/ })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDirectory, "07-narrow-searchable-filter.png"), fullPage: true });
  const narrowOptions = await page.getByRole("dialog", { name: "Oddsmatcher filters" }).getByRole("listbox", { name: "Bookmakers options" }).boundingBox();
  expect(narrowOptions?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((narrowOptions?.x ?? 0) + (narrowOptions?.width ?? 9999)).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Oddsmatcher filters" })).toBeHidden();
  await expect(narrowFiltersButton).toBeFocused();
  await page.getByRole("button", { name: /^Open Bet Summary/ }).first().click();
  await expect(page.getByRole("dialog", { name: "Oddsmatcher Bet Summary" })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDirectory, "J-bet-summary-narrow.png"), fullPage: true });
});
