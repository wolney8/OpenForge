import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({ actionTimeout: 15_000 });

async function fixture(page: Page) {
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Authorised isolated/Preview session required");
  const health = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
  expect(["test", "preview"]).toContain(health.runtime_role);
  if (health.runtime_role === "preview") expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
  expect((await page.request.get("/api/auth/session")).status()).toBe(200);
  const now = new Date();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  const olderMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1)).toISOString().slice(0, 7);
  const profile = { profile_id: "synthetic-cp045-fee-drawers", display_name: "Synthetic Fee Drawer Profile", profile_code: "F45-001", status: "Active", tracking_start_date: "2025-01-01", management_fee_percent: "40", investment_fee_percent: "10" };
  const state = { missingModule: false, stored: true, fail: false, gate: null as Promise<void> | null, previewMonths: [] as string[] };
  const revision = { eligible_period_profit: "100.00", opening_loss_carryforward: "0.00", fee_base: "100.00", management_fee_amount: "40.00", investment_fee_amount: "10.00", total_fee_due: "50.00" };
  await page.route("**/api/profiles", r => r.fulfill({ json: [profile] }));
  await page.route("**/api/profiles/*/tracker-summary-sources", r => r.fulfill({ json: {
    accounts: [], sportsbook_bets: [], free_bets: [], casino_offers: [], each_way_extra_places: [], balance_snapshots: [],
    cash_adjustments: [
      { cash_adjustment_id: "synthetic-in-month", adjustment_date: `${month}-10`, adjustment_type: "TopUp", description: "Synthetic funding", signed_amount: "300.00" },
      { cash_adjustment_id: "synthetic-older-month", adjustment_date: `${olderMonth}-10`, adjustment_type: "TopUp", description: "Synthetic earlier funding", signed_amount: "900.00" },
    ],
    fee_periods: [month, olderMonth].map(m => ({ fee_period_id: `synthetic-fee-${m}`, profile_id: profile.profile_id, period_start: `${m}-01`, period_end: `${m}-28`, state: "crystallised", current_revision_number: 1,
      current_revision: { ...revision, ...(state.stored ? { fee_base_breakdown_json: JSON.stringify({ module_totals: { sportsbook: "-1234567.89", free_bet: "0.00", casino: state.missingModule ? "" : "1234667.89" } }) } : {}) },
      fee_withdrawn_amount: "10.00", fee_outstanding_amount: "40.00", withdrawal_links: [{ component: "management", amount: "10.00", cash_adjustment_id: "synthetic-withdrawal" }],
      corrections: [{ fee_correction_id: "synthetic-correction", adjustment_type: "fee_credit", amount: "12.34", reason: "Synthetic retained correction", state: "pending" }],
    })),
    tracker_settings: { active_date_preset: "All Dates", custom_start_date: "", custom_end_date: "", range_back_days: 0, range_forward_days: 0 },
  }}));
  await page.route("**/api/profiles/*/fee-periods/preview", async r => {
    const requestedMonth = r.request().postDataJSON().period_start.slice(0, 7);
    state.previewMonths.push(requestedMonth);
    if (state.gate) await state.gate;
    if (state.fail) return void await r.fulfill({ status: 503, json: { detail: "Synthetic fee preview unavailable" } });
    await r.fulfill({ json: { profile_id: profile.profile_id, period_start: `${requestedMonth}-01`, period_end: `${requestedMonth}-28`, calculation_state: "resolved",
      sportsbook_total: requestedMonth === month ? "-1234.56" : "12.34", sportsbook_count: 1,
      free_bet_total: "0.00", free_bet_count: 0, casino_total: state.missingModule ? "" : "2234.56", casino_count: 1,
      eligible_period_profit: "1000.00", opening_loss_carryforward: "0.00", fee_base: "1000.00", management_fee_percent: "40", investment_fee_percent: "10", management_fee_amount: state.missingModule ? " " : "400.00", investment_fee_amount: "100.00", total_fee_due: "500.00", blockers: [],
    }});
  });
  await page.route("**/api/profiles/*/fee-periods/*/revisions", r => r.fulfill({ json: [{
    ...revision, fee_revision_id: "synthetic-revision", fee_period_id: `synthetic-fee-${month}`, profile_id: profile.profile_id, revision_number: 1,
    eligible_period_profit: state.missingModule ? "" : "100.00", reporting_basis: "settled_final", fee_base_source_version: "synthetic", closing_loss_carryforward: "0.00", management_fee_percent: "40", investment_fee_percent: "10", change_reason: "Synthetic initial fee review", created_by: "USER-001", created_at: `${month}-28T12:00:00Z`,
  }] }));
  return { profile, state, month, olderMonth };
}

function field(dialog: Locator, label: string) {
  return dialog.locator("dt").filter({ hasText: new RegExp(`^${label}`) }).locator("xpath=following-sibling::dd").first();
}
async function openFees(page: Page) {
  await page.goto("/profiles");
  await page.locator('[data-pd-id="profiles.navigation.fees"]').click();
  await expect(page.locator('[data-pd-id="fees.synthetic-cp045-fee-drawers.row"]')).toBeVisible();
}
async function copy(page: Page, value: Locator, expected: string) {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await value.evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); getSelection()!.removeAllRanges(); getSelection()!.addRange(range); });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+c" : "Control+c");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
}
async function checkGeometry(dialog: Locator) {
  expect(await dialog.evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && el.scrollWidth <= el.clientWidth + 1; })).toBe(true);
  for (const value of await dialog.locator(".financial-value").all()) {
    expect(await value.evaluate(el => { const value = el.getBoundingClientRect(), parent = (el.closest("dd, strong, small") ?? el.parentElement)!.getBoundingClientRect(); return value.width <= parent.width + 1 && value.left >= parent.left - 1 && value.right <= parent.right + 1; })).toBe(true);
  }
}
async function replayGroup(group: Locator, trigger: Locator, peer: Locator) {
  const values = await group.locator(".financial-value").all();
  const nonzero: Locator[] = [];
  for (const value of values) if (!["£ -", "Unavailable"].includes(await value.getAttribute("aria-label") ?? "")) nonzero.push(value);
  expect(nonzero.length).toBeGreaterThan(0);
  for (const value of [...nonzero, peer]) {
    await expect.poll(async () => Number(await value.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(0);
    await expect(value).toHaveAttribute("data-money-motion", "none");
  }
  const before = await Promise.all(nonzero.map(value => value.getAttribute("data-money-motion-cycle")));
  const peerCycle = await peer.getAttribute("data-money-motion-cycle");
  await trigger.click();
  for (let i = 0; i < nonzero.length; i++) await expect.poll(async () => Number(await nonzero[i].getAttribute("data-money-motion-cycle"))).toBeGreaterThan(Number(before[i]));
  expect(await peer.getAttribute("data-money-motion-cycle")).toBe(peerCycle);
}

test("fee breakdown preserves monthly context, known fees, shared replay and exact copy", async ({ page }, info) => {
  const { state } = await fixture(page);
  await openFees(page);
  const row = page.locator('[data-pd-id="fees.synthetic-cp045-fee-drawers.row"]');
  await row.press("Enter");
  const drawer = page.locator('[data-pd-id="fees.breakdown.drawer"]');
  const value = field(drawer, "Sportsbook").locator(".financial-value");
  await expect(value).toHaveAttribute("aria-label", "£ (1,234,567.89)");
  await expect(field(drawer, "Cash Adjustments").locator(".financial-value")).toHaveAttribute("aria-label", "£ 300.00");
  await expect(field(drawer, "Free Bets").locator(".financial-value")).toHaveAttribute("aria-label", "£ -");
  await expect(field(drawer, "Available to Withdraw").locator(".financial-value")).toHaveAttribute("aria-label", "£ 40.00");
  expect(state.previewMonths).toEqual([]);
  for (const [width, theme, scale] of [[1440, "light", 100], [390, "dark", 100], [760, "light", 200]] as const) {
    await page.setViewportSize({ width, height: 1100 });
    await page.evaluate(({ theme, scale }) => { document.documentElement.dataset.theme = theme; document.documentElement.style.fontSize = scale + "%"; }, { theme, scale });
    await expect.poll(async () => Number(await value.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(0);
    await expect(value).toHaveAttribute("data-money-motion", "none");
    const cycle = Number(await value.getAttribute("data-money-motion-cycle"));
    const peer = field(drawer, "Total Fee").locator(".financial-value");
    await expect.poll(async () => Number(await peer.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(0);
    await expect(peer).toHaveAttribute("data-money-motion", "none");
    const peerCycle = await peer.getAttribute("data-money-motion-cycle");
    await drawer.getByRole("heading", { name: "Monthly Performance" }).click();
    await expect.poll(async () => Number(await value.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(cycle);
    expect(await peer.getAttribute("data-money-motion-cycle")).toBe(peerCycle);
    for (let frame = 0; frame < 3; frame++) { await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => r()))); await checkGeometry(drawer); }
    await page.screenshot({ path: info.outputPath(`fee-breakdown-${width}-${theme}-${scale}.png`) });
  }
  await replayGroup(drawer.locator("section").filter({ has: page.getByRole("heading", { name: "Fee Calculation", exact: true }) }), drawer.getByRole("heading", { name: "Fee Calculation", exact: true }), value);
  await replayGroup(drawer.locator("section").filter({ has: page.getByRole("heading", { name: "Withdrawal Position" }) }), drawer.getByRole("heading", { name: "Withdrawal Position" }), value);
  await copy(page, value, "£ (1,234,567.89)");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await drawer.getByRole("heading", { name: "Monthly Performance" }).click();
  await expect(value).toHaveAttribute("data-money-motion", "none");
  await page.keyboard.press("Escape"); await expect(drawer).not.toBeVisible(); await expect(row).toBeFocused();
  state.missingModule = true;
  await page.reload(); await page.locator('[data-pd-id="profiles.navigation.fees"]').click(); await row.press("Enter");
  await expect(field(drawer, "Casino Offers")).toHaveText("Unavailable");
  await expect(field(drawer, "Total Fee").locator(".financial-value")).toHaveAttribute("aria-label", "£ 50.00");
  await page.route("**/api/fund-manager/preferences/financial-motion", r => r.fulfill({ json: { enabled: false, replay_delay_ms: 1500, duration_ms: 520, stagger_ms: 80 } }));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload(); await page.locator('[data-pd-id="profiles.navigation.fees"]').click(); await row.press("Enter");
  await drawer.getByRole("heading", { name: "Monthly Performance" }).click();
  await expect(value).toHaveAttribute("data-money-motion-cycle", "0");
  await expect(value).toHaveAttribute("data-money-motion", "none");
});

test("fee preview failure and month changes preserve truthful review and breakdown values", async ({ page }) => {
  const { state, month, olderMonth } = await fixture(page);
  state.stored = false;
  let release!: () => void; state.gate = new Promise<void>(r => release = r);
  await openFees(page);
  const row = page.locator('[data-pd-id="fees.synthetic-cp045-fee-drawers.row"]');
  await row.press("Enter");
  const drawer = page.locator('[data-pd-id="fees.breakdown.drawer"]');
  await expect(field(drawer, "Sportsbook")).toHaveText("Loading…");
  await expect(field(drawer, "Total Fee").locator(".financial-value")).toHaveAttribute("aria-label", "£ 50.00");
  state.fail = true; release(); state.gate = null;
  await expect(drawer.getByRole("alert")).toContainText("503");
  await expect(field(drawer, "Sportsbook")).toHaveText("Unavailable");
  await expect(field(drawer, "Available to Withdraw").locator(".financial-value")).toHaveAttribute("aria-label", "£ 40.00");
  state.fail = false;
  await drawer.locator('[data-pd-id="fees.breakdown.review"]').click();
  const review = page.locator('[data-pd-id="fee-period-review.dialog"]');
  const sportsbook = review.getByRole("region", { name: "Monthly settled fee totals" }).locator(".stat-card").first().locator(".financial-value");
  await expect(sportsbook).toHaveAttribute("aria-label", "£ (1,234.56)");
  await copy(page, sportsbook, "£ (1,234.56)");
  const withdrawal = review.locator('[data-pd-id="fee-period-review.withdrawal"]');
  await expect(withdrawal).toHaveAttribute("data-motion-replay-group", "true");
  await replayGroup(review.locator('[data-pd-id="fee-period-review.calculation"]'), review.getByRole("heading", { name: "Fee Calculation", exact: true }), sportsbook);
  await replayGroup(review.locator(".fee-revision-list li"), review.getByText("Revision 1", { exact: true }), sportsbook);
  await replayGroup(review.locator(".fee-correction-list li"), review.getByText("Fee Credit", { exact: true }), sportsbook);
  await replayGroup(withdrawal, review.getByRole("heading", { name: "Mark as Withdrawn" }), sportsbook);
  await expect(withdrawal.locator("input").first()).toHaveValue("30.00");
  await expect(review.locator('[data-pd-id="fee-period-review.revision-audit"]')).toContainText("Synthetic retained correction");
  const monthSelect = review.locator('[data-pd-id="fee-period-review.month"]');
  state.gate = new Promise<void>(r => release = r);
  await monthSelect.selectOption(olderMonth);
  await expect(review).toContainText("Calculating settled monthly fees");
  await expect(sportsbook).toHaveCount(0);
  state.gate = null;
  await monthSelect.selectOption(month);
  await expect(sportsbook).toHaveAttribute("aria-label", "£ (1,234.56)");
  release();
  await expect(monthSelect).toHaveValue(month);
  await expect(sportsbook).toHaveAttribute("aria-label", "£ (1,234.56)");
  state.missingModule = true;
  await monthSelect.selectOption(olderMonth);
  await expect(sportsbook).toHaveAttribute("aria-label", "£ 12.34");
  await expect(field(review, "Management Fee")).toHaveText("Unavailable");
  await expect(review.locator(".fee-revision-values dd").first()).toHaveText("Unavailable");
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, theme, scale] of [[390, "dark", 100], [760, "light", 200]] as const) {
    await page.setViewportSize({ width, height: 1100 });
    await page.evaluate(({ theme, scale }) => { document.documentElement.dataset.theme = theme; document.documentElement.style.fontSize = scale + "%"; }, { theme, scale });
    await checkGeometry(review);
    await review.locator('[data-pd-id="fee-period-review.close"]').focus();
    await page.keyboard.press("Tab");
    expect(await review.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape"); await expect(review).not.toBeVisible();
  await row.locator("button").click(); await expect(review).toBeVisible();
  await expect(field(review, "Management Fee")).toHaveText("Unavailable");
  await page.keyboard.press("Escape");
});
