import { expect, test, type Page } from "@playwright/test";

async function openInlineFreeBetBridge(page: Page, profileId: string, sportsbookBetId: string) {
  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets?record=${sportsbookBetId}`);
  await page.waitForLoadState("networkidle");

  const editor = page.getByRole("dialog", { name: "Edit sportsbook row" });
  await expect(editor).toBeVisible();
  await editor.getByRole("tab", { name: /Free Bet/ }).click();

  const bridge = editor.locator('[data-pd-id="sportsbook.free-bet-bridge.inline"]');
  await expect(bridge).toBeVisible();

  return {
    bridge,
    editor,
    footerActions: editor.locator('[data-pd-id="sportsbook.editor.actions"]'),
  };
}

test("Sportsbook free-bet bridge creates a free-bet row in the editor and marks the source awarded", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

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
      date_settled: "2026-08-09T18:00",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  const { bridge, editor, footerActions } = await openInlineFreeBetBridge(
    page,
    profileId,
    createdRow.sportsbook_bet_id
  );

  await bridge.getByLabel("Campaign tag").selectOption("Bridge Offer Name");
  await bridge.getByLabel("Free-bet value").fill("7");
  await bridge.getByLabel("Retention mode").selectOption("SR");

  const expiryInput = bridge.getByLabel("Expiry");
  await expect(expiryInput).toHaveValue(/2026-08-12T18:00/);

  const createFreeBetButton = footerActions.getByRole("button", {
    name: "Create free bet from sportsbook row",
  });
  await createFreeBetButton.click();

  let createdFreeBet: Record<string, string> | null = null;
  await expect
    .poll(async () => {
      const freeBetsResponse = await request.get(`http://127.0.0.1:8010/profiles/${profileId}/free-bets`);
      expect(freeBetsResponse.ok()).toBeTruthy();
      const freeBets = await freeBetsResponse.json();
      createdFreeBet =
        freeBets.find((row: Record<string, string>) => row.origin_qual_bet_id === createdRow.sportsbook_bet_id) ??
        null;
      return Boolean(createdFreeBet);
    }, { timeout: 15_000 })
    .toBe(true);
  await expect(editor).toBeVisible();
  await expect(createFreeBetButton).toContainText("Create Another Free Bet", { timeout: 15_000 });
  expect(createdFreeBet).toBeTruthy();
  expect(createdFreeBet.bookmaker).toBe("Bookmaker A");
  expect(createdFreeBet.offer_type).toBe("Bet & Get");
  expect(createdFreeBet.bet_type).toBe("Single");
  expect(createdFreeBet.offer_name).toBe("Bridge Offer Name");
  expect(createdFreeBet.free_bet_value).toBe("7");
  expect(createdFreeBet.retention_mode).toBe("SR");
  expect(createdFreeBet.status).toBe("Available");

  const sourceRowResponse = await request.get(
    `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets/${createdRow.sportsbook_bet_id}`
  );
  expect(sourceRowResponse.ok()).toBeTruthy();
  const updatedRow = await sourceRowResponse.json();
  expect(updatedRow.status).toBe("Free Bet Awarded");
});

test("Sportsbook free-bet bridge keeps the editor open after creating an available free bet", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

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
      date_settled: "2026-08-09T18:00",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  const { editor, footerActions } = await openInlineFreeBetBridge(
    page,
    profileId,
    createdRow.sportsbook_bet_id
  );

  const createFreeBetButton = footerActions.getByRole("button", {
    name: "Create free bet from sportsbook row",
  });
  await createFreeBetButton.click();

  await expect
    .poll(async () => {
      const sourceRowResponse = await request.get(
        `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets/${createdRow.sportsbook_bet_id}`
      );
      expect(sourceRowResponse.ok()).toBeTruthy();
      const updatedRow = await sourceRowResponse.json();
      return updatedRow.status;
    })
    .toBe("Free Bet Awarded");
  await expect(editor).toBeVisible();
  await expect(createFreeBetButton).toContainText("Create Another Free Bet", { timeout: 15_000 });

  let createdFreeBet: Record<string, string> | null = null;
  await expect
    .poll(async () => {
      const freeBetsResponse = await request.get(`http://127.0.0.1:8010/profiles/${profileId}/free-bets`);
      expect(freeBetsResponse.ok()).toBeTruthy();
      const freeBets = await freeBetsResponse.json();
      createdFreeBet =
        freeBets.find((row: Record<string, string>) => row.origin_qual_bet_id === createdRow.sportsbook_bet_id) ??
        null;
      return Boolean(createdFreeBet);
    }, { timeout: 15_000 })
    .toBe(true);
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
      date_settled: "2026-08-09T18:00",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  const { bridge } = await openInlineFreeBetBridge(
    page,
    profileId,
    createdRow.sportsbook_bet_id
  );

  await expect(bridge.getByLabel("Bet type")).toHaveValue("In Play + Single");
  await expect(bridge.getByLabel("Bet type").locator('option[value="In Play + Single"]')).toHaveCount(1);
  await expect(bridge.getByLabel("Bet type").locator('option[value="First Goalscorer"]')).toHaveCount(0);
  await expect(bridge.getByLabel("Campaign tag").locator(`option[value="${betAndGetTag}"]`)).toHaveCount(1);
  await expect(bridge.getByLabel("Campaign tag").locator(`option[value="${reloadTag}"]`)).toHaveCount(0);
});

test("Sportsbook free-bet bridge can split one awarded value into multiple audited free-bet rows", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const profileId = "profile-demo-001";
  const nonce = Date.now().toString();
  const footballTag = `Split Football ${nonce}`;
  const racingTag = `Bet 10 Get 2 Racing ${nonce}`;

  for (const optionValue of [footballTag, racingTag]) {
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
      event_name: "Bridge Split Award Match",
      offer_text: "Bridge split source",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: footballTag,
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
      date_settled: "2026-08-09T18:00",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  const { bridge, footerActions } = await openInlineFreeBetBridge(
    page,
    profileId,
    createdRow.sportsbook_bet_id
  );

  await bridge.getByLabel("Free-bet value").fill("3");
  await bridge.getByLabel("Expected award value").fill("5");
  await bridge.getByRole("button", { name: "Expand free-bet award splits" }).click();
  await bridge.locator(".bridge-split-row").first().getByLabel("Split value").fill("3");
  await bridge.getByRole("button", { name: "Add split free bet" }).click();
  const secondSplit = bridge.locator(".bridge-split-row").last();
  await expect(bridge.locator('[data-pd-id="sportsbook.free-bet-bridge.splits"]')).toBeVisible();
  const splitGeometry = await bridge.locator('[data-pd-id="sportsbook.free-bet-bridge.splits"]').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(splitGeometry.scrollWidth).toBeLessThanOrEqual(splitGeometry.clientWidth + 2);
  await secondSplit.getByLabel("Split value").fill("2");
  await secondSplit.getByLabel("Award deadline").fill("2026-08-12T18:00");
  await secondSplit.getByLabel("Bet type").selectOption("Bet Builder");
  await secondSplit.getByLabel("Fixture type").selectOption("Horse Racing");
  await secondSplit.getByLabel("Campaign tag").selectOption(racingTag);
  await secondSplit.getByLabel("Restriction note").fill("Horse racing only");

  await footerActions
    .getByRole("button", { name: "Create free bet from sportsbook row" })
    .click();

  let createdFreeBets: Array<Record<string, string>> = [];
  await expect
    .poll(async () => {
      const freeBetsResponse = await request.get(`http://127.0.0.1:8010/profiles/${profileId}/free-bets`);
      expect(freeBetsResponse.ok()).toBeTruthy();
      const freeBets = await freeBetsResponse.json();
      createdFreeBets = freeBets.filter(
        (freeBet: Record<string, string>) => freeBet.origin_qual_bet_id === createdRow.sportsbook_bet_id
      );
      return createdFreeBets.length;
    }, { timeout: 15_000 })
    .toBe(2);
  expect(createdFreeBets).toHaveLength(2);
  expect(new Set(createdFreeBets.map((freeBet: Record<string, string>) => freeBet.source_award_group_id)).size).toBe(1);
  expect(createdFreeBets.map((freeBet: Record<string, string>) => freeBet.source_award_split_total)).toEqual([2, 2]);
  expect(createdFreeBets.map((freeBet: Record<string, string>) => freeBet.free_bet_value).sort()).toEqual(["2", "3"]);
  expect(createdFreeBets.find((freeBet: Record<string, string>) => freeBet.free_bet_value === "2")?.fixture_type).toBe(
    "Horse Racing"
  );

  await page.goto(
    `/profiles/${profileId}/tracker/free-bets?record=${createdFreeBets[0].free_bet_id}`
  );

  const editor = page.locator('[data-pd-id="free-bets.editor.dialog"]');
  await expect(editor).toBeVisible();
  const awardSourceCard = editor.locator('[data-pd-id="free-bets.editor.award-source-card"]');
  await expect(awardSourceCard).toBeVisible();
  await expect(awardSourceCard).toContainText(/Split [12] of 2/);
  await expect(awardSourceCard).toContainText(createdRow.sportsbook_bet_id);
  await expect(awardSourceCard).toContainText("Expected award £ 5.00");
});

test("Sportsbook free-bet bridge lists and removes safe unplaced linked free bets", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const eventName = `Bridge linked cleanup ${Date.now()}`;

  const createSourceResponse = await request.post(
    `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`,
    {
      data: {
        event_name: eventName,
        offer_text: "Bridge cleanup source",
        bookmaker: "Bookmaker A",
        offer_type: "Bet & Get",
        bet_type: "Single",
        offer_name: "Bridge Cleanup Campaign",
        fixture_type: "Football",
        market: "Match Odds",
        status: "Free Bet Awarded",
        result: "Pending",
        back_stake: "",
        back_odds: "",
        match_strategy: "Standard",
        lay_odds_1: "",
        lay_actual: "",
        lay_matched_stake_1: "",
        lay_commission_1: "",
        exchange_name: "Matchbook",
        date_settled: "",
        user_notes: "",
        manual_override_value: "",
        manual_override_reason: "",
      },
    }
  );
  expect(createSourceResponse.ok()).toBeTruthy();
  const sourceRow = await createSourceResponse.json();

  const createFreeBetResponse = await request.post(
    `http://127.0.0.1:8010/profiles/${profileId}/free-bets`,
    {
      data: {
        event_name: eventName,
        offer_text: "Bridge cleanup linked free bet",
        bookmaker: "Bookmaker A",
        offer_type: "Bet & Get",
        bet_type: "Single",
        offer_name: "Bridge Cleanup Campaign",
        fixture_type: "Football",
        status: "Not Yet Awarded",
        result: "Pending",
        retention_mode: "SNR",
        free_bet_value: "5.00",
        back_odds: "",
        match_strategy: "Standard",
        lay_odds_1: "",
        lay_actual: "",
        lay_matched_stake_1: "",
        lay_commission_1: "",
        exchange_name: "Matchbook",
        expiry_datetime: "2026-08-12T18:00:00",
        date_settled: "",
        origin_qual_bet_id: sourceRow.sportsbook_bet_id,
        offer_group_id: "",
        user_notes: "",
        manual_override_value: "",
        manual_override_reason: "",
      },
    }
  );
  expect(createFreeBetResponse.ok()).toBeTruthy();
  const linkedFreeBet = await createFreeBetResponse.json();

  try {
    await page.goto(
      `/profiles/${profileId}/tracker/sportsbook-bets?record=${sourceRow.sportsbook_bet_id}`
    );
    await page.waitForLoadState("networkidle");

    const editorDialog = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await expect(editorDialog).toBeVisible();
    await editorDialog.getByRole("tab", { name: /Free Bet/ }).click();

    const linkedPanel = editorDialog.locator(
      '[data-pd-id="sportsbook.free-bet-bridge.linked-free-bets"]'
    );
    await expect(linkedPanel).toBeVisible();
    await expect(linkedPanel).toContainText("Bridge cleanup linked free bet");
    await expect(linkedPanel).toContainText("Not Yet Awarded");

    await linkedPanel
      .getByRole("button", { name: `Remove linked free bet ${linkedFreeBet.free_bet_id}` })
      .click();
    await expect(linkedPanel.getByText("Remove linked free bet?")).toBeVisible();
    await linkedPanel.getByRole("button", { name: "Remove" }).click();

    await expect
      .poll(async () => {
        const freeBetsResponse = await request.get(
          `http://127.0.0.1:8010/profiles/${profileId}/free-bets`
        );
        expect(freeBetsResponse.ok()).toBeTruthy();
        const freeBets = await freeBetsResponse.json();
        return freeBets.some(
          (row: Record<string, string>) => row.free_bet_id === linkedFreeBet.free_bet_id
        );
      })
      .toBe(false);
    await expect(linkedPanel).toContainText(
      "No free-bet rows have been created from this sportsbook row yet."
    );
  } finally {
    await request.delete(
      `http://127.0.0.1:8010/profiles/${profileId}/free-bets/${linkedFreeBet.free_bet_id}`
    );
    await request.delete(
      `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets/${sourceRow.sportsbook_bet_id}`
    );
  }
});
