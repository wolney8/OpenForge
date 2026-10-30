import { expect, test } from "@playwright/test";

const apiBaseUrl = process.env.OPENFORGE_E2E_API_BASE_URL ?? "http://127.0.0.1:8010";

test("Sportsbook synthetic daily journey places, settles, corrects, and retains history", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const eventName = `CP-108 Daily Journey ${Date.now()}`;
  await page.route("**/auth/session**", (route) =>
    route.fulfill({
      json: {
        authenticated: true,
        email: "founder@example.invalid",
        expires_at: 2_100_000_000,
        linked_profile_ids: [profileId],
        name: "Synthetic Founder",
        role: "fund_manager",
      },
    })
  );
  await page.route("**/auth/activity**", (route) => route.fulfill({ status: 204 }));
  await page.route("**/auth/security-preference**", (route) =>
    route.fulfill({ json: { configured: false } })
  );
  await page.route("**/fund-manager/import-executions**", (route) =>
    route.fulfill({ json: [] })
  );
  await page.route("**/fund-manager/notifications**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    return route.fulfill({
      json: pathname.endsWith("/state")
        ? { dismissed_ids: [], read_keys: [] }
        : pathname.endsWith("/preferences")
          ? { preferences: {} }
          : [],
    });
  });
  const existingRows = await (
    await request.get(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`)
  ).json();
  const openBefore = (existingRows as Array<{ counts_as_open: boolean }>).filter(
    (row) => row.counts_as_open
  ).length;

  expect(
    (
      await request.put(`${apiBaseUrl}/profiles/${profileId}/exchange-commissions`, {
        data: { exchange_name: "Matchbook", commission_rate: "0.02" },
      })
    ).ok()
  ).toBeTruthy();

  const createdResponse = await request.post(
    `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`,
    {
      data: {
        event_name: eventName,
        offer_text: "Synthetic standard qualifier",
        bookmaker: "Bookmaker A",
        offer_type: "Bet & Get",
        bet_type: "Single",
        offer_name: "CP-108 synthetic",
        fixture_type: "Football",
        market: "Match Odds",
        status: "Prospecting",
        result: "Pending",
        back_stake: "10.00",
        back_odds: "2.10",
        match_strategy: "Standard",
        lay_odds_1: "2.20",
        lay_actual: "",
        lay_matched_stake_1: "",
        lay_commission_1: "",
        exchange_name: "Matchbook",
        date_settled: "2026-10-30T20:00:00Z",
        user_notes: "CP-108 isolated browser fixture",
        manual_override_value: "",
        manual_override_reason: "",
      },
    }
  );
  expect(createdResponse.ok(), await createdResponse.text()).toBeTruthy();
  const created = await createdResponse.json();
  const recordId = created.sportsbook_bet_id as string;
  expect(created.counts_as_open).toBe(false);

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets?record=${recordId}`);
  const editor = page.getByRole("dialog", { name: "Edit sportsbook row" });
  await expect(editor).toBeVisible();
  await editor.getByRole("tab", { name: /Matching/ }).click();
  const replan = editor.getByRole("button", { name: "Replan with current references" });
  if (await replan.isVisible()) await replan.click();
  await expect(editor.locator('[data-pd-id="sportsbook.matching.core-planner"]')).toBeVisible();
  await expect(editor.getByText(/Liability/).first()).toBeVisible();

  await editor.getByLabel("Actual matched stake").fill("9.63");
  await editor.getByRole("button", { name: "Confirm actual placement" }).click();
  await editor
    .locator('[data-pd-id="sportsbook.editor.actions"]')
    .getByRole("button", { name: "Save", exact: true })
    .click();

  await expect
    .poll(async () => {
      const response = await request.get(
        `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${recordId}`
      );
      return (await response.json()).status;
    })
    .toBe("Placed");
  const placed = await (
    await request.get(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${recordId}`)
  ).json();
  expect(placed.counts_as_open).toBe(true);
  expect(placed.calculated_liability_1).not.toBeNull();

  await page.goto(`/profiles/${profileId}/tracker/dashboard`);
  const openPositionsCard = page
    .getByRole("region", { name: "Profile operational dashboard cards" })
    .locator("article", { hasText: "Open Positions" });
  await expect(openPositionsCard.locator("strong")).toHaveText(String(openBefore + 1));

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets?record=${recordId}`);
  const settlementEditor = page.getByRole("dialog", { name: "Edit sportsbook row" });
  await settlementEditor.getByRole("tab", { name: /Settlement/ }).click();
  await settlementEditor.getByLabel("Result").selectOption("Back Won");
  await settlementEditor
    .locator('[data-pd-id="sportsbook.editor.actions"]')
    .getByRole("button", { name: "Save", exact: true })
    .click();

  await expect
    .poll(async () => {
      const response = await request.get(
        `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${recordId}`
      );
      return (await response.json()).status;
    })
    .toBe("Settled");

  await page.goto(`/profiles/${profileId}/tracker/dashboard`);
  await expect(
    page
      .getByRole("region", { name: "Profile operational dashboard cards" })
      .locator("article", { hasText: "Open Positions" })
      .locator("strong")
  ).toHaveText(String(openBefore));
  await page.goto(`/profiles/${profileId}/tracker/reports`);
  const report = page.locator('[data-pd-id="reports.period-pnl"]');
  await expect(report).toBeVisible();
  await report.getByLabel("P&L week containing").fill("2026-10-30");
  await expect(report.locator('[data-pd-id="reports.period-pnl.records"]')).toContainText(
    eventName
  );

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets?record=${recordId}`);
  const correctionEditor = page.getByRole("dialog", { name: "Edit sportsbook row" });
  await correctionEditor.getByRole("tab", { name: /Settlement/ }).click();
  await correctionEditor
    .locator('[data-pd-id="sportsbook.editor.edit-settled-row"]:visible')
    .first()
    .click();
  await correctionEditor.getByLabel("Result").selectOption("Lay Won");
  await expect(correctionEditor.getByLabel("Correction reason")).toBeVisible();
  const saveEdits = correctionEditor
    .locator('[data-pd-id="sportsbook.editor.actions"]')
    .getByRole("button", { name: "Save Edits", exact: true });
  await expect(saveEdits).toBeDisabled();
  await correctionEditor
    .getByLabel("Correction reason")
    .fill("Corrected synthetic result from the settlement receipt.");
  await expect(saveEdits).toBeEnabled();
  await saveEdits.click();

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets?record=${recordId}`);
  const historyEditor = page.getByRole("dialog", { name: "Edit sportsbook row" });
  await historyEditor.getByRole("tab", { name: /Settlement/ }).click();
  await historyEditor.getByText("History", { exact: true }).click();
  await expect(historyEditor.getByText("Corrected", { exact: true })).toBeVisible();
  await expect(
    historyEditor.getByText("Corrected synthetic result from the settlement receipt.")
  ).toBeVisible();

  await page.setViewportSize({ width: 430, height: 900 });
  await expect(historyEditor).toBeVisible();
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(overflow.body).toBeLessThanOrEqual(1);
  expect(overflow.document).toBeLessThanOrEqual(1);
});
