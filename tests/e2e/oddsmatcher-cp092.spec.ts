import { expect, test, type Page } from "@playwright/test";

type FeedState = "empty-permitted" | "empty-blocked" | "stale";

const baseFeed = {
  provider: "The Odds API",
  fetched_at: null,
  state: "empty",
  warning: null,
  manual_refresh_only: true,
  competitions: ["Premier League", "Championship", "UEFA Champions League"],
  event_count: 0,
  bookmaker_count: 0,
  exchange_count: 0,
  credits_used_today: 0,
  provider_credits_used: null,
  provider_credits_remaining: null,
  daily_credit_ceiling: 25,
  opportunities: [],
  excluded: [],
};

const staleOpportunity = {
  opportunity_id: "event-1:h2h:HOME", provider: "The Odds API",
  competition_key: "soccer_epl", competition: "Premier League", event_id: "event-1",
  event_name: "Demo City v Demo United", starts_at: "2026-10-27T15:00:00Z",
  selection_key: "HOME", selection: "Demo City", market_key: "h2h", market: "Match Odds / 1X2",
  back: { provider_key: "williamhill", provider_name: "William Hill", account_name: "William Hill", odds: "4.50", observed_at: "2026-10-26T14:00:00Z", link: null },
  lay: { provider_key: "smarkets", provider_name: "Smarkets", account_name: "Smarkets", odds: "4.70", observed_at: "2026-10-26T14:00:05Z", link: null },
  display_rating: "95.74", commission_aware_rating: "95.74", exchange_commission: "0", commission_origin: "oddsmatcher-default",
  standard_lay_stake: "9.62", liability: "35.59", pnl_if_back_wins: "-1.09", pnl_if_lay_wins: "-0.57", conservative_result: "-1.09",
  liquidity_state: "UNKNOWN", freshness: "stale", age_seconds: 600,
  back_eligibility: { state: "eligible", reason: "Eligible", account_id: null },
  lay_eligibility: { state: "eligible", reason: "Eligible", account_id: null },
  can_create_prospecting_draft: false,
};

async function mockRuntime(page: Page, state: FeedState) {
  let refreshRequests = 0;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/fund-manager/preferences/oddsmatcher")) {
      return route.fulfill({ json: { version: 1, default_back_stake: "10.00", exchange_commission_overrides: {}, excluded_bookmaker_identities: [], excluded_exchange_identities: [], show_arbs_default: false, default_advanced: false, saved_filters: [] } });
    }
    if (url.pathname.endsWith("/oddsmatcher/refresh")) {
      refreshRequests += 1;
      return route.fulfill({ status: 429, json: { detail: "Manual refresh is paused because the configured daily provider credit ceiling would be exceeded." } });
    }
    if (url.pathname.endsWith("/oddsmatcher")) {
      if (state === "empty-blocked") return route.fulfill({ json: { ...baseFeed, credits_used_today: 24 } });
      if (state === "stale") return route.fulfill({ json: { ...baseFeed, fetched_at: "2026-10-26T14:01:00Z", state: "stale", warning: "Refresh failed. Showing the last successful data as stale.", event_count: 1, bookmaker_count: 1, exchange_count: 1, opportunities: [staleOpportunity] } });
      return route.fulfill({ json: baseFeed });
    }
    if (url.pathname.endsWith("/account-catalogue/source")) return route.fulfill({ json: { schema_version: "1.0", records: [] } });
    if (/\/profiles\/?$/.test(url.pathname)) return route.fulfill({ json: [] });
    if (url.pathname.endsWith("/auth/session")) return route.fulfill({ json: { authenticated: true, email: "owner@example.invalid", linked_profile_ids: [], name: "Owner", role: "fund_manager" } });
    if (url.pathname.endsWith("/auth/activity")) return route.fulfill({ status: 204 });
    if (url.pathname.includes("/fund-manager/notifications")) return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: {} });
  });
  return () => refreshRequests;
}

test("CP-092 separates the quota-blocked empty state and disables Refresh", async ({ page }) => {
  const refreshRequests = await mockRuntime(page, "empty-blocked");
  await page.goto("/oddsmatcher");
  const state = page.locator(".oddsmatcher-provider-state");
  await expect(state.locator(":scope > *")).toHaveText([
    "Manual refresh is paused because the configured daily provider credit ceiling would be exceeded.",
    "No odds snapshot is loaded.",
    "Refresh will be available when the provider budget resets.",
  ]);
  await expect(state).toHaveCSS("display", "grid");
  await expect(state).toHaveCSS("row-gap", "5.6px");
  await expect(state).not.toContainText("Use Refresh");
  await expect(page.getByRole("button", { name: /Refresh unavailable/ })).toBeDisabled();
  expect(refreshRequests()).toBe(0);
});

test("CP-092 gives one Refresh instruction when an empty snapshot can be loaded", async ({ page }) => {
  await mockRuntime(page, "empty-permitted");
  await page.goto("/oddsmatcher");
  const state = page.locator(".oddsmatcher-provider-state");
  await expect(state.locator(":scope > *")).toHaveText([
    "No odds snapshot is loaded.",
    "Use Refresh once to make one bounded provider request across the approved competitions.",
  ]);
  await expect(state).toHaveCSS("display", "grid");
  await expect(page.getByRole("button", { name: "Refresh odds" })).toBeEnabled();
});

test("CP-092 preserves a stale last-good snapshot", async ({ page }) => {
  await mockRuntime(page, "stale");
  await page.goto("/oddsmatcher");
  await expect(page.locator(".oddsmatcher-table tbody tr")).toHaveCount(1);
  await expect(page.getByText("Refresh failed. Showing the last successful data as stale.")).toBeVisible();
  await expect(page.getByText("No odds snapshot is loaded.")).toHaveCount(0);
});
