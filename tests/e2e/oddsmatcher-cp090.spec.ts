import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const evidence = path.resolve("data/private/evidence/cp090-oddsmatcher-layout-state-20261026");
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
    if (url.includes("matched-betting/preview")) { const body = route.request().postDataJSON() as Record<string, string>; receipt.previews.push(body); return route.fulfill({ json: previewFor(body) }); }
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

test("CP-090 filter panels remain horizontally contained and vertically scrollable", async ({ page }) => {
  await fs.mkdir(evidence, { recursive: true });
  await mock(page, { previews: [] });
  await page.setViewportSize({ width: 1100, height: 780 });
  await page.goto(`/oddsmatcher?profile_id=${profileId}`);
  for (const [name, file] of [["Back", "01-back-panel.png"], ["Lay", "02-lay-panel.png"], ["Rating", "03-rating-panel.png"]] as const) {
    await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
    const panel = page.getByRole("dialog", { name: `${name} filter` });
    const geometry = await panel.evaluate(node => {
      const panelRect = node.getBoundingClientRect();
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const activeRect = active?.getBoundingClientRect();
      const activeStyle = active ? getComputedStyle(active) : null;
      const focusExtent = activeStyle ? Number.parseFloat(activeStyle.outlineWidth || "0") + Math.max(0, Number.parseFloat(activeStyle.outlineOffset || "0")) : 0;
      return { clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, overflowX: getComputedStyle(node).overflowX,
        focusContained: !activeRect || (activeRect.left - focusExtent >= panelRect.left - 1 && activeRect.right + focusExtent <= panelRect.right + 1) };
    });
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.focusContained).toBe(true);
    await panel.screenshot({ path: path.join(evidence, file) });
    await page.keyboard.press("Escape");
  }
  await page.getByRole("button", { name: /^Back/ }).click();
  await page.getByRole("combobox", { name: "Bookmakers" }).fill("e");
  const options = page.locator(".pd-combobox-options");
  await expect(options).toBeVisible();
  expect(await options.evaluate(node => getComputedStyle(node).overflowY)).toMatch(/auto|scroll/);
  await page.setViewportSize({ width: 430, height: 760 });
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 900, height: 760 });
  await page.getByRole("button", { name: /^Filters/ }).click();
  let drawer = page.getByRole("dialog", { name: "Oddsmatcher filters" });
  expect(await drawer.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await drawer.getByRole("button", { name: "Close filters" }).click();
  await page.setViewportSize({ width: 430, height: 760 });
  await page.getByRole("button", { name: /^Filters/ }).click();
  drawer = page.getByRole("dialog", { name: "Oddsmatcher filters" });
  expect(await drawer.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
});

test("CP-090 quote cells align and Bet Summary uses governed range references", async ({ page }) => {
  await fs.mkdir(evidence, { recursive: true });
  const receipt = { previews: [] as Record<string, string>[] };
  await mock(page, receipt);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/oddsmatcher?profile_id=${profileId}`);
  const row = page.locator(".oddsmatcher-table tbody tr").first();
  const quoteGeometry = await row.evaluate(node => {
    const cells = node.querySelectorAll<HTMLElement>(".oddsmatcher-quote-cell");
    const blocks = Array.from(node.querySelectorAll<HTMLElement>(".oddsmatcher-quote-block"));
    const slots = Array.from(node.querySelectorAll<HTMLElement>(".oddsmatcher-quote-status-slot"));
    return { tops: blocks.map(item => item.getBoundingClientRect().top), heights: blocks.map(item => item.getBoundingClientRect().height), slotHeights: slots.map(item => item.getBoundingClientRect().height), cellHeights: Array.from(cells).map(item => item.getBoundingClientRect().height) };
  });
  expect(Math.abs(quoteGeometry.tops[0] - quoteGeometry.tops[1])).toBeLessThanOrEqual(1);
  expect(Math.abs(quoteGeometry.heights[0] - quoteGeometry.heights[1])).toBeLessThanOrEqual(1);
  expect(quoteGeometry.slotHeights[0]).toBeGreaterThan(0);
  expect(quoteGeometry.slotHeights[1]).toBe(quoteGeometry.slotHeights[0]);
  await row.screenshot({ path: path.join(evidence, "04-desktop-quote-alignment.png") });

  await row.getByRole("button", { name: /^Open Bet Summary/ }).click();
  const dialog = page.getByRole("dialog", { name: "Oddsmatcher Bet Summary" });
  const normalGeometry = await dialog.evaluate(node => ({ clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, bodyClient: node.querySelector<HTMLElement>(".oddsmatcher-summary-body")!.clientHeight, bodyScroll: node.querySelector<HTMLElement>(".oddsmatcher-summary-body")!.scrollHeight }));
  expect(normalGeometry.bodyScroll).toBeLessThanOrEqual(normalGeometry.bodyClient);
  await expect(page.locator("body")).toHaveCSS("position", "fixed");
  await page.screenshot({ path: path.join(evidence, "07-normal-summary-1440x1000.png") });
  await dialog.locator('[data-pd-id="oddsmatcher.advanced"]').click();
  await expect(dialog.getByLabel("Min")).toHaveValue("8.90");
  await expect(dialog.getByLabel("Max")).toHaveValue("10.40");
  await expect(dialog.getByLabel("Lay strategy range")).toHaveAttribute("aria-valuenow", "9.62");
  const advancedGeometry = await dialog.evaluate(node => ({ clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, bodyClient: node.querySelector<HTMLElement>(".oddsmatcher-summary-body")!.clientHeight, bodyScroll: node.querySelector<HTMLElement>(".oddsmatcher-summary-body")!.scrollHeight, viewport: innerHeight, maxHeight: getComputedStyle(node).maxHeight, gridRows: getComputedStyle(node).gridTemplateRows, backdropPadding: getComputedStyle(node.parentElement!).padding }));
  expect(advancedGeometry.clientHeight).toBeLessThanOrEqual(advancedGeometry.viewport - 20);
  expect(advancedGeometry.bodyScroll).toBeLessThanOrEqual(advancedGeometry.bodyClient);
  expect(advancedGeometry.clientHeight).toBeGreaterThan(normalGeometry.clientHeight);
  await page.screenshot({ path: path.join(evidence, "08-advanced-summary-1440x1000.png") });
  await dialog.getByLabel("Back Stake").fill("20.00");
  await expect(dialog.getByLabel("Min")).toHaveValue("17.80");
  await expect(dialog.getByLabel("Max")).toHaveValue("20.80");
  await dialog.getByLabel("Min").fill("17.00");
  await dialog.getByLabel("Back Stake").fill("30.00");
  await expect(dialog.getByLabel("Min")).toHaveValue("17.00");
  await dialog.getByLabel("Max").fill("20.00");
  await expect(dialog.getByText("Range Max cannot be below the Standard lay stake.")).toBeVisible();
  await expect(dialog.getByLabel("Lay strategy range")).toBeDisabled();
  await page.screenshot({ path: path.join(evidence, "09-advanced-governed-range.png") });
  await dialog.getByLabel("Min").fill("26.00");
  await dialog.getByLabel("Max").fill("31.20");
  await expect(dialog.getByLabel("Lay strategy range")).toBeEnabled();

  await page.setViewportSize({ width: 1024, height: 650 });
  const shortGeometry = await dialog.evaluate(node => ({ clientHeight: node.clientHeight, bodyClient: node.querySelector<HTMLElement>(".oddsmatcher-summary-body")!.clientHeight, bodyScroll: node.querySelector<HTMLElement>(".oddsmatcher-summary-body")!.scrollHeight, viewport: innerHeight }));
  expect(shortGeometry.clientHeight).toBeLessThanOrEqual(shortGeometry.viewport - 16);
  expect(shortGeometry.bodyScroll).toBeGreaterThan(shortGeometry.bodyClient);
  await page.screenshot({ path: path.join(evidence, "10-short-height-safe-scroll-1024x650.png") });
  await dialog.getByRole("button", { name: "Close Bet Summary" }).click();
  await page.setViewportSize({ width: 430, height: 900 });
  const card = page.locator(".oddsmatcher-opportunity-card").first();
  await expect(card).toBeVisible();
  const cardQuotes = await card.evaluate(node => Array.from(node.querySelectorAll<HTMLElement>(".oddsmatcher-quote-cell")).map(item => ({ top: item.getBoundingClientRect().top, width: item.getBoundingClientRect().width, scrollWidth: item.scrollWidth })));
  expect(Math.abs(cardQuotes[0].top - cardQuotes[1].top)).toBeLessThanOrEqual(1);
  expect(cardQuotes.every(item => item.scrollWidth <= item.width + 1)).toBe(true);
  await card.screenshot({ path: path.join(evidence, "06-narrow-quote-alignment-430x900.png") });
  await fs.writeFile(path.join(evidence, "verification.json"), JSON.stringify({ normalGeometry, advancedGeometry, shortGeometry, quoteGeometry, receipt }, null, 2));
});
