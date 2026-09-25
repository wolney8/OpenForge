import { expect, test, type Page, type Locator } from "@playwright/test";

test.use({ actionTimeout: 15_000 });
async function fixture(page: Page) {
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Authorised isolated/Preview session required");
  const health = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
  expect(["test", "preview"]).toContain(health.runtime_role);
  if (health.runtime_role === "preview") expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
  expect((await page.request.get("/api/auth/session")).status()).toBe(200);
  const now = new Date(), today = now.toISOString().slice(0, 10);
  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  const profiles = Array.from({ length: 2 }, (_, i) => ({ profile_id: `synthetic-cp045-${i}`, display_name: `Synthetic CP045 ${i}`, profile_code: `C45-${i}`, status: "Active", tracking_start_date: "2026-01-01", management_fee_percent: "10", investment_fee_percent: "20" }));
  const state = { fail: "", outstanding: "1234567.89" as string | null, liability: "4567.89" as string | null, gate: null as Promise<void> | null, requests: [] as string[] };
  await page.route("**/api/profiles", r => r.fulfill({ json: profiles }));
  await page.route("**/api/profiles/*/tracker-summary-sources", async r => {
    const id = r.request().url().split("/").at(-2)!; state.requests.push(id); if (state.gate) await state.gate;
    if (state.fail === id) return void await r.fulfill({ status: 503, json: { detail: "Synthetic source unavailable" } });
    const populated = id === profiles[0].profile_id;
    await r.fulfill({ json: {
      accounts: populated ? [{ account_id: "synthetic-account", account: "Bookmaker A", type: "Bookie", status: "Active", counts_in_cash_total: true, current_balance: "125.00", pending_withdrawal_amount: "0.00", last_balance_update: "", group_name: "", platform: "" }] : [],
      sportsbook_bets: populated ? [{ sportsbook_bet_id: "synthetic-bet", bookmaker: "Bookmaker A", event_name: "Synthetic open position", status: "Placed", result: "Pending", date_settled: today + "T23:59", reporting_value: "-5.00", projected_current_pnl: "-5.00", final_net_pnl: null, calculated_liability_1: state.liability, lay_status: "Fully Laid", counts_as_open: true }] : [],
      free_bets: [], casino_offers: [], each_way_extra_places: [], balance_snapshots: [], cash_adjustments: [],
      fee_periods: populated ? [{ fee_period_id: "synthetic-fee", profile_id: id, period_start: lastMonth + "-01", period_end: lastMonth + "-28", state: "crystallised", current_revision: { total_fee_due: "1234577.89", management_fee_amount: "10.00", investment_fee_amount: "1234567.89" }, fee_withdrawn_amount: "10.00", fee_outstanding_amount: state.outstanding }] : [],
      tracker_settings: { active_date_preset: "All Dates", custom_start_date: "", custom_end_date: "", range_back_days: 0, range_forward_days: 0 },
    }});
  });
  return { profiles, state, lastMonth };
}
async function selectTab(page: Page, tab: "fees" | "exposure" | "profiles") {
  await page.locator(`[data-pd-id="profiles.navigation.${tab}"]`).click();
}
async function copy(page: Page, value: Locator, expected: string) {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await value.evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); getSelection()!.removeAllRanges(); getSelection()!.addRange(range); });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+c" : "Control+c");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
}
async function replay(page: Page, group: Locator, target: Locator) {
  await expect(target).toHaveAttribute("data-money-motion", "none");
  const before = Number(await target.getAttribute("data-money-motion-cycle"));
  await group.click();
  await expect.poll(async () => Number(await target.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(before);
}

test("Fee Position and Exposure replay their nearest cards and never show partial totals", async ({ page }, info) => {
  const { profiles, state } = await fixture(page);
  let release!: () => void; state.gate = new Promise<void>(r => release = r);
  await page.goto("/profiles");
  await selectTab(page, "fees");
  const fees = page.getByRole("region", { name: "Fund Manager fee position" });
  await expect(fees).toContainText("Loading"); await expect(fees.locator(".financial-value")).toHaveCount(0);
  release(); state.gate = null;
  const available = fees.locator(".stat-card").nth(0), withdrawn = fees.locator(".stat-card").nth(3);
  const value = available.locator(".financial-value");
  await expect(value).toHaveAttribute("aria-label", "£ 1,234,567.89");
  await expect(withdrawn.locator(".financial-value")).toHaveAttribute("aria-label", "£ 10.00");
  for (const [width, theme, scale] of [[1440, "light", 100], [390, "dark", 100], [760, "light", 200]] as const) {
    await page.setViewportSize({ width, height: 1100 });
    await page.evaluate(({ theme, scale }) => { document.documentElement.dataset.theme = theme; document.documentElement.style.fontSize = scale + "%"; }, { theme, scale });
    await expect(value).toHaveAttribute("data-money-motion-cycle", /^[1-9]/);
    await expect(withdrawn.locator(".financial-value")).toHaveAttribute("data-money-motion", "none");
    const peerCycle = await withdrawn.locator(".financial-value").getAttribute("data-money-motion-cycle");
    await replay(page, available.locator(".eyebrow"), value);
    expect(await withdrawn.locator(".financial-value").getAttribute("data-money-motion-cycle")).toBe(peerCycle);
    for (let frame = 0; frame < 4; frame++) {
      await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => r())));
      expect(await value.evaluate(el => { const a = el.getBoundingClientRect(), b = el.closest(".stat-card")!.getBoundingClientRect(); return a.left >= b.left && a.right <= b.right + 1 && el.scrollWidth <= el.clientWidth + 1; })).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await available.scrollIntoViewIfNeeded(); await page.screenshot({ path: info.outputPath(`fee-card-${width}-${theme}-${scale}.png`) });
  }
  await replay(page, withdrawn.locator(".eyebrow"), withdrawn.locator(".financial-value"));
  await copy(page, value, "£ 1,234,567.89");
  await expect(value).toHaveAttribute("data-money-motion", "none");
  await page.screenshot({ path: info.outputPath("fee-value-settled.png") });
  const unchangedFeeCycle = await value.getAttribute("data-money-motion-cycle");
  await page.locator('[data-pd-id="fees.closed-month"]').selectOption({ index: 1 });
  await expect(value).toHaveAttribute("aria-label", "£ 1,234,567.89");
  expect(await value.getAttribute("data-money-motion-cycle")).toBe(unchangedFeeCycle);
  await page.locator('[data-pd-id="fees.closed-month"]').selectOption({ index: 0 });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.evaluate(() => document.documentElement.style.fontSize = "100%");
  await selectTab(page, "exposure");
  const exposure = page.getByRole("region", { name: "Combined exposure totals" }).locator(".stat-card").nth(1);
  await expect(exposure.locator(".financial-value")).toHaveAttribute("aria-label", "£ 4,567.89");
  await replay(page, exposure.locator(".eyebrow"), exposure.locator(".financial-value"));
  await page.getByRole("combobox", { name: "Date range", exact: true }).selectOption("Yesterday");
  await expect(exposure.locator(".financial-value")).toHaveAttribute("aria-label", "£ -");
  await page.getByRole("combobox", { name: "Date range", exact: true }).selectOption("Today");
  await page.getByRole("combobox", { name: "Date range", exact: true }).selectOption("All Dates");
  await expect(exposure.locator(".financial-value")).toHaveAttribute("aria-label", "£ 4,567.89");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(exposure.locator(".financial-value")).toHaveAttribute("data-money-motion", "none");
  const cycle = await exposure.locator(".financial-value").getAttribute("data-money-motion-cycle");
  await exposure.locator(".eyebrow").click(); expect(await exposure.locator(".financial-value").getAttribute("data-money-motion-cycle")).toBe(cycle);
  state.fail = profiles[1].profile_id;
  await page.reload(); await selectTab(page, "exposure");
  await expect(exposure).toContainText("unavailable"); await expect(exposure.locator(".financial-value")).toHaveCount(0);
  await selectTab(page, "fees"); await expect(available).toContainText("unavailable"); await expect(available.locator(".financial-value")).toHaveCount(0);
  await expect(page.locator(`[data-pd-id="fees.${profiles[0].profile_id}.row"]`)).toContainText("1,234,567.89");
  await selectTab(page, "profiles");
  await page.locator(`[data-pd-id="profiles.directory.row.${profiles[1].profile_id}"]`).press("Enter");
  const detail = page.getByRole("dialog", { name: `Profile details for ${profiles[1].display_name}` });
  await expect(detail.locator('[data-pd-id="profiles.drawer.fee-position"]')).toContainText("unavailable");
  await expect(detail.locator(".financial-value")).toHaveCount(0);
});

test("Profile directory and detail preserve scope, unknown versus zero and independent fee values", async ({ page }, info) => {
  const { profiles, state } = await fixture(page);
  await page.goto("/profiles");
  await page.getByRole("combobox", { name: "Date range", exact: true }).selectOption("All Dates");
  const row = page.locator(`[data-pd-id="profiles.directory.row.${profiles[0].profile_id}"]`);
  await expect(row.locator(".financial-value").nth(0)).toHaveAttribute("aria-label", "£ (5.00)");
  await expect(row.locator(".financial-value").nth(1)).toHaveAttribute("aria-label", "£ 1,234,567.89");
  await expect(row.locator(".financial-value").nth(1)).toHaveAttribute("data-money-motion", "none");
  const rowCycle = Number(await row.locator(".financial-value").nth(1).getAttribute("data-money-motion-cycle"));
  await page.locator('[data-pd-id="profiles.directory.search"]').hover();
  await row.locator("td").nth(1).hover();
  await expect.poll(async () => Number(await row.locator(".financial-value").nth(1).getAttribute("data-money-motion-cycle"))).toBeGreaterThan(rowCycle);
  await row.focus(); await page.keyboard.press("Enter");
  const detail = page.getByRole("dialog", { name: `Profile details for ${profiles[0].display_name}` });
  const fees = detail.locator('[data-pd-id="profiles.drawer.fee-position"]');
  await expect(fees.locator(".financial-value").nth(2)).toHaveAttribute("aria-label", "£ 1,234,567.89");
  const values = detail.locator(".financial-value");
  await expect(values.nth(0)).toHaveAttribute("aria-label", "£ (5.00)");
  await expect(values.nth(5)).toHaveAttribute("aria-label", "£ 125.00");
  for (const [width, theme, scale] of [[390, "light", 100], [760, "dark", 200]] as const) {
    await page.setViewportSize({ width, height: 1100 });
    await page.evaluate(({ theme, scale }) => { document.documentElement.dataset.theme = theme; document.documentElement.style.fontSize = scale + "%"; }, { theme, scale });
    await expect(fees.locator(".financial-value").nth(2)).toHaveAttribute("data-money-motion", "none");
    await replay(page, fees.getByRole("heading"), fees.locator(".financial-value").nth(2));
    expect(await detail.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await values.evaluateAll(nodes => nodes.every(el => { const a = el.getBoundingClientRect(), b = el.closest("dialog")!.getBoundingClientRect(); return a.left >= b.left && a.right <= b.right + 1; }))).toBe(true);
    await fees.scrollIntoViewIfNeeded(); await expect(fees.locator(".financial-value").nth(2)).toHaveAttribute("data-money-motion", "none"); await page.screenshot({ path: info.outputPath(`profile-detail-${width}-${theme}-${scale}.png`) });
  }
  await replay(page, detail.getByRole("heading", { name: "Selected Range Performance", exact: true }), values.nth(0));
  await replay(page, detail.getByRole("heading", { name: "Current Cash", exact: true }), values.nth(5));
  await copy(page, values.nth(0), "£ (5.00)");
  await detail.getByRole("button", { name: "Close profile details", exact: true }).click();
  await row.press("Enter"); await expect(values.nth(0)).toHaveAttribute("aria-label", "£ (5.00)");
  await detail.getByRole("button", { name: "Close profile details", exact: true }).click();
  state.outstanding = null; state.liability = null;
  await page.reload(); await selectTab(page, "fees");
  const cards = page.getByRole("region", { name: "Fund Manager fee position" }).locator(".stat-card");
  await expect(cards.nth(0).locator(".financial-value")).toHaveAttribute("aria-label", "Unavailable");
  await expect(cards.nth(3).locator(".financial-value")).toHaveAttribute("aria-label", "£ 10.00");
  const feeRow = page.locator(`[data-pd-id="fees.${profiles[0].profile_id}.row"]`);
  await expect(feeRow.locator(".fee-centre-state")).toHaveText("Unavailable");
  await expect(feeRow.locator("button")).toBeDisabled();
  await selectTab(page, "exposure");
  await expect(page.getByRole("region", { name: "Combined exposure totals" }).locator(".financial-value")).toHaveAttribute("aria-label", "Unavailable");
  await expect(page.locator('[data-pd-id="profiles.visual-summary"] .financial-value').first()).toHaveAttribute("aria-label", "Combined selected range profit and loss: £ (5.00)");
  state.outstanding = "0.00"; state.liability = "0.00";
  await page.route("**/api/fund-manager/preferences/financial-motion", r => r.fulfill({ json: { enabled: false, replay_delay_ms: 1500, duration_ms: 520, stagger_ms: 80 } }));
  await page.reload(); await selectTab(page, "fees");
  await expect(cards.nth(0).locator(".financial-value")).toHaveAttribute("aria-label", "£ -");
  await expect(cards.nth(3).locator(".financial-value")).toHaveAttribute("data-money-motion", "none");
  await selectTab(page, "exposure");
  await expect(page.getByRole("region", { name: "Combined exposure totals" }).locator(".financial-value")).toHaveAttribute("aria-label", "£ -");
});

test("Unread archived Profiles do not become zero fees or trigger all-Profile request fan-out", async ({ page }) => {
  const { profiles, state } = await fixture(page);
  for (let i = 2; i < 27; i++) profiles.push({ ...profiles[1], profile_id: `synthetic-cp045-${i}`, display_name: `Synthetic CP045 ${String(i).padStart(2, "0")}`, profile_code: `C45-${i}`, status: "Archived" });
  await page.goto("/profiles");
  const command = page.locator('[data-pd-id="profiles.visual-summary"] .dashboard-performance-card');
  const pnl = command.locator(".financial-value").first();
  await expect(pnl).toHaveAttribute("aria-label", "Combined selected range profit and loss: £ (5.00)");
  const node = await pnl.elementHandle();
  let release!: () => void; state.gate = new Promise<void>(r => release = r);
  await page.locator('[data-pd-id="profiles.directory.status-filter"]').selectOption("Archived");
  await expect.poll(() => new Set(state.requests).size).toBeGreaterThan(2);
  expect(await node!.evaluate(el => el.isConnected)).toBe(true);
  await expect(pnl).toHaveAttribute("aria-label", "Combined selected range profit and loss: £ (5.00)");
  release(); state.gate = null;
  await expect(page.locator('[data-pd-id^="profiles.directory.row."]').first().locator(".financial-value").first()).toHaveAttribute("aria-label", "£ -");
  await selectTab(page, "fees");
  await expect(page.getByRole("region", { name: "Fund Manager fee position" })).toContainText("unavailable");
  await expect(page.locator('[data-pd-id="fees.panel"]')).toContainText("all-Profile fee total is incomplete");
  expect(new Set(state.requests).size).toBeLessThan(27);
  await expect(page.locator(`[data-pd-id="fees.${profiles[0].profile_id}.row"]`).locator(".financial-value").nth(2)).toHaveAttribute("aria-label", "£ 1,234,567.89");
});
