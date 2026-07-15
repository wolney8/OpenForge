import { expect, test } from "@playwright/test";

test("Sportsbook multilay planner uses branch copy placement flow", async ({ page, request }) => {
  const profileId = "profile-demo-001";
  const uniqueLabel = `Multilay Planner ${Date.now()}`;

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
      event_name: `${uniqueLabel} Match`,
      offer_text: uniqueLabel,
      bookmaker: "Bookmaker A",
      offer_type: "Price Boost",
      bet_type: "Single",
      offer_name: uniqueLabel,
      fixture_type: "Football",
      market: "First Goalscorer",
      status: "Prospecting",
      result: "Pending",
      back_stake: "10.00",
      back_odds: "3.20",
      match_strategy: "Multilay-Underlay",
      lay_odds_1: "5.90",
      multi_lay_outcome_1_name: "Haaland 1st",
      multi_lay_outcomes_json:
        '[{"id":"outcome2","label":"Kane 1st","layOdds":"4.90","placementState":"pending"}]',
      lay_actual: "",
      lay_matched_stake_1: "",
      lay_commission_1: "",
      exchange_name: "Matchbook",
      date_settled: "2026-07-20T18:00",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");

  const row = page.locator(".data-table tbody tr", { hasText: uniqueLabel }).first();
  await expect(row).toBeVisible();
  await row.click();

  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toBeVisible();
  await expect(editor.getByLabel("Strategy")).toHaveValue("Multilay");
  await expect(editor.getByLabel("Strategy").locator('option[value="Multilay-Underlay"]')).toHaveCount(0);
  await expect(editor).toHaveCSS("resize", "horizontal");

  const planner = editor.locator(".multi-lay-planner-grid");
  await expect(planner).toBeVisible();
  await expect(planner).toContainText("Underlay Stake");
  await expect(planner.locator("tbody tr")).toHaveCount(2);
  const plannerGeometry = await planner.evaluate((table) => {
    const wrap = table.closest(".multi-lay-grid-wrap");
    const outcomeHeader = table.querySelector("th:nth-child(2)");
    const oddsHeader = table.querySelector("th:nth-child(3)");
    return {
      hasHorizontalOverflow: wrap ? wrap.scrollWidth > wrap.clientWidth + 1 : true,
      oddsWidth: oddsHeader?.getBoundingClientRect().width ?? 0,
      outcomeWidth: outcomeHeader?.getBoundingClientRect().width ?? 0,
    };
  });
  expect(plannerGeometry.hasHorizontalOverflow).toBeFalsy();
  expect(plannerGeometry.outcomeWidth).toBeGreaterThan(plannerGeometry.oddsWidth);
  const underlayToggle = editor.getByRole("switch", { name: "Underlay" });
  await expect(underlayToggle).toHaveAttribute("aria-checked", "true");
  await underlayToggle.click();
  await expect(planner).not.toContainText("Underlay Stake");
  await underlayToggle.click();
  await expect(planner).toContainText("Underlay Stake");

  const firstOutcomeName = planner.getByLabel("Outcome 1 name");
  await expect(firstOutcomeName).toHaveAttribute("maxlength", "20");
  await firstOutcomeName.fill("Haaland first scorer");
  await expect(firstOutcomeName).toHaveValue("Haaland first scorer");

  await expect(planner.getByRole("button", { name: /^Remove / })).toHaveCount(0);
  await editor.getByRole("button", { name: "Add outcome" }).click();
  await expect(planner.locator("tbody tr")).toHaveCount(3);
  const removeThirdOutcome = planner.getByRole("button", { name: "Remove outcome 3" });
  await expect(removeThirdOutcome).toBeVisible();
  await removeThirdOutcome.click();
  await expect(planner.locator("tbody tr")).toHaveCount(2);

  const placementGrid = editor.locator(".multi-lay-placement-grid");
  await expect(placementGrid).toBeVisible();
  await expect(editor.getByText("Not Laid", { exact: true }).first()).toBeVisible();

  await planner.locator("tbody tr").nth(0).getByRole("button", { name: "Copy lay" }).click();
  await expect(editor.getByText("Part Laid", { exact: true }).first()).toBeVisible();
  await expect(placementGrid).toContainText("Haaland first scorer");

  await planner.locator("tbody tr").nth(1).getByRole("button", { name: "Copy lay" }).click();
  await expect(editor.getByText("Fully Laid", { exact: true }).first()).toBeVisible();
  await expect(placementGrid).toContainText("Haaland first scorer");
  await expect(placementGrid).toContainText("Kane 1st");

  await placementGrid.locator("tbody tr").nth(1).getByRole("button", { name: "Delete" }).click();
  await expect(editor.getByText("Part Laid", { exact: true }).first()).toBeVisible();
});

test("Sportsbook ledger exposes a loading indicator while initial rows resolve", async ({ page }) => {
  const profileId = "profile-demo-001";

  await page.route(`http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route.fulfill({
      body: "[]",
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  const loadingState = page.getByRole("status").filter({ hasText: "Loading sportsbook ledger" });
  await expect(loadingState).toBeVisible();
  await expect(loadingState).toBeHidden();
});
