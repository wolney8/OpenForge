import { expect, test, type APIRequestContext } from "@playwright/test";

async function deleteFreeBetFixture(
  request: APIRequestContext,
  profileId: string,
  freeBetId: string
) {
  try {
    await request.delete(`http://127.0.0.1:8010/profiles/${profileId}/free-bets/${freeBetId}`, {
      timeout: 5_000,
    });
  } catch {
    // Cleanup is best-effort; the UI regression assertion must not be masked by a slow DELETE.
  }
}

test("Free Bets calculator keeps Matching active when Advanced mode autosaves", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const profileId = "profile-demo-001";
  const createResponse = await request.post(
    `http://127.0.0.1:8010/profiles/${profileId}/free-bets`,
    {
      data: {
        event_name: "Calculator parity event",
        offer_text: "Calculator parity offer",
        bookmaker: "Bookmaker A",
        offer_type: "Bet & Get",
        bet_type: "Single",
        offer_name: "Weekly Reload",
        fixture_type: "Football",
        status: "Placed",
        result: "Pending",
        retention_mode: "SNR",
        free_bet_value: "5",
        back_odds: "2.0",
        match_strategy: "Standard",
        lay_odds_1: "3.5",
        lay_actual: "1.43",
        lay_matched_stake_1: "1.43",
        lay_commission_1: "0",
        exchange_name: "Matchbook",
        expiry_datetime: "2026-07-25T12:00:00",
        date_settled: "2026-07-18T15:00:00",
        origin_qual_bet_id: "SB-CALC-PARITY",
        offer_group_id: "DEMO-CODE-001",
        user_notes: "",
        manual_override_value: "",
        manual_override_reason: "",
      },
    }
  );
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = (await createResponse.json()) as { free_bet_id: string };

  try {
    await page.goto(`/profiles/${profileId}/tracker/free-bets?record=${createdRow.free_bet_id}`);
    await expect(page.getByText("Loading free-bet ledger")).toBeHidden({ timeout: 90_000 });

    const editor = page.locator(".workflow-editor-panel");
    await expect(editor).toBeVisible({ timeout: 30_000 });
    await editor.locator('[data-pd-id="ledger-editor.tab.matching"]').click();

    const matchingPanel = editor.locator('[data-pd-id="ledger-editor.panel.matching"]');
    await expect(matchingPanel).toBeVisible();

    const modeBar = editor.locator('[data-pd-id="free-bets.matching.calculator-mode"]');
    await expect(modeBar).toBeVisible();
    const layModeSelect = modeBar.getByLabel("Free-bet lay mode");
    await expect(layModeSelect).toHaveValue("Standard");

    await layModeSelect.selectOption("Advanced");
    await expect(matchingPanel).toBeVisible();
    await expect(layModeSelect).toHaveValue("Advanced");

    const resultCards = editor.locator(
      '[data-pd-id="free-bets.matching.result-cards"] .calculator-result-card'
    );
    await expect(resultCards).toHaveCount(4);
    await expect(resultCards.filter({ hasText: "Underlay" })).toHaveCount(1);
    await expect(resultCards.filter({ hasText: "Standard" })).toHaveCount(1);
    await expect(resultCards.filter({ hasText: "Overlay" })).toHaveCount(1);
    await expect(resultCards.filter({ hasText: "Custom" })).toHaveCount(1);
    await expect(editor.getByLabel("Custom free-bet lay stake slider")).toBeVisible();
    await expect(resultCards.first()).toContainText("Lay Stake");
    await expect(resultCards.first()).toContainText("Liability");
    await expect(resultCards.first()).toContainText("Back Win");
    await expect(resultCards.first()).toContainText("Lay Win");
    await expect(resultCards.first()).toContainText("£");

    const exchangeSelect = editor.getByLabel("Exchange");
    const currentExchange = await exchangeSelect.inputValue();
    const exchangeOptions = await exchangeSelect.locator("option").evaluateAll((options) =>
      options
        .map((option) => (option as HTMLOptionElement).value)
        .filter((value) => value.length > 0)
    );
    const nextExchange =
      exchangeOptions.find((option) => option !== currentExchange) ?? exchangeOptions[0];
    expect(nextExchange).toBeTruthy();

    if (nextExchange !== currentExchange) {
      const autosaveResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/profiles/${profileId}/free-bets/${createdRow.free_bet_id}`) &&
          response.request().method() === "PUT"
      );
      await Promise.all([autosaveResponse, exchangeSelect.selectOption(nextExchange)]);
      await expect(matchingPanel).toBeVisible();
      await expect(layModeSelect).toHaveValue("Advanced");
    }

  } finally {
    await deleteFreeBetFixture(request, profileId, createdRow.free_bet_id);
  }
});

test("Free Bets settlement uses unique result options and one step edit chip", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const profileId = "profile-demo-001";
  const createResponse = await request.post(
    `http://127.0.0.1:8010/profiles/${profileId}/free-bets`,
    {
      data: {
        event_name: "Settlement quick chips event",
        offer_text: "Settlement quick chips offer",
        bookmaker: "Bookmaker A",
        offer_type: "Bet & Get",
        bet_type: "Single",
        offer_name: "Weekly Reload",
        fixture_type: "Football",
        status: "Settled",
        result: "Back Won",
        retention_mode: "SNR",
        free_bet_value: "5",
        back_odds: "2.0",
        match_strategy: "Standard",
        lay_odds_1: "3.5",
        lay_actual: "1.43",
        lay_matched_stake_1: "1.43",
        lay_commission_1: "0",
        exchange_name: "Matchbook",
        expiry_datetime: "2026-07-25T12:00:00",
        date_settled: "2026-07-18T15:00:00",
        origin_qual_bet_id: "SB-SETTLEMENT-QUICK-CHIPS",
        offer_group_id: "DEMO-CODE-001",
        user_notes: "",
        manual_override_value: "",
        manual_override_reason: "",
      },
    }
  );
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = (await createResponse.json()) as { free_bet_id: string };

  try {
    await page.goto(`/profiles/${profileId}/tracker/free-bets?record=${createdRow.free_bet_id}`);

    const editor = page.getByRole("dialog", { name: "Edit free-bet row" });
    await expect(editor).toBeVisible({ timeout: 30_000 });
    await editor.getByRole("tab", { name: /Settlement/ }).click();

    const resultSelect = editor.locator('[data-guided-field="result"] select');
    const optionLabels = await resultSelect.locator("option").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).textContent?.trim() ?? "")
    );
    expect(new Set(optionLabels).size).toBe(optionLabels.length);
    expect(optionLabels).toEqual(["Pending", "Back won", "Lay won", "Void"]);

    const quickActions = editor.locator('[data-pd-id="free-bets.editor.quick-settlement-actions"]');
    await expect(quickActions).toBeVisible();
    await expect(quickActions.getByRole("button", { name: "Back won" })).toBeVisible();
    await expect(quickActions.getByRole("button", { name: "Lay won" })).toBeVisible();

    const settlementPanel = editor.locator('[data-pd-id="ledger-editor.panel.settlement"]');
    await settlementPanel.locator('[data-pd-id="free-bets.editor.edit-settled-row"]').click();
    await expect(
      settlementPanel.locator('[data-pd-id="free-bets.editor.editing-state"]')
    ).toHaveCount(1);
    await expect(
      settlementPanel.locator('[data-pd-id="free-bets.editor.edit-settled-row"]')
    ).toHaveCount(0);
    const footerPrimaryActions = editor.locator(".workflow-editor-footer-primary");
    await expect(footerPrimaryActions.getByRole("button", { exact: true, name: "Save Edits" })).toBeDisabled();
    await expect(footerPrimaryActions.getByRole("button", { exact: true, name: "Cancel" })).toBeVisible();
    await footerPrimaryActions.getByRole("button", { exact: true, name: "Cancel" }).click();
    await expect(
      settlementPanel.locator('[data-pd-id="free-bets.editor.edit-settled-row"]')
    ).toHaveCount(1);
  } finally {
    await deleteFreeBetFixture(request, profileId, createdRow.free_bet_id);
  }
});

test("Free Bets editor stays closed after closing an existing row", async ({ page, request }) => {
  test.setTimeout(45_000);
  const profileId = "profile-demo-001";
  const createResponse = await request.post(
    `http://127.0.0.1:8010/profiles/${profileId}/free-bets`,
    {
      data: {
        event_name: "Close lifecycle event",
        offer_text: "Close lifecycle offer",
        bookmaker: "Bookmaker A",
        offer_type: "Bet & Get",
        bet_type: "Single",
        offer_name: "Weekly Reload",
        fixture_type: "Football",
        status: "Placed",
        result: "Pending",
        retention_mode: "SNR",
        free_bet_value: "5",
        back_odds: "2.0",
        match_strategy: "Standard",
        lay_odds_1: "3.5",
        lay_actual: "1.43",
        lay_matched_stake_1: "1.43",
        lay_commission_1: "0",
        exchange_name: "Matchbook",
        expiry_datetime: "2026-07-25T12:00:00",
        date_settled: "2026-07-18T15:00:00",
        origin_qual_bet_id: "SB-CLOSE-LIFECYCLE",
        offer_group_id: "DEMO-CODE-001",
        user_notes: "",
        manual_override_value: "",
        manual_override_reason: "",
      },
    }
  );
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = (await createResponse.json()) as { free_bet_id: string };

  try {
    await page.goto(`/profiles/${profileId}/tracker/free-bets`);
    await expect(page.getByText("Loading free-bet ledger")).toBeHidden({ timeout: 90_000 });
    await page.getByRole("button", { name: `Edit ${createdRow.free_bet_id}` }).click();

    const editor = page.locator(".workflow-editor-panel");
    await expect(editor).toBeVisible({ timeout: 30_000 });
    await editor.getByRole("button", { name: "Close free-bet editor" }).click();
    await expect.poll(async () => page.locator(".workflow-editor-modal").count()).toBe(0);
    await page.waitForTimeout(1_000);
    expect(await page.locator(".workflow-editor-modal").count()).toBe(0);
  } finally {
    await deleteFreeBetFixture(request, profileId, createdRow.free_bet_id);
  }
});

test("Free Bets guided entry routes through setup and matching fields", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/profiles/profile-demo-001/tracker/free-bets");
  await expect(page.getByText("Loading free-bet ledger")).toBeHidden({ timeout: 90_000 });

  await page.getByRole("button", { name: "Add free-bet row" }).click();

  const editor = page.getByRole("dialog", { name: "Create free-bet row" });
  await expect(editor).toBeVisible();

  const guide = editor.locator('[data-pd-id="free-bets.guided-entry"]');
  await expect(guide).toBeVisible();
  await expect(guide).toContainText("Next required");
  await expect(guide).toContainText("Bookmaker");
  await expect(editor.locator('[data-guided-field="bookmaker"]')).toHaveClass(/is-guided-next/);

  await editor.getByLabel("Offer", { exact: true }).fill("Free bet guided entry offer");
  await editor.getByLabel("Bookmaker").selectOption({ index: 1 });
  await editor.getByLabel("Offer type").selectOption({ label: "Bet & Get" });
  await editor.getByLabel("Bet type").selectOption({ label: "Single" });
  await editor.getByLabel("Fixture type").selectOption({ label: "Football" });
  await editor.getByLabel("Event name").fill("Free bet guided entry event");

  await expect(guide).toContainText("Go to");
  await expect(guide).toContainText("Matching");
  await expect(guide).toContainText("Free-Bet Value");

  await editor.locator('[data-pd-id="free-bets.guided-entry"] .guided-entry-action').click();
  await expect(editor.locator('[data-pd-id="ledger-editor.panel.matching"]')).toBeVisible();
  const freeBetValueInput = editor.locator('[data-guided-field="free_bet_value"] input');
  await expect(freeBetValueInput).toBeFocused();
  await expect(freeBetValueInput).toHaveAttribute("aria-describedby", "free-bet-guided-entry-message");

  await editor.getByRole("button", { name: "Dismiss free-bet guided entry" }).click();
  await expect(guide).toHaveCount(0);
  await expect(editor.locator('[data-pd-id="free-bets.guided-entry.restore"]')).toBeVisible();
});
