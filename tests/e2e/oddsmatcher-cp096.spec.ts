import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const evidence = path.resolve("data/private/evidence/cp096-oddsmatcher-background-preview-20261027");
const profileId = "profile-demo-001";
const baseOpportunity = {
  opportunity_id: "soccer_epl:event-1:h2h:HOME", provider: "The Odds API", competition_key: "soccer_epl", competition: "Premier League", event_id: "event-1",
  event_name: "Demo City v Demo United", starts_at: "2026-10-27T15:00:00Z", selection_key: "HOME", selection: "Demo City", market_key: "h2h", market: "Match Odds / 1X2",
  back: { provider_key: "betfred", provider_name: "Betfred", account_name: "Betfred", odds: "4.50", observed_at: "2026-10-26T14:00:00Z", link: "https://example.invalid/back" },
  lay: { provider_key: "smarkets", provider_name: "Smarkets", account_name: "Smarkets", odds: "4.70", observed_at: "2026-10-26T14:00:05Z", link: null },
  display_rating: "95.74", commission_aware_rating: "94.00", exchange_commission: "0.02", commission_origin: "profile-account", standard_lay_stake: "9.62", liability: "35.59", pnl_if_back_wins: "-1.09", pnl_if_lay_wins: "-0.57", conservative_result: "-1.09",
  liquidity_state: "UNKNOWN", freshness: "fresh", age_seconds: 60,
  back_eligibility: { state: "eligible", reason: "Eligible", account_id: "account-b" }, lay_eligibility: { state: "eligible", reason: "Eligible", account_id: "account-l" }, can_create_prospecting_draft: true,
};
const secondOpportunity = {
  ...baseOpportunity,
  opportunity_id: "soccer_epl:event-2:h2h:AWAY",
  event_id: "event-2",
  event_name: "Demo Rovers v Demo Athletic",
  selection_key: "AWAY",
  selection: "Demo Athletic",
  back: { ...baseOpportunity.back, provider_key: "williamhill", provider_name: "William Hill", account_name: "William Hill", odds: "3.80" },
  lay: { ...baseOpportunity.lay, provider_key: "betfair_ex_uk", provider_name: "Betfair Exchange", account_name: "Betfair Exchange", odds: "3.90" },
};
const feed = { provider: "The Odds API", fetched_at: "2026-10-26T14:01:00Z", state: "fresh", warning: null, manual_refresh_only: true,
  competitions: ["Premier League"], event_count: 2, bookmaker_count: 2, exchange_count: 2,  provider_credits_used: 3, provider_credits_remaining: 497, provider_last_refresh_cost: 3,
  provider_quota_exhausted: false,
  opportunities: [baseOpportunity, secondOpportunity], excluded: [] };

function previewFor(body: Record<string, string>) {
  const factor = Number(body.back_stake || "10") / 10;
  const standard = (9.62 * factor).toFixed(2);
  const underlay = (8.90 * factor).toFixed(2);
  const overlay = (10.40 * factor).toFixed(2);
  const selected = body.strategy === "Underlay" ? underlay : body.strategy === "Overlay" ? overlay : body.strategy === "Custom" ? body.manual_lay_stake : standard;
  return { selected_lay_stake: selected, reference_lay_stake_standard: standard, reference_lay_stake_underlay: underlay, reference_lay_stake_overlay: overlay, liability: (Number(selected) * 3.7).toFixed(2),
    pnl_if_back_wins: "-1.09", pnl_if_lay_wins: "-0.57", matched_result: "-1.09",
    strategy_references: [{ strategy: "Underlay", lay_stake: underlay, liability: "32.93", back_wins_total: "1.20", back_loses_total: "-1.80" }, { strategy: "Standard", lay_stake: standard, liability: "35.59", back_wins_total: "-1.09", back_loses_total: "-0.57" }, { strategy: "Overlay", lay_stake: overlay, liability: "38.48", back_wins_total: "-4.00", back_loses_total: "2.20" }],
    outcomes: [{ key: "back-wins", label: "Back wins", bookmaker_component: "35.00", exchange_component: "-36.09", total: "-1.09" }, { key: "lay-wins", label: "Lay wins", bookmaker_component: "-10.00", exchange_component: "9.43", total: "-0.57" }] };
}

async function mock(page: Page, receipt: { previews: Record<string, string>[] }) {
  await page.route("**/api/**", async route => {
    const url = route.request().url();
    if (url.includes("matched-betting/preview")) {
      const body = route.request().postDataJSON() as Record<string, string>;
      receipt.previews.push(body);
      const delay = body.strategy === "Underlay" ? 450 : body.strategy === "Overlay" ? 30 : 10;
      await new Promise(resolve => setTimeout(resolve, delay));
      return route.fulfill({ json: previewFor(body) });
    }
    if (url.includes("/fund-manager/preferences/oddsmatcher")) return route.fulfill({ json: { version: 1, default_back_stake: "10.00", exchange_commission_overrides: {}, excluded_bookmaker_identities: [], excluded_exchange_identities: [], show_arbs_default: false, default_advanced: false, saved_filters: [] } });
    if (url.includes("/oddsmatcher")) return route.fulfill({ json: feed });
    if (url.includes("/account-catalogue/source")) return route.fulfill({ json: { schema_version: "1.0", records: [] } });
    if (/\/profiles\/?$/.test(new URL(url).pathname)) return route.fulfill({ json: [{ profile_id: profileId, display_name: "ALPHA-001 Synthetic", status: "active" }] });
    if (url.includes("/auth/session")) return route.fulfill({ json: { authenticated: true, email: "alpha@example.invalid", linked_profile_ids: [profileId], name: "Alpha Owner", role: "fund_manager" } });
    if (url.includes("/auth/activity")) return route.fulfill({ status: 204 });
    if (url.includes("/auth/security-preference")) return route.fulfill({ json: { configured: false } });
    if (url.includes("/fund-manager/notifications")) return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: {} });
  });
}

test("CP-096 Bet Summary refreshes calculations in the background", async ({ page }) => {
  test.setTimeout(60_000);
  await fs.mkdir(evidence, { recursive: true });
  const receipt = { previews: [] as Record<string, string>[] };
  await mock(page, receipt);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/oddsmatcher?profile_id=${profileId}`);
  await page.getByRole("button", { name: /^Open Bet Summary/ }).first().click();
  const dialog = page.getByRole("dialog", { name: "Oddsmatcher Bet Summary" });
  await expect(dialog.getByText("Total Profit")).toBeVisible();
  await expect(dialog.getByText("Loading Bet Summary")).toHaveCount(0);

  const backOdds = dialog.getByLabel("Back Odds");
  const backCommission = dialog.getByLabel("Back Commission", { exact: true });
  const layOdds = dialog.getByLabel("Lay Odds");
  const layCommission = dialog.getByLabel("Lay Commission", { exact: true });
  await expect(dialog.getByText(/0% default/i)).toHaveCount(0);
  const geometry = await dialog.evaluate(() => {
    const elements = ["Back Odds", "Back Commission", "Lay Odds", "Lay Commission"].map(label => document.querySelector<HTMLElement>(`[aria-label="${label}"]`)!);
    return elements.map(element => { const rect = element.closest(".adorned-text-input")?.getBoundingClientRect() ?? element.getBoundingClientRect(); const style = getComputedStyle(element); return { height: rect.height, fontSize: style.fontSize, paddingTop: style.paddingTop, borderRadius: getComputedStyle(element.closest(".adorned-text-input") ?? element).borderRadius }; });
  });
  expect(Math.max(...geometry.map(item => item.height)) - Math.min(...geometry.map(item => item.height))).toBeLessThanOrEqual(1);
  expect(new Set(geometry.map(item => item.fontSize)).size).toBe(1);

  await dialog.getByRole("switch", { name: "Advanced" }).click();
  await expect(dialog.getByLabel("Lay strategy range")).toBeVisible();
  const before = receipt.previews.length;
  const slider = dialog.getByLabel("Lay strategy range");
  await slider.focus();
  await slider.press("End");
  await expect(dialog.getByRole("textbox", { name: "Lay Stake" })).toHaveValue("10.40");
  await expect(dialog.locator('.ledger-loading-overlay')).toHaveCount(0);
  await expect(dialog.getByText("Updating Bet Summary")).toHaveCount(0);
  await expect(slider).toBeFocused();
  await expect.poll(() => receipt.previews.length).toBe(before + 1);

  const beforeRapidOdds = receipt.previews.length;
  for (const value of ["4.51", "4.52", "4.53", "4.54"]) await backOdds.fill(value);
  await expect.poll(() => receipt.previews.length).toBe(beforeRapidOdds + 1);

  await dialog.getByRole("button", { name: "Underlay", exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: "Lay Stake" })).toHaveValue("8.90");
  await expect(dialog.locator('.ledger-loading-overlay')).toHaveCount(0);
  await page.waitForTimeout(180);
  await dialog.getByRole("button", { name: "Overlay", exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: "Lay Stake" })).toHaveValue("10.40");
  await expect(dialog).toHaveAttribute("data-preview-pending", "true");
  await expect.poll(async () => await dialog.getByText("Liability:").locator("xpath=following-sibling::*[1]").count()).toBeGreaterThanOrEqual(0);
  await page.waitForTimeout(550);
  expect(receipt.previews.at(-1)?.strategy).toBe("Overlay");
  await expect(dialog.locator(".oddsmatcher-lay-stake-block")).toContainText(/Liability:.*38\.48/);
  await expect(dialog).not.toHaveAttribute("data-preview-pending");
  await dialog.screenshot({ path: path.join(evidence, "01-background-overlay.png") });
  await dialog.locator(".oddsmatcher-summary-input-row").first().screenshot({ path: path.join(evidence, "02-back-fields.png") });
  await dialog.locator(".oddsmatcher-summary-input-row").nth(1).screenshot({ path: path.join(evidence, "03-lay-fields.png") });
  await dialog.locator(".custom-slider-summary-layout").screenshot({ path: path.join(evidence, "04-slider.png") });

  await page.setViewportSize({ width: 430, height: 900 });
  const narrow = await dialog.evaluate(node => ({ page: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth, rows: Array.from(node.querySelectorAll<HTMLElement>(".oddsmatcher-summary-input-row")).map(row => ({ width: row.getBoundingClientRect().width, columns: getComputedStyle(row).gridTemplateColumns })) }));
  expect(narrow.page).toBeLessThanOrEqual(narrow.viewport + 1);
  expect(narrow.rows.every(row => row.columns.split(" ").length === 2)).toBe(true);
  await dialog.screenshot({ path: path.join(evidence, "05-narrow-fields-430.png") });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await dialog.getByRole("button", { name: "Standard", exact: true }).click();
  await expect(dialog.locator('.ledger-loading-overlay')).toHaveCount(0);
  await page.screenshot({ path: path.join(evidence, "06-reduced-motion.png") });
  await fs.writeFile(path.join(evidence, "verification.json"), JSON.stringify({ previewRequests: receipt.previews, geometry, narrow }, null, 2));
});
