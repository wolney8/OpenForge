import { expect, test, type APIRequestContext } from "@playwright/test";

test("shared Report help containment preserves calculator help and header controls", async ({ page }, info) => {
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Explicit isolated/Preview acceptance only");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/fund-manager/calculators");
  await page.getByLabel("Back stake", { exact: true }).fill("10");
  await page.getByLabel("Back odds", { exact: true }).fill("3");
  await page.getByLabel("Lay odds", { exact: true }).fill("3.1");
  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  for (const width of [1440, 760, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const help = page.getByRole("button", { name: "About Underlay", exact: true });
    await help.focus(); await help.press("Enter");
    await expect(help).toHaveAttribute("aria-expanded", "true");
    const tooltip = page.locator("#" + await help.getAttribute("aria-describedby"));
    const bounds = await tooltip.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await help.press("Escape"); await help.press("Tab");
    await expect(page.getByText("Tracker platform", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath("shared-help-" + width + ".png") });
  }
  expect(errors).toEqual([]);
});

test("period P&L reconciles source records and retains selected scope, week and point", async ({ page }, info) => {
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Explicit isolated/Preview acceptance only");
  test.setTimeout(300_000);
  const health = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
  expect(["test", "preview", "candidate"]).toContain(health.runtime_role);
  if (health.runtime_role === "preview") expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
  if (health.runtime_role === "candidate") expect(health.database_identity).toBe("cp058-owner-review-synthetic");
  expect((await page.request.get("/api/auth/session")).status()).toBe(200);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  let reads = 0;
  page.on("request", (request) => { if (request.method() === "GET" && request.url().includes("/api/")) reads++; });
  const ids: string[] = [];
  const suffix = Date.now().toString();
  const create = async (label: string) => {
    const response = await page.request.post("/api/profiles/onboarding", { data: {
      accounts: [], display_name: "Synthetic CP038 " + label + " " + suffix, profile_code: "C38-" + ids.length + "-" + suffix,
      enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments"], quick_actions: [],
      setup_path: "import", profile_relationship: "Personal", management_fee_percent: "0", investment_fee_percent: "0", tracking_start_date: "2026-09-01",
    }});
    expect(response.status(), await response.text()).toBe(201);
    const id = (await response.json()).profile.profile_id as string; ids.push(id);
    expect((await page.request.patch("/api/profiles/" + id, { data: { status: "Active" } })).ok()).toBeTruthy();
    for (const [account, type] of [["Bet365", "Bookie"], ["Smarkets", "Exchange"]]) {
      expect((await page.request.post("/api/profiles/" + id + "/accounts", { data: {
        account, type, status: "Active", lifecycle_status: "Active", channel: "Online",
        stake_access: "Normal", promo_access: "Full", restrictions: [], ...(type === "Exchange" ? { commission_rate: "0.02" } : {}),
      }})).status()).toBe(201);
    }
    return id;
  };
  const add = async (profile: string, label: string, amount: string, day: string) => {
    const response = await page.request.post("/api/profiles/" + profile + "/sportsbook-bets", { data: {
      date_settled: day + "T12:00", status: "Settled", result: "Back Won",
      event_name: "Synthetic CP038 " + label, bookmaker: "Bet365", offer_type: "Bet & Get",
      bet_type: "Single", fixture_type: "Football", match_strategy: "Standard",
      back_stake: "10.00", back_odds: "2.10", lay_odds_1: "2.20", lay_actual: "9.54",
      lay_matched_stake_1: "9.54", lay_commission_1: "0.02", exchange_name: "Smarkets",
      manual_override_value: amount, manual_override_reason: "Independent synthetic period oracle",
    }});
    expect(response.status()).toBe(201);
    return response.json();
  };
  const persisted = async (request: APIRequestContext, profile: string) => {
    const paths = ["sportsbook-bets", "cash-adjustments"];
    return Promise.all(paths.map(async (path) => (await request.get("/api/profiles/" + profile + "/" + path)).json()));
  };
  try {
    const a = await create("A"), b = await create("B"), c = await create("Archived");
    const corrected = await add(a, "corrected six to five", "6.00", "2026-09-21");
    const correctedPath = "/api/profiles/" + a + "/sportsbook-bets/" + corrected.sportsbook_bet_id;
    const correction = await page.request.put(correctedPath, { data: { ...corrected,
      manual_override_value: "5.00", manual_override_reason: "Independent correction six to five" } });
    expect(correction.status()).toBe(200);
    expect((await correction.json()).reporting_value).toBe("5.00");
    await add(a, "previous boundary", "40.00", "2026-09-20");
    await add(a, "following boundary", "80.00", "2026-09-28");
    await add(b, "separate Profile loss", "-3.00", "2026-09-24");
    await add(c, "retained archived profit", "7.00", "2026-09-24");
    expect((await page.request.patch("/api/profiles/" + c, { data: { status: "Archived" } })).ok()).toBeTruthy();
    for (const [kind, direction, amount] of [["TopUp", "In", "200.00"], ["Deposit", "In", "100.00"],
      ["Deduction", "Out", "2.00"], ["Withdrawal", "Out", "3.00"]]) {
      expect((await page.request.post("/api/profiles/" + a + "/cash-adjustments", { data: {
        adjustment_date: "2026-09-24T12:00", direction, amount, adjustment_type: kind,
        affects_investment: false, affects_cash_snapshot: false, linked_account: "", description: "Synthetic CP038 " + kind,
      }})).status()).toBe(201);
    }
    const before = await persisted(page.request, a);
    const historyPath = "/api/profiles/" + a + "/financial-history/sportsbook/" + corrected.sportsbook_bet_id;
    const historyBefore = await (await page.request.get(historyPath)).json();
    expect(historyBefore.length).toBe(2);
    await page.goto("/profiles/" + a + "/tracker/reports");
    const preset = page.locator('[data-pd-id="reports.period-pnl"]');
    await expect(preset).toBeVisible({ timeout: 90_000 });
    const total = preset.locator('[data-pd-id="reports.period-pnl.total"] .financial-value');
    const retained = preset.locator('[data-pd-id="reports.period-pnl.retained"] .financial-value');
    const week = preset.getByLabel("P&L week containing");
    await expect(total).toHaveAttribute("aria-label", "£ 125.00");
    await week.fill("2026-09-24");
    await expect(week).toHaveValue("2026-09-21");
    await expect(total).toHaveAttribute("aria-label", "£ 5.00");
    await expect(retained).toHaveAttribute("aria-label", "£ -");
    const records = preset.locator('[data-pd-id="reports.period-pnl.records"]');
    await expect(records.locator("tbody > tr")).toHaveCount(3);
    await expect(records).not.toContainText("TopUp");
    await expect(records.getByRole("link")).toHaveCount(3);
    await records.getByRole("link").filter({ hasText: "corrected six to five" }).click();
    await expect(page).toHaveURL(/sportsbook-bets\?search=.*source=report-point/);
    await expect(page.getByRole("heading", { name: "Sportsbook Bets", exact: true })).toBeVisible();
    await page.goBack();
    await expect(week).toHaveValue("2026-09-21", { timeout: 60_000 });
    await expect(total).toHaveAttribute("aria-label", "£ 5.00");
    await page.reload();
    await expect(total).toHaveAttribute("aria-label", "£ 5.00", { timeout: 60_000 });
    await week.fill("2026-10-19");
    await expect(preset.getByRole("status")).toHaveText("No report records match this period and result filter.");
    await expect(preset.locator('[data-pd-id^="reports.period-pnl.period."]')).toHaveCount(0);
    await week.fill("");
    await expect(preset.locator('[data-pd-id^="reports.period-pnl.period."]')).toHaveCount(3);
    await preset.getByRole("button", { name: "Inspect Records" }).nth(1).click();
    await expect(records).toContainText("corrected six to five");
    await page.reload();
    await expect(records).toContainText("corrected six to five", { timeout: 60_000 });
    // Existing Profile picker remains the authority; no foreign IDs or hidden archived default.
    await page.goto("/reports");
    await expect(preset).toBeVisible({ timeout: 90_000 });
    const picker = page.locator(".profile-report-picker");
    await expect(picker.locator("summary")).toContainText(/\d+ Active Profiles?/);
    await expect(picker.locator("summary")).not.toContainText("Synthetic CP038 A " + suffix);
    await picker.locator("summary").click();
    await picker.getByLabel("Report Profile scope").selectOption("custom");
    await picker.getByLabel("Search Report Profiles").fill(suffix);
    await picker.getByRole("button", { name: "Use Matching Profiles" }).click();
    await expect(picker.getByRole("checkbox").filter({ visible: true })).toHaveCount(3);
    const archivedBox = picker.locator("label").filter({ hasText: "Synthetic CP038 Archived " + suffix }).getByRole("checkbox");
    await expect(archivedBox).toBeChecked();
    const aBox = picker.locator("label").filter({ hasText: "Synthetic CP038 A " + suffix }).getByRole("checkbox");
    const bBox = picker.locator("label").filter({ hasText: "Synthetic CP038 B " + suffix }).getByRole("checkbox");
    await expect(aBox).toBeChecked(); await expect(bBox).toBeChecked(); await archivedBox.uncheck();
    await picker.locator("summary").click();
    await week.fill("2026-09-21");
    await expect(total).toHaveAttribute("aria-label", "£ 2.00", { timeout: 60_000 });
    await expect(records.locator("tbody > tr")).toHaveCount(4);
    await picker.locator("summary").click(); await archivedBox.check(); await picker.locator("summary").click();
    await expect(total).toHaveAttribute("aria-label", "£ 9.00", { timeout: 60_000 });
    await page.reload();
    await expect(total).toHaveAttribute("aria-label", "£ 9.00", { timeout: 60_000 });
    await records.getByRole("link").filter({ hasText: "retained archived profit" }).click();
    await expect(page).toHaveURL(new RegExp("/profiles/" + c + "/tracker/sportsbook-bets"));
    await page.goBack(); await expect(total).toHaveAttribute("aria-label", "£ 9.00", { timeout: 60_000 });
    await preset.getByLabel("P&L results").selectOption("negative-pnl");
    await expect(preset.getByRole("status")).toBeVisible();
    await preset.getByLabel("P&L results").selectOption("all");
    await week.fill("2026-09-14"); await week.fill("2026-09-28"); await week.fill("2026-09-21");
    await expect(total).toHaveAttribute("aria-label", "£ 9.00");
    for (const [width, theme, textSize] of [[1440, "dark", 100], [760, "light", 100], [390, "dark", 100], [760, "light", 200]] as const) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(({ theme, textSize }) => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.fontSize = textSize + "%";
      }, { theme, textSize });
      await page.emulateMedia({ reducedMotion: theme === "dark" ? "no-preference" : "reduce" });
      await preset.scrollIntoViewIfNeeded();
      const help = preset.getByRole("button", { name: "About period P&L" });
      await help.focus(); await help.press("Enter");
      await expect(help).toHaveAttribute("aria-expanded", "true");
      const helpBounds = await preset.getByRole("tooltip").boundingBox();
      expect(helpBounds!.x).toBeGreaterThanOrEqual(0);
      expect(helpBounds!.x + helpBounds!.width).toBeLessThanOrEqual(width);
      await help.press("Escape");
      await help.press("Tab"); await page.mouse.move(0, 0);
      const heading = await preset.locator(".formal-report-section-heading").boundingBox();
      const controlHeights = await preset.locator(".m3-picker-field").evaluateAll((fields) => fields.map((field) => field.getBoundingClientRect().height));
      expect(controlHeights.every((height) => height < 100 * textSize / 100)).toBe(true);
      expect(heading!.height).toBeLessThan(350 * textSize / 100);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await expect(week).toBeVisible();
      await expect(page.getByText("Tracker platform", { exact: true })).toHaveCount(0);
      const navigation = await page.getByRole("button", { name: "Open navigation drawer" }).boundingBox();
      expect(navigation!.width).toBeGreaterThanOrEqual(44);
      expect(navigation!.height).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: info.outputPath("period-pnl-" + width + "-" + theme + "-" + textSize + ".png") });
    }
    const settledReads = reads;
    await page.waitForTimeout(1200);
    expect(reads - settledReads).toBeLessThanOrEqual(1);
    expect(await persisted(page.request, a)).toEqual(before);
    expect(await (await page.request.get(historyPath)).json()).toEqual(historyBefore);
    expect(errors).toEqual([]);
    await info.attach("runtime-and-oracle", { body: JSON.stringify({
      runtime: health, expected: { single: 5, combined: 2, withArchived: 9, fundingExcluded: 300 },
      historyEvents: historyBefore.length, apiReads: reads, browserErrors: errors,
    }, null, 2), contentType: "application/json" });
  } finally {
    for (const id of ids) {
      const current = await (await page.request.get("/api/profiles/" + id)).json();
      if (current.status !== "Archived") {
        const archived = await page.request.patch("/api/profiles/" + id, { data: { status: "Archived" } });
        expect(archived.ok(), await archived.text()).toBeTruthy();
      }
    }
  }
});
