import { expect, test, type APIRequestContext } from "@playwright/test";

const route = "/profiles/profile-demo-001/tracker/each-way-extra-places";
const apiBaseUrl = "http://127.0.0.1:8010";
const profileId = "profile-demo-001";

async function createExtraPlaceRow(
  request: APIRequestContext,
  values: Record<string, string>,
) {
  const response = await request.post(
    `${apiBaseUrl}/profiles/${profileId}/each-way-extra-places`,
    { data: values },
  );
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ each_way_extra_place_id: string }>;
}

async function deleteExtraPlaceRow(
  request: APIRequestContext,
  id: string,
) {
  const response = await request.delete(
    `${apiBaseUrl}/profiles/${profileId}/each-way-extra-places/${id}`,
  );
  expect(response.ok()).toBeTruthy();
}

function rgbLuminance(color: string) {
  const channels = color.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number) ?? [];
  expect(channels).toHaveLength(3);
  const scale = Math.max(...channels) <= 1 ? 255 : 1;
  return (
    channels[0] * scale * 0.2126 +
    channels[1] * scale * 0.7152 +
    channels[2] * scale * 0.0722
  );
}

test.describe("Extra Place ledger parity", () => {
  test("uses profile account choices and the configured preferred exchange for a saved settlement", async ({ page }) => {
    const sessionToken = process.env.OPENFORGE_E2E_SESSION_TOKEN;
    if (sessionToken) {
      await page.context().addCookies([{
        domain: "127.0.0.1",
        httpOnly: true,
        name: "pd_session",
        path: "/",
        sameSite: "Lax",
        secure: false,
        value: sessionToken,
      }]);
    }
    const accountRows: Array<Record<string, unknown>> = [
      {
        account_id: "account-synthetic-bookie",
        profile_id: profileId,
        account: "Synthetic Extra Place Bookmaker",
        type: "Bookie",
        counts_in_cash_total: true,
        channel: "Online",
        status: "Active",
        lifecycle_status: "Active",
        extra_places_access_state: "not_checked",
        extra_places_capability_state: "NotChecked",
        extra_places_access_reason: "Extra Places capability has not been checked for this account.",
        extra_places_allows_planning: true,
        extra_places_allows_operational_use: true,
        current_balance: "0.00",
        pending_withdrawal_amount: "0.00",
        last_balance_update: "",
        group_name: "Synthetic Group",
        platform: "Synthetic Platform",
        created_at: "2026-09-07T12:00:00Z",
        updated_at: "2026-09-07T12:00:00Z",
      },
      {
        account_id: "account-synthetic-warned-bookie",
        profile_id: profileId,
        account: "Synthetic Stake Limited Bookmaker",
        type: "Bookie",
        counts_in_cash_total: true,
        channel: "Online",
        status: "Stake Restricted",
        lifecycle_status: "Active",
        restrictions: ["Soft Limited"],
        extra_places_access_state: "warning",
        extra_places_capability_state: "NotChecked",
        extra_places_access_reason: "Stake restrictions recorded. Extra Places remains available, but check the accepted stake.",
        extra_places_allows_planning: true,
        extra_places_allows_operational_use: true,
        current_balance: "0.00",
        pending_withdrawal_amount: "0.00",
        last_balance_update: "",
        group_name: "Synthetic Group",
        platform: "Synthetic Platform",
        created_at: "2026-09-07T12:00:00Z",
        updated_at: "2026-09-07T12:00:00Z",
      },
      {
        account_id: "account-synthetic-blocked-bookie",
        profile_id: profileId,
        account: "Synthetic Login Restricted Bookmaker",
        type: "Bookie",
        counts_in_cash_total: true,
        channel: "Online",
        status: "Active",
        lifecycle_status: "Active",
        restrictions: ["Login Restricted"],
        extra_places_access_state: "blocked",
        extra_places_capability_state: "NotChecked",
        extra_places_access_reason: "Login restricted: this account cannot be used for new Extra Places activity.",
        extra_places_allows_planning: false,
        extra_places_allows_operational_use: false,
        current_balance: "0.00",
        pending_withdrawal_amount: "0.00",
        last_balance_update: "",
        group_name: "Synthetic Group",
        platform: "Synthetic Platform",
        created_at: "2026-09-07T12:00:00Z",
        updated_at: "2026-09-07T12:00:00Z",
      },
      {
        account_id: "account-synthetic-exchange",
        profile_id: profileId,
        account: "Synthetic Preferred Exchange",
        type: "Exchange",
        counts_in_cash_total: true,
        channel: "Online",
        status: "Active",
        lifecycle_status: "Active",
        current_balance: "0.00",
        pending_withdrawal_amount: "0.00",
        last_balance_update: "",
        group_name: "Synthetic Group",
        platform: "Synthetic Platform",
        created_at: "2026-09-07T12:00:00Z",
        updated_at: "2026-09-07T12:00:00Z",
      },
    ];
    accountRows.push(
      ...Array.from({ length: 6 }, (_, index) => ({
        ...accountRows[0],
        account_id: `account-synthetic-bookie-${index + 2}`,
        account: `Synthetic Long Bookmaker Choice ${index + 2}`,
        current_balance: index === 0 ? "25.00" : "0.00",
      })),
      ...Array.from({ length: 6 }, (_, index) => ({
        ...accountRows[3],
        account_id: `account-synthetic-exchange-${index + 2}`,
        account: `Synthetic Long Exchange Choice ${index + 2}`,
      })),
    );
    let savedPayload: Record<string, string> | null = null;
    await page.route("**/auth/session", (route) =>
      route.fulfill({
        json: {
          authenticated: true,
          email: "extra-place-test@example.invalid",
          name: "Synthetic Fund Manager",
          role: "fund_manager",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          linked_profile_ids: [profileId],
          session_policy: {
            auto_logout_enabled: false,
            timeout_minutes: 15,
            preference_configured: true,
            effective_expires_at: Math.floor(Date.now() / 1000) + 3600,
          },
        },
      }),
    );
    let financialMotionEnabled = true;
    await page.route("**/fund-manager/preferences/financial-motion", async (route) => {
      if (route.request().method() === "PUT") {
        financialMotionEnabled = Boolean(
          (route.request().postDataJSON() as { enabled?: boolean }).enabled,
        );
      }
      await route.fulfill({ json: { enabled: financialMotionEnabled } });
    });
    await page.route(`**/profiles/${profileId}/accounts`, (route) =>
      route.fulfill({ json: accountRows }),
    );
    await page.route(`**/profiles/${profileId}/tracker-settings`, (route) =>
      route.fulfill({
        json: {
          active_date_preset: "All Time",
          default_exchange_name: "Synthetic Preferred Exchange",
          extra_place_weekly_loss_budget: "15.00",
        },
      }),
    );
    await page.route("**/fund-manager/common-bet-combos/profile-overrides/**", (route) =>
      route.fulfill({ json: [] }),
    );
    await page.route(`**/profiles/${profileId}/sportsbook-bets`, (route) =>
      route.fulfill({ json: [{ bookmaker: "Synthetic Long Bookmaker Choice 3", exchange_name: "Synthetic Long Exchange Choice 3", status: "Placed", updated_at: "2026-09-07T12:30:00Z" }] }),
    );
    await page.route(`**/profiles/${profileId}/free-bets`, (route) => route.fulfill({ json: [] }));
    await page.route(`**/profiles/${profileId}/casino-offers`, (route) => route.fulfill({ json: [] }));
    await page.route(`**/profiles/${profileId}/each-way-extra-places/preview`, async (route) => {
      const form = route.request().postDataJSON() as Record<string, string>;
      await route.fulfill({
        json: {
          ...form,
          calculation_state: "resolved",
          calculation_notes: [],
          rating_percent: "95.00",
          implied_odds: "3.00",
          current_value: "-1.00",
          final_value: form.status === "Settled" ? "12.34" : null,
        },
      });
    });
    await page.route(`**/profiles/${profileId}/each-way-extra-places`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          json: savedPayload
            ? ["61.12", "-14.01", "3450.50", "0"].map((qualifyingLoss, index) => ({
                ...savedPayload,
                each_way_extra_place_id: `extra-place-synthetic-account-default-${index}`,
                runner: `Synthetic Geometry Runner ${index + 1}`,
                calculation_state: "resolved",
                calculation_notes: [],
                current_value: index === 3 ? "0" : "12.34",
                final_value: index === 3 ? "0" : "12.34",
                qualifying_loss: qualifyingLoss,
              }))
            : [],
        });
        return;
      }
      savedPayload = route.request().postDataJSON() as Record<string, string>;
      await route.fulfill({
        status: 201,
        json: {
          ...savedPayload,
          each_way_extra_place_id: "extra-place-synthetic-account-default",
          calculation_state: "resolved",
          calculation_notes: [],
          current_value: "12.34",
          final_value: "12.34",
        },
      });
    });

    const accountsLoaded = page.waitForResponse((response) =>
      response.url().endsWith(`/profiles/${profileId}/accounts`),
    );
    const settingsLoaded = page.waitForResponse((response) =>
      response.url().endsWith(`/profiles/${profileId}/tracker-settings`),
    );
    await page.goto(route);
    await Promise.all([accountsLoaded, settingsLoaded]);
    await page.getByRole("button", { name: "Add Extra Place row" }).click();
    const dialog = page.getByRole("dialog", { name: "Create Extra Place row" });
    const bookmaker = dialog.getByLabel("BookmakerSelect");
    await expect(bookmaker.locator("option")).toHaveCount(10);
    await expect(bookmaker.locator("option", { hasText: "Synthetic Long Bookmaker Choice 6" })).toHaveCount(1);
    await expect(dialog.locator(".extra-place-lay-win select")).toHaveValue(
      "Synthetic Preferred Exchange",
    );
    await expect(dialog.locator(".extra-place-lay-place select")).toHaveValue(
      "Synthetic Preferred Exchange",
    );
    const accountRails = dialog.locator(".extra-place-account-option-rail");
    await expect(accountRails).toHaveCount(3);
    const bookmakerRail = accountRails.first();
    await expect(bookmakerRail.locator(".quick-select-rail-page .review-chip")).toHaveCount(3);
    await expect(bookmakerRail.locator(".quick-select-rail-page .review-chip").first()).toContainText("Synthetic Long Bookmaker Choice 3");
    await expect(bookmakerRail.locator(".quick-select-rail-page .review-chip").nth(1)).toContainText("Synthetic Long Bookmaker Choice 2");
    const nextBookmakers = bookmakerRail.getByRole("button", { name: /Show next Account quick selections/ });
    const previousBookmakers = bookmakerRail.getByRole("button", { name: /Show previous Account quick selections/ });
    await expect(previousBookmakers).toBeDisabled();
    await expect(nextBookmakers).toBeEnabled();
    expect(
      await bookmakerRail.locator(".import-review-loadouts").evaluate(
        (element) => element.scrollHeight <= element.clientHeight + 2,
      ),
    ).toBeTruthy();
    await nextBookmakers.focus();
    await expect(nextBookmakers).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(previousBookmakers).toBeEnabled();
    await expect(bookmakerRail.locator(".quick-select-rail-page .review-chip")).toHaveCount(3);
    await nextBookmakers.click();
    await expect(nextBookmakers).toBeDisabled();
    await expect(bookmakerRail.locator(".quick-select-rail-page")).toContainText(
      "Synthetic Long Bookmaker Choice 7",
    );
    await previousBookmakers.click();
    await previousBookmakers.click();
    await expect(previousBookmakers).toBeDisabled();
    const eachWayTermsRail = dialog.locator(".extra-place-field-with-chips", { hasText: "Each-Way Terms" }).locator('[data-pd-id="quick-select.rail"]');
    await expect(eachWayTermsRail.locator(".review-chip")).toHaveCount(3);
    await expect(eachWayTermsRail.locator(".icon-button")).toHaveCount(0);
    const placeTermsRail = dialog.locator(".extra-place-place-terms").locator('[data-pd-id="quick-select.rail"]');
    await expect(placeTermsRail.locator(".review-chip")).toHaveCount(3);
    await expect(placeTermsRail.locator(".icon-button")).toHaveCount(2);
    await bookmaker.selectOption("Synthetic Stake Limited Bookmaker");
    await expect(dialog.locator('[data-pd-id="extra-place.account-health"]')).toBeVisible();
    await bookmaker.selectOption("Synthetic Extra Place Bookmaker");

    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
      document.documentElement.style.colorScheme = "dark";
    });
    await expect(bookmaker).toBeVisible();
    await page.setViewportSize({ width: 720, height: 820 });
    const [dialogBox, bookmakerBox] = await Promise.all([
      dialog.boundingBox(),
      bookmaker.boundingBox(),
    ]);
    expect(dialogBox).not.toBeNull();
    expect(bookmakerBox).not.toBeNull();
    expect(bookmakerBox!.x).toBeGreaterThanOrEqual(dialogBox!.x);
    expect(bookmakerBox!.x + bookmakerBox!.width).toBeLessThanOrEqual(
      dialogBox!.x + dialogBox!.width + 1,
    );
    for (const rail of await accountRails.all()) {
      const railBox = await rail.boundingBox();
      expect(railBox).not.toBeNull();
      expect(railBox!.x).toBeGreaterThanOrEqual(dialogBox!.x);
      expect(railBox!.x + railBox!.width).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width + 1);
    }

    await bookmaker.focus();
    await expect(bookmaker).toBeFocused();
    await bookmaker.selectOption("Synthetic Stake Limited Bookmaker");
    await expect(dialog.locator('[data-pd-id="extra-place.account-health"]')).toContainText(
      "Stake restrictions recorded",
    );
    await expect(dialog.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
    await bookmaker.selectOption("Synthetic Login Restricted Bookmaker");
    await expect(dialog.locator('[data-pd-id="extra-place.account-health"]')).toContainText(
      "cannot be used for new Extra Places activity",
    );
    await expect(dialog.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
    await bookmaker.selectOption("Synthetic Extra Place Bookmaker");
    await expect(dialog.locator('[data-pd-id="extra-place.account-health"]')).toContainText(
      "capability has not been checked",
    );
    await dialog.getByLabel("Runner / Horse").fill("Synthetic Runner");
    await dialog.getByLabel("Race").fill("Synthetic Race 14:10");
    await dialog.getByLabel("Date / Time").fill("2026-09-07T14:10");
    await dialog.getByLabel("E/W Stake (each way)").fill("5");
    await dialog.getByLabel("Back Odds").fill("6");
    await dialog.getByLabel("Lay Odds").first().fill("2.3");
    await dialog.getByLabel("Lay Odds").nth(1).fill("4.5");
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: new URL(page.url()).origin,
    });
    const stakeSentence = dialog.locator(".extra-place-stake-explainer").filter({
      hasText: "Total bookmaker stake",
    });
    for (const theme of ["light", "dark"] as const) {
      await page.evaluate((nextTheme) => {
        document.documentElement.dataset.theme = nextTheme;
        document.documentElement.style.colorScheme = nextTheme;
      }, theme);
      const colours = await stakeSentence.evaluate((element) => ({
        sentence: getComputedStyle(element).color,
        values: Array.from(element.querySelectorAll<HTMLElement>(".financial-value"))
          .map((value) => getComputedStyle(value).color),
      }));
      expect(colours.values).toEqual([colours.sentence, colours.sentence]);
    }
    await stakeSentence.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
    await page.keyboard.press(process.platform === "darwin" ? "Meta+C" : "Control+C");
    await expect.poll(async () => (await page.evaluate(() => navigator.clipboard.readText())).replace(/\s+/g, " ").trim())
      .toBe("£ 5.00 each way. Total bookmaker stake: £ 10.00.");
    await dialog.getByRole("tab", { name: /Settlement/ }).click();
    const finishingPositionGroup = dialog.getByLabel("Finishing Position").locator("../..");
    await finishingPositionGroup
      .getByRole("button", { name: /Show next quick choices/ })
      .click();
    await finishingPositionGroup.getByRole("button", { name: "5th", exact: true }).click();
    const selectedOutcomeRow = dialog.locator(".extra-place-outcome-row.is-selected:visible");
    const groupedValues = selectedOutcomeRow.locator(".financial-value");
    const groupedCycles = await groupedValues.evaluateAll((values) =>
      values.map((value) => Number(value.getAttribute("data-money-motion-cycle"))),
    );
    await selectedOutcomeRow.hover();
    await expect.poll(async () => {
      const next = await groupedValues.evaluateAll((values) =>
        values.map((value) => Number(value.getAttribute("data-money-motion-cycle"))),
      );
      return next.every((cycle, index) => cycle > groupedCycles[index]);
    }).toBe(true);
    await dialog.getByRole("button", { name: "Save", exact: true }).click();

    expect(savedPayload).toMatchObject({
      bookmaker: "Synthetic Extra Place Bookmaker",
      bookmaker_account: "Synthetic Extra Place Bookmaker",
      win_exchange: "Synthetic Preferred Exchange",
      place_exchange: "Synthetic Preferred Exchange",
      status: "Settled",
      result: "Extra Place",
      finishing_position: "5th",
    });

    const resolvedValue = page.locator('[data-pd-id="extra-place.ledger"] .stat-card .financial-value').first();
    await expect(resolvedValue).toHaveAttribute("aria-label", "£ 37.02");
    await expect(
      page.locator('[data-pd-id="extra-place.ledger"] .financial-value[aria-label$="£ (14.01)"]'),
    ).toHaveAttribute("data-money-tone", "negative");
    await expect(resolvedValue.locator(".financial-value-digit-window")).toHaveCount(4);
    await expect(resolvedValue.locator(".financial-value-digit-window").first()).toHaveCSS("overflow", "hidden");
    await resolvedValue.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
    await page.keyboard.press(process.platform === "darwin" ? "Meta+C" : "Control+C");
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("£ 37.02");
    const cycle = Number(await resolvedValue.getAttribute("data-money-motion-cycle"));
    await resolvedValue.hover();
    await expect.poll(async () => Number(await resolvedValue.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(cycle);
    await expect(resolvedValue).toHaveAttribute("data-money-motion", "up");
    const hoverCycle = Number(await resolvedValue.getAttribute("data-money-motion-cycle"));
    await resolvedValue.click();
    await resolvedValue.click();
    await expect.poll(async () => Number(await resolvedValue.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(hoverCycle + 1);
    await expect(resolvedValue).toHaveAttribute("data-money-motion", "up");
    const delays = await resolvedValue.locator(".financial-value-digit-strip").evaluateAll((strips) =>
      strips.slice(0, 2).map((strip) => getComputedStyle(strip).animationDelay),
    );
    expect(delays).toEqual(["0s", "0.07s"]);
    const financialGeometry = await page.locator('[data-pd-id="extra-place.ledger"] .financial-value').evaluateAll((values) =>
      values.filter((value) => ["£ 37.02", "£ 61.12", "£ (14.01)", "£ 3,450.50"].includes(value.getAttribute("aria-label")?.replace("Financial value: ", "") ?? "")).map((value) => {
        const display = value.getAttribute("aria-label")?.replace("Financial value: ", "") ?? "";
        const clone = value.cloneNode(false) as HTMLElement;
        clone.removeAttribute("aria-label");
        clone.style.position = "absolute";
        clone.style.visibility = "hidden";
        clone.textContent = display;
        value.parentElement?.appendChild(clone);
        const animated = value.getBoundingClientRect();
        const staticValue = clone.getBoundingClientRect();
        const valueStyle = getComputedStyle(value);
        const digitStyle = getComputedStyle(value.querySelector(".financial-value-digit-window")!);
        const result = {
          display,
          animatedWidth: animated.width,
          staticWidth: staticValue.width,
          animatedHeight: animated.height,
          staticHeight: staticValue.height,
          fontFamily: valueStyle.fontFamily === digitStyle.fontFamily,
          fontSize: valueStyle.fontSize === digitStyle.fontSize,
          fontWeight: valueStyle.fontWeight === digitStyle.fontWeight,
          lineHeight: valueStyle.lineHeight === digitStyle.lineHeight,
        };
        clone.remove();
        return result;
      }),
    );
    expect(financialGeometry).toHaveLength(4);
    financialGeometry.forEach((geometry) => {
      expect(Math.abs(geometry.animatedWidth - geometry.staticWidth), JSON.stringify(geometry)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(geometry.animatedHeight - geometry.staticHeight), JSON.stringify(geometry)).toBeLessThanOrEqual(1.5);
      expect(geometry.fontFamily && geometry.fontSize && geometry.fontWeight && geometry.lineHeight, JSON.stringify(geometry)).toBeTruthy();
    });
    const zeroValue = page.locator('[data-pd-id="extra-place.ledger"] .financial-value[aria-label="Financial value: £ -"]').first();
    await expect(zeroValue).toHaveAttribute("data-money-tone", "neutral");
    const zeroCycle = Number(await zeroValue.getAttribute("data-money-motion-cycle"));
    await zeroValue.click();
    await expect.poll(async () => Number(await zeroValue.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(zeroCycle);
    await expect(zeroValue.locator(".financial-value-placeholder-window")).toHaveCount(1);
    const reopenedDialog = page.getByRole("dialog", { name: "Edit Extra Place row" });
    if (await reopenedDialog.isVisible()) {
      await reopenedDialog.getByRole("button", { name: "Close Extra Place editor" }).click();
    }
    await expect(resolvedValue).toHaveAttribute("data-money-motion", "none");
    const settledCycle = await resolvedValue.getAttribute("data-money-motion-cycle");
    await page.getByRole("button", { name: "Use Back and Lay colour theme" }).click();
    await expect(resolvedValue).toHaveAttribute("data-money-motion-cycle", settledCycle ?? "0");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(resolvedValue).toHaveAttribute("data-money-motion", "none", { timeout: 2_000 });
    const reducedCycle = Number(await resolvedValue.getAttribute("data-money-motion-cycle"));
    await resolvedValue.click();
    await expect(resolvedValue).toHaveAttribute("data-money-motion-cycle", String(reducedCycle));
    await expect(resolvedValue.locator(".financial-value-digit-strip").first()).toHaveCSS("animation-name", "none");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/settings#site-settings");
    await page.getByRole("button", { name: "Financial motion" }).click();
    await expect(page.getByRole("button", { name: "Financial motion" })).toHaveAttribute("aria-pressed", "false");
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });
    const staticValue = page.locator('[data-pd-id="extra-place.ledger"] .stat-card .financial-value').first();
    const staticCycle = await staticValue.getAttribute("data-money-motion-cycle");
    await staticValue.hover();
    await staticValue.click();
    await expect(staticValue).toHaveAttribute("data-money-motion", "none");
    await expect(staticValue).toHaveAttribute("data-money-motion-cycle", staticCycle ?? "0");
  });

  test("uses the range card, grouped headers, theme switch and filter-owned detail-column controls", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });

    const ledger = page.locator('[data-pd-id="extra-place.ledger"]');
    await expect(ledger.locator('[data-pd-id="tracker.range-card"]')).toBeVisible();
    await expect(ledger.locator("th.extra-place-column-back").first()).toContainText("Bookmaker");
    await expect(ledger.locator("th.extra-place-column-back").first()).toHaveCSS("color", "rgb(20, 37, 51)");
    await expect(ledger.locator("th", { hasText: "Place Odds" })).toBeVisible();
    await expect(ledger.locator("th.extra-place-column-win-lay").first()).toContainText("Win Lay Odds");
    await expect(ledger.locator("th.extra-place-column-place-lay").first()).toContainText("Place Lay Odds");

    await expect(ledger.getByRole("button", { name: "Use Extra Place colour theme" }).locator(".material-symbols-outlined")).toContainText("chess_knight");
    await ledger.getByRole("button", { name: "Use Back and Lay colour theme" }).click();
    await expect(ledger).toHaveClass(/extra-place-theme-back-lay/);

    await ledger.getByRole("button", { name: "Open Extra Place filters" }).click();
    const filterDialog = page.getByRole("dialog", { name: "Extra Place filter controls" });
    await expect(filterDialog.getByRole("button", { name: "Clear Extra Place filters" })).toBeVisible();
    await filterDialog.getByRole("button", { name: "Hide Win Lay Odds" }).click();
    await filterDialog.getByRole("button", { name: "Done" }).click();
    await expect(ledger.locator("th", { hasText: "Date / time" })).toBeVisible();
    await expect(ledger.locator("th", { hasText: "Qual Loss" })).toBeVisible();
    await expect(ledger.locator("th", { hasText: "EP Profit" })).toBeVisible();
    await expect(ledger.locator("th", { hasText: "Win Lay Odds" })).toHaveCount(0);

    await expect(ledger.getByRole("button", { name: "Show detail columns" })).toHaveCount(0);
  });

  test("uses compact accessible qualifying-loss and weekly-budget stat details", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });

    const ledger = page.locator('[data-pd-id="extra-place.ledger"]');
    const qualifyingLoss = ledger.locator('[data-pd-id="extra-place.stat.qualifying-loss"]');
    const weeklyBudget = ledger.locator('[data-pd-id="extra-place.stat.weekly-loss-budget"]');

    await expect(qualifyingLoss).toHaveAttribute("aria-label", "Qualifying loss");
    await expect(qualifyingLoss.locator(".material-symbols-outlined")).toHaveText("trending_down");
    await expect(weeklyBudget).toHaveAttribute(
      "aria-label",
      "Weekly qualifying loss spend against weekly loss budget",
    );
    await expect(weeklyBudget.locator(".material-symbols-outlined")).toHaveText("savings");
    await expect(weeklyBudget).toContainText("/");
    await expect(ledger.getByText("Selected-range Extra Place P&L", { exact: true })).toHaveCount(0);

    const [qualifyingLossBox, weeklyBudgetBox] = await Promise.all([
      qualifyingLoss.boundingBox(),
      weeklyBudget.boundingBox(),
    ]);
    expect(qualifyingLossBox).not.toBeNull();
    expect(weeklyBudgetBox).not.toBeNull();
    expect(weeklyBudgetBox!.y).toBeGreaterThan(qualifyingLossBox!.y + 1);
  });

  test("uses a viewport-owned editor with visible footer controls", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });

    await page.getByRole("button", { name: "Add Extra Place row" }).click();

    const dialog = page.getByRole("dialog", { name: "Create Extra Place row" });
    const footer = dialog.locator('[data-pd-id="extra-place.editor.actions"]');
    const backdrop = page.locator(".modal-backdrop-extra-place");
    await expect(dialog).toBeVisible();
    await expect(footer).toBeVisible();

    const [viewport, backdropBox, dialogBox, footerBox] = await Promise.all([
      page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })),
      backdrop.boundingBox(),
      dialog.boundingBox(),
      footer.boundingBox(),
    ]);
    expect(backdropBox).not.toBeNull();
    expect(dialogBox).not.toBeNull();
    expect(footerBox).not.toBeNull();
    expect(Math.abs(backdropBox!.width - viewport.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(backdropBox!.height - viewport.height)).toBeLessThanOrEqual(2);
    expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(dialogBox!.y + dialogBox!.height + 2);
    expect(dialogBox!.y + dialogBox!.height - (footerBox!.y + footerBox!.height)).toBeLessThanOrEqual(32);

    await dialog.locator(".workflow-editor-body").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(footer).toBeVisible();
    await expect(footer.getByRole("button", { name: "Save" })).toBeVisible();
    await expect(footer.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(footer.getByRole("button", { name: "Next" })).toBeVisible();
  });

  test("honours report issue deep links", async ({ page }) => {
    await page.goto(`${route}?view=issues&issue=all-issues&source=reports`);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });
    await expect(page.getByLabel("2 active Extra Place filters")).toBeVisible();

    await page.getByRole("button", { name: "Open Extra Place filters" }).click();
    const dialog = page.getByRole("dialog", { name: "Extra Place filter controls" });
    await expect(dialog.getByLabel("View")).toHaveValue("issues");
    await expect(dialog.getByLabel("Issue type")).toHaveValue("all-issues");
  });

  test("uses two editor steps and only lets race parsing own an empty date", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });
    await page.getByRole("button", { name: "Add Extra Place row" }).click();

    const dialog = page.getByRole("dialog", { name: "Create Extra Place row" });
    await expect(dialog.getByRole("tab", { name: /Calculate & Place/ })).toBeVisible();
    await expect(dialog.getByRole("tab", { name: /Placement/ })).toHaveCount(0);

    const race = dialog.getByLabel("Race");
    const date = dialog.getByLabel("Date / Time");
    await race.fill("Sandtown 14:10");
    await expect(date).toHaveValue(/T14:10$/);
    await expect(dialog.getByRole("button", { name: "Today, 14:10" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Tomorrow, 14:10" })).toBeVisible();

    await date.fill("2026-08-30T12:00");
    await race.fill("Sandtown 15:10");
    await expect(date).toHaveValue("2026-08-30T12:00");
  });

  test("keeps an incomplete saved row visible outside the active range", async ({ page, request }) => {
    const runnerName = `Incomplete visibility runner ${Date.now()}`;
    const row = await createExtraPlaceRow(request, { runner: runnerName });
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });

    const tableRow = page.locator("tbody tr").filter({ hasText: runnerName }).last();
    await expect(tableRow).toBeVisible();
    await expect(tableRow).toContainText("Needs action");
    await expect(tableRow).toContainText("outside range");
    await tableRow.hover();
    await expect(tableRow.locator(".row-issue-overlay")).toContainText("Bookmaker needed");
    await expect(tableRow).toHaveClass(/row-state-issue-danger/);
    await expect(tableRow.locator(".row-issue-overlay .table-chip")).toHaveCount(5);
    await expect(tableRow.locator(".row-issue-overlay")).toContainText(/\d+\+ Issues/);
    await expect(tableRow.locator(".row-issue-overlay")).toHaveCSS("box-shadow", "none");
    const issueSurfaceOpacity = await tableRow.locator(".row-issue-overlay").evaluate((element) => {
      const color = getComputedStyle(element).backgroundColor;
      return Number.parseFloat(color.match(/\/ ([0-9.]+)\)$/)?.[1] ?? "1");
    });
    expect(issueSurfaceOpacity).toBeLessThan(0.2);
    const issueBlurFallback = await tableRow.locator(".row-issue-overlay").evaluate((element) =>
      getComputedStyle(element, "::before").filter,
    );
    expect(issueBlurFallback).toContain("blur");
    await deleteExtraPlaceRow(request, row.each_way_extra_place_id);
  });

  test("uses the purple result-due cue for an unsettled placed race after ten minutes", async ({ page, request }) => {
    const runnerName = `Result due runner ${Date.now()}`;
    const normalRunnerName = `Normal placed runner ${Date.now()}`;
    const row = await createExtraPlaceRow(request, {
      runner: runnerName,
      placed_at: new Date(Date.now() - 11 * 60_000).toISOString(),
      status: "Placed",
    });
    const normalRow = await createExtraPlaceRow(request, {
      runner: normalRunnerName,
      placed_at: new Date().toISOString(),
      status: "Placed",
    });
    try {
      await page.goto(route);
      await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });
      await page.evaluate(() => {
        document.documentElement.dataset.theme = "dark";
        document.documentElement.style.colorScheme = "dark";
      });
      const tableRow = page.locator("tbody tr").filter({ hasText: runnerName }).last();
      const normalTableRow = page.locator("tbody tr").filter({ hasText: normalRunnerName }).last();
      await expect(tableRow).toHaveClass(/extra-place-row-result-due/);
      await expect(tableRow.getByText("Result due", { exact: true })).toBeVisible();
      const baseBackground = await tableRow.evaluate((element) => getComputedStyle(element).backgroundColor);
      await tableRow.hover();
      await page.waitForTimeout(80);
      const hoverBackground = await tableRow.evaluate((element) => getComputedStyle(element).backgroundColor);
      await expect(tableRow.getByText("Result Needed", { exact: true })).toBeVisible();
      expect(hoverBackground).not.toBe(baseBackground);
      expect(rgbLuminance(hoverBackground)).toBeGreaterThan(rgbLuminance(baseBackground));
      await expect(tableRow.locator("td").first()).toHaveCSS(
        "box-shadow",
        /rgba?\(138, 73, 187(?:, 0\.72)?\)|rgba?\(216, 174, 255(?:, 0\.72)?\)/,
      );
      const [resultDueBox, normalBox] = await Promise.all([
        tableRow.boundingBox(),
        normalTableRow.boundingBox(),
      ]);
      expect(resultDueBox).not.toBeNull();
      expect(normalBox).not.toBeNull();
      expect(Math.abs(resultDueBox!.height - normalBox!.height)).toBeLessThanOrEqual(1);
    } finally {
      await deleteExtraPlaceRow(request, row.each_way_extra_place_id);
      await deleteExtraPlaceRow(request, normalRow.each_way_extra_place_id);
    }
  });

  test("uses faster, theme-aware normal and result-due row feedback", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });

    const styles = await page.evaluate(() => {
      const tableBody = document.querySelector<HTMLTableSectionElement>(
        ".extra-place-data-table tbody",
      );
      if (!tableBody) throw new Error("Expected Extra Place table body");

      const toResolvedColor = (value: string) => {
        const probe = document.createElement("span");
        probe.style.color = value;
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      };
      const capture = (theme: "light" | "dark") => {
        document.documentElement.dataset.theme = theme;
        const normal = document.createElement("tr");
        const resultDue = document.createElement("tr");
        resultDue.className = "extra-place-row-result-due";
        normal.innerHTML = "<td>Normal row</td>";
        resultDue.innerHTML = "<td>Result-due row</td>";
        tableBody.append(normal, resultDue);
        const root = getComputedStyle(document.documentElement);
        const values = {
          surface: toResolvedColor(root.getPropertyValue("--surface-strong").trim()),
          normal: toResolvedColor(getComputedStyle(normal).backgroundColor),
          due: toResolvedColor(getComputedStyle(resultDue).backgroundColor),
          transition: getComputedStyle(normal).transitionDuration,
        };
        normal.remove();
        resultDue.remove();
        return values;
      };

      const initialTheme = document.documentElement.dataset.theme;
      const light = capture("light");
      const dark = capture("dark");
      if (initialTheme) document.documentElement.dataset.theme = initialTheme;
      else delete document.documentElement.dataset.theme;
      return { light, dark };
    });

    expect(rgbLuminance(styles.light.normal)).toBeLessThan(rgbLuminance(styles.light.surface));
    expect(rgbLuminance(styles.light.due)).toBeLessThan(rgbLuminance(styles.light.normal));
    expect(Number.parseFloat(styles.light.transition)).toBeLessThanOrEqual(0.06);
    expect(rgbLuminance(styles.dark.normal)).toBeGreaterThan(rgbLuminance(styles.dark.surface));
    expect(rgbLuminance(styles.dark.due)).toBeGreaterThan(rgbLuminance(styles.dark.normal));

    const { baseColour, hoverColour } = await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
      const probe = document.createElement("div");
      const base = document.createElement("span");
      const hover = document.createElement("span");
      base.style.background = "var(--extra-place-result-due-surface)";
      hover.style.background = "var(--extra-place-result-due-hover-surface)";
      probe.append(base, hover);
      document.body.append(probe);
      const values = {
        baseColour: getComputedStyle(base).backgroundColor,
        hoverColour: getComputedStyle(hover).backgroundColor,
      };
      probe.remove();
      return values;
    });
    expect(rgbLuminance(baseColour)).toBeLessThan(65);
    expect(rgbLuminance(hoverColour)).toBeGreaterThan(rgbLuminance(baseColour));
    expect(rgbLuminance(hoverColour) - rgbLuminance(baseColour)).toBeGreaterThan(15);

    const transitionDuration = await page.evaluate(() => {
      document.documentElement.classList.add("theme-switching");
      const row = document.querySelector(".extra-place-data-table tbody tr");
      const duration = row ? getComputedStyle(row).transitionDuration : "";
      document.documentElement.classList.remove("theme-switching");
      return duration;
    });
    expect(transitionDuration).toBe("0s");
  });

  test("opens Extra Place-specific filter controls", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });

    await page.getByRole("button", { name: "Open Extra Place filters" }).click();
    const dialog = page.getByRole("dialog", { name: "Extra Place filter controls" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Bet type", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Bookmaker", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Status", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Result", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Issue type", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Visible columns", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Hide Win Lay Odds" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Done" })).toBeVisible();
  });

  test("keeps the Extra Place theme readable in dark mode and makes the calculation mode state explicit", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });
    await page.evaluate(() => document.documentElement.dataset.theme = "dark");

    const themedHeader = page.locator("th.extra-place-column-back").first();
    const neutralHeader = page.locator("th", { hasText: "Date / time" }).first();
    await expect(themedHeader).toHaveCSS("background-color", "rgb(125, 170, 232)");
    await expect(themedHeader).toHaveCSS("color", "rgb(20, 37, 51)");
    await expect(page.locator("th.extra-place-column-win-lay").first()).toHaveCSS(
      "background-color",
      "rgb(225, 132, 148)",
    );
    await expect(page.locator("th.extra-place-column-place-lay").first()).toHaveCSS(
      "background-color",
      "rgb(225, 142, 132)",
    );
    await expect(neutralHeader).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(neutralHeader).toHaveCSS("background-color", "rgb(45, 58, 71)");

    await page.getByRole("button", { name: "Add Extra Place row" }).click();
    const dialog = page.getByRole("dialog", { name: "Create Extra Place row" });
    const extraPlace = dialog.getByRole("button", { name: "Extra Place", exact: true });
    const eachWay = dialog.getByRole("button", { name: "Each Way", exact: true });
    await expect(extraPlace).toHaveAttribute("aria-pressed", "true");
    await eachWay.click();
    await expect(eachWay).toHaveAttribute("aria-pressed", "true");
    await expect(extraPlace).toHaveAttribute("aria-pressed", "false");
    await expect
      .poll(() =>
        dialog.locator(".extra-place-bet-type-toggle").evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).borderTopLeftRadius),
        ),
      )
      .toBeGreaterThan(30);
    await expect(dialog.locator(".extra-place-term-input > span")).toHaveCSS("color", "rgb(14, 23, 32)");
    await expect(dialog.locator(".calculator-segment-back h3")).toHaveCSS("color", "rgb(14, 23, 32)");
    await expect(dialog.locator(".extra-place-place-terms-title")).toHaveCSS("color", "rgb(14, 23, 32)");

    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Use Back and Lay colour theme" }).click();
    await page.getByRole("button", { name: "Add Extra Place row" }).click();
    const backLayDialog = page.getByRole("dialog", { name: "Create Extra Place row" });
    await expect(backLayDialog.locator(".calculator-segment-back h3")).toHaveCSS("color", "rgb(231, 237, 244)");
    await expect(backLayDialog.locator(".extra-place-place-terms-title")).toHaveCSS("color", "rgb(231, 237, 244)");
    await expect(backLayDialog.locator(".extra-place-term-input > span")).toHaveCSS("color", "rgb(231, 237, 244)");

    await backLayDialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Use Extra Place colour theme" }).click();
    await page.getByRole("button", { name: "Add Extra Place row" }).click();
    const epDialog = page.getByRole("dialog", { name: "Create Extra Place row" });
    await expect(epDialog.locator(".extra-place-race-details .field-control > span").first()).toHaveCSS(
      "color",
      "rgb(231, 237, 244)",
    );
  });

  test("keeps calculation and settlement choices in local Extra Place controls", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });
    await page.getByRole("button", { name: "Add Extra Place row" }).click();

    const dialog = page.getByRole("dialog", { name: "Create Extra Place row" });
    await expect(dialog.getByLabel("Each-way term denominator")).toHaveValue("5");
    await dialog.getByRole("button", { name: "1/4" }).click();
    await expect(dialog.getByLabel("Each-way term denominator")).toHaveValue("4");
    await expect(dialog.getByText("Total bookmaker stake:")).toBeVisible();
    const calculatePanel = dialog.locator('[data-pd-id="ledger-editor.panel.calculate"]');
    await expect(calculatePanel.getByText("Outcomes", { exact: true })).toBeVisible();
    await expect(calculatePanel.getByText("Qualifying Loss", { exact: false })).toBeVisible();

    await dialog.getByLabel("E/W Stake (each way)").fill("5");
    await dialog.getByLabel("Back Odds").fill("6");
    await dialog.locator(".extra-place-lay-win select").selectOption("Smarkets");
    await dialog.getByLabel("Lay Odds").first().fill("2.3");
    await dialog.locator(".extra-place-lay-place select").selectOption("Smarkets");
    await dialog.getByLabel("Lay Odds").nth(1).fill("4.5");
    await dialog.getByLabel("BookmakerSelect").selectOption("Betfred");
    await expect(calculatePanel.locator(".extra-place-matrix-value-negative").first()).toBeVisible();
    await expect(dialog.getByText(/^Rating \d+\.\d+%$/)).toBeVisible();
    await expect(dialog.getByText(/^Implied odds \d+\.\d+$/)).toBeVisible();
    await dialog.getByLabel("Runner / Horse").fill("Test Runner");
    await dialog.getByLabel("Race").fill("Test Race 14:10");
    await dialog.getByLabel("Date / Time").fill("2026-08-24T12:00");
    const settlementPanel = dialog.locator('[data-pd-id="ledger-editor.panel.settlement"]');
    await expect(settlementPanel.locator(".extra-place-quick-choice-row")).toHaveCount(3);
    await expect(settlementPanel.getByText("Advanced", { exact: true })).toHaveCount(1);
    await expect(settlementPanel.locator(".tracker-nav.field-choice-pills")).toHaveCount(0);

    await dialog.getByRole("tab", { name: /Settlement/ }).click();
    const finishingPosition = dialog.getByLabel("Finishing Position");
    await dialog.getByRole("button", { name: "2nd", exact: true }).click();
    await expect(finishingPosition).toHaveValue("2nd");
    await expect(dialog.getByLabel("Status")).toHaveValue("Settled");
    await expect(dialog.getByLabel("Result")).toHaveValue("Standard Place");
    await expect(dialog.getByRole("button", { name: "2nd", exact: true })).toHaveAttribute("aria-pressed", "true");

    await finishingPosition.fill("3");
    await expect(finishingPosition).toHaveValue("3rd");
    await expect(dialog.getByRole("button", { name: "3rd", exact: true })).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: "Win", exact: true }).click();
    await expect(finishingPosition).toHaveValue("1st");
    await expect(dialog.getByRole("button", { name: "1st", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("parses supported Smarkets and MBB runner copy blocks without overwriting a manual date", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });
    await page.getByRole("button", { name: "Add Extra Place row" }).click();
    const dialog = page.getByRole("dialog", { name: "Create Extra Place row" });
    const runner = dialog.getByLabel("Runner / Horse");
    const race = dialog.getByLabel("Race");
    const date = dialog.getByLabel("Date / Time");

    await runner.evaluate((element, copiedText) => {
      const data = new DataTransfer();
      data.setData("text/plain", copiedText);
      element.dispatchEvent(
        new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: data,
        }),
      );
    }, "14:45 - Catterick\n\nTo win\n\nRoyale Union");
    await expect(runner).toHaveValue("Royale Union");
    await expect(race).toHaveValue("Catterick 14:45");

    await date.fill("2026-08-30T12:00");
    await race.evaluate((element, copiedText) => {
      const data = new DataTransfer();
      data.setData("text/plain", copiedText);
      element.dispatchEvent(
        new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: data,
        }),
      );
    }, "14:45 Catterick\n\nCatterick\n\nRoyale Union\n\nWinner");
    await expect(runner).toHaveValue("Royale Union");
    await expect(race).toHaveValue("Catterick 14:45");
    await expect(date).toHaveValue("2026-08-30T12:00");
  });

  test("derives Extra Place settlement choices from paid-place counts", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });
    await page.getByRole("button", { name: "Add Extra Place row" }).click();

    const dialog = page.getByRole("dialog", { name: "Create Extra Place row" });
    await dialog.getByLabel("Bookmaker Pays").fill("6");
    await dialog.getByLabel("Exchange Pays").fill("4");
    await expect(dialog.getByText("Paying 6 instead of 4.")).toBeVisible();

    await dialog.getByRole("tab", { name: /Settlement/ }).click();
    const finishingPosition = dialog.getByLabel("Finishing Position");
    await dialog.getByRole("button", { name: "6th", exact: true }).click();
    await expect(finishingPosition).toHaveValue("6th");
    await expect(dialog.getByLabel("Result")).toHaveValue("Extra Place");

    await dialog.getByRole("button", { name: "7+", exact: true }).click();
    await expect(finishingPosition).toHaveValue("7+");
    await expect(dialog.getByLabel("Result")).toHaveValue("Unplaced");
    await expect(dialog.locator(".extra-place-outcome-unplaced").first()).toHaveCSS(
      "background-color",
      "rgb(255, 240, 239)",
    );
  });

  test("anchors visible table scroll controls to the visible viewport and uses opaque surfaces", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });
    const rightArrow = page.locator('[data-pd-id="extra-place.table-scroll.scroll-right"]');

    await expect(rightArrow).toBeAttached();
    await expect(rightArrow).toHaveCSS("opacity", "1");
    await expect(rightArrow).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(rightArrow).not.toHaveCSS("box-shadow", "none");
    await expect(rightArrow).toHaveCSS("border-top-style", "solid");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const [arrowBox, tableBox, viewport] = await Promise.all([
      rightArrow.boundingBox(),
      page.locator('[data-pd-id="extra-place.table-scroll"]').boundingBox(),
      page.evaluate(() => ({ height: window.innerHeight })),
    ]);
    expect(arrowBox).not.toBeNull();
    expect(tableBox).not.toBeNull();
    const visibleTop = Math.max(8, tableBox!.y + 8);
    const visibleBottom = Math.min(viewport.height - 8, tableBox!.y + tableBox!.height - 8);
    expect(arrowBox!.y + arrowBox!.height / 2).toBeGreaterThanOrEqual(visibleTop - 1);
    expect(arrowBox!.y + arrowBox!.height / 2).toBeLessThanOrEqual(visibleBottom + 1);
  });

  test("paginates Extra Place rows with the standard ledger controls", async ({ page, request }) => {
    const created = await Promise.all(
      Array.from({ length: 9 }, (_, index) =>
        createExtraPlaceRow(request, {
          runner: `Pagination runner ${Date.now()}-${index}`,
          race: "Demo Race 14:10",
          placed_at: "2026-07-15T14:10:00",
          bookmaker: "Betfred",
          each_way_stake: "5",
          back_odds: "6",
          win_exchange: "Smarkets",
          win_lay_odds: "2.3",
          place_exchange: "Smarkets",
          place_lay_odds: "4.5",
          status: "Placed",
        }),
      ),
    );
    try {
      await page.goto(route);
      await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });
      const topPagination = page.locator(
        '[data-pd-id="extra-place-pagination.pagination.top"]',
      );
      const bottomPagination = page.locator(
        '[data-pd-id="extra-place-pagination.pagination.bottom"]',
      );
      await expect(topPagination).toContainText(/Page 1 of [2-9]/);
      await expect(bottomPagination).toContainText(/Page 1 of [2-9]/);
      await expect(topPagination.getByRole("button", { name: "Next" })).toBeEnabled();
      await topPagination.getByRole("button", { name: "Next" }).click();
      await expect(topPagination).toContainText(/Page 2 of [2-9]/);
      await expect(bottomPagination).toContainText(/Page 2 of [2-9]/);
      await expect(bottomPagination.getByRole("button", { name: "Previous" })).toBeEnabled();
      const pageCountBeforePageSizeChange = Number(
        (await topPagination.textContent())?.match(/Page 2 of (\d+)/)?.[1],
      );
      await topPagination.getByLabel("Extra Place pagination rows per page").selectOption("16");
      await expect(topPagination).toContainText(/Page 1 of \d+/);
      const pageCountAfterPageSizeChange = Number(
        (await topPagination.textContent())?.match(/Page 1 of (\d+)/)?.[1],
      );
      expect(pageCountAfterPageSizeChange).toBeLessThan(pageCountBeforePageSizeChange);
      await expect(bottomPagination.getByLabel("Extra Place pagination rows per page")).toHaveValue("16");
      const rowsPerPagePadding = await topPagination
        .getByLabel("Extra Place pagination rows per page")
        .evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingRight));
      expect(rowsPerPagePadding).toBeGreaterThan(32);
    } finally {
      await Promise.all(created.map((row) => deleteExtraPlaceRow(request, row.each_way_extra_place_id)));
    }
  });

  test("keeps operational table controls available for Extra Place rows", async ({ page, request }) => {
    const row = await createExtraPlaceRow(request, {
      runner: `Action menu runner ${Date.now()}`,
      bookmaker: "Betfred",
      each_way_stake: "5",
      back_odds: "6",
      win_exchange: "Smarkets",
      win_lay_odds: "2.3",
      place_exchange: "Smarkets",
      place_lay_odds: "4.5",
    });
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });
    const ledger = page.locator('[data-pd-id="extra-place.ledger"]');

    await expect(ledger.getByText("Qual Loss", { exact: true }).first()).toBeVisible();
    await expect(ledger.locator("th", { hasText: "Status" })).toBeVisible();
    await expect(page.locator('[data-pd-id="extra-place.table-scroll.scroll-right"]')).toBeAttached();
    await expect(ledger.locator(".table-column-resize-handle").first()).toBeVisible();

    await ledger.locator(".table-scroll").evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    const flag = ledger.locator('button[aria-label^="Update result for"]').first();
    await flag.scrollIntoViewIfNeeded();
    await flag.click({ force: true });
    await expect(page.locator(".extra-place-result-menu")).toBeVisible();
    await deleteExtraPlaceRow(request, row.each_way_extra_place_id);
  });

  test("uses the shared bookmaker badge and fully rounded neutral EP Profit treatment", async ({ page, request }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });
    const ledger = page.locator('[data-pd-id="extra-place.ledger"]');

    await page.getByRole("button", { name: "Add Extra Place row" }).click();
    const quickAddDialog = page.getByRole("dialog", { name: "Create Extra Place row" });
    const modalBetfred = quickAddDialog
      .locator('[data-pd-id="ledger-editor.panel.calculate"]')
      .locator(".extra-place-bookmaker-chip", { hasText: "Betfred" });
    await expect(modalBetfred).toHaveCSS("background-color", "rgb(179, 38, 30)");
    await expect(modalBetfred).toHaveCSS("color", "rgb(255, 255, 255)");
    await quickAddDialog.getByRole("button", { name: "Close", exact: true }).click();
    const row = await createExtraPlaceRow(request, {
      runner: `Branded badge runner ${Date.now()}`,
      bookmaker: "Betfred",
    });
    await page.reload();
    const ledgerBetfred = ledger.locator(".bookmaker-identity-badge", { hasText: "Betfred" }).last();
    await expect(ledgerBetfred).toBeVisible();
    await expect(ledgerBetfred).toHaveCSS("background-color", "rgb(179, 38, 30)");
    await expect
      .poll(() =>
        ledger.locator(".extra-place-profit-value, .extra-place-profit-neutral").first().evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).borderTopLeftRadius),
        ),
      )
      .toBeGreaterThan(30);
    await deleteExtraPlaceRow(request, row.each_way_extra_place_id);
  });

  test("uses a neutral rating pill when calculation inputs are incomplete", async ({ page, request }) => {
    const runnerName = `Neutral rating runner ${Date.now()}`;
    const saved = await createExtraPlaceRow(request, { runner: runnerName });
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });

    const row = page.locator("tbody tr").filter({ hasText: runnerName }).last();
    await expect(row.locator(".extra-place-rating-pill-neutral")).toContainText("Rating —");
    await deleteExtraPlaceRow(request, saved.each_way_extra_place_id);
  });
});
