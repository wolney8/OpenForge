import { expect, test } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:8010";
const profileId = "profile-demo-001";

test("Fund Manager catalogue drives profile Bookie accounts and ledger identity", async ({
  page,
  request,
}) => {
  const nonce = Date.now().toString().slice(-7);
  const brandName = `Demo Book ${nonce}`;
  const shortName = `DB${nonce.slice(-3)}`;
  const originalSettingsResponse = await request.get(
    `${apiBaseUrl}/profiles/${profileId}/bookmaker-display-settings`
  );
  expect(originalSettingsResponse.ok()).toBeTruthy();
  const originalSettings = (await originalSettingsResponse.json()) as {
    global_mode: string;
    profile_override: string;
  };
  const createResponse = await request.post(`${apiBaseUrl}/bookmaker-catalogue`, {
    data: {
      brand_name: brandName,
      short_display_name: shortName,
      legal_operator: "Demo Operator Limited",
      operator_group: "Demo Group",
      platform: "Demo Platform",
      risk_team: "Demo Risk Team",
      licence_reference: "DEMO-LICENCE-001",
      licence_status: "Demo only",
      canonical_domain: "demo-book.example.invalid",
      status: "Active",
      foreground_colour: "#FFFFFF",
      background_colour: "#1B5E20",
      logo_asset_path: "",
      source: "Synthetic Playwright fixture",
      confidence: "Verified",
      last_verified_date: "2026-07-15",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const bookmaker = (await createResponse.json()) as { bookmaker_id: string };

  await request.put(`${apiBaseUrl}/bookmaker-display-settings`, {
    data: { mode: "Brand badge" },
  });
  await request.put(`${apiBaseUrl}/profiles/${profileId}/bookmaker-display-settings`, {
    data: { mode: "Inherit" },
  });

  await page.goto(`/profiles/${profileId}/tracker/accounts`);
  await page.getByRole("button", { name: "Add account row" }).click();
  const editor = page.locator(".workflow-editor-panel");
  await editor.getByRole("combobox").first().selectOption(bookmaker.bookmaker_id);
  await expect(editor.locator("label").filter({ hasText: /^Group/ }).locator("select")).toHaveValue(
    "Demo Group"
  );
  await expect(
    editor.locator("label").filter({ hasText: /^Platform/ }).locator("select")
  ).toHaveValue("Demo Platform");
  await editor.getByRole("button", { name: "Create account row" }).click();
  await page.getByPlaceholder("Search account rows").fill(brandName);
  await expect(page.getByText(shortName, { exact: true })).toBeVisible();
  const accountRowsResponse = await request.get(`${apiBaseUrl}/profiles/${profileId}/accounts`);
  expect(accountRowsResponse.ok()).toBeTruthy();
  const accountRecord = (
    (await accountRowsResponse.json()) as Array<Record<string, unknown>>
  ).find((row) => row.bookmaker_id === bookmaker.bookmaker_id);
  expect(accountRecord).toBeTruthy();

  const sportsbookResponse = await request.post(
    `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`,
    {
      data: {
        event_name: `Catalogue Identity Match ${nonce}`,
        offer_text: "Synthetic catalogue display test",
        bookmaker: brandName,
        offer_type: "Qualifying Bet",
        status: "Prospecting",
        result: "Pending",
        back_stake: "",
        back_odds: "",
        match_strategy: "No Lay",
        lay_odds_1: "",
        lay_commission_1: "",
        exchange_name: "",
        date_settled: "2026-07-15 18:00:00",
        user_notes: "",
        manual_override_value: "",
        manual_override_reason: "",
      },
    }
  );
  expect(sportsbookResponse.ok()).toBeTruthy();
  const sportsbookRecord = (await sportsbookResponse.json()) as { sportsbook_bet_id: string };

  const waitForSportsbookRows = () =>
    page.waitForResponse(
      (response) =>
        response.url() === `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets` &&
        response.ok(),
      { timeout: 30_000 }
    );

  const initialRowsResponse = waitForSportsbookRows();
  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await initialRowsResponse;
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 30_000 });
  await page.getByPlaceholder("Search sportsbook rows").fill(`Catalogue Identity Match ${nonce}`);
  await expect(page.locator(".bookmaker-identity-badge", { hasText: shortName })).toBeVisible();

  await request.put(`${apiBaseUrl}/profiles/${profileId}/bookmaker-display-settings`, {
    data: { mode: "Name" },
  });
  const nameModeRowsResponse = waitForSportsbookRows();
  await page.reload();
  await nameModeRowsResponse;
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 30_000 });
  await page.getByPlaceholder("Search sportsbook rows").fill(`Catalogue Identity Match ${nonce}`);
  await expect(page.getByText(brandName, { exact: true })).toBeVisible();
  await expect(page.locator(".bookmaker-identity-badge", { hasText: shortName })).toHaveCount(0);

  await request.put(`${apiBaseUrl}/profiles/${profileId}/bookmaker-display-settings`, {
    data: { mode: "Logo" },
  });
  const logoModeRowsResponse = waitForSportsbookRows();
  await page.reload();
  await logoModeRowsResponse;
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 30_000 });
  await page.getByPlaceholder("Search sportsbook rows").fill(`Catalogue Identity Match ${nonce}`);
  await expect(page.locator(".bookmaker-identity-badge", { hasText: shortName })).toBeVisible();

  await page.goto(`/profiles/${profileId}/tracker/settings`);
  await expect(page.getByRole("heading", { name: "Bookmaker catalogue" })).toBeVisible();
  await page.getByLabel("Search catalogue").fill(brandName);
  await expect(page.getByText(brandName, { exact: true })).toBeVisible();
  await expect(page.getByText("Demo Group · Demo Platform · Verified")).toBeVisible();

  await request.delete(
    `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${sportsbookRecord.sportsbook_bet_id}`
  );
  await request.put(
    `${apiBaseUrl}/profiles/${profileId}/accounts/${String(accountRecord?.account_id)}`,
    { data: { ...accountRecord, status: "Archived" } }
  );
  const catalogueRowsResponse = await request.get(`${apiBaseUrl}/bookmaker-catalogue`);
  const catalogueRecord = (
    (await catalogueRowsResponse.json()) as Array<Record<string, unknown>>
  ).find((row) => row.bookmaker_id === bookmaker.bookmaker_id);
  await request.put(`${apiBaseUrl}/bookmaker-catalogue/${bookmaker.bookmaker_id}`, {
    data: { ...catalogueRecord, status: "Archived" },
  });
  await request.put(`${apiBaseUrl}/bookmaker-display-settings`, {
    data: { mode: originalSettings.global_mode },
  });
  await request.put(`${apiBaseUrl}/profiles/${profileId}/bookmaker-display-settings`, {
    data: { mode: originalSettings.profile_override },
  });

});
