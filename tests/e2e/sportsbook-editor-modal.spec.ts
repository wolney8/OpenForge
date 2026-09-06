import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:8010";

async function deleteSportsbookFixture(
  request: APIRequestContext,
  profileId: string,
  sportsbookBetId: string
) {
  try {
    await request.delete(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${sportsbookBetId}`, {
      timeout: 5_000,
    });
  } catch {
    // Cleanup is best-effort; the UI regression assertion must not be masked by a slow DELETE.
  }
}

async function mockFundManagerShell(page: Page, profileId: string) {
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
}

test("Sportsbook row click opens the editor as a modal dialog", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });

  const row = page.locator(".data-table tbody tr").first();
  await expect(row).toBeVisible();

  await row.click();

  const editorDialog = page.getByRole("dialog", { name: "Edit sportsbook row" });
  await expect(editorDialog).toBeVisible();
  await expect(editorDialog).toHaveClass(/workflow-editor-panel/);

  const tabRail = editorDialog.getByRole("tablist", { name: "Sportsbook editor sections" });
  await expect(tabRail).toBeVisible();
  await expect(tabRail.getByRole("tab", { name: /Bet Setup/ })).toBeVisible();
  const matchingTab = tabRail.getByRole("tab", { name: /Matching/ });
  await expect(matchingTab).toBeVisible();
  const matchingWatermarkStyles = await matchingTab.evaluate((element) => {
    const styles = window.getComputedStyle(element, "::before");
    return {
      content: styles.content,
      display: styles.display,
      fontFamily: styles.fontFamily,
      opacity: Number.parseFloat(styles.opacity),
    };
  });
  expect(matchingWatermarkStyles.content).toContain("calculate");
  expect(matchingWatermarkStyles.display).not.toBe("none");
  expect(matchingWatermarkStyles.fontFamily).toContain("Material Symbols");
  expect(matchingWatermarkStyles.opacity).toBeGreaterThanOrEqual(0.34);
  await expect(tabRail.locator(".ledger-editor-step-marker")).toHaveCount(
    await tabRail.getByRole("tab").count()
  );
  const tabRailStyles = await tabRail.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      display: styles.display,
      gridTemplateColumns: styles.gridTemplateColumns,
      overflowX: styles.overflowX,
    };
  });
  expect(tabRailStyles.display).toBe("grid");
  expect(tabRailStyles.gridTemplateColumns).not.toBe("none");
  expect(tabRailStyles.overflowX).not.toBe("visible");
  await expect(editorDialog.locator('[data-pd-id="sportsbook.editor.compact-summary"]')).toBeVisible();
  await expect(editorDialog.locator(".editor-summary-value-chip")).toBeVisible();
  await expect(editorDialog.locator(".editor-section-toggle-icon")).toHaveCount(0);

  const guide = editorDialog.locator('[data-pd-id="sportsbook.guided-entry"]');
  if (await guide.isVisible()) {
    const tabBox = await tabRail.boundingBox();
    const guideBox = await guide.boundingBox();
    expect(guideBox?.y ?? 0).toBeGreaterThan(tabBox?.y ?? 0);
    const guideRadius = await guide.evaluate((element) =>
      window.getComputedStyle(element).borderRadius
    );
    expect(guideRadius).not.toBe("0px");
    await guide.getByRole("button", { name: "Dismiss sportsbook guided entry" }).click();
    await expect(editorDialog.locator('[data-pd-id="sportsbook.guided-entry.restore"]')).toBeVisible();
  }

  await matchingTab.click();
  await expect(editorDialog.locator('[data-pd-id="ledger-editor.panel.matching"]')).toBeVisible();

  const headerTabActions = editorDialog.locator('[data-pd-id="sportsbook.editor.tab-actions"]');
  await expect(headerTabActions).toBeVisible();
  await expect(headerTabActions.getByRole("button", { name: "Previous" })).toBeEnabled();
  await expect(headerTabActions.getByRole("button", { name: "Next" })).toBeEnabled();
  const compactSummary = editorDialog.locator('[data-pd-id="sportsbook.editor.compact-summary"]');
  const title = editorDialog.locator(".workflow-header-title");
  const editorHeader = editorDialog.locator('[data-pd-id="sportsbook.editor.header"]');
  const dialogBox = await editorDialog.boundingBox();
  const headerBox = await editorHeader.boundingBox();
  const summaryBox = await compactSummary.boundingBox();
  const titleBox = await title.boundingBox();
  const initialHeaderActionsBox = await headerTabActions.boundingBox();
  const initialTabBox = await tabRail.boundingBox();
  expect(Math.abs((headerBox?.y ?? 0) - (dialogBox?.y ?? 0))).toBeLessThan(2);
  expect(Math.abs((headerBox?.width ?? 0) - (dialogBox?.width ?? 0))).toBeLessThan(2);
  expect(Math.abs((summaryBox?.y ?? 0) - (titleBox?.y ?? 0))).toBeLessThan(42);
  expect((initialHeaderActionsBox?.y ?? 0) + (initialHeaderActionsBox?.height ?? 0)).toBeLessThan(
    initialTabBox?.y ?? 0,
  );
  const footerTabActions = editorDialog.locator('[data-pd-id="sportsbook.editor.footer-tab-actions"]');
  await expect(footerTabActions).toBeVisible();
  const editorFooter = editorDialog.locator('[data-pd-id="sportsbook.editor.actions"]');
  const footerBox = await editorFooter.boundingBox();
  expect(Math.abs((footerBox?.width ?? 0) - (dialogBox?.width ?? 0))).toBeLessThanOrEqual(3);
  const headerActionsBox = await headerTabActions.boundingBox();
  const footerActionsBox = await footerTabActions.boundingBox();
  expect(Math.abs((headerActionsBox?.x ?? 0) - (footerActionsBox?.x ?? 0))).toBeLessThanOrEqual(12);
  expect(Math.abs((headerActionsBox?.width ?? 0) - (footerActionsBox?.width ?? 0))).toBeLessThanOrEqual(12);

  await editorDialog.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(compactSummary).toBeVisible();
  await expect(title).toBeVisible();
  await expect(headerTabActions).toBeVisible();
  await expect(tabRail).toBeVisible();
  const scrolledSummaryBox = await compactSummary.boundingBox();
  const scrolledHeaderBox = await editorHeader.boundingBox();
  const scrolledDialogBox = await editorDialog.boundingBox();
  const scrolledHeaderActionsBox = await headerTabActions.boundingBox();
  const scrolledTabBox = await tabRail.boundingBox();
  expect(Math.abs((scrolledHeaderBox?.y ?? 0) - (scrolledDialogBox?.y ?? 0))).toBeLessThan(2);
  expect((scrolledSummaryBox?.y ?? 0) + (scrolledSummaryBox?.height ?? 0)).toBeLessThan(scrolledTabBox?.y ?? 0);
  expect((scrolledHeaderActionsBox?.y ?? 0) + (scrolledHeaderActionsBox?.height ?? 0)).toBeLessThan(
    scrolledTabBox?.y ?? 0,
  );

  await tabRail.getByRole("tab", { name: /Settlement/ }).click();
  await expect(editorDialog.locator('[data-pd-id="ledger-editor.panel.settlement"]')).toBeVisible();
  await expect(editorDialog.getByLabel("Status")).toBeVisible();
  await expect(editorDialog.getByLabel("Settles")).toBeVisible();
  await expect(editorDialog.getByLabel("Result")).toBeVisible();
  await expect(editorDialog.locator(".status-toast")).toHaveCount(0);
  await expect(
    editorDialog.locator('[data-pd-id="sportsbook.editor.header"]').getByRole("button", {
      name: "Close sportsbook editor",
    }),
  ).toBeVisible();
});

test("Sportsbook settled edit state uses Edit, Save Edits, and Revert without the legacy header action", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const eventName = `Modal revert settlement ${Date.now()}`;

  const createResponse = await request.post(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`, {
    data: {
      event_name: eventName,
      offer_text: "Modal revert offer",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Modal Revert",
      fixture_type: "Football",
      market: "Match Odds",
      status: "Placed",
      result: "Pending",
      back_stake: "10.00",
      back_odds: "2.10",
      match_strategy: "Standard",
      lay_odds_1: "2.20",
      lay_actual: "9.54",
      lay_matched_stake_1: "9.54",
      lay_commission_1: "",
      exchange_name: "Matchbook",
      date_settled: "2026-08-09T11:44",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  try {
    await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets?record=${createdRow.sportsbook_bet_id}`);

    const editorDialog = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await expect(editorDialog).toBeVisible();
    await editorDialog.getByRole("tab", { name: /Settlement/ }).click();

    await expect(editorDialog.getByRole("button", { name: "Edit settled row" })).toHaveCount(0);
    const footerPrimaryActions = editorDialog.locator(".workflow-editor-footer-primary");
    const saveButton = footerPrimaryActions.getByRole("button", { name: "Save", exact: true });
    await expect(saveButton).toBeDisabled();

    const resultSelect = editorDialog.getByLabel("Result");
    await expect(editorDialog.locator('[data-pd-id="sportsbook.settlement.outcomes"]')).toContainText("Current value");
    await resultSelect.selectOption("Lay Won");
    await expect(resultSelect).toHaveValue("Lay Won");
    await expect(editorDialog.locator('[data-pd-id="sportsbook.settlement.outcomes"]')).toContainText("Final value");
    const settlementPanel = editorDialog.locator('[data-pd-id="ledger-editor.panel.settlement"]');
    const sectionEditControl = settlementPanel
      .locator('[data-pd-id="sportsbook.editor.edit-settled-row"], [data-pd-id="sportsbook.editor.editing-state"]')
      .first();
    await expect(sectionEditControl).toBeVisible();
    await expect(footerPrimaryActions.getByRole("button", { name: "Save Edits" })).toHaveCount(0);

    await expect(async () => {
      await editorDialog.getByRole("button", { name: "Revert" }).click({ timeout: 2_000 });
    }).toPass({ timeout: 10_000 });
    await expect(editorDialog.getByLabel("Result")).toHaveValue("Pending");
    await expect(editorDialog.getByLabel("Status")).toHaveValue("Placed");
    await expect(footerPrimaryActions.getByRole("button", { name: "Save", exact: true })).toBeDisabled();

    await resultSelect.selectOption("Lay Won");
    const settledEditButton = settlementPanel.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]').first();
    if ((await settledEditButton.count()) > 0) {
      await settledEditButton.click();
    }
    await expect(settlementPanel.locator('[data-pd-id="sportsbook.editor.editing-state"]').first()).toBeVisible();
    await expect(footerPrimaryActions.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
    await expect(editorDialog.getByLabel("Result")).toBeEnabled();
  } finally {
    await deleteSportsbookFixture(request, profileId, createdRow.sportsbook_bet_id);
  }
});

test("Sportsbook settled rows require edit cancellation and a delete reason guard", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const eventName = `Settled delete guard ${Date.now()}`;

  const createResponse = await request.post(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`, {
    data: {
      event_name: eventName,
      offer_text: "Settled guard offer",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Settled Guard",
      fixture_type: "Football",
      market: "Match Odds",
      status: "Settled",
      result: "Back Won",
      back_stake: "10.00",
      back_odds: "2.10",
      match_strategy: "Standard",
      lay_odds_1: "2.20",
      lay_actual: "9.54",
      lay_matched_stake_1: "9.54",
      lay_commission_1: "",
      exchange_name: "Matchbook",
      date_settled: "2026-08-09T11:44",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  try {
    await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets?record=${createdRow.sportsbook_bet_id}`);

    const editorDialog = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await expect(editorDialog).toBeVisible();
    await editorDialog.getByRole("tab", { name: /Settlement/ }).click();

    const settlementPanel = editorDialog.locator('[data-pd-id="ledger-editor.panel.settlement"]');
    await expect(settlementPanel.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]').first()).toBeVisible();
    await expect(editorDialog.getByLabel("Result")).toBeDisabled();

    await settlementPanel.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]').first().click();
    await expect(settlementPanel.locator('[data-pd-id="sportsbook.editor.editing-state"]').first()).toBeVisible();
    await expect(editorDialog.getByLabel("Result")).toBeEnabled();

    const footerPrimaryActions = editorDialog.locator(".workflow-editor-footer-primary");
    await expect(footerPrimaryActions.getByRole("button", { exact: true, name: "Save Edits" })).toBeDisabled();
    await expect(footerPrimaryActions.getByRole("button", { exact: true, name: "Cancel" })).toBeVisible();

    await footerPrimaryActions.getByRole("button", { exact: true, name: "Delete" }).click();
    const deleteGuard = editorDialog.getByLabel("Confirm settled sportsbook deletion");
    await expect(deleteGuard).toBeVisible();
    await expect(deleteGuard.getByRole("button", { exact: true, name: "Delete" })).toBeDisabled();
    await deleteGuard.getByLabel(/Deletion reason for settled sportsbook row/i).fill("Duplicate settled smoke row");
    await expect(deleteGuard.getByRole("button", { exact: true, name: "Delete" })).toBeEnabled();
    await deleteGuard.getByRole("button", { exact: true, name: "Cancel" }).click();
    await expect(deleteGuard).toBeHidden();

    await footerPrimaryActions.getByRole("button", { exact: true, name: "Cancel" }).click();
    await expect(settlementPanel.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]').first()).toBeVisible();
    await expect(editorDialog.getByLabel("Result")).toBeDisabled();
  } finally {
    await deleteSportsbookFixture(request, profileId, createdRow.sportsbook_bet_id);
  }
});

test("Sportsbook free-bet bridge action is scoped to the Free Bet tab", async ({ page, request }) => {
  const profileId = "profile-demo-001";
  const eventName = `Modal free bet bridge ${Date.now()}`;

  const createResponse = await request.post(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`, {
    data: {
      event_name: eventName,
      offer_text: "Bridge offer",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Bridge campaign",
      fixture_type: "Football",
      market: "Match Odds",
      status: "Placed",
      result: "Pending",
      back_stake: "10.00",
      back_odds: "2.10",
      match_strategy: "Standard",
      lay_odds_1: "2.20",
      lay_actual: "9.54",
      lay_matched_stake_1: "9.54",
      lay_commission_1: "",
      exchange_name: "Matchbook",
      date_settled: "2026-08-09T11:44",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  try {
    await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets?record=${createdRow.sportsbook_bet_id}`);

    const editorDialog = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await expect(editorDialog).toBeVisible();
    const footerActions = editorDialog.locator('[data-pd-id="sportsbook.editor.actions"]');
    await expect(footerActions.getByRole("button", { name: "Create free bet from sportsbook row" })).toHaveCount(0);

    await editorDialog.getByRole("tab", { name: /Free Bet/ }).click();
    const bridge = editorDialog.locator('[data-pd-id="sportsbook.free-bet-bridge.inline"]');
    await expect(bridge).toBeVisible();
    await expect(bridge.getByLabel("Status")).toBeVisible();
    await expect(bridge.getByLabel("Notes")).toBeVisible();
    await expect(bridge.getByLabel("Event", { exact: true })).toHaveCount(0);
    await expect(bridge.getByLabel("Award timing", { exact: true })).toHaveCount(0);
    await expect(editorDialog.locator(".bridge-split-list")).toHaveCount(0);
    const createFreeBetButton = footerActions.getByRole("button", {
      name: "Create free bet from sportsbook row",
    });
    await expect(createFreeBetButton).toBeEnabled();
    await expect(createFreeBetButton).toContainText("Create Free Bet");

    await page.route(`**/profiles/${profileId}/free-bets`, async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({ free_bet_id: `FB-BRIDGE-${Date.now()}` }),
      });
    });

    const createPromise = createFreeBetButton.click();
    await expect(createFreeBetButton.locator(".button-spinner")).toBeVisible();
    await createPromise;
    await expect(createFreeBetButton).toContainText("Create Another Free Bet", { timeout: 15_000 });
    await expect(createFreeBetButton).toBeEnabled();

    await bridge.getByRole("button", { name: "Clear free-bet bridge defaults" }).click();
    await expect(footerActions.getByRole("button", { name: "Create free bet from sportsbook row" })).toBeDisabled();
  } finally {
    await deleteSportsbookFixture(request, profileId, createdRow.sportsbook_bet_id);
  }
});

test("Sportsbook Matching calculator supports simple, advanced, copy, and multi-lay branches", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const eventName = `Outplayed-style calculator ${Date.now()}`;

  const createResponse = await request.post(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`, {
    data: {
      event_name: eventName,
      offer_text: "Calculator refactor offer",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Calculator refactor",
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
      date_settled: "2026-08-09T11:44",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  try {
    await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets?record=${createdRow.sportsbook_bet_id}`);

    const editorDialog = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await expect(editorDialog).toBeVisible();
    await editorDialog.getByRole("tab", { name: /Matching/ }).click();
    await expect(editorDialog.locator('[data-pd-id="ledger-editor.panel.matching"]')).toBeVisible();

    await expect(editorDialog.locator('[data-pd-id="sportsbook.matching.calculator-mode"]')).toBeVisible();
    await expect(editorDialog.getByLabel("Sportsbook calculator bet type")).toBeVisible();
    const layModeSelect = editorDialog.getByLabel("Sportsbook lay workflow mode");
    await expect(layModeSelect).toHaveValue("Standard");
    await layModeSelect.selectOption("Advanced");

    const resultCards = editorDialog.locator('[data-pd-id="sportsbook.matching.result-cards"]');
    await expect(resultCards).toBeVisible();
    await expect(editorDialog.getByText("Projected outcomes")).toHaveCount(0);
    await expect(resultCards.locator(".calculator-result-card")).toHaveCount(4);
    await expect(resultCards).toContainText("Underlay");
    await expect(resultCards).toContainText("Standard");
    await expect(resultCards).toContainText("Overlay");
    await expect(resultCards).toContainText("Custom");
    await expect(editorDialog.getByText("Lay results")).toHaveCount(0);
    const customLaySlider = resultCards
      .locator(".calculator-result-card-custom")
      .getByLabel("Custom lay stake slider");
    await expect(customLaySlider).toBeVisible();
    await expect(customLaySlider).toHaveAttribute("step", "0.01");

    await layModeSelect.selectOption("Standard");
    await expect(layModeSelect).toHaveValue("Standard");
    await expect(editorDialog.getByLabel("Strategy")).toHaveCount(0);
    await expect(resultCards.locator(".calculator-result-card")).toHaveCount(1);
    await expect(resultCards).toContainText("Standard");
    await expect(resultCards).not.toContainText("Underlay");

    await layModeSelect.selectOption("Advanced");
    await expect(layModeSelect).toBeEnabled();
    const standardCard = resultCards.locator(".calculator-result-card-standard");
    await expect(standardCard.getByRole("button", { name: /Copy/ })).toBeEnabled();
    await standardCard.getByRole("button", { name: /Copy/ }).click();
    await expect(editorDialog.locator(".calculator-copy-feedback")).toContainText("Standard lay");
    await expect(editorDialog.locator(".status-toast")).toHaveCount(0);
    await expect(editorDialog.locator('[data-pd-id="sportsbook.editor.compact-summary"]')).toContainText("Fully Laid");
    await expect(editorDialog.locator('[aria-label="Matched Lay"]')).toHaveCount(0);

    await layModeSelect.selectOption("Multilay");
    await expect(editorDialog.locator('[data-pd-id="sportsbook.matching.result-cards"]')).toHaveCount(0);
    await expect(editorDialog.getByText("Multi-Lay Calculator", { exact: true })).toBeVisible();
  } finally {
    await deleteSportsbookFixture(request, profileId, createdRow.sportsbook_bet_id);
  }
});

test("Sportsbook odds preserve malformed text and suppress stale preview and save", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const eventName = `Strict odds ${Date.now()}`;
  const previewBackOdds: string[] = [];
  await page.setViewportSize({ width: 760, height: 900 });
  page.on("request", (pendingRequest) => {
    if (
      pendingRequest.method() === "POST" &&
      pendingRequest.url().endsWith(`/profiles/${profileId}/sportsbook-bets/preview`)
    ) {
      previewBackOdds.push((pendingRequest.postDataJSON() as { back_odds: string }).back_odds);
    }
  });
  await mockFundManagerShell(page, profileId);
  const createResponse = await request.post(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`, {
    data: {
      event_name: eventName,
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      fixture_type: "Football",
      status: "Prospecting",
      result: "Pending",
      back_stake: "10.00",
      back_odds: "2.10",
      match_strategy: "Standard",
      lay_odds_1: "2.20",
      exchange_name: "Matchbook",
      date_settled: "2026-09-06T15:00",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  try {
    await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
    await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });
    const row = page.locator(".data-table tbody tr").filter({ hasText: eventName });
    await expect(row).toHaveCount(1);
    await row.click();
    const editor = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await expect(editor).toBeVisible();
    await editor.getByRole("tab", { name: /Matching/ }).click();

    const backOdds = editor.getByLabel("Back odds", { exact: true });
    const resultCards = editor.locator('[data-pd-id="sportsbook.matching.result-cards"]');
    const applyBackPlacement = editor.getByRole("button", { name: "Back Bet Placed" });
    const save = editor.getByRole("button", { name: "Save", exact: true });
    await expect(resultCards).toBeVisible();
    const initialDialogWidth = (await editor.boundingBox())?.width;

    await backOdds.focus();
    await backOdds.press("ControlOrMeta+A");
    await backOdds.pressSequentially("8.5abc");
    await expect(backOdds).toHaveValue("8.5abc");
    await expect(backOdds).toHaveAttribute("aria-invalid", "true");
    const oddsError = editor.getByText(
      "Enter decimal odds using a full stop, for example 8.5.",
      { exact: true }
    );
    await expect(oddsError).toBeVisible();
    await expect(oddsError).toHaveAttribute("role", "alert");
    await expect(backOdds).toHaveAttribute("aria-describedby", /sportsbook-back-odds-error/);
    await expect(resultCards).toHaveCount(0);
    await expect(applyBackPlacement).toBeDisabled();
    await expect(save).toBeDisabled();
    await expect(editor).toHaveCSS("max-width", /.+/);
    expect((await editor.boundingBox())?.width).toBe(initialDialogWidth);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    ).toBe(true);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page
      .getByRole("button", { name: "Switch to light mode" })
      .evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(oddsError).toBeVisible();
    await page.waitForTimeout(350);
    expect(previewBackOdds).not.toContain("8.5abc");

    await backOdds.focus();
    await backOdds.press("ControlOrMeta+A");
    await backOdds.pressSequentially("8.5");
    await expect(backOdds).toHaveAttribute("aria-invalid", "false");
    await expect(resultCards).toBeVisible();
    await expect(applyBackPlacement).toBeEnabled();
    await expect(save).toBeEnabled();
    await expect
      .poll(() => previewBackOdds.filter((value) => value === "8.5").length)
      .toBe(1);

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith(
          `/profiles/${profileId}/sportsbook-bets/${createdRow.sportsbook_bet_id}`
        ) && response.request().method() === "PUT"
    );
    await save.click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();
    expect((await updateResponse.json()).back_odds).toBe("8.5");
  } finally {
    await deleteSportsbookFixture(request, profileId, createdRow.sportsbook_bet_id);
  }
});

test("Profit Boost payout helper floors, applies, persists, and preserves precedence", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const eventName = `Payout odds ${Date.now()}`;
  const payoutRequests: string[] = [];
  const sportsbookPreviews: Array<{ back_odds: string; profit_boost_mode: string }> = [];
  await page.setViewportSize({ width: 760, height: 900 });
  await mockFundManagerShell(page, profileId);
  page.on("request", (pendingRequest) => {
    if (pendingRequest.method() !== "POST") {
      return;
    }
    if (pendingRequest.url().endsWith("/sportsbook-bets/payout-odds-preview")) {
      payoutRequests.push(
        (pendingRequest.postDataJSON() as { total_potential_return: string })
          .total_potential_return
      );
    } else if (pendingRequest.url().endsWith("/sportsbook-bets/preview")) {
      const payload = pendingRequest.postDataJSON() as {
        back_odds: string;
        profit_boost_mode: string;
      };
      sportsbookPreviews.push({
        back_odds: payload.back_odds,
        profit_boost_mode: payload.profit_boost_mode,
      });
    }
  });

  const createResponse = await request.post(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`, {
    data: {
      event_name: eventName,
      bookmaker: "Bookmaker A",
      offer_type: "Profit Boost",
      bet_type: "Single",
      fixture_type: "Football",
      status: "Prospecting",
      result: "Pending",
      back_stake: "10",
      back_odds: "2.50",
      profit_boost_mode: "displayed_odds",
      match_strategy: "Standard",
      lay_odds_1: "2.90",
      exchange_name: "Matchbook",
      date_settled: "2026-09-06T15:00",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  try {
    await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
    await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });
    const row = page.locator(".data-table tbody tr").filter({ hasText: eventName });
    await expect(row).toHaveCount(1);
    await row.click();
    const editor = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await expect(editor).toBeVisible();
    await editor.getByRole("tab", { name: /Matching/ }).click();

    const helper = editor.locator(
      '[data-pd-id="sportsbook.profit-boost.payout-odds-helper"]'
    );
    const totalReturn = helper.getByLabel("Total potential return");
    const useCalculatedOdds = helper.getByRole("button", { name: "Use calculated odds" });
    const enteredOdds = editor.getByLabel("Entered boosted odds");
    await expect(helper).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    ).toBe(true);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await totalReturn.fill("£27.86");
    await expect(totalReturn).toHaveValue("£27.86");
    await expect(totalReturn).toHaveAttribute("aria-invalid", "true");
    const amountError = helper.getByText(
      "Enter a decimal amount using a full stop, for example 10.50."
    );
    await expect(amountError).toBeVisible();
    await expect(amountError).toHaveAttribute("role", "alert");
    await expect(totalReturn).toHaveAttribute("aria-describedby", /sportsbook-payout-return-error/);
    await expect(useCalculatedOdds).toBeDisabled();
    expect(payoutRequests).not.toContain("£27.86");

    await totalReturn.focus();
    await totalReturn.press("ControlOrMeta+A");
    await totalReturn.pressSequentially("27.86");
    await expect(helper.getByText("2.786", { exact: true })).toBeVisible();
    await expect(helper.getByText("2.78", { exact: true })).toBeVisible();
    await expect(useCalculatedOdds).toBeEnabled();

    await useCalculatedOdds.click();
    await expect(enteredOdds).toHaveValue("2.78");
    await expect(editor.getByLabel("Profit Boost entry")).toHaveValue("displayed_odds");
    await expect(helper.getByText(/Calculated from payout and applied/)).toBeVisible();
    await expect
      .poll(() => sportsbookPreviews.filter((value) => value.back_odds === "2.78").length)
      .toBe(1);
    expect(sportsbookPreviews.find((value) => value.back_odds === "2.78")).toEqual({
      back_odds: "2.78",
      profit_boost_mode: "displayed_odds",
    });
    await totalReturn.fill("29.00");
    await expect(helper.getByText(/Calculated from payout and applied/)).toHaveCount(0);
    await expect(enteredOdds).toHaveValue("2.78");
    await expect(helper.getByText("2.90", { exact: true })).toBeVisible();
    await expect(useCalculatedOdds).toBeEnabled();
    await totalReturn.fill("27.86");
    await expect(helper.getByText("2.78", { exact: true })).toBeVisible();
    await useCalculatedOdds.click();
    await page
      .getByRole("button", { name: "Switch to light mode" })
      .evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(helper).toBeVisible();

    const acceptedOdds = editor.getByLabel("Actual accepted back odds");
    await acceptedOdds.fill("2.75");
    await expect(helper.getByText(/Actual accepted odds already take precedence/)).toBeVisible();
    await expect(useCalculatedOdds).toBeDisabled();
    await acceptedOdds.fill("");
    await expect(helper.getByText("2.78", { exact: true })).toBeVisible();
    await useCalculatedOdds.click();

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith(
          `/profiles/${profileId}/sportsbook-bets/${createdRow.sportsbook_bet_id}`
        ) && response.request().method() === "PUT"
    );
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();
    const saved = await updateResponse.json();
    expect(saved.back_odds).toBe("2.78");
    expect(saved.profit_boost_mode).toBe("displayed_odds");
    expect(saved.actual_accepted_back_odds).toBe("");

    const savedRow = page.locator(".data-table tbody tr").filter({ hasText: eventName });
    await savedRow.click();
    const reopened = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await reopened.getByRole("tab", { name: /Matching/ }).click();
    await expect(reopened.getByLabel("Entered boosted odds")).toHaveValue("2.78");
    await expect(reopened.getByLabel("Total potential return")).toHaveValue("");
    expect(payoutRequests.filter((value) => value === "27.86")).toHaveLength(4);
  } finally {
    await deleteSportsbookFixture(request, profileId, createdRow.sportsbook_bet_id);
  }
});
