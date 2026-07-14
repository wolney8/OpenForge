import { expect, test } from "@playwright/test";

test("Sportsbook free-bet bridge creates a free-bet row in place and leaves settlement-awarded rows unchanged by default", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";

  const commissionResponse = await request.put(
    `http://127.0.0.1:8010/profiles/${profileId}/exchange-commissions`,
    {
      data: {
        exchange_name: "Matchbook",
        commission_rate: "0.02",
      },
    }
  );
  expect(commissionResponse.ok()).toBeTruthy();

  const createResponse = await request.post(`http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`, {
    data: {
      event_name: "Bridge Source Match",
      offer_text: "Bridge source offer",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Bridge Offer Name",
      fixture_type: "Football",
      market: "Match Odds",
      status: "Placed",
      result: "Pending",
      back_stake: "10.00",
      back_odds: "2.20",
      match_strategy: "Standard",
      lay_odds_1: "2.30",
      lay_actual: "9.57",
      lay_matched_stake_1: "9.57",
      lay_commission_1: "",
      exchange_name: "Matchbook",
      date_settled: "2026-07-22T18:00",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");

  const row = page.locator(".data-table tbody tr", { hasText: "Bridge Source Match" }).first();
  await expect(row).toBeVisible();

  const bridgeButton = row.getByRole("button", {
    name: `Copy ${createdRow.sportsbook_bet_id} to free bets`,
  });
  await bridgeButton.click();

  const modal = page.locator('.modal-panel[aria-label="Copy sportsbook row to free bets"]');
  await expect(modal).toBeVisible();

  await modal.getByLabel("Campaign tag (optional)").selectOption("Bridge Offer Name");
  await modal.getByLabel("Free-bet value").fill("7");
  await modal.getByLabel("Retention mode").selectOption("SR");

  const expiryInput = modal.getByLabel("Expiry");
  await expect(expiryInput).toHaveValue(/2026-07-25T18:00/);

  await modal.getByRole("button", { name: "Create free bet" }).click();

  await expect(page).toHaveURL(new RegExp(`/profiles/${profileId}/tracker/sportsbook-bets$`));
  await expect(page.locator('.modal-panel[aria-label="Copy sportsbook row to free bets"]')).toHaveCount(0);
  await expect(page.locator(".status-toast")).toContainText(createdRow.sportsbook_bet_id);

  const freeBetsResponse = await request.get(`http://127.0.0.1:8010/profiles/${profileId}/free-bets`);
  expect(freeBetsResponse.ok()).toBeTruthy();
  const freeBets = await freeBetsResponse.json();
  const createdFreeBet = freeBets.find((row: Record<string, string>) => row.event_name === "Bridge Source Match");
  expect(createdFreeBet).toBeTruthy();
  expect(createdFreeBet.bookmaker).toBe("Bookmaker A");
  expect(createdFreeBet.offer_type).toBe("Bet & Get");
  expect(createdFreeBet.bet_type).toBe("Single");
  expect(createdFreeBet.offer_name).toBe("Bridge Offer Name");
  expect(createdFreeBet.free_bet_value).toBe("7");
  expect(createdFreeBet.retention_mode).toBe("SR");
  expect(createdFreeBet.status).toBe("Not Yet Awarded");

  const sourceRowResponse = await request.get(
    `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets/${createdRow.sportsbook_bet_id}`
  );
  expect(sourceRowResponse.ok()).toBeTruthy();
  const updatedRow = await sourceRowResponse.json();
  expect(updatedRow.status).toBe("Placed");
});

test("Sportsbook free-bet bridge can award on placement, create the free bet, and promote the source row immediately", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";

  const commissionResponse = await request.put(
    `http://127.0.0.1:8010/profiles/${profileId}/exchange-commissions`,
    {
      data: {
        exchange_name: "Matchbook",
        commission_rate: "0.02",
      },
    }
  );
  expect(commissionResponse.ok()).toBeTruthy();

  const createResponse = await request.post(`http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`, {
    data: {
      event_name: "Bridge Placement Award Match",
      offer_text: "Bridge placement offer",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Bridge Placement Offer",
      fixture_type: "Football",
      market: "Match Odds",
      status: "Placed",
      result: "Pending",
      back_stake: "10.00",
      back_odds: "2.20",
      match_strategy: "Standard",
      lay_odds_1: "2.30",
      lay_actual: "9.57",
      lay_matched_stake_1: "9.57",
      lay_commission_1: "",
      exchange_name: "Matchbook",
      date_settled: "2026-07-22T18:00",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");

  const row = page.locator(".data-table tbody tr", { hasText: "Bridge Placement Award Match" }).first();
  await expect(row).toBeVisible();
  await row
    .getByRole("button", {
      name: `Copy ${createdRow.sportsbook_bet_id} to free bets`,
    })
    .click();

  const modal = page.locator('.modal-panel[aria-label="Copy sportsbook row to free bets"]');
  await expect(modal).toBeVisible();
  await modal.getByLabel("Free-bet award timing").selectOption("placement");
  await modal.getByRole("button", { name: "Create free bet" }).click();

  await expect(page).toHaveURL(new RegExp(`/profiles/${profileId}/tracker/sportsbook-bets$`));
  await expect(page.locator(".status-toast")).toContainText("free bet awarded");

  const sourceRowResponse = await request.get(
    `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets/${createdRow.sportsbook_bet_id}`
  );
  expect(sourceRowResponse.ok()).toBeTruthy();
  const updatedRow = await sourceRowResponse.json();
  expect(updatedRow.status).toBe("Free Bet Awarded");

  const freeBetsResponse = await request.get(`http://127.0.0.1:8010/profiles/${profileId}/free-bets`);
  expect(freeBetsResponse.ok()).toBeTruthy();
  const freeBets = await freeBetsResponse.json();
  const createdFreeBet = freeBets.find(
    (row: Record<string, string>) => row.event_name === "Bridge Placement Award Match"
  );
  expect(createdFreeBet).toBeTruthy();
  expect(createdFreeBet.status).toBe("Available");
});

test("Sportsbook free-bet bridge modal follows offer-type taxonomy for campaign tag and bet type", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const nonce = Date.now().toString();
  const betAndGetTag = `Bet 10 Get 5 In Play ${nonce}`;
  const reloadTag = `Weekly Reload ${nonce}`;

  for (const optionValue of [betAndGetTag, reloadTag]) {
    const response = await request.post(
      `http://127.0.0.1:8010/profiles/${profileId}/lookup-values`,
      {
        data: {
          lookup_type: "offer_name",
          option_value: optionValue,
        },
      }
    );
    expect(response.ok()).toBeTruthy();
  }

  const createResponse = await request.post(`http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`, {
    data: {
      event_name: "Bridge Bet and Get Match",
      offer_text: "Bridge bet and get source",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "In Play + Single",
      offer_name: betAndGetTag,
      fixture_type: "Football",
      market: "Match Odds",
      status: "Placed",
      result: "Pending",
      back_stake: "10.00",
      back_odds: "2.20",
      match_strategy: "Standard",
      lay_odds_1: "2.30",
      lay_actual: "9.57",
      lay_matched_stake_1: "9.57",
      lay_commission_1: "",
      exchange_name: "Matchbook",
      date_settled: "2026-07-22T18:00",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");

  const row = page.locator(".data-table tbody tr", { hasText: "Bridge Bet and Get Match" }).first();
  await expect(row).toBeVisible();
  await row
    .getByRole("button", {
      name: `Copy ${createdRow.sportsbook_bet_id} to free bets`,
    })
    .click();

  const modal = page.locator('.modal-panel[aria-label="Copy sportsbook row to free bets"]');
  await expect(modal).toBeVisible();

  await expect(modal.getByLabel("Bet type (bet shape / placement)")).toHaveValue(
    "In Play + Single"
  );
  await expect(
    modal.getByLabel("Bet type (bet shape / placement)").locator('option[value="In Play + Single"]')
  ).toHaveCount(1);
  await expect(
    modal.getByLabel("Bet type (bet shape / placement)").locator('option[value="First Goalscorer"]')
  ).toHaveCount(0);
  await expect(modal.getByLabel("Campaign tag (optional)").locator(`option[value="${betAndGetTag}"]`)).toHaveCount(1);
  await expect(modal.getByLabel("Campaign tag (optional)").locator(`option[value="${reloadTag}"]`)).toHaveCount(0);
});
