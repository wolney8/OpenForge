import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const profileId = "profile-demo-001";
const evidenceDirectory = path.resolve(
  "data/private/evidence/cp082-owner-smoke-20261024",
);

function opportunity(index: number) {
  const selection = index % 3 === 0 ? "DRAW" : index % 3 === 1 ? "HOME" : "AWAY";
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
    back: { provider_key: "bookmaker_a", provider_name: "Bookmaker A", account_name: "Bookmaker A", odds: "4.50", observed_at: "2026-10-23T14:00:00Z", link: "https://example.invalid/back" },
    lay: { provider_key: "smarkets", provider_name: "Smarkets", account_name: "Smarkets", odds: "4.70", observed_at: "2026-10-23T14:00:05Z", link: "https://example.invalid/lay" },
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
    if (url.includes(`/profiles/${profileId}/oddsmatcher/prospecting-drafts`)) {
      return route.fulfill({ status: 201, json: { created: true, sportsbook_bet: { sportsbook_bet_id: "ODD-DEMO-001" } } });
    }
    if (url.includes("/fund-manager/calculators/matched-betting/preview")) {
      return route.fulfill({ json: { selected_lay_stake: "9.62", liability: "35.59", pnl_if_back_wins: "-1.09", pnl_if_lay_wins: "-0.57", matched_result: "-1.09" } });
    }
    if (url.includes("/oddsmatcher")) {
      return route.fulfill({ json: feed });
    }
    if (/\/profiles\/?(?:\?.*)?$/.test(new URL(url).pathname)) {
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
  const liquidityLabel = page.getByText("Liquidity unknown", { exact: true }).first();
  await expect(liquidityLabel).toBeVisible();
  expect((await liquidityLabel.boundingBox())?.height).toBeLessThan(44);
  await expect(page.getByRole("button", { name: "Add Prospecting Draft" })).toHaveCount(0);
  await page.screenshot({ path: path.join(evidenceDirectory, "G-oddsmatcher-profile-context-desktop.png"), fullPage: true });
  await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
  await page.screenshot({ path: path.join(evidenceDirectory, "01b-table-shell-light.png"), fullPage: true });
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });

  await page.getByRole("button", { name: /^Selection/ }).click();
  await page.screenshot({ path: path.join(evidenceDirectory, "H-oddsmatcher-filter-drawer.png"), fullPage: true });
  await page.getByLabel("Selection").selectOption("DRAW");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page.locator('[data-pd-id="oddsmatcher.filters"]').getByRole("button", { name: /^Rating/ }).click();
  await page.getByLabel("Minimum rating").selectOption("95");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Draw");
  await expect(page.getByText(/Page 1 of \d+ · \d+ rows/).first()).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDirectory, "02-filtered-ranked-results.png"), fullPage: true });

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
  await page.keyboard.press("Escape");
  await expect(settingsButton).toBeFocused();

  const desktopGeometry = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    tableScrollWidth: document.querySelector('.oddsmatcher-desktop-results')?.scrollWidth ?? 0,
    tableClientWidth: document.querySelector('.oddsmatcher-desktop-results')?.clientWidth ?? 0,
  }));
  expect(desktopGeometry.bodyWidth).toBeLessThanOrEqual(desktopGeometry.viewportWidth);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Oddsmatcher" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Filters(?: \d+)?$/ })).toBeVisible();
  await expect(page.locator(".oddsmatcher-opportunity-card").first()).toBeVisible();
  const narrowGeometry = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(narrowGeometry.bodyWidth).toBeLessThanOrEqual(narrowGeometry.viewportWidth);
  await page.screenshot({ path: path.join(evidenceDirectory, "I-oddsmatcher-narrow-stacked.png"), fullPage: true });
  await page.getByRole("button", { name: /^Open Bet Summary/ }).first().click();
  await expect(page.getByRole("dialog", { name: "Oddsmatcher Bet Summary" })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDirectory, "J-bet-summary-narrow.png"), fullPage: true });
});
