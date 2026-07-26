import { expect, type Locator, type Page, test } from "@playwright/test";

const profileId = "profile-demo-001";
const apiBaseUrl = "http://127.0.0.1:8010";

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
    const bookmaker = `UI Contract Bookmaker ${Date.now()}`;
    const offer = `UI contract opportunity ${Date.now()}`;

    try {
      for (const targetProfileId of profileIds) {
        const profileResponse = await request.patch(`${apiBaseUrl}/profiles/${targetProfileId}`, {
          data: { status: "Active" },
        });
        expect(profileResponse.ok()).toBeTruthy();
        const accountResponse = await request.post(
          `${apiBaseUrl}/profiles/${targetProfileId}/accounts`,
          {
            data: {
              account: bookmaker,
              type: "Bookie",
              status: "Active",
              channel: "Online",
            },
          }
        );
        expect(accountResponse.ok()).toBeTruthy();
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

        const accountResponse = await request.get(
          `${apiBaseUrl}/profiles/${targetProfileId}/accounts`
        );
        if (accountResponse.ok()) {
          const accounts = (await accountResponse.json()) as Array<Record<string, string>>;
          for (const account of accounts.filter((record) => record.account === bookmaker)) {
            await request.put(
              `${apiBaseUrl}/profiles/${targetProfileId}/accounts/${account.account_id}`,
              { data: { ...account, status: "Archived" } }
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
      await page.route(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`, async (route) => {
        if (route.request().method() === "GET") {
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
    } finally {
      await request.delete(
        `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${createdRow.sportsbook_bet_id}`
      );
    }
  });
});
