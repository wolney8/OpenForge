import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const evidence = path.resolve("data/private/evidence/cp088-owner-smoke-followup-20261026");
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
const feed = { provider: "The Odds API", fetched_at: "2026-10-26T14:01:00Z", state: "fresh", warning: null, manual_refresh_only: true,
  competitions: ["Premier League", "Championship", "UEFA Champions League"], event_count: 1, bookmaker_count: 1, exchange_count: 1, credits_used_today: 3, provider_credits_used: 3, provider_credits_remaining: 497, daily_credit_ceiling: 25,
  opportunities: [baseOpportunity], excluded: [] };
const preview = { selected_lay_stake: "9.62", liability: "35.59", pnl_if_back_wins: "-1.09", pnl_if_lay_wins: "-0.57", matched_result: "-1.09",
  outcomes: [{ key: "back-wins", label: "Back wins", bookmaker_component: "35.00", exchange_component: "-35.59", total: "-1.09" }, { key: "lay-wins", label: "Lay wins", bookmaker_component: "-10.00", exchange_component: "9.43", total: "-0.57" }] };

async function mock(page: Page) {
  await page.route("**/api/**", async route => {
    const url = route.request().url();
    if (url.includes("/fund-manager/preferences/oddsmatcher")) return route.fulfill({ json: { version: 1, default_back_stake: "10.00", exchange_commission_overrides: { smarkets: "0.03" }, excluded_bookmaker_identities: [], excluded_exchange_identities: [], show_arbs_default: false, default_advanced: false, saved_filters: [] } });
    if (url.includes("matched-betting/preview")) return route.fulfill({ json: preview });
    if (url.includes("prospecting-drafts")) return route.fulfill({ status: 201, json: { created: true, sportsbook_bet: { sportsbook_bet_id: "ODD-DEMO-001" } } });
    if (url.includes("/oddsmatcher/refresh")) { await new Promise(resolve => setTimeout(resolve, 500)); return route.fulfill({ json: feed }); }
    if (url.includes("/oddsmatcher")) {
      const scoped = url.includes("profile_id=");
      return route.fulfill({ json: scoped ? feed : { ...feed, opportunities: [{ ...baseOpportunity, exchange_commission: "0", commission_origin: "zero", back_eligibility: { state: "warning", reason: "Profile required", account_id: null }, lay_eligibility: { state: "warning", reason: "Profile required", account_id: null }, can_create_prospecting_draft: false }] } });
    }
    if (url.includes("/account-catalogue/source")) return route.fulfill({ json: { schema_version: "1.0", records: [] } });
    if (/\/profiles\/?$/.test(new URL(url).pathname)) return route.fulfill({ json: [{ profile_id: profileId, display_name: "ALPHA-001 Synthetic", status: "active" }] });
    if (url.includes("/auth/session")) return route.fulfill({ json: { authenticated: true, email: "alpha@example.invalid", linked_profile_ids: [profileId], name: "Alpha Owner", role: "fund_manager" } });
    if (url.includes("/auth/activity")) return route.fulfill({ status: 204 });
    if (url.includes("/auth/security-preference")) return route.fulfill({ json: { configured: false } });
    if (url.includes("/fund-manager/notifications")) return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: {} });
  });
}

test("CP-088 contained refresh and Bet Summary responsive parity", async ({ page }) => {
  await fs.mkdir(evidence, { recursive: true });
  await mock(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/oddsmatcher");
  await expect(page.locator(".oddsmatcher-table tbody tr")).toHaveCount(1);

  await page.locator('[data-pd-id="oddsmatcher.filters"]').getByRole("button", { name: /^Rating/ }).click();
  const minRating = page.getByLabel("Min. rating");
  await minRating.focus();
  const ratingGeometry = await minRating.evaluate(node => { const box = node.getBoundingClientRect(); const panel = node.closest(".oddsmatcher-anchored-surface")!.getBoundingClientRect(); return { height: box.height, inside: box.left >= panel.left && box.right <= panel.right }; });
  expect(ratingGeometry.height).toBeLessThanOrEqual(46);
  expect(ratingGeometry.inside).toBe(true);
  await page.screenshot({ path: path.join(evidence, "01-rating-filter-focus.png") });
  await page.keyboard.press("Escape");

  const refresh = page.locator('[data-pd-id="oddsmatcher.refresh"]');
  await refresh.click();
  await expect(refresh).toHaveAttribute("aria-label", "Refreshing odds");
  await expect(refresh.locator(".button-spinner")).toBeVisible();
  await expect(page.locator(".oddsmatcher-table tbody tr")).toHaveCount(1);
  await page.screenshot({ path: path.join(evidence, "02-refreshing-contained.png") });
  await expect(refresh).toHaveAttribute("aria-label", "Refresh odds");
  const layQuote = page.locator(".oddsmatcher-lay-quote-stack").first();
  const quoteBlock = layQuote.locator(".oddsmatcher-quote-block");
  const liquidity = layQuote.locator(".compact-status-trigger");
  const quoteGeometry = await layQuote.evaluate(node => {
    const quote = node.querySelector(".oddsmatcher-quote-block")!.getBoundingClientRect();
    const status = node.querySelector(".compact-status-trigger")!.getBoundingClientRect();
    return { below: status.top >= quote.bottom, quoteBottom: quote.bottom, statusTop: status.top };
  });
  expect(quoteGeometry.below).toBe(true);
  await page.screenshot({ path: path.join(evidence, "03-table-lay-liquidity-below.png") });
  await liquidity.focus();
  const tooltip = page.getByRole("tooltip").first();
  await expect(tooltip).toBeVisible();
  const tooltipGeometry = await tooltip.evaluate(node => {
    const box = node.getBoundingClientRect();
    return { fixed: getComputedStyle(node).position, insideViewport: box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight, portalParent: node.parentElement?.tagName };
  });
  expect(tooltipGeometry).toMatchObject({ fixed: "fixed", insideViewport: true, portalParent: "BODY" });
  await page.screenshot({ path: path.join(evidence, "04-liquidity-tooltip-unclipped.png") });

  await page.getByLabel("Oddsmatcher Profile context").selectOption(profileId);
  await page.evaluate(() => { document.body.style.minHeight = "2600px"; window.scrollTo(0, 420); });
  const scrollBefore = await page.evaluate(() => ({ x: scrollX, y: scrollY, width: document.documentElement.clientWidth }));
  const summaryTrigger = page.getByRole("button", { name: /^Open Bet Summary/ }).first();
  await summaryTrigger.evaluate((node: HTMLButtonElement) => node.click());
  const dialog = page.getByRole("dialog", { name: "Oddsmatcher Bet Summary" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Back Bet", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Lay Bet", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Total Profit", { exact: true })).toBeVisible();
  const desktop = await dialog.evaluate(node => { const layout = node.querySelector(".oddsmatcher-summary-layout")!; const style = getComputedStyle(layout); return { columns: style.gridTemplateColumns, overflow: document.body.scrollWidth <= document.documentElement.clientWidth }; });
  expect(desktop.columns.split(" ").length).toBeGreaterThanOrEqual(2);
  expect(desktop.overflow).toBe(true);
  await expect(page.locator("body")).toHaveCSS("position", "fixed");
  await expect(page.locator("body")).toHaveCSS("top", `${-scrollBefore.y}px`);
  await page.mouse.wheel(0, 900);
  await expect(page.locator("body")).toHaveCSS("top", `${-scrollBefore.y}px`);
  await page.screenshot({ path: path.join(evidence, "05-bet-summary-normal-desktop.png") });

  await dialog.locator('[data-pd-id="oddsmatcher.advanced"]').click();
  await expect(dialog.getByRole("button", { name: "Underlay" })).toBeVisible();
  await expect(dialog.getByText("Back Stake", { exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(evidence, "06-bet-summary-advanced-desktop.png") });
  await dialog.locator(".oddsmatcher-summary-left").screenshot({ path: path.join(evidence, "07-back-lay-cards.png") });
  await dialog.locator(".oddsmatcher-advanced-controls").screenshot({ path: path.join(evidence, "08-advanced-controls.png") });
  await dialog.locator(".oddsmatcher-outcome-stack").screenshot({ path: path.join(evidence, "09-outcomes-total-profit.png") });
  await page.screenshot({ path: path.join(evidence, "11-profile-selected-commission.png") });
  await page.keyboard.press("Escape");
  await expect(summaryTrigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(scrollBefore.y);
  await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  const scrollReceipt = { before: scrollBefore, after: await page.evaluate(() => ({ x: scrollX, y: scrollY, width: document.documentElement.clientWidth })) };
  expect(scrollReceipt.after).toEqual(scrollReceipt.before);
  await page.evaluate(() => { document.body.style.minHeight = ""; window.scrollTo(0, 0); });

  await page.getByLabel("Oddsmatcher Profile context").selectOption("");
  await page.locator(".oddsmatcher-table tbody tr").click();
  await expect(page.getByRole("button", { name: "Add Prospecting Draft", exact: true })).toBeDisabled();
  const noProfileDialog = page.getByRole("dialog", { name: "Oddsmatcher Bet Summary" });
  await expect(noProfileDialog.getByText("Profile required to add to Tracker")).toBeVisible();
  await expect(noProfileDialog.getByLabel("Back Commission (%)")).toHaveValue("0.00");
  await expect(noProfileDialog.getByLabel("Lay Commission (%)")).toHaveValue("0.00");
  await page.screenshot({ path: path.join(evidence, "10-no-profile-zero-commission.png") });
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Oddsmatcher Settings" })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("position", "fixed");
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveCSS("position", "fixed");

  await page.setViewportSize({ width: 430, height: 900 });
  await page.getByRole("button", { name: /^Open Bet Summary/ }).first().click();
  const narrow = page.getByRole("dialog", { name: "Oddsmatcher Bet Summary" });
  const narrowGeometry = await narrow.evaluate(node => ({ bodyWidth: document.body.scrollWidth, viewport: document.documentElement.clientWidth, columns: getComputedStyle(node.querySelector(".oddsmatcher-summary-layout")!).gridTemplateColumns }));
  expect(narrowGeometry.bodyWidth).toBeLessThanOrEqual(narrowGeometry.viewport);
  expect(narrowGeometry.columns.split(" ")).toHaveLength(1);
  await page.screenshot({ path: path.join(evidence, "12-bet-summary-narrow.png") });
  await fs.writeFile(path.join(evidence, "geometry.json"), JSON.stringify({ ratingGeometry, quoteGeometry, tooltipGeometry, desktop, narrowGeometry }, null, 2));
  await fs.writeFile(path.join(evidence, "scroll-lock-receipt.json"), JSON.stringify(scrollReceipt, null, 2));
});
