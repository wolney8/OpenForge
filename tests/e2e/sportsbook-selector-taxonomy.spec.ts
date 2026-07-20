import { expect, test } from "@playwright/test";

test("Sportsbook selectors follow the approved offer-type and bet-type model", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add sportsbook row" }).click();

  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toBeVisible();

  const offerTypeSelect = page.getByLabel("Offer type (promotion mechanism)");
  const betTypeSelect = page.getByLabel("Bet type (bet shape / placement)");

  await expect(offerTypeSelect.locator('option[value="Bet Builder"]')).toHaveCount(0);
  await expect(offerTypeSelect.locator('option[value="Acca"]')).toHaveCount(0);
  await expect(offerTypeSelect.locator('option[value="None"]')).toHaveCount(0);

  await expect(betTypeSelect.locator('option[value="In Play + Single"]')).toHaveCount(1);
  await expect(betTypeSelect.locator('option[value="In Play + Bet Builder"]')).toHaveCount(1);
  await expect(betTypeSelect.locator('option[value="First Goalscorer"]')).toHaveCount(1);

  await offerTypeSelect.selectOption("Bet & Get");
  await expect(betTypeSelect.locator('option[value="First Goalscorer"]')).toHaveCount(0);
  await expect(betTypeSelect.locator('option[value="In Play + Single"]')).toHaveCount(1);
  await expect(betTypeSelect.locator('option[value="Accumulator / Multiple"]')).toHaveCount(1);

  await offerTypeSelect.selectOption("Double Delight / Hat-trick Heaven");
  await expect(betTypeSelect).toHaveValue("First Goalscorer");
  await expect(betTypeSelect.locator("option")).toHaveCount(2);
});

test("Sportsbook common combo prefills an unsaved draft and records no row until save", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const beforeResponse = await request.get(
    `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`
  );
  expect(beforeResponse.ok()).toBeTruthy();
  const beforeCount = ((await beforeResponse.json()) as unknown[]).length;

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add sportsbook row" }).click();

  const editor = page.getByRole("dialog", { name: "Create sportsbook row" });
  const comboSelect = editor.getByLabel("Apply common bet combo to new sportsbook draft");
  await expect(comboSelect).toBeVisible();
  await comboSelect.selectOption("COMBO-WEEKLY-BUILDER");

  await expect(editor.getByLabel("Offer type (promotion mechanism)")).toHaveValue("Bet & Get");
  await expect(editor.getByLabel("Bet type (bet shape / placement)")).toHaveValue("Bet Builder");
  await expect(editor.getByLabel("Fixture type")).toHaveValue("Football");
  await expect(editor.getByLabel("Back stake")).toHaveValue("10.00");
  await expect(editor.getByLabel("Back odds")).toHaveValue("");

  const afterResponse = await request.get(
    `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`
  );
  expect(afterResponse.ok()).toBeTruthy();
  expect(((await afterResponse.json()) as unknown[]).length).toBe(beforeCount);
});

test("Sportsbook common combo requires an explicit choice from several eligible bookmakers", async ({
  page,
  request,
}) => {
  const createResponse = await request.post(
    "http://127.0.0.1:8010/fund-manager/common-bet-combos",
    {
      data: {
        name: `Two bookmaker combo ${Date.now()}`,
        ledger_type: "Sportsbook",
        bookmakers: ["247Bet", "32Red"],
        offer_type: "Bet & Get",
        bet_type: "Single",
        offer_name: "",
        fixture_type: "Football",
        default_back_stake: "10.00",
        minimum_back_odds: "2.00",
        allowed_strategies: ["Standard", "Underlay"],
      },
    }
  );
  expect(createResponse.ok()).toBeTruthy();
  const preset = (await createResponse.json()) as Record<string, unknown>;

  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add sportsbook row" }).click();
  const editor = page.getByRole("dialog", { name: "Create sportsbook row" });
  await editor
    .getByLabel("Apply common bet combo to new sportsbook draft")
    .selectOption(String(preset.preset_id));

  const candidateRow = editor.locator('[data-pd-id="sportsbook.editor.combo-bookmakers"]');
  await expect(candidateRow.getByRole("button", { name: "247Bet" })).toBeVisible();
  await expect(candidateRow.getByRole("button", { name: "32Red" })).toBeVisible();
  const bookmakerSelect = editor.getByRole("combobox", { name: "Bookmaker", exact: true });
  await expect(bookmakerSelect).toHaveValue("");
  await candidateRow.getByRole("button", { name: "32Red" }).click();
  await expect(bookmakerSelect).toHaveValue("32Red");

  const archiveResponse = await request.put(
    `http://127.0.0.1:8010/fund-manager/common-bet-combos/${preset.preset_id}`,
    { data: { ...preset, status: "Archived" } }
  );
  expect(archiveResponse.ok()).toBeTruthy();
});

test("Sportsbook campaign tag remains free text when offer family changes", async ({ page }) => {
  const profileId = "profile-demo-001";
  const campaignTag = `Saturday DDHH ${Date.now()}`;

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add sportsbook row" }).click();

  const offerTypeSelect = page.getByLabel("Offer type (promotion mechanism)");
  const campaignTagInput = page.getByLabel("Campaign tag (optional)");

  await offerTypeSelect.selectOption("Double Delight / Hat-trick Heaven");
  await campaignTagInput.fill(campaignTag);
  await offerTypeSelect.selectOption("Weekly Reload");
  await expect(campaignTagInput).toHaveValue(campaignTag);
});

test("Free bets no longer require a campaign tag to save a prospecting row", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/free-bets");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add free-bet row" }).click();

  await page.getByLabel("Bookmaker").selectOption({ index: 1 });
  await page.getByLabel("Offer type").selectOption("Bet & Get");
  await page.getByLabel("Bet type (bet shape / placement)").selectOption("In Play + Single");
  await page.getByLabel("Event name").fill("Optional campaign tag proof");

  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.locator(".workflow-editor-panel")).not.toBeVisible();
  await expect(page.locator(".data-table")).toContainText("Optional campaign tag proof");
});

test("Free-bet selectors follow the approved offer-type and bet-type model", async ({ page }) => {
  const profileId = "profile-demo-001";

  await page.goto(`/profiles/${profileId}/tracker/free-bets`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add free-bet row" }).click();

  const offerTypeSelect = page.getByLabel("Offer type");
  const betTypeSelect = page.getByLabel("Bet type (bet shape / placement)");
  const campaignTagInput = page.getByLabel("Campaign tag (optional)");

  await offerTypeSelect.selectOption("Bet & Get");
  await expect(betTypeSelect.locator('option[value="First Goalscorer"]')).toHaveCount(0);
  await expect(betTypeSelect.locator('option[value="In Play + Single"]')).toHaveCount(1);

  await offerTypeSelect.selectOption("Double Delight / Hat-trick Heaven");
  await expect(betTypeSelect).toHaveValue("First Goalscorer");
  await expect(betTypeSelect.locator("option")).toHaveCount(2);
  await campaignTagInput.fill("Demo DDHH campaign");
  await expect(campaignTagInput).toHaveValue("Demo DDHH campaign");
});

test("Legacy sportsbook rows keep deprecated offer-type values re-openable without exposing them on new rows", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";

  const createResponse = await request.post(`http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`, {
    data: {
      event_name: "Legacy None Offer Type Match",
      offer_text: "Legacy none offer row",
      bookmaker: "Bookmaker A",
      offer_type: "None",
      bet_type: "Single",
      offer_name: "",
      fixture_type: "Football",
      market: "Match Odds",
      status: "Prospecting",
      result: "Pending",
      back_stake: "",
      back_odds: "",
      match_strategy: "No Lay",
      lay_odds_1: "",
      lay_actual: "",
      lay_matched_stake_1: "",
      lay_commission_1: "",
      exchange_name: "",
      date_settled: "",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add sportsbook row" }).click();
  const newRowOfferTypeSelect = page.getByLabel("Offer type (promotion mechanism)");
  await expect(newRowOfferTypeSelect.locator('option[value="None"]')).toHaveCount(0);
  await page
    .getByRole("dialog", { name: "Create sportsbook row" })
    .locator(".workflow-panel-header .button-link", { hasText: "Close" })
    .click();

  const row = page.locator(".data-table tbody tr", { hasText: "Legacy None Offer Type Match" }).first();
  await expect(row).toBeVisible();
  await row.click();

  const editor = page.locator(".workflow-editor-panel");
  const editOfferTypeSelect = editor.getByLabel("Offer type (promotion mechanism)");
  await expect(editOfferTypeSelect).toHaveValue("None");
  await expect(editOfferTypeSelect.locator('option[value="None"]')).toHaveCount(1);
});
