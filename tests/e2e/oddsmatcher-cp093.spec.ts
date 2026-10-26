import { expect, test, type Page } from "@playwright/test";

const snapshotId = "20261026T203500000000Z-123456789abc";
const profileId = "profile-demo-001";
const opportunity = {
  opportunity_id: "soccer_epl:event-1:h2h:HOME", provider: "The Odds API",
  competition_key: "soccer_epl", competition: "Premier League", event_id: "event-1",
  event_name: "Demo City v Demo United", starts_at: "2026-10-27T15:00:00Z",
  selection_key: "HOME", selection: "Demo City", market_key: "h2h", market: "Match Odds / 1X2",
  back: { provider_key: "williamhill", provider_name: "William Hill", account_name: "William Hill", odds: "4.50", observed_at: "2026-10-26T20:34:50Z", link: "https://example.invalid/back" },
  lay: { provider_key: "smarkets", provider_name: "Smarkets", account_name: "Smarkets", odds: "4.70", observed_at: "2026-10-26T20:34:55Z", link: null },
  display_rating: "95.74", commission_aware_rating: "95.74", exchange_commission: "0", commission_origin: "oddsmatcher-default",
  standard_lay_stake: "9.62", liability: "35.59", pnl_if_back_wins: "-1.09", pnl_if_lay_wins: "-0.57", conservative_result: "-1.09",
  liquidity_state: "UNKNOWN", freshness: "fresh", age_seconds: 30,
  back_eligibility: { state: "eligible", reason: "Eligible", account_id: "account-b" },
  lay_eligibility: { state: "eligible", reason: "Eligible", account_id: "account-l" },
  can_create_prospecting_draft: true,
};
const liveFeed = {
  provider: "The Odds API", fetched_at: "2026-10-26T20:35:00Z", state: "fresh", warning: null,
  manual_refresh_only: true, data_source: "live", replay_snapshot_id: null, replay_captured_at: null,
  competitions: ["Premier League", "Championship", "UEFA Champions League"], event_count: 1,
  bookmaker_count: 1, exchange_count: 1, provider_credits_used: 495,
  provider_credits_remaining: 5, provider_last_refresh_cost: 3, opportunities: [opportunity], excluded: [],
  provider_quota_exhausted: false,
};
const replayFeed = {
  ...liveFeed,
  state: "stale",
  data_source: "replay",
  replay_snapshot_id: snapshotId,
  replay_captured_at: liveFeed.fetched_at,
  opportunities: [{ ...opportunity, freshness: "stale", can_create_prospecting_draft: false, back: { ...opportunity.back, link: null } }],
};

async function mockRuntime(page: Page) {
  let refreshRequests = 0;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/fund-manager/preferences/oddsmatcher")) return route.fulfill({ json: { version: 1, default_back_stake: "10.00", exchange_commission_overrides: {}, excluded_bookmaker_identities: [], excluded_exchange_identities: [], show_arbs_default: false, default_advanced: false, saved_filters: [] } });
    if (url.pathname.endsWith(`/oddsmatcher/snapshots/${snapshotId}`)) return route.fulfill({ json: replayFeed });
    if (url.pathname.endsWith("/oddsmatcher/snapshots")) return route.fulfill({ json: [{ snapshot_id: snapshotId, captured_at: liveFeed.fetched_at, provider: "The Odds API", competitions: liveFeed.competitions, event_count: 1, bookmaker_count: 1, exchange_count: 1 }] });
    if (url.pathname.endsWith("/oddsmatcher/refresh")) {
      refreshRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 100));
      return route.fulfill({ json: liveFeed });
    }
    if (url.pathname.endsWith("/oddsmatcher")) return route.fulfill({ json: liveFeed });
    if (url.pathname.endsWith("/fund-manager/calculators/matched-betting/preview")) return route.fulfill({ json: { selected_lay_stake: "9.62", reference_lay_stake_standard: "9.62", reference_lay_stake_underlay: "9.00", reference_lay_stake_overlay: "10.20", liability: "35.59", pnl_if_back_wins: "-1.09", pnl_if_lay_wins: "-0.57", matched_result: "-1.09", outcomes: [{ key: "back-wins", label: "Back wins", bookmaker_component: "35.00", exchange_component: "-35.59", total: "-1.09" }, { key: "lay-wins", label: "Lay wins", bookmaker_component: "-10.00", exchange_component: "9.43", total: "-0.57" }], strategy_references: [] } });
    if (url.pathname.endsWith("/account-catalogue/source")) return route.fulfill({ json: { schema_version: "1.0", records: [] } });
    if (/\/profiles\/?$/.test(url.pathname)) return route.fulfill({ json: [{ profile_id: profileId, display_name: "ALPHA-001 Synthetic", status: "active" }] });
    if (url.pathname.endsWith("/auth/session")) return route.fulfill({ json: { authenticated: true, email: "owner@example.invalid", linked_profile_ids: [profileId], name: "Owner", role: "fund_manager" } });
    if (url.pathname.endsWith("/auth/activity")) return route.fulfill({ status: 204 });
    if (url.pathname.includes("/fund-manager/notifications")) return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: {} });
  });
  return () => refreshRequests;
}

test("CP-093 shows provider quota and coalesces live manual refresh", async ({ page }) => {
  const requestCount = await mockRuntime(page);
  await page.goto(`/oddsmatcher?profileId=${profileId}`);
  await expect(page.getByText("Provider credits: 5 remaining")).toBeVisible();
  await expect(page.getByText("495 used")).toBeVisible();
  await expect(page.getByText("Last refresh: 3 credits")).toBeVisible();
  await expect(page.getByText("Provider quota is running low.")).toBeVisible();
  const refresh = page.getByRole("button", { name: "Refresh odds" });
  await refresh.dblclick();
  await expect(refresh).toBeEnabled();
  expect(requestCount()).toBe(1);
});

test("CP-093 replays a saved snapshot without provider calls or draft actions", async ({ page }) => {
  const requestCount = await mockRuntime(page);
  await page.goto(`/oddsmatcher?profileId=${profileId}`);
  await page.getByRole("button", { name: "Saved snapshot" }).click();
  await expect(page.getByText(/testing\/replay/)).toBeVisible();
  await expect(page.getByText("Draft creation and external quote links are disabled for replayed odds.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh unavailable in saved snapshot mode" })).toBeDisabled();
  await page.getByRole("searchbox", { name: "Search Oddsmatcher events" }).fill("No matching event");
  await expect(page.getByText("No opportunities match the current filters.").first()).toBeVisible();
  await page.getByRole("searchbox", { name: "Search Oddsmatcher events" }).fill("Demo City");
  const opportunityRow = page.getByRole("row", { name: /Open Bet Summary for Demo City/ });
  await expect(opportunityRow).toBeVisible();
  await opportunityRow.focus();
  await opportunityRow.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Oddsmatcher Bet Summary" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Replay · draft creation disabled")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Add Prospecting Draft" })).toBeDisabled();
  await expect(dialog.getByRole("link", { name: /Go to/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.setViewportSize({ width: 430, height: 900 });
  await expect(page.getByRole("button", { name: "Saved snapshot", exact: true })).toBeVisible();
  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
    sourceRight: document.querySelector("[data-pd-id='oddsmatcher.data-source']")?.getBoundingClientRect().right ?? 0,
  }));
  expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.sourceRight).toBeLessThanOrEqual(geometry.viewport + 1);
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await expect(page.getByText(/testing\/replay/)).toBeVisible();
  expect(requestCount()).toBe(0);
});
