import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const evidence = path.resolve("data/private/evidence/cp089-bet-summary-format-parity-20261026");
const profileId = "profile-demo-001";
const opportunity = {
  opportunity_id: "soccer_epl:event-1:h2h:HOME", provider: "The Odds API", competition_key: "soccer_epl", competition: "Premier League", event_id: "event-1",
  event_name: "Demo City v Demo United", starts_at: "2026-10-27T15:00:00Z", selection_key: "HOME", selection: "Demo City", market_key: "h2h", market: "Match Odds / 1X2",
  back: { provider_key: "betfred", provider_name: "Betfred", account_name: "Betfred", odds: "4.50", observed_at: "2026-10-26T14:00:00Z", link: "https://example.invalid/back" },
  lay: { provider_key: "smarkets", provider_name: "Smarkets", account_name: "Smarkets", odds: "4.70", observed_at: "2026-10-26T14:00:05Z", link: null },
  display_rating: "95.74", commission_aware_rating: "94.00", exchange_commission: "0.02", commission_origin: "profile-account", standard_lay_stake: "9.62", liability: "35.59", pnl_if_back_wins: "-1.09", pnl_if_lay_wins: "-0.57", conservative_result: "-1.09",
  liquidity_state: "UNKNOWN", freshness: "fresh", age_seconds: 60,
  back_eligibility: { state: "eligible", reason: "Eligible", account_id: "account-b" }, lay_eligibility: { state: "eligible", reason: "Eligible", account_id: "account-l" }, can_create_prospecting_draft: true,
};
const feed = { provider: "The Odds API", fetched_at: "2026-10-26T14:01:00Z", state: "fresh", warning: null, manual_refresh_only: true,
  competitions: ["Premier League"], event_count: 1, bookmaker_count: 1, exchange_count: 1,  provider_credits_used: 3, provider_credits_remaining: 497, provider_last_refresh_cost: 3,
  provider_quota_exhausted: false,
  opportunities: [opportunity], excluded: [] };

function previewFor(body: Record<string, string>) {
  const selected = body.strategy === "Underlay" ? "8.90" : body.strategy === "Overlay" ? "10.40" : body.strategy === "Custom" ? body.manual_lay_stake : "9.62";
  const liability = (Number(selected) * 3.7).toFixed(2);
  const backWins = body.strategy === "Underlay" || body.strategy === "Custom" ? "1.20" : body.strategy === "Overlay" ? "-4.00" : "-1.09";
  const layWins = body.strategy === "Underlay" || body.strategy === "Custom" ? "-1.80" : body.strategy === "Overlay" ? "2.20" : "-0.57";
  return { selected_lay_stake: selected, reference_lay_stake_standard: "9.62", reference_lay_stake_underlay: "8.90", reference_lay_stake_overlay: "10.40", liability,
    pnl_if_back_wins: backWins, pnl_if_lay_wins: layWins, matched_result: "-1.09",
    strategy_references: [
      { strategy: "Underlay", lay_stake: "8.90", liability: "32.93", back_wins_total: "1.20", back_loses_total: "-1.80" },
      { strategy: "Standard", lay_stake: "9.62", liability: "35.59", back_wins_total: "-1.09", back_loses_total: "-0.57" },
      { strategy: "Overlay", lay_stake: "10.40", liability: "38.48", back_wins_total: "-4.00", back_loses_total: "2.20" },
    ],
    outcomes: [{ key: "back-wins", label: "Back wins", bookmaker_component: "35.00", exchange_component: (Number(backWins) - 35).toFixed(2), total: backWins }, { key: "lay-wins", label: "Lay wins", bookmaker_component: "-10.00", exchange_component: (Number(layWins) + 10).toFixed(2), total: layWins }] };
}

async function mock(page: Page, receipt: { previews: Record<string, string>[]; mutations: string[] }) {
  await page.route("**/api/**", async route => {
    const url = route.request().url();
    if (url.includes("matched-betting/preview")) {
      const body = route.request().postDataJSON() as Record<string, string>;
      receipt.previews.push(body);
      return route.fulfill({ json: previewFor(body) });
    }
    if (url.includes("prospecting-drafts") || url.includes("oddsmatcher/refresh") || url.includes("place")) receipt.mutations.push(url);
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

test("CP-089 Bet Summary presentation, canonical formats and disabled placement", async ({ page }) => {
  await fs.mkdir(evidence, { recursive: true });
  const receipt = { previews: [] as Record<string, string>[], mutations: [] as string[] };
  await mock(page, receipt);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/oddsmatcher?profile_id=${profileId}`);
  await page.getByRole("button", { name: /^Open Bet Summary/ }).first().click();
  const dialog = page.getByRole("dialog", { name: "Oddsmatcher Bet Summary" });
  await expect(dialog.getByText("Total Profit", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Place lay bet" })).toHaveAttribute("aria-disabled", "true");
  await expect(dialog.getByText("Direct exchange placement is not enabled yet.")).toBeVisible();
  const placeLayStub = dialog.locator('[data-pd-id="oddsmatcher.place-lay-stub"]');
  await expect(placeLayStub).toContainText("Stake:");
  await expect(placeLayStub).toContainText("9.62");
  await expect(placeLayStub).toContainText("Liability:");
  await expect(placeLayStub).toContainText("35.59");
  await page.screenshot({ path: path.join(evidence, "01-standard-total-profit.png") });
  await dialog.locator('[data-pd-id="oddsmatcher.place-lay-stub"]').screenshot({ path: path.join(evidence, "05-place-lay-stub.png") });
  await dialog.getByRole("button", { name: "Place lay bet" }).evaluate((element: HTMLButtonElement) => element.click());
  expect(receipt.mutations).toEqual([]);

  await dialog.locator('[data-pd-id="oddsmatcher.advanced"]').click();
  await dialog.getByRole("button", { name: "Underlay" }).click();
  await expect(dialog.getByText("Total Profit", { exact: true })).toHaveCount(0);
  await expect(dialog.locator(".oddsmatcher-outcome-card")).toHaveCount(2);
  await page.screenshot({ path: path.join(evidence, "02-underlay-outcomes.png") });
  await dialog.getByRole("button", { name: "Overlay" }).click();
  await expect(dialog.getByText("Total Profit", { exact: true })).toHaveCount(0);
  await expect(dialog.locator(".oddsmatcher-outcome-card")).toHaveCount(2);
  await page.screenshot({ path: path.join(evidence, "03-overlay-outcomes.png") });
  await dialog.getByLabel("Lay Stake").fill("9.10");
  await expect.poll(() => receipt.previews.at(-1)?.strategy).toBe("Custom");
  await expect(dialog.getByText("Total Profit", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: path.join(evidence, "04-custom-stake-outcomes.png") });
  await dialog.getByLabel("Lay Stake").fill("9.62");
  await expect.poll(() => receipt.previews.at(-1)?.strategy).toBe("Standard");
  await expect(dialog.getByText("Total Profit", { exact: true })).toBeVisible();

  const settingsTrigger = dialog.getByRole("button", { name: "Open Bet Summary settings" });
  await settingsTrigger.click();
  const settings = page.getByRole("dialog", { name: "Bet Summary settings" });
  await expect(settings.getByLabel("Back Odds Format")).toHaveValue("Decimal");
  await expect(settings.getByLabel("Lay Odds Format")).toHaveValue("Decimal");
  await expect(page.locator("body")).toHaveCSS("position", "fixed");
  await page.screenshot({ path: path.join(evidence, "06-settings-decimal.png") });
  await settings.getByLabel("Back Odds Format").selectOption("Fractional");
  await settings.getByLabel("Lay Odds Format").selectOption("Moneyline");
  await page.screenshot({ path: path.join(evidence, "07-settings-fractional-moneyline.png") });
  await page.keyboard.press("Escape");
  await expect(settings).toHaveCount(0);
  await expect(settingsTrigger).toBeFocused();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Back Odds")).toHaveValue("7/2");
  await expect(dialog.getByLabel("Lay Odds")).toHaveValue("+370");
  await page.screenshot({ path: path.join(evidence, "08-fractional-odds-field.png") });
  await dialog.getByLabel("Back Odds").fill("5/2");
  await expect.poll(() => receipt.previews.at(-1)?.back_odds).toBe("3.5");
  await settingsTrigger.click();
  await settings.getByLabel("Back Odds Format").selectOption("Moneyline");
  await settings.getByLabel("Lay Odds Format").selectOption("Moneyline");
  await settings.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog.getByLabel("Back Odds")).toHaveValue("+250");
  await dialog.getByLabel("Lay Odds").fill("not odds");
  await expect(dialog.getByText(/Enter Moneyline odds/)).toBeVisible();
  const previewCount = receipt.previews.length;
  await page.waitForTimeout(150);
  expect(receipt.previews).toHaveLength(previewCount);
  await page.screenshot({ path: path.join(evidence, "09-moneyline-invalid-field.png") });

  await dialog.getByLabel("Lay Odds").fill("+370");
  await expect.poll(() => receipt.previews.at(-1)?.lay_odds).toBe("4.7");
  await page.setViewportSize({ width: 430, height: 900 });
  const geometry = await dialog.evaluate(node => ({ bodyWidth: document.body.scrollWidth, viewport: document.documentElement.clientWidth, columns: getComputedStyle(node.querySelector(".oddsmatcher-summary-layout")!).gridTemplateColumns, placeTop: node.querySelector(".oddsmatcher-place-lay-stub")!.getBoundingClientRect().top, outcomesTop: node.querySelector(".oddsmatcher-outcome-stack")!.getBoundingClientRect().top }));
  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.columns.split(" ")).toHaveLength(1);
  expect(geometry.placeTop).toBeLessThan(geometry.outcomesTop);
  expect(await page.locator(".oddsmatcher-quote-price").first().textContent()).toContain("4.50");
  await dialog.locator(".oddsmatcher-bet-card-lay").screenshot({ path: path.join(evidence, "10-narrow-place-lay-advanced.png") });
  await fs.writeFile(path.join(evidence, "verification.json"), JSON.stringify({ geometry, receipt, mainTableOdds: await page.locator(".oddsmatcher-quote-price").first().textContent() }, null, 2));
});
