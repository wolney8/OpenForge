import { expect, test, type Page } from "@playwright/test";

async function ensureHostedRouteReady(page: Page, heading: string) {
  const target = page.getByRole("heading", { name: heading, exact: true }).first();
  try {
    await target.waitFor({ state: "visible", timeout: 30_000 });
  } catch (error) {
    const recovery = page.getByRole("heading", { name: "Unable to continue", exact: true });
    if (!(await recovery.isVisible())) throw error;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await target.waitFor({ state: "visible", timeout: 90_000 });
  }
}

test("authenticated Preview Reports settles without a React update loop", async ({ page }) => {
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Explicit hosted gate only");
  const diagnostics: string[] = [];
  const responses: Array<{ path: string; status: number }> = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) diagnostics.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => diagnostics.push(`pageerror: ${error.message}\n${error.stack ?? ""}`));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.pathname.includes("/profiles/profile-demo-001/")) {
      responses.push({ path: url.pathname, status: response.status() });
    }
  });

  const response = await page.goto("/profiles/profile-demo-001/tracker/reports", {
    waitUntil: "domcontentloaded", timeout: 90_000,
  });
  expect(response?.status()).toBeLessThan(400);
  await ensureHostedRouteReady(page, "Reports");
  await expect(page.getByText("Loading tracker summaries", { exact: true })).toBeHidden({
    timeout: 150_000,
  });
  await page.waitForTimeout(2_000);
  console.log(`CP030_REPORTS_DIAGNOSTICS=${JSON.stringify(diagnostics)}`);
  console.log(`CP030_REPORTS_RESPONSES=${JSON.stringify(responses)}`);

  expect(diagnostics.filter((entry) => /maximum update depth|react error #185/i.test(entry))).toEqual([]);
});

test("authenticated Preview preserves a £6 to £5 Cash Adjustment correction once", async ({ page }) => {
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Explicit hosted gate only");
  test.setTimeout(600_000);
  const suffix = `${Date.now()}`;
  const createdProfileResponse = await page.request.post("/api/profiles/onboarding", { data: {
    accounts: [],
    display_name: `Synthetic CP030 Reports ${suffix}`,
    enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments"],
    profile_code: `CP30-${suffix}`,
    quick_actions: [],
    setup_path: "import",
    tracking_start_date: "2026-09-22",
  }});
  expect(createdProfileResponse.status()).toBe(201);
  const createdProfile = await createdProfileResponse.json() as { profile: { profile_id: string } };
  const profileId = createdProfile.profile.profile_id;
  expect((await page.request.patch(`/api/profiles/${profileId}`, {
    data: { status: "Active" },
  })).ok()).toBeTruthy();

  const description = `Synthetic CP030 original £6 ${suffix}`;
  const correctedDescription = `Synthetic CP030 corrected to £5 ${suffix}`;
  const createPayload = {
    adjustment_date: "2026-09-22T12:00",
    direction: "In",
    amount: "6.00",
    adjustment_type: "TopUp",
    affects_investment: true,
    affects_cash_snapshot: true,
    linked_account: "",
    description,
  };
  const createdAdjustmentResponse = await page.request.post(
    `/api/profiles/${profileId}/cash-adjustments`,
    {
      data: createPayload,
      headers: { "Idempotency-Key": `cp030-create-${suffix}` },
    },
  );
  expect(createdAdjustmentResponse.status()).toBe(201);
  const created = await createdAdjustmentResponse.json() as {
    cash_adjustment_id: string; signed_amount: string;
  };
  expect(created.signed_amount).toBe("6.00");
  const adjustmentId = created.cash_adjustment_id;

  await page.goto(`/profiles/${profileId}/tracker/cash-adjustments`);
  await ensureHostedRouteReady(page, "Cash Adjustments");
  await expect(page.getByText("Loading cash-adjustment ledger")).toBeHidden({ timeout: 90_000 });
  await page.getByLabel("Search cash-adjustment rows").fill(adjustmentId);
  await page.getByRole("row", { name: new RegExp(adjustmentId) }).dblclick();
  const editDialog = page.getByRole("dialog", { name: "Edit cash adjustment" });
  await expect(editDialog.getByLabel("Amount", { exact: true })).toHaveValue("6.00");
  await editDialog.getByRole("button", { name: "Close cash-adjustment editor" }).click();
  await expect(editDialog).toHaveCount(0);

  const correctionKey = `cp030-correct-${suffix}`;
  const correctionPayload = { ...createPayload, amount: "5.00", description: correctedDescription };
  const correction = await page.request.put(
    `/api/profiles/${profileId}/cash-adjustments/${adjustmentId}`,
    { data: correctionPayload, headers: { "Idempotency-Key": correctionKey } },
  );
  expect(correction.status()).toBe(200);

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureHostedRouteReady(page, "Cash Adjustments");
  await expect(page.getByText("Loading cash-adjustment ledger")).toBeHidden({ timeout: 90_000 });
  await page.getByLabel("Search cash-adjustment rows").fill(adjustmentId);
  await page.getByRole("row", { name: new RegExp(adjustmentId) }).dblclick();
  const reopenedDialog = page.getByRole("dialog", { name: "Edit cash adjustment" });
  const history = reopenedDialog.locator('[data-pd-id="cash_adjustment.editor.history"]');
  await history.locator("summary").click();
  await expect(history.getByText("Created", { exact: true })).toBeVisible({ timeout: 90_000 });
  await expect(history.getByText("Corrected", { exact: true })).toBeVisible({ timeout: 90_000 });
  await expect(history.getByText("£ 6.00", { exact: true }).first()).toBeVisible({ timeout: 90_000 });
  await expect(history.getByText("£ 5.00", { exact: true }).first()).toBeVisible({ timeout: 90_000 });

  const retry = await page.request.put(
    `/api/profiles/${profileId}/cash-adjustments/${adjustmentId}`,
    { data: correctionPayload, headers: { "Idempotency-Key": correctionKey } },
  );
  expect(retry.status()).toBe(200);
  await page.keyboard.press("Escape");
  await page.goto(`/profiles/${profileId}/tracker/reports`);
  await ensureHostedRouteReady(page, "Reports");
  await expect(page.getByText("Loading tracker summaries", { exact: true })).toBeHidden({ timeout: 150_000 });
  const range = page.getByLabel("Change tracker date range");
  if (await range.isVisible()) await range.selectOption({ label: "All Dates" });
  const cashCard = page.locator("article.stat-card", { hasText: "Cash Adjustments" }).first();
  await expect(cashCard.getByText("£ 5.00", { exact: true })).toBeVisible({ timeout: 90_000 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureHostedRouteReady(page, "Reports");
  await expect(page.getByText("Loading tracker summaries", { exact: true })).toBeHidden({ timeout: 150_000 });
  await expect(page.locator("article.stat-card", { hasText: "Cash Adjustments" }).first()
    .getByText("£ 5.00", { exact: true })).toBeVisible();
  await page.screenshot({ path: "/tmp/cp030-preview-cash-report.png", fullPage: true });

  const [persistedRowsResponse, historyResponse] = await Promise.all([
    page.request.get(`/api/profiles/${profileId}/cash-adjustments`),
    page.request.get(`/api/profiles/${profileId}/financial-history/cash_adjustment/${adjustmentId}`),
  ]);
  expect([persistedRowsResponse.status(), historyResponse.status()]).toEqual([200, 200]);
  const persistedRows = await persistedRowsResponse.json() as Array<{
    cash_adjustment_id: string; signed_amount: string;
  }>;
  const persistedHistory = await historyResponse.json() as Array<{ operation: string }>;
  expect(persistedRows.filter((row) => row.cash_adjustment_id === adjustmentId)).toEqual([
    expect.objectContaining({ signed_amount: "5.00" }),
  ]);
  expect(persistedHistory.map((event) => event.operation)).toEqual(["created", "corrected"]);
  expect((await page.request.patch(`/api/profiles/${profileId}`, {
    data: { status: "Archived" },
  })).ok()).toBeTruthy();
});

test("authenticated Preview renders core hosted surfaces and accepted visual invariants", async ({ page }) => {
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Explicit hosted gate only");
  const baseURL = process.env.OPENFORGE_E2E_BASE_URL!;
  const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (protectionBypass) {
    const bypassResponse = await page.request.get(baseURL, {
      headers: {
        "x-vercel-protection-bypass": protectionBypass,
        "x-vercel-set-bypass-cookie": "true",
      },
    });
    expect(bypassResponse.status()).toBeLessThan(400);
  }
  const diagnostics: string[] = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) diagnostics.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => diagnostics.push(`pageerror ${page.url()}: ${error.message}`));

  const timings: Record<string, number> = {};
  const recoveries: string[] = [];
  async function open(path: string, heading: string) {
    const started = Date.now();
    const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 90_000 });
    expect(response?.status()).toBeLessThan(400);
    const targetHeading = page.getByRole("heading", { name: heading, exact: true }).first();
    try {
      await targetHeading.waitFor({ state: "visible", timeout: 30_000 });
    } catch (error) {
      const recoveryHeading = page.getByRole("heading", { name: "Unable to continue", exact: true });
      if (!(await recoveryHeading.isVisible())) throw error;
      recoveries.push(path);
      await page.getByRole("button", { name: "Try again", exact: true }).click();
      await targetHeading.waitFor({ state: "visible", timeout: 90_000 });
    }
    await expect(page.getByRole("progressbar", { name: "Loading page data" })).toBeHidden({
      timeout: 90_000,
    });
    timings[path] = Date.now() - started;
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await open("/profiles", "Profiles");
  await expect(page.getByText("CP-028 Active Scale", { exact: true })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("Subscriber Alpha", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Subscriber Bravo", { exact: true }).first()).toBeVisible();
  await expect(page.locator('[data-pd-id="global-search.input"]')).toBeVisible();
  await page.screenshot({ path: "/tmp/cp029-preview-profiles-desktop.png", fullPage: true });

  const search = page.locator('[data-pd-id="global-search.input"]');
  await search.fill("Subscriber Alpha");
  await expect(page.locator('[data-pd-id="global-search.results"]')).toContainText(
    "Subscriber Alpha",
    { timeout: 90_000 },
  );
  await search.press("Escape");

  await open("/profiles/profile-demo-001/tracker/dashboard", "Dashboard");
  const chartPoints = page.locator('[data-pd-id="dashboard.performance-graph"] button');
  if (await chartPoints.count()) {
    await chartPoints.first().focus();
    await chartPoints.first().press("Enter");
    await expect(page.locator('[data-pd-id="dashboard.chart.drilldown"]')).toBeVisible();
  }

  await open("/profiles/profile-demo-001/tracker/accounts", "Accounts");
  await expect(page.locator(".data-table tbody tr").first()).toBeVisible({ timeout: 90_000 });

  await open("/fund-manager/calculators?family=standard", "Calculators");
  await expect(page.getByRole("button", { name: "Advanced" })).toBeVisible();
  await page.getByLabel("Back stake", { exact: false }).first().fill("10");
  await page.getByLabel("Back odds", { exact: false }).first().fill("5");
  await page.getByLabel("Lay odds", { exact: false }).first().fill("5.2");
  await expect(page.locator(".financial-value").first()).toBeVisible({ timeout: 90_000 });

  await open("/fund-manager/calculators?family=multi-lay", "Calculators");
  const multi = page.locator('[data-pd-id="calculators.multi-lay.presentation"]');
  await expect(multi).toBeVisible();
  const geometry = await multi.evaluate((root) => {
    const back = root.querySelector<HTMLElement>('[data-pd-id="calculators.multi-lay.back"]')!;
    const lay = root.querySelector<HTMLElement>('[data-pd-id="calculators.multi-lay.lay-outcomes"]')!;
    const heading = lay.querySelector<HTMLElement>(".calculator-section-heading")!;
    const title = heading.querySelector<HTMLElement>("h3")!.getBoundingClientRect();
    const help = heading.querySelector<HTMLElement>(".context-help-action")!.getBoundingClientRect();
    const backBox = back.getBoundingClientRect();
    const layBox = lay.getBoundingClientRect();
    return {
      aligned: Math.abs(backBox.left - layBox.left) <= 1 && Math.abs(backBox.right - layBox.right) <= 1,
      helpInline: Math.abs((title.top + title.height / 2) - (help.top + help.height / 2)) <= 1,
      noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    };
  });
  expect(geometry).toEqual({ aligned: true, helpInline: true, noOverflow: true });
  await page.screenshot({ path: "/tmp/cp029-preview-multilay-desktop.png", fullPage: true });

  await open("/profiles/profile-demo-001/tracker/reports", "Reports");
  await expect(page.getByText("Loading tracker summaries", { exact: true })).toBeHidden({
    timeout: 90_000,
  });
  await expect(page.locator("main")).toContainText(/Profit|P&L|Financial/i, { timeout: 90_000 });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open("/fund-manager/calculators?family=multi-lay", "Calculators");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  await page.screenshot({ path: "/tmp/cp029-preview-multilay-narrow-dark.png", fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  const unexpected = diagnostics.filter((entry) =>
    /duplicate key|hydration|uncaught|unhandled|secret|token|react error/i.test(entry),
  );
  console.log(`CP029_HOSTED_TIMINGS=${JSON.stringify(timings)}`);
  console.log(`CP029_HOSTED_RECOVERIES=${JSON.stringify(recoveries)}`);
  console.log(`CP029_HOSTED_DIAGNOSTICS=${JSON.stringify(diagnostics)}`);
  expect(unexpected).toEqual([]);
});
