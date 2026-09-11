import { expect, type Locator, type Page, test } from "@playwright/test";

const profileId = "profile-demo-001";
const apiBaseUrl = "http://127.0.0.1:8010";

test.beforeEach(async ({ page }) => {
  await page.route("**/auth/session**", (route) => route.fulfill({
    json: {
      authenticated: true,
      email: "ui-contract@example.invalid",
      name: "Synthetic Fund Manager",
      role: "fund_manager",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      linked_profile_ids: ["profile-demo-001", "profile-demo-002"],
      session_policy: { auto_logout_enabled: false, timeout_minutes: 15 },
    },
  }));
  await page.route("**/auth/activity", (route) => route.fulfill({ status: 204 }));
  await page.route("**/auth/security-preference", (route) =>
    route.fulfill({ json: { configured: false } })
  );
});

function sportsbookImportBatch() {
  return {
    import_batch_id: "IMPORT-UI-CONTRACT",
    profile_id: profileId,
    source_filename: "synthetic-ui-contract-sportsbook.xlsx",
    source_type: "xlsx",
    mapping_version: "sportsbook-v1",
    status: "dry_run_ready",
    row_count: 2,
    error_count: 2,
    warning_count: 0,
    summary: { blocked: 2 },
    row_accounting: {
      source_row_count: 2,
      accounted_row_count: 2,
      state: "complete",
      message: "All 2 source rows are represented in this review.",
    },
    financial_reconciliation: {
      ledger: "Sportsbook Bets",
      state: "incomplete",
      source_total: "-1.16",
      recomputed_total: null,
      difference: null,
      compared_row_count: 0,
      source_row_count: 2,
      tolerance: "0.01",
      message: "Blocked sportsbook rows must be resolved before comparison.",
    },
    backup_snapshot_id: "",
    started_at: "2026-07-15T10:00:00Z",
    completed_at: "2026-07-15T10:00:00Z",
    rows: [
      {
        import_staged_row_id: "STAGED-BLOCKED-1",
        source_sheet: "Sportsbook Bets",
        source_record_id: "DEMO-QB-BLOCKED-1",
        source_row: 2,
        source_hash: "synthetic-blocked-hash-1",
        staged_action: "blocked",
        warnings: [],
        errors: [
          {
            code: "bookmaker_not_configured",
            message:
              "This sportsbook identity belongs to a bookmaker that is not configured for the target profile and cannot be imported until the account is added.",
          },
        ],
        fields: {
          EventName: "Synthetic long blocked import event",
          Bookmaker: "Lottoland",
          Offer: "Synthetic import offer",
          Status: "Placed",
        },
        mapped_fields: {},
      },
      {
        import_staged_row_id: "STAGED-BLOCKED-2",
        source_sheet: "Sportsbook Bets",
        source_record_id: "DEMO-QB-BLOCKED-2",
        source_row: 3,
        source_hash: "synthetic-blocked-hash-2",
        staged_action: "blocked",
        warnings: [],
        errors: [
          {
            code: "bookmaker_not_configured",
            message:
              "This sportsbook identity belongs to a bookmaker that is not configured for the target profile and cannot be imported until the account is added.",
          },
        ],
        fields: {
          EventName: "Synthetic second blocked import event",
          Bookmaker: "Betfred",
          Offer: "Synthetic import offer",
          Status: "Placed",
        },
        mapped_fields: {},
      },
    ],
  };
}

async function expectNoPageHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

async function expectWithinViewport(locator: Locator) {
  const geometry = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  });

  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
}

async function expectIconButtonMatches(reference: Locator, candidate: Locator) {
  const [referenceGeometry, candidateGeometry] = await Promise.all([
    reference.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        borderRadius: style.borderRadius,
        height: rect.height,
        width: rect.width,
      };
    }),
    candidate.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        borderRadius: style.borderRadius,
        height: rect.height,
        width: rect.width,
      };
    }),
  ]);

  expect(Math.abs(candidateGeometry.height - referenceGeometry.height)).toBeLessThanOrEqual(2);
  expect(candidateGeometry.width).toBeGreaterThanOrEqual(40);
  expect(candidateGeometry.width).toBeLessThanOrEqual(64);
  expect(candidateGeometry.borderRadius).toBe(referenceGeometry.borderRadius);
}

async function expectMaterialSymbolsRenderAsIcons(page: Page) {
  const symbolStyles = await page.locator(".material-symbols-outlined").evaluateAll((elements) =>
    elements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .slice(0, 20)
      .map((element) => {
        const style = getComputedStyle(element);
        return {
          text: element.textContent?.trim() ?? "",
          fontFamily: style.fontFamily,
          height: element.getBoundingClientRect().height,
        };
      })
  );

  expect(symbolStyles.length).toBeGreaterThan(0);
  for (const style of symbolStyles) {
    expect(style.text).not.toBe("");
    expect(style.fontFamily).toContain("Material Symbols");
    expect(style.height).toBeGreaterThan(0);
  }
}

test.describe("Plum Duff UI contract regressions", () => {
  test("global top-bar actions keep contextual names, icon rendering, and stable geometry", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/profiles");

    const navigation = page.locator('[data-pd-id="app-navigation.trigger"]');
    const notifications = page.locator('[data-pd-id="notifications.trigger"]');
    const backLayTheme = page.getByRole("button", { name: "Choose back/lay colour theme" });
    const themeToggle = page.getByRole("button", { name: /Switch to (light|dark) mode/ });

    for (const button of [navigation, notifications, backLayTheme, themeToggle]) {
      await expect(button).toBeVisible();
      await expect(button).toHaveAttribute("aria-label", /.+/);
    }

    await expectIconButtonMatches(navigation, notifications);
    await expectIconButtonMatches(navigation, backLayTheme);
    await expectIconButtonMatches(navigation, themeToggle);
    await expectMaterialSymbolsRenderAsIcons(page);
    await expectNoPageHorizontalOverflow(page);
  });

  test("opportunity dialog remains viewport-bound with local table scroll and visible actions", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1366, height: 768 });
    const profileIds = ["profile-demo-001", "profile-demo-002"];
    const bookmaker = "247Bet";
    const offer = `UI contract opportunity ${Date.now()}`;

    try {
      for (const targetProfileId of profileIds) {
        const profileResponse = await request.patch(`${apiBaseUrl}/profiles/${targetProfileId}`, {
          data: { status: "Active" },
        });
        expect(profileResponse.ok()).toBeTruthy();
      }

      await page.goto("/profiles");
      await page.getByRole("button", { name: "Add Opportunity" }).click();

      const dialog = page.getByRole("dialog", {
        name: "Add sportsbook opportunity across profiles",
      });
      await expect(dialog).toBeVisible();
      await expectWithinViewport(dialog);
      await expectNoPageHorizontalOverflow(page);

      const header = dialog.locator('[data-pd-id="multi-profile-opportunity.header"]');
      const footer = dialog.locator('[data-pd-id="multi-profile-opportunity.footer"]');
      await expect(header).toBeVisible();
      await expect(footer).toBeVisible();

      await dialog.getByLabel("Offer", { exact: true }).fill(offer);
      await dialog.getByRole("combobox", { name: "Bookmaker", exact: true }).selectOption(bookmaker);
      await dialog.getByRole("combobox", { name: "Offer Type" }).selectOption("Bet & Get");
      await dialog.getByRole("combobox", { name: "Bet Type" }).selectOption("Single");
      await dialog.getByRole("combobox", { name: "Fixture Type" }).selectOption("Football");
      await dialog.getByRole("button", { name: "Check Availability" }).click();

      const availableTargets = dialog.locator('label:has(input[type="checkbox"])');
      await expect(availableTargets.first()).toBeVisible();
      for (let index = 0; index < Math.min(await availableTargets.count(), 2); index += 1) {
        await availableTargets.nth(index).getByRole("checkbox").check();
      }
      const createRowsButton = dialog.getByRole("button", {
        name: /Create .* Prospecting Rows/,
      });
      await expect(createRowsButton).toBeEnabled();
      await createRowsButton.click();
      await expect(dialog.getByRole("heading", { name: "Profile Placement" })).toBeVisible();

      await expectWithinViewport(dialog);
      await expect(header).toBeVisible();
      await expect(footer).toBeVisible();

      const tableScroll = dialog.locator(
        '[data-pd-id="multi-profile-opportunity.placement.table-scroll"]'
      );
      await expect(tableScroll).toBeVisible();
      const tableGeometry = await tableScroll.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(tableGeometry.scrollWidth).toBeGreaterThan(tableGeometry.clientWidth);
      await expectNoPageHorizontalOverflow(page);

      const rowActionButtons = dialog.locator("tbody tr").first().getByRole("button");
      const actionGeometry = await rowActionButtons.evaluateAll((buttons) =>
        buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return {
            ariaLabel: button.getAttribute("aria-label"),
            height: rect.height,
            width: rect.width,
          };
        })
      );
      expect(actionGeometry.length).toBeGreaterThan(0);
      for (const action of actionGeometry) {
        expect(action.ariaLabel).toMatch(/\S/);
        expect(action.height).toBeGreaterThanOrEqual(40);
        expect(action.width).toBeGreaterThanOrEqual(40);
      }
    } finally {
      for (const targetProfileId of profileIds) {
        const sportsbookResponse = await request.get(
          `${apiBaseUrl}/profiles/${targetProfileId}/sportsbook-bets`
        );
        if (sportsbookResponse.ok()) {
          const rows = (await sportsbookResponse.json()) as Array<Record<string, string>>;
          for (const row of rows.filter((record) => record.offer_text === offer)) {
            await request.delete(
              `${apiBaseUrl}/profiles/${targetProfileId}/sportsbook-bets/${row.sportsbook_bet_id}`
            );
          }
        }

      }
    }
  });

  test("spreadsheet import review uses bounded dialog and contained review-note text", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.route(`http://127.0.0.1:8010/profiles/${profileId}/imports**`, async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === "POST" && path.endsWith("/xlsx/dry-run")) {
        await route.fulfill({
          body: JSON.stringify(sportsbookImportBatch()),
          contentType: "application/json",
          status: 201,
        });
        return;
      }
      if (request.method() === "GET" && path.endsWith("/IMPORT-UI-CONTRACT")) {
        await route.fulfill({
          body: JSON.stringify(sportsbookImportBatch()),
          contentType: "application/json",
          status: 200,
        });
        return;
      }
      await route.fulfill({ body: "[]", contentType: "application/json", status: 200 });
    });

    await page.goto(`/profiles/${profileId}/tracker/settings`);
    await page.getByRole("tab", { name: "Spreadsheet Transfer" }).click();
    await page.locator('[data-pd-id="spreadsheet-transfer.import-file"]').setInputFiles({
      buffer: Buffer.from("synthetic intercepted XLSX"),
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      name: "synthetic-ui-contract-sportsbook.xlsx",
    });

    const dialog = page.getByRole("dialog", { name: "Spreadsheet import review" });
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expectWithinViewport(dialog);
    await expectNoPageHorizontalOverflow(page);
    await expect(dialog.locator('[data-pd-id="import-review.close"]')).toBeVisible();

    const tableScroll = dialog.locator('[data-pd-id="import-review.table-scroll"]');
    await expect(tableScroll).toBeVisible();
    const reviewNotes = dialog.locator("details", { hasText: "Review note" });
    const noteCount = await reviewNotes.count();
    for (let index = 0; index < Math.min(noteCount, 3); index += 1) {
      const note = reviewNotes.nth(index);
      await note.locator("summary").click();
      const containment = await note.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(containment.scrollWidth).toBeLessThanOrEqual(containment.clientWidth + 1);
    }
  });

  test("ledger value cells use financial badges and M3 current/final icons instead of text labels", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1366, height: 768 });
    const eventName = `UI value badge ${Date.now()}`;
    const existingRowsResponse = await request.get(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`);
    if (existingRowsResponse.ok()) {
      const existingRows = (await existingRowsResponse.json()) as Array<Record<string, string>>;
      for (const row of existingRows.filter((record) =>
        String(record.event_name ?? "").startsWith("UI value badge")
      )) {
        await request.delete(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${row.sportsbook_bet_id}`);
      }
    }
    const createResponse = await request.post(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`, {
      data: {
        event_name: eventName,
        offer_text: "UI value badge offer",
        bookmaker: "Bookmaker A",
        offer_type: "Bet & Get",
        bet_type: "Single",
        offer_name: "UI Value Badge",
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
        date_settled: "2026-07-24T18:00",
        user_notes: "",
        manual_override_value: "",
        manual_override_reason: "",
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const createdRow = await createResponse.json();
    const finalEventName = `${eventName} final`;
    const finalRow = {
      ...createdRow,
      sportsbook_bet_id: `${createdRow.sportsbook_bet_id}-final`,
      event_name: finalEventName,
      status: "Settled",
      result: "Back Won",
      projected_current_pnl: null,
      final_net_pnl: "8.57",
      reporting_value: "8.57",
    };

    try {
      await page.route(`**/profiles/${profileId}/sportsbook-bets**`, async (route) => {
        const url = new URL(route.request().url());
        if (route.request().method() === "GET" && url.pathname.endsWith("/sportsbook-bets")) {
          await route.fulfill({
            body: JSON.stringify([createdRow, finalRow]),
            contentType: "application/json",
            status: 200,
          });
          return;
        }
        await route.continue();
      });
      await page.addInitScript(() => {
        window.localStorage.removeItem(
          "openforge-ledger-table-mode:profile-demo-001:sportsbook-bets"
        );
        window.localStorage.removeItem(
          "openforge-ledger-table-filters:profile-demo-001:sportsbook-bets"
        );
      });
      await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
      await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });

      const row = page.locator(".data-table tbody tr", { hasText: eventName }).first();
      await expect(row).toBeVisible();
      const valueCell = row.locator(".ledger-value-cell").first();
      await expect(valueCell).toBeVisible();
      await expect(valueCell).not.toContainText(/Current value|Final value/i);
      await expect(valueCell).toHaveAttribute(
        "title",
        "Current value: cash-first value while this row is still open."
      );

      const stateIcon = valueCell.locator(".material-symbols-outlined");
      await expect(stateIcon).toHaveText("hourglass_top");

      const stateBadge = valueCell.locator(".ledger-value-state");
      await expect(stateBadge).toHaveAttribute(
        "title",
        "Current value: cash-first value while this row is still open."
      );
      await expect(stateBadge).toHaveAttribute("aria-label", "Current value");

      const finalRowElement = page.locator(".data-table tbody tr", { hasText: finalEventName }).first();
      await expect(finalRowElement).toBeVisible();
      const finalValueCell = finalRowElement.locator(".ledger-value-cell").first();
      await expect(finalValueCell).toHaveAttribute(
        "title",
        "Final value: settled result value for this row."
      );
      const finalStateIcon = finalValueCell.locator(".material-symbols-outlined");
      await expect(finalStateIcon).toHaveText("done_all");
      const finalStateBadge = finalValueCell.locator(".ledger-value-state");
      await expect(finalStateBadge).toHaveAttribute(
        "title",
        "Final value: settled result value for this row."
      );
      await expect(finalStateBadge).toHaveAttribute("aria-label", "Final value");
      await expect(finalValueCell.locator(".ledger-financial-value")).toHaveAttribute(
        "title",
        "Final value: settled result value for this row."
      );

      const badge = valueCell.locator(".ledger-financial-value");
      await expect(badge).toHaveAttribute(
        "title",
        "Current value: cash-first value while this row is still open."
      );
      await expect(badge).toHaveAttribute("data-money-tone", /positive|negative|neutral/);
      const [badgeStyles, iconStyles] = await Promise.all([
        badge.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius,
            color: style.color,
            height: element.getBoundingClientRect().height,
            right: element.getBoundingClientRect().right,
            top: element.getBoundingClientRect().top,
            width: element.getBoundingClientRect().width,
          };
        }),
        stateBadge.evaluate((element) => {
          const style = getComputedStyle(element);
          const className = element.className;
          return {
            className: typeof className === "string" ? className : String(className),
            color: style.color,
            fontSize: style.fontSize,
            height: element.getBoundingClientRect().height,
            opacity: style.opacity,
            pointerEvents: style.pointerEvents,
            position: style.position,
            right: element.getBoundingClientRect().right,
            top: element.getBoundingClientRect().top,
            badgeTop: element.parentElement?.getBoundingClientRect().top ?? 0,
            width: element.getBoundingClientRect().width,
          };
        }),
      ]);

      expect(badgeStyles.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
      expect(parseFloat(badgeStyles.borderRadius)).toBeGreaterThanOrEqual(10);
      expect(badgeStyles.height).toBeGreaterThanOrEqual(32);
      expect(badgeStyles.width).toBeGreaterThanOrEqual(70);
      expect(badgeStyles.color).not.toBe(badgeStyles.backgroundColor);
      expect(iconStyles.position).toBe("absolute");
      expect(Number(iconStyles.opacity)).toBeCloseTo(0.75, 1);
      expect(iconStyles.pointerEvents).toBe("auto");
      expect(parseFloat(iconStyles.fontSize)).toBeGreaterThanOrEqual(18);
      expect(iconStyles.height).toBeGreaterThanOrEqual(22);
      expect(iconStyles.width).toBeGreaterThanOrEqual(22);
      expect(iconStyles.top).toBeLessThanOrEqual(iconStyles.badgeTop + 6);
      expect(iconStyles.top).toBeLessThan(badgeStyles.top);
      expect(iconStyles.right).toBeGreaterThan(badgeStyles.right - 10);
      expect(iconStyles.color).not.toBe(badgeStyles.color);
      expect(iconStyles.className).toMatch(
        /ledger-value-state-(current|final|neutral)/
      );
      await row.click();
      const editor = page.getByRole("dialog", { name: "Edit sportsbook row" });
      await expect(editor).toBeVisible();
      const summaryValue = editor.locator(".editor-summary-value-chip");
      const summaryGeometry = await summaryValue.evaluate((element) => {
        const badge = element.getBoundingClientRect();
        const value = element.querySelector(".financial-value-visual")!.getBoundingClientRect();
        return {
          x: Math.abs((badge.left + badge.right) / 2 - (value.left + value.right) / 2),
          y: Math.abs((badge.top + badge.bottom) / 2 - (value.top + value.bottom) / 2),
        };
      });
      expect(summaryGeometry.x).toBeLessThanOrEqual(1);
      expect(summaryGeometry.y).toBeLessThanOrEqual(1);
    } finally {
      await request.delete(
        `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${createdRow.sportsbook_bet_id}`
      );
    }
  });

  test("Casino ledger values preserve natural positive and accounting-negative odometer geometry", async ({ page }) => {
    test.setTimeout(60_000);
    const marker = `Casino value geometry ${Date.now()}`;
    const casinoRow = (suffix: string, value: string) => {
      const id = `CO-GEOMETRY-${suffix.toUpperCase()}`;
      return {
        casino_offer_id: id, profile_id: profileId, offer_group_id: "",
        date_started: "2026-09-10T12:00:00", date_settling: "2026-09-10T12:30:00", expiry_datetime: "2026-09-10T13:00:00",
        bookmaker: "Bookmaker A", offer_type: "Manual Play / No Offer", offer_name: `${marker} ${suffix}`, game: `Synthetic Blackjack ${suffix}`,
        cash_stake: "3.00", credit_amount: "", bonus_amount: "", wager_multiplier: "", wager_target: "", required_spins: "", spin_stake: "", free_spins_awarded: "", free_spins_value: "",
        wagering_base: "", custom_wager_base: "", wagering_completed: "", rtp_percent: "", reward_type: "", reward_wager_multiplier: "", reward_wager_target: "", reward_required_spins: "", reward_wagering_completed: "", reward_rtp_percent: "", expected_reward_cash_value: "", qualifying_expected_loss: "", reward_expected_loss: "", other_expected_costs: "", campaign_ev: "", own_cash_committed: "3.00", cash_returned: value.startsWith("-") ? "0.00" : "6.00", settlement_other_costs: "",
        status: "Settled", result: value.startsWith("-") ? "Lose" : "Win", calc_net_pnl: "", final_net_pnl: value, user_notes: "Synthetic FinancialValue table geometry fixture.",
        created_at: "2026-09-10T12:30:00Z", updated_at: "2026-09-10T12:30:00Z", resolved_net_pnl: value, calculation_state: "resolved", calculation_notes: [], counts_as_open: false, is_overdue: false, week_label: "2026-W37",
      };
    };
    await page.route(`**/profiles/${profileId}/casino-offers**`, (route) => route.fulfill({ json: [casinoRow("negative", "-3.00"), casinoRow("positive", "3.00")] }));
    await page.route(`**/profiles/${profileId}/accounts`, (route) => route.fulfill({ json: [] }));
    await page.route(`**/profiles/${profileId}/lookup-values`, (route) => route.fulfill({ json: [] }));
    await page.route(`**/profiles/${profileId}/tracker-settings`, (route) => route.fulfill({ json: { active_date_preset: "All Dates", custom_start_date: "", custom_end_date: "", range_back_days: 0, range_forward_days: 0 } }));
    await page.route("**/account-catalogue/source", (route) => route.fulfill({ json: { records: [], source_hash: "synthetic" } }));
    await page.route(`**/profiles/${profileId}/bookmaker-display-settings`, (route) => route.fulfill({ json: {} }));
    await page.route("**/fund-manager/common-bet-combos?active_only=true", (route) => route.fulfill({ json: [] }));
    await page.route("**/fund-manager/common-bet-combos/profile-overrides/**", (route) => route.fulfill({ json: [] }));
    await page.route("**/fund-manager/preferences/financial-motion", (route) => route.fulfill({ json: { duration_ms: 520, enabled: true, replay_delay_ms: 1500, stagger_ms: 80 } }));
    await page.addInitScript((keys) => keys.forEach((key) => window.localStorage.removeItem(key)), [
      `openforge-ledger-table-mode:${profileId}:casino-offers`,
      `openforge-ledger-table-filters:${profileId}:casino-offers`,
    ]);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(`/profiles/${profileId}/tracker/casino-offers?search=${encodeURIComponent(marker)}`);
      const negativeRow = page.locator(".data-table tbody tr", { hasText: `${marker} negative` });
      const positiveRow = page.locator(".data-table tbody tr", { hasText: `${marker} positive` });
      await expect(negativeRow).toBeVisible();
      await expect(positiveRow).toBeVisible();
      const negativeValue = negativeRow.locator(".ledger-financial-value");
      const positiveValue = positiveRow.locator(".ledger-financial-value");
      await expect(negativeValue).toHaveAttribute("aria-label", "Net result: £ (3.00)");
      await expect(positiveValue).toHaveAttribute("aria-label", "Net result: £ 3.00");
      await expect(negativeValue).toHaveAttribute("data-money-tone", "negative");
      await expect(positiveValue).toHaveAttribute("data-money-tone", "positive");

      const geometry = await Promise.all([negativeValue, positiveValue].map((value) => value.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const cell = element.closest("td")!.getBoundingClientRect();
        const rootStyle = getComputedStyle(element);
        const descendants = [...element.querySelectorAll<HTMLElement>(".financial-value-character, .financial-value-digit-window")];
        const range = document.createRange();
        range.selectNodeContents(element.querySelector(".financial-value-canonical-text")!);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);
        const selectedText = selection.toString();
        selection.removeAllRanges();
        return {
          cellLeft: cell.left, cellRight: cell.right,
          left: rect.left, right: rect.right, width: rect.width,
          selectedText,
          typography: descendants.map((child) => {
            const style = getComputedStyle(child);
            return { fontSize: style.fontSize, lineHeight: style.lineHeight, textTransform: style.textTransform, letterSpacing: style.letterSpacing };
          }),
          rootTypography: { fontSize: rootStyle.fontSize, lineHeight: rootStyle.lineHeight },
        };
      })));
      expect(geometry[0].selectedText).toBe("£ (3.00)");
      expect(geometry[1].selectedText).toBe("£ 3.00");
      for (const value of geometry) {
        expect(value.left).toBeGreaterThanOrEqual(value.cellLeft - 1);
        expect(value.right).toBeLessThanOrEqual(value.cellRight + 1);
        for (const typography of value.typography) {
          expect(typography.fontSize).toBe(value.rootTypography.fontSize);
          expect(typography.lineHeight).toBe(value.rootTypography.lineHeight);
          expect(typography.textTransform).toBe("none");
          expect(["0px", "normal"]).toContain(typography.letterSpacing);
        }
      }
      expect(geometry[0].width).toBeGreaterThan(geometry[1].width);
      await expect(negativeValue).toHaveAttribute("data-money-motion", "none", { timeout: 4_000 });
      await page.waitForTimeout(1_550);
      await negativeRow.hover();
      await expect(negativeValue).toHaveAttribute("data-money-motion", "down");

      for (const theme of ["light", "dark"] as const) {
        await page.evaluate((nextTheme) => { document.documentElement.dataset.theme = nextTheme; }, theme);
        for (const width of [1366, 720]) {
          await page.setViewportSize({ width, height: 768 });
          await negativeValue.scrollIntoViewIfNeeded();
          const containment = await negativeValue.evaluate((element) => {
            const valueRect = element.getBoundingClientRect();
            const cellRect = element.closest("td")!.getBoundingClientRect();
            return {
              contained: valueRect.left >= cellRect.left - 1 && valueRect.right <= cellRect.right + 1,
              pageContained: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
            };
          });
          expect(containment).toEqual({ contained: true, pageContained: true });
        }
      }
  });
});
