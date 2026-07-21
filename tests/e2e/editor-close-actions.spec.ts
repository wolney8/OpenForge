import { expect, test, type APIRequestContext } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:8010";
const profileId = "profile-demo-001";

type EditorScenario = {
  route: string;
  title: string;
  idKey: string;
  apiPath: string;
  supportsRecordRoute?: boolean;
  createPayload: (suffix: string) => Record<string, string>;
};

const scenarios: EditorScenario[] = [
  {
    route: `/profiles/${profileId}/tracker/sportsbook-bets`,
    title: "Sportsbook Bets",
    idKey: "sportsbook_bet_id",
    apiPath: "sportsbook-bets",
    createPayload: (suffix) => ({
      event_name: `Editor close sportsbook ${suffix}`,
      offer_text: "Editor close sportsbook offer",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Editor Close",
      fixture_type: "Football",
      market: "Match Odds",
      status: "Prospecting",
      result: "Pending",
      back_stake: "",
      back_odds: "",
      match_strategy: "Standard",
      lay_odds_1: "",
      lay_actual: "",
      lay_matched_stake_1: "",
      lay_commission_1: "",
      exchange_name: "",
      date_settled: "",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    }),
  },
  {
    route: `/profiles/${profileId}/tracker/free-bets`,
    title: "Free Bets",
    idKey: "free_bet_id",
    apiPath: "free-bets",
    createPayload: (suffix) => ({
      event_name: `Editor close free bet ${suffix}`,
      offer_text: "Editor close free-bet offer",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Editor Close",
      fixture_type: "Football",
      status: "Available",
      result: "Pending",
      retention_mode: "SNR",
      free_bet_value: "5.00",
      back_odds: "",
      match_strategy: "Standard",
      lay_odds_1: "",
      lay_actual: "",
      lay_matched_stake_1: "",
      lay_commission_1: "",
      exchange_name: "",
      expiry_datetime: "2026-07-25T18:00:00",
      date_settled: "",
      origin_qual_bet_id: "",
      offer_group_id: "",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    }),
  },
  {
    route: `/profiles/${profileId}/tracker/casino-offers`,
    title: "Casino Offers",
    idKey: "casino_offer_id",
    apiPath: "casino-offers",
    createPayload: (suffix) => ({
      offer_group_id: "",
      date_started: "2026-07-21T12:00:00",
      date_settling: "2026-07-21T12:00:00",
      expiry_datetime: "2026-07-25T18:00:00",
      bookmaker: "Bookmaker A",
      offer_type: "Free Spins",
      offer_name: `Editor close casino ${suffix}`,
      game: "Editor Close Slots",
      cash_stake: "",
      credit_amount: "",
      bonus_amount: "",
      wager_multiplier: "",
      wager_target: "",
      required_spins: "",
      spin_stake: "",
      free_spins_awarded: "",
      free_spins_value: "",
      status: "Prospecting",
      result: "Pending",
      calc_net_pnl: "0.00",
      final_net_pnl: "",
      user_notes: "",
    }),
  },
  {
    route: `/profiles/${profileId}/tracker/cash-adjustments`,
    title: "Cash Adjustments",
    idKey: "cash_adjustment_id",
    apiPath: "cash-adjustments",
    supportsRecordRoute: false,
    createPayload: (suffix) => ({
      adjustment_date: "2026-07-21T12:00:00",
      adjustment_type: "Withdrawal",
      direction: "Out",
      amount: "10.00",
      description: `Editor close adjustment ${suffix}`,
      notes: "",
    }),
  },
];

async function createScenarioRecord(
  request: APIRequestContext,
  scenario: EditorScenario
): Promise<string> {
  const response = await request.post(
    `${apiBaseUrl}/profiles/${profileId}/${scenario.apiPath}`,
    { data: scenario.createPayload(String(Date.now())) }
  );
  expect(response.ok()).toBeTruthy();
  const record = (await response.json()) as Record<string, string>;
  return record[scenario.idKey];
}

test.describe("Editor close-action parity", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  for (const scenario of scenarios) {
    test(`${scenario.title} shows close controls and returns to its ledger after Save`, async ({
      page,
      request,
    }) => {
      const recordId = await createScenarioRecord(request, scenario);

      try {
        await page.goto(
          scenario.supportsRecordRoute === false
            ? scenario.route
            : `${scenario.route}?record=${recordId}`
        );

        await expect(page.getByRole("heading", { name: scenario.title })).toBeVisible();
        await expect(page.locator(".ledger-loading-overlay")).toBeHidden({ timeout: 30_000 });
        if (scenario.supportsRecordRoute === false) {
          const fixtureRow = page.locator(".data-table tbody tr", { hasText: recordId }).first();
          await expect(fixtureRow).toBeVisible();
          await fixtureRow.click();
        }
        await expect(page.locator(".workflow-editor-modal")).toBeVisible();

        const topClose = page.locator(".workflow-editor-panel .workflow-panel-header .button-link", {
          hasText: "Close",
        });
        await expect(topClose).toBeVisible();
        await expect(topClose).toBeFocused();

        const bottomClose = page.locator(
          ".workflow-editor-panel .tracker-nav .button-link.tracker-nav-right-action",
          { hasText: "Close" }
        );
        await expect(bottomClose).toBeVisible();

        const saveButton = page
          .locator(".workflow-editor-modal")
          .getByRole("button", { name: "Save", exact: true });
        await expect(saveButton).toBeEnabled();
        await saveButton.click();
        await expect(page.locator(".workflow-editor-modal")).toBeHidden();
        await expect(page.getByRole("table")).toBeVisible();
      } finally {
        await request.delete(
          `${apiBaseUrl}/profiles/${profileId}/${scenario.apiPath}/${recordId}`
        );
      }
    });
  }

  test("closing a newly opened sportsbook editor restores focus to its trigger", async ({ page }) => {
    await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
    await expect(page.locator(".ledger-loading-overlay")).toBeHidden({ timeout: 30_000 });
    const addButton = page.getByRole("button", { name: "Add sportsbook row" });
    await addButton.click();

    const closeButton = page.getByRole("button", { name: "Close sportsbook editor" }).first();
    await expect(closeButton).toBeFocused();
    await closeButton.click();
    await expect(addButton).toBeFocused();
  });
});
