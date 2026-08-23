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
  async function ensureMatchingEditorOpen() {
    if (!(await editor.isVisible().catch(() => false))) {
      await row.click();
      await expect(editor).toBeVisible();
    }
    await editor.getByRole("tab", { name: /Matching/ }).click();
    await expect(planner).toBeVisible();
  }
  await expect(editor).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("hidden");
  await editor.getByRole("tab", { name: /Matching/ }).click();
  await expect(editor.getByLabel("Sportsbook lay workflow mode")).toHaveValue("Multilay");
  await expect(
    editor.getByLabel("Sportsbook lay workflow mode").locator('option[value="Multilay-Underlay"]')
  ).toHaveCount(0);
  await expect(editor.getByRole("tab", { name: /Free Bet/ })).toHaveCount(0);
  await expect(editor).toHaveCSS("resize", "horizontal");

  const planner = editor.locator(".multi-lay-planner-grid");
  await expect(planner).toBeVisible();
  await expect(editor.getByText("Multi-Lay Calculator", { exact: true })).toBeVisible();
  await expect(editor.getByText("Lay / exchange", { exact: true })).toHaveCount(0);
  await expect(editor.getByText("Matched Lay", { exact: true })).toHaveCount(0);
  await expect(editor.getByText("Outcome Table", { exact: true })).toBeVisible();
  await expect(editor.getByText("Result Table", { exact: true })).toBeVisible();
  const multiLaySurface = editor.locator(".calculator-band-multilay");
  await expect(multiLaySurface).toBeVisible();
  const multiLaySurfaceStyles = await multiLaySurface.evaluate((element) => {
    const styles = getComputedStyle(element);
    const tableWrap = element.querySelector(".multi-lay-grid-wrap");
    const tableWrapStyles = tableWrap ? getComputedStyle(tableWrap) : null;
    const firstHeader = element.querySelector(".multi-lay-planner-grid th");
    const firstCell = element.querySelector(".multi-lay-planner-grid td");
    const firstHeaderStyles = firstHeader ? getComputedStyle(firstHeader) : null;
    const firstCellStyles = firstCell ? getComputedStyle(firstCell) : null;
    return {
      backgroundColor: styles.backgroundColor,
      borderTopColor: styles.borderTopColor,
      firstCellBackgroundColor: firstCellStyles?.backgroundColor,
      firstHeaderBackgroundColor: firstHeaderStyles?.backgroundColor,
      tableWrapBorderTopWidth: tableWrapStyles?.borderTopWidth,
    };
  });
  expect(multiLaySurfaceStyles.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(multiLaySurfaceStyles.borderTopColor).not.toBe("rgb(255, 255, 255)");
  expect(multiLaySurfaceStyles.firstHeaderBackgroundColor).toBe(
    multiLaySurfaceStyles.firstCellBackgroundColor
  );
  expect(multiLaySurfaceStyles.tableWrapBorderTopWidth).toBe("0px");
  const backSegmentWidth = await editor.locator(".calculator-segment-back").evaluate((element) => {
    return Math.round(element.getBoundingClientRect().width);
  });
  const multiLaySurfaceWidth = await multiLaySurface.evaluate((element) => {
    return Math.round(element.getBoundingClientRect().width);
  });
  expect(Math.abs(backSegmentWidth - multiLaySurfaceWidth)).toBeLessThanOrEqual(1);
  await expect(planner).toContainText("Underlay Stake");
  await expect(planner).toContainText("Exchange");
  await expect(planner).not.toContainText("Comm %");
  await expect(editor.getByText("Not Laid", { exact: true }).first()).toBeVisible();
  await expect(planner.locator("tbody tr")).toHaveCount(2);
  const plannerGeometry = await planner.evaluate((table) => {
    const wrap = table.closest(".multi-lay-grid-wrap");
    const outcomeHeader = table.querySelector("th:nth-child(2)");
    const exchangeHeader = table.querySelector("th:nth-child(3)");
    return {
      hasHorizontalOverflow: wrap ? wrap.scrollWidth > wrap.clientWidth + 1 : true,
      exchangeWidth: exchangeHeader?.getBoundingClientRect().width ?? 0,
      outcomeWidth: outcomeHeader?.getBoundingClientRect().width ?? 0,
    };
  });
  expect(plannerGeometry.hasHorizontalOverflow).toBeFalsy();
  expect(plannerGeometry.outcomeWidth).toBeGreaterThan(plannerGeometry.exchangeWidth);
  const underlayToggle = editor.getByRole("switch", { name: "Underlay" });
  await expect(underlayToggle).toHaveAttribute("aria-checked", "true");
  await underlayToggle.click();
  await expect(planner).not.toContainText("Underlay Stake");
  await expect(planner).toContainText("Lay Stake");
  await underlayToggle.click();
  await expect(planner).toContainText("Underlay Stake");

  const firstOutcomeName = planner.getByLabel("Outcome 1 name");
  await expect(firstOutcomeName).toHaveAttribute("maxlength", "20");
  await firstOutcomeName.fill("Haaland first scorer");
  await expect(firstOutcomeName).toHaveValue("Haaland first scorer");
  await expect(planner.getByLabel("Outcome 1 exchange")).toHaveValue("Matchbook");

  await expect(planner.getByRole("button", { name: /^Remove / })).toHaveCount(0);
  await editor.getByRole("button", { name: "Add outcome" }).click();
  await expect(planner.locator("tbody tr")).toHaveCount(3);
  await planner.getByLabel("Outcome 3 name").fill("Bellingham");
  await expect(planner.getByLabel("Outcome 3 exchange")).toHaveValue("Matchbook");
  await planner.getByLabel("Outcome 3 lay odds").fill("10.50");
  await expect(editor.locator(".multi-lay-results-grid thead")).toContainText("Bellingham");
  await editor.getByRole("tab", { name: /Settlement/ }).click();
  await expect(editor.locator('[data-pd-id="sportsbook.settlement.outcomes"]')).toContainText("Bellingham wins");
  await editor.getByRole("tab", { name: /Matching/ }).click();
  const removeThirdOutcome = planner.getByRole("button", { name: "Remove Bellingham" });
  await expect(removeThirdOutcome).toBeVisible();
  await removeThirdOutcome.click();
  await expect(planner.locator("tbody tr")).toHaveCount(2);

  await expect(editor.getByRole("tab", { name: /Placement/ })).toHaveCount(0);

  await planner.locator("tbody tr").nth(0).getByRole("button", { name: "Copy lay" }).click();
  await ensureMatchingEditorOpen();
  await expect(editor.getByText("Part Laid", { exact: true })).toHaveCount(0);
  await planner.locator("tbody tr").nth(1).getByRole("button", { name: "Copy lay" }).click();
  await ensureMatchingEditorOpen();
  await expect(editor.getByText("Fully Laid", { exact: true }).first()).toBeVisible();

  await planner.locator("tbody tr").nth(1).getByLabel("Partial").check();
  await expect(planner.getByLabel("Outcome 2 currently matched lay stake")).not.toHaveValue("");
  await planner.getByLabel("Outcome 2 currently matched lay stake").fill("1.00");
  await expect(editor.getByText("Part Laid", { exact: true }).first()).toBeVisible();
  const resetGeometry = await planner
    .getByRole("button", { name: /Reset Kane 1st partial lay to calculated stake/ })
    .evaluate((button) => {
      const icon = button.querySelector(".material-symbols-outlined");
      const buttonBox = button.getBoundingClientRect();
      const iconBox = icon?.getBoundingClientRect();
      return {
        buttonHeight: buttonBox.height,
        buttonWidth: buttonBox.width,
        centerDeltaX: iconBox
          ? Math.abs(buttonBox.left + buttonBox.width / 2 - (iconBox.left + iconBox.width / 2))
          : 99,
        centerDeltaY: iconBox
          ? Math.abs(buttonBox.top + buttonBox.height / 2 - (iconBox.top + iconBox.height / 2))
          : 99,
      };
    });
  expect(resetGeometry.buttonHeight).toBeLessThanOrEqual(34);
  expect(resetGeometry.buttonWidth).toBeLessThanOrEqual(34);
  expect(resetGeometry.centerDeltaX).toBeLessThanOrEqual(1);
  expect(resetGeometry.centerDeltaY).toBeLessThanOrEqual(1);
  await planner.getByRole("button", { name: /Reset Kane 1st partial lay to calculated stake/ }).click();
  await expect(editor.getByText("Fully Laid", { exact: true }).first()).toBeVisible();
  await expect(editor.getByText("Part Laid", { exact: true })).toHaveCount(0);
});

test("Sportsbook ledger exposes a loading indicator while initial rows resolve", async ({ page }) => {
  const profileId = "profile-demo-001";

  await page.route(`**/profiles/${profileId}/sportsbook-bets**`, async (route) => {
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
