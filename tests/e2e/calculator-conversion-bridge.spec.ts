import { expect, test } from "@playwright/test";

async function authorizeServerRoute(page: import("@playwright/test").Page) {
  const token = process.env.OPENFORGE_E2E_SESSION_TOKEN;
  if (!token) return;
  await page.context().addCookies([{
    name: "pd_session",
    value: token,
    url: process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010",
  }]);
}

test("keeps Standard state while reusing the guided Profile and Account conversion flow", async ({ page }) => {
  await authorizeServerRoute(page);
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: {
    authenticated: true, email: "bridge-test@example.invalid", name: "Synthetic Fund Manager", role: "fund_manager",
    expires_at: Math.floor(Date.now() / 1000) + 3600, linked_profile_ids: [],
    session_policy: { auto_logout_enabled: false, timeout_minutes: 15, preference_configured: true, effective_expires_at: Math.floor(Date.now() / 1000) + 3600 },
  }}));
  await page.context().route("**/fund-manager/calculators/exchanges", (route) => route.fulfill({ json: [
    { catalogue_id: "exchange-smarkets", name: "Smarkets", default_commission_rate: "0" },
  ] }));
  await page.context().route("**/fund-manager/calculators/matched-betting/preview", (route) => route.fulfill({ json: {
    result_kind: "reference", calculation_state: "resolved", calculator_family: "matched-betting",
    canonical_back_odds: "3.00", canonical_lay_odds: "3.10", selected_lay_stake: "9.68",
    reference_lay_stake_standard: "9.68", reference_lay_stake_underlay: "9.00",
    reference_lay_stake_overlay: "10.20", liability: "20.32", pnl_if_back_wins: "-0.32",
    pnl_if_lay_wins: "-0.32", matched_result: "-0.32", promotion_trigger_result: null,
    effective_back_odds: "3.0000", profit_boost_source: null,
    outcomes: [
      { key: "back", label: "Back bet wins", bookmaker_component: "20.00", exchange_component: "-20.32", promotion_component: null, total: "-0.32" },
      { key: "lay", label: "Lay bet wins", bookmaker_component: "-10.00", exchange_component: "9.68", promotion_component: null, total: "-0.32" },
    ],
  }}));
  await page.context().route("**/profiles", (route) => route.fulfill({ json: [
    { profile_id: "profile-synthetic-001", display_name: "Synthetic Profile One", profile_code: "SYN-001", status: "Active" },
    { profile_id: "profile-synthetic-002", display_name: "Synthetic Profile Two", profile_code: "SYN-002", status: "Active" },
  ] }));
  await page.context().route("**/profiles/*/accounts", (route) => route.fulfill({ json: [
    { account: "Bet365", type: "Bookie", status: "Active", lifecycle_status: "Active", restrictions: [] },
  ] }));
  let submitted: Record<string, unknown> | null = null;
  await page.context().route("**/fund-manager/calculator-conversions/standard", async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ json: {
      source_id: "matched-betting-demo", source_checksum: "demo",
      notification: "Added Standard opportunity to 2 Profiles.",
      results: [
        { profile_id: "profile-synthetic-001", account: "Bet365", state: "succeeded", record_id: "SB-DEMO1", href: "/profiles/profile-synthetic-001/tracker/sportsbook-bets?record=SB-DEMO1", reasons: [] },
        { profile_id: "profile-synthetic-002", account: "Bet365", state: "succeeded", record_id: "SB-DEMO2", href: "/profiles/profile-synthetic-002/tracker/sportsbook-bets?record=SB-DEMO2", reasons: [] },
      ],
    }});
  });

  await page.goto("/fund-manager/calculators");
  await page.getByLabel("Back stake").fill("10.00");
  await page.getByLabel("Back odds").fill("3.00");
  await page.getByLabel("Lay odds").fill("3.10");
  await expect(page.locator('[data-pd-id="calculators.matched-betting.convert"]')).toBeVisible();
  await page.locator('[data-pd-id="calculators.matched-betting.convert"]').click();
  const dialog = page.getByRole("dialog", { name: "Convert Standard calculation to opportunity" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Event / fixture").fill("Synthetic United v Example City");
  await dialog.getByText("Synthetic Profile One").click();
  await dialog.getByText("Synthetic Profile Two").click();
  for (const select of await dialog.getByLabel("Bookmaker Account").all()) await select.selectOption("Bet365");
  await dialog.getByRole("button", { name: "Convert to opportunity" }).click();
  await expect(dialog.getByText("Added Standard opportunity to 2 Profiles.")).toBeVisible();
  expect((submitted?.targets as unknown[]).length).toBe(2);
  await expect(page.getByLabel("Back stake")).toHaveValue("10.00");
  await expect(page.getByLabel("Back odds")).toHaveValue("3.00");
});

test("does not expose Casino conversion for Blackjack Simulation", async ({ page }) => {
  await authorizeServerRoute(page);
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: {
    authenticated: true, email: "bridge-test@example.invalid", name: "Synthetic Fund Manager", role: "fund_manager",
    expires_at: Math.floor(Date.now() / 1000) + 3600, linked_profile_ids: [],
    session_policy: { auto_logout_enabled: false, timeout_minutes: 15, preference_configured: true, effective_expires_at: Math.floor(Date.now() / 1000) + 3600 },
  }}));
  await page.goto("/fund-manager/calculators?family=blackjack");
  await expect(page.getByRole("combobox", { name: "Blackjack session mode" })).toHaveValue("simulation");
  await expect(page.locator('[data-pd-id="calculators.blackjack.save-activity"]')).toHaveCount(0);
});
