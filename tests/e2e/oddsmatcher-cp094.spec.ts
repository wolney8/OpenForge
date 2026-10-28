import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const evidence = path.resolve("data/private/evidence/cp094-oddsmatcher-summary-settings-20261027");
const cp099Evidence = path.resolve("data/private/evidence/cp099-oddsmatcher-auth-consistency-20261028");
const snapshotId = "20261026T203500Z-demo";
const profileId = "profile-demo-001";
const opportunity = {
  opportunity_id: "soccer_epl:event-1:h2h:HOME", provider: "The Odds API", competition_key: "soccer_epl", competition: "Premier League", event_id: "event-1",
  event_name: "Demo City v Demo United", starts_at: "2026-10-27T15:00:00Z", selection_key: "HOME", selection: "Demo City", market_key: "h2h", market: "Match Odds / 1X2",
  back: { provider_key: "williamhill", provider_name: "William Hill", account_name: "William Hill", odds: "4.05", observed_at: "2026-10-26T20:34:50Z", link: "https://example.invalid/back" },
  lay: { provider_key: "smarkets", provider_name: "Smarkets", account_name: "Smarkets", odds: "4.00", observed_at: "2026-10-26T20:34:55Z", link: null },
  display_rating: "101.25", commission_aware_rating: "100.75", exchange_commission: "0.005", commission_origin: "profile-account",
  standard_lay_stake: "10.14", liability: "30.42", pnl_if_back_wins: "0.08", pnl_if_lay_wins: "0.09", conservative_result: "0.08",
  liquidity_state: "UNKNOWN", freshness: "fresh", age_seconds: 30,
  back_eligibility: { state: "eligible", reason: "Eligible", account_id: "account-b" }, lay_eligibility: { state: "eligible", reason: "Eligible", account_id: "account-l" }, can_create_prospecting_draft: true,
};
const liveFeed = { provider: "The Odds API", fetched_at: "2026-10-26T20:35:00Z", state: "fresh", warning: null, manual_refresh_only: true, data_source: "live", replay_snapshot_id: null, replay_captured_at: null,
  competitions: ["Premier League"], event_count: 1, bookmaker_count: 1, exchange_count: 1, provider_credits_used: 49, provider_credits_remaining: 451, provider_last_refresh_cost: 3, provider_quota_exhausted: false, opportunities: [opportunity], excluded: [] };

function preview(body: Record<string, string>) {
  const scale = Number(body.back_stake || "10") / 10;
  const standard = (10.14 * scale).toFixed(2);
  const underlay = (Number(standard) * 0.98).toFixed(2);
  const overlay = (Number(standard) * 1.02).toFixed(2);
  const selected = body.strategy === "Underlay" ? underlay : body.strategy === "Overlay" ? overlay : body.strategy === "Custom" ? body.manual_lay_stake : standard;
  return { selected_lay_stake: selected, reference_lay_stake_standard: standard, reference_lay_stake_underlay: underlay, reference_lay_stake_overlay: overlay, liability: (Number(selected) * 3).toFixed(2), pnl_if_back_wins: "0.08", pnl_if_lay_wins: "0.09", matched_result: "0.08",
    outcomes: [{ key: "back-wins", label: "Back wins", bookmaker_component: "30.50", exchange_component: "-30.42", total: "0.08" }, { key: "lay-wins", label: "Lay wins", bookmaker_component: "-10.00", exchange_component: "10.09", total: "0.09" }],
    strategy_references: [{ strategy: "Underlay", lay_stake: underlay, liability: "29.82", back_wins_total: "0.68", back_loses_total: "-0.11" }, { strategy: "Standard", lay_stake: standard, liability: "30.42", back_wins_total: "0.08", back_loses_total: "0.09" }, { strategy: "Overlay", lay_stake: overlay, liability: "31.02", back_wins_total: "-0.52", back_loses_total: "0.29" }] };
}

async function mock(page: Page) {
  let preferences = { version: 1 as const, default_back_stake: "10.00", exchange_commission_overrides: {}, excluded_bookmaker_identities: [], excluded_exchange_identities: [], show_arbs_default: true, default_advanced: false, data_source: "live" as "live" | "replay", saved_snapshot_id: "", auto_update_back_odds: false, auto_update_lay_odds: false, saved_filters: [] };
  let refreshCalls = 0;
  await page.route("**/api/**", async route => {
    const request = route.request(); const url = new URL(request.url());
    if (url.pathname.endsWith("/fund-manager/preferences/oddsmatcher")) {
      if (request.method() === "PUT") preferences = request.postDataJSON();
      return route.fulfill({ json: preferences });
    }
    if (url.pathname.endsWith("/oddsmatcher/snapshots")) return route.fulfill({ json: [{ snapshot_id: snapshotId, captured_at: "2026-10-26T20:35:00Z", provider: "The Odds API", competitions: ["Premier League"], event_count: 1, bookmaker_count: 1, exchange_count: 1 }] });
    if (url.pathname.endsWith(`/oddsmatcher/snapshots/${snapshotId}`)) return route.fulfill({ json: { ...liveFeed, state: "stale", data_source: "replay", replay_snapshot_id: snapshotId, replay_captured_at: liveFeed.fetched_at, opportunities: [{ ...opportunity, freshness: "stale", can_create_prospecting_draft: false, back: { ...opportunity.back, link: null } }] } });
    if (url.pathname.endsWith("/oddsmatcher/refresh")) { refreshCalls += 1; return route.fulfill({ json: liveFeed }); }
    if (url.pathname.endsWith("/oddsmatcher")) return route.fulfill({ json: liveFeed });
    if (url.pathname.endsWith("/fund-manager/calculators/matched-betting/preview")) return route.fulfill({ json: preview(request.postDataJSON()) });
    if (url.pathname.endsWith("/account-catalogue/source")) return route.fulfill({ json: { schema_version: "1.0", records: [] } });
    if (/\/profiles\/?$/.test(url.pathname)) return route.fulfill({ json: [{ profile_id: profileId, display_name: "ALPHA-001 Synthetic", status: "active" }] });
    if (url.pathname.endsWith("/auth/session")) return route.fulfill({ json: { authenticated: true, email: "owner@example.invalid", linked_profile_ids: [profileId], name: "Owner", role: "fund_manager" } });
    if (url.pathname.endsWith("/auth/activity")) return route.fulfill({ status: 204 });
    if (url.pathname.endsWith("/auth/security-preference")) return route.fulfill({ json: { configured: false } });
    if (url.pathname.includes("/fund-manager/notifications")) return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: {} });
  });
  return { getPreferences: () => preferences, getRefreshCalls: () => refreshCalls };
}

test("CP-094 universal source settings and Bet Summary hierarchy", async ({ page }) => {
  test.setTimeout(60_000);
  await fs.mkdir(evidence, { recursive: true });
  await fs.mkdir(cp099Evidence, { recursive: true });
  const receipt = await mock(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/settings#oddsmatcher");
  await page.getByRole("tab", { name: "Oddsmatcher" }).click();
  const settingsPanel = page.locator('[data-pd-id="fund-manager-settings.oddsmatcher"]');
  await expect(settingsPanel).toBeVisible();
  const settingsSwitches = settingsPanel.getByRole("switch", { name: /Auto-update/ });
  await expect(settingsSwitches).toHaveCount(2);
  const settingsSwitchGeometry = await settingsSwitches.evaluateAll((switches) => switches.map((control) => {
    const track = control.querySelector<HTMLElement>(".material-switch-track")!;
    const row = control.parentElement!;
    return {
      controlWidth: control.getBoundingClientRect().width,
      rowWidth: row.getBoundingClientRect().width,
      trackHeight: track.getBoundingClientRect().height,
      trackWidth: track.getBoundingClientRect().width,
    };
  }));
  expect(settingsSwitchGeometry.every((item) => item.controlWidth < item.rowWidth * 0.75)).toBe(true);
  expect(new Set(settingsSwitchGeometry.map((item) => item.trackWidth)).size).toBe(1);
  expect(settingsSwitchGeometry.every((item) => item.trackWidth >= 51 && item.trackWidth <= 53)).toBe(true);
  expect(settingsSwitchGeometry.every((item) => item.trackHeight >= 31 && item.trackHeight <= 33)).toBe(true);
  await settingsPanel.getByText("Bet Summary defaults", { exact: true }).locator("xpath=..").screenshot({ path: path.join(cp099Evidence, "01-settings-compact-switches-desktop.png") });
  await fs.writeFile(path.join(cp099Evidence, "settings-switch-geometry.json"), JSON.stringify(settingsSwitchGeometry, null, 2));
  await settingsPanel.screenshot({ path: path.join(evidence, "01-fund-manager-oddsmatcher-settings.png") });
  await page.screenshot({ path: path.join(evidence, "02-live-source-settings-1440x1000.png") });
  await settingsPanel.getByRole("button", { name: "Saved Snapshot" }).click();
  await expect(settingsPanel.getByLabel("Saved Snapshot")).toHaveValue(snapshotId);
  await page.screenshot({ path: path.join(evidence, "03-saved-snapshot-settings-1440x1000.png") });
  await settingsPanel.getByRole("button", { name: "Save Oddsmatcher settings" }).click();
  await page.goto(`/oddsmatcher?profile_id=${profileId}`);
  await expect(page.locator('[data-pd-id="oddsmatcher.data-source-control"]')).toHaveCount(0);
  await expect(page.getByText(/testing\/replay/)).toBeVisible();
  await page.locator(".oddsmatcher-opportunity-card, .oddsmatcher-table tbody tr").first().click();
  let dialog = page.getByRole("dialog", { name: "Oddsmatcher Bet Summary" });
  await expect(dialog).toBeVisible();
  const replaySwitches = dialog.getByRole("switch", { name: /Auto-update/ });
  await expect(replaySwitches).toHaveCount(2);
  await expect(replaySwitches.nth(0)).toBeDisabled();
  await expect(replaySwitches.nth(1)).toBeDisabled();
  await page.screenshot({ path: path.join(evidence, "04-snapshot-summary-disabled-auto-update-1440x1000.png") });
  await dialog.getByRole("button", { name: "Close Bet Summary" }).click();

  await page.goto("/settings#oddsmatcher");
  await page.getByRole("tab", { name: "Oddsmatcher" }).click();
  await page.getByRole("button", { name: "Live", exact: true }).click();
  await page.getByRole("switch", { name: "Auto-update Back Odds" }).click();
  await page.getByRole("button", { name: "Save Oddsmatcher settings" }).click();
  expect(receipt.getPreferences()).toMatchObject({ data_source: "live", auto_update_back_odds: true, auto_update_lay_odds: false });
  await page.goto(`/oddsmatcher?profile_id=${profileId}`);
  await page.locator(".oddsmatcher-opportunity-card, .oddsmatcher-table tbody tr").first().click();
  dialog = page.getByRole("dialog", { name: "Oddsmatcher Bet Summary" });
  await expect(dialog.getByLabel("Bet Type")).toHaveValue("qualifying");
  await expect(dialog.getByRole("switch", { name: "Auto-update Back Odds" })).toHaveAttribute("aria-checked", "true");
  await expect(dialog.getByRole("switch", { name: "Auto-update Lay Odds" })).toHaveAttribute("aria-checked", "false");
  await page.screenshot({ path: path.join(evidence, "05-live-summary-1440x1000.png") });
  await dialog.getByRole("button", { name: "Open Bet Summary settings" }).click();
  const popover = page.getByRole("dialog", { name: "Bet Summary settings" });
  await expect(popover).toBeVisible();
  await popover.screenshot({ path: path.join(evidence, "06-summary-settings-popover.png") });
  await page.keyboard.press("Escape");
  await dialog.getByRole("switch", { name: "Advanced" }).click();
  await expect(dialog.getByLabel("Range Min")).toHaveValue("9.94");
  await expect(dialog.getByLabel("Lay strategy range")).toHaveAttribute("aria-valuenow", "10.14");
  await expect(dialog.getByLabel("Range Max")).toHaveValue("10.34");
  await page.screenshot({ path: path.join(evidence, "07-advanced-hierarchy-1440x1000.png") });
  await dialog.locator(".custom-slider-summary-layout").screenshot({ path: path.join(evidence, "08-valid-min-standard-max.png") });
  await dialog.getByRole("button", { name: "Underlay", exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: "Lay Stake" })).toHaveValue("9.94");
  await page.screenshot({ path: path.join(evidence, "09-underlay.png") });
  await dialog.getByRole("button", { name: "Overlay", exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: "Lay Stake" })).toHaveValue("10.34");
  await page.screenshot({ path: path.join(evidence, "10-overlay.png") });
  await dialog.getByLabel("Range Min").fill("9.80");
  await dialog.getByLabel("Range Max").fill("10.50");
  await dialog.getByRole("button", { name: "Close Bet Summary" }).click();
  await page.locator(".oddsmatcher-opportunity-card, .oddsmatcher-table tbody tr").first().click();
  dialog = page.getByRole("dialog", { name: "Oddsmatcher Bet Summary" });
  await dialog.getByRole("switch", { name: "Advanced" }).click();
  await expect(dialog.getByLabel("Range Min")).toHaveValue("9.94");
  await expect(dialog.getByLabel("Range Max")).toHaveValue("10.34");
  await page.setViewportSize({ width: 430, height: 900 });
  const geometry = await dialog.evaluate(node => ({ pageWidth: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth, dialogRight: node.getBoundingClientRect().right, placeAfterRange: Boolean(node.querySelector(".oddsmatcher-advanced-controls")?.compareDocumentPosition(node.querySelector('[data-pd-id="oddsmatcher.place-lay-stub"]')!) & Node.DOCUMENT_POSITION_FOLLOWING) }));
  expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.dialogRight).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.placeAfterRange).toBe(true);
  await page.screenshot({ path: path.join(evidence, "11-narrow-advanced-430x900.png") });
  expect(receipt.getRefreshCalls()).toBe(0);
  await fs.writeFile(path.join(evidence, "verification.json"), JSON.stringify({ viewport: { desktop: [1440, 1000], narrow: [430, 900] }, preferences: receipt.getPreferences(), providerRefreshCalls: receipt.getRefreshCalls(), geometry }, null, 2));
});
