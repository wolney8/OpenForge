import { expect, test, type Page, type Locator } from "@playwright/test";

test.use({ actionTimeout: 15_000 });
async function preflight(page: Page) {
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Authorised isolated/Preview session required");
  const health = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
  expect(["test", "preview"]).toContain(health.runtime_role);
  if (health.runtime_role === "preview") expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
  expect((await page.request.get("/api/auth/session")).status()).toBe(200);
}
async function viewport(page: Page, width: number, theme: string, scale: number) {
  await page.setViewportSize({ width, height: 1000 });
  await page.evaluate(({ theme, scale }) => { document.documentElement.dataset.theme = theme; document.documentElement.style.fontSize = scale + "%"; }, { theme, scale });
}
async function fits(page: Page, region: Locator) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const bounds = await region.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  expect(await region.locator("select:visible").evaluateAll(nodes => nodes.every(node => {
    const select = node as HTMLSelectElement, style = getComputedStyle(select), context = document.createElement("canvas").getContext("2d")!;
    context.font = style.font;
    return context.measureText(select.selectedOptions[0]?.text ?? "").width <= select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) + 1;
  })), "Selected dropdown values fit").toBe(true);
}

test("Extra Places filters stay beside their trigger and contain keyboard focus", async ({ page }, info) => {
  await preflight(page); const stamp = Date.now();
  const created = await page.request.post("/api/profiles/onboarding", { data: {
    accounts: [], display_name: `Synthetic CP042 Extra Places ${stamp}`, profile_code: `C42-${stamp}`,
    enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments", "each-way-extra-places"], quick_actions: [], setup_path: "import", tracking_start_date: "2026-09-01",
  }});
  expect(created.status(), await created.text()).toBe(201); const id = (await created.json()).profile.profile_id;
  const path = `/api/profiles/${id}/each-way-extra-places`;
  try {
    const account = await page.request.post(`/api/profiles/${id}/accounts`, { data: { account: "Bet365", type: "Bookie", status: "Active", lifecycle_status: "Active", channel: "Online", stake_access: "Normal", promo_access: "Full", restrictions: [] }});
    expect(account.status(), await account.text()).toBe(201);
    const row = await page.request.post(path, { data: { runner: "Synthetic CP042 runner", bookmaker: "Bet365", bookmaker_account: "Bet365", status: "Prospecting" }});
    expect(row.status(), await row.text()).toBe(201);
    await page.goto(`/profiles/${id}/tracker/each-way-extra-places`);
    const toolbar = page.getByRole("toolbar", { name: "Extra Place controls" });
    const trigger = toolbar.getByRole("button", { name: "Open Extra Place filters" });
    const search = toolbar.getByRole("searchbox");
    const dialog = page.getByRole("dialog", { name: "Extra Place filter controls" });
    for (const [width, theme, scale] of [[1440, "light", 100], [760, "dark", 100], [390, "light", 100], [760, "dark", 200]] as const) {
      await viewport(page, width, theme, scale); await toolbar.scrollIntoViewIfNeeded(); await fits(page, toolbar);
      await search.focus(); await search.press("Tab"); await expect(toolbar.getByRole("button", { name: "Add Extra Place row" })).toBeFocused();
      await page.keyboard.press("Tab"); await expect(trigger).toBeFocused(); await trigger.press("Enter");
      const close = dialog.getByRole("button", { name: "Close Extra Place filter controls" });
      await expect(close).toBeFocused({ timeout: 5000 });
      const closeGeometry = await close.evaluate(el => { const r = el.getBoundingClientRect(), icon = el.querySelector("span")!.getBoundingClientRect(); return { w: r.width, h: r.height, dx: Math.abs(r.x + r.width / 2 - icon.x - icon.width / 2), dy: Math.abs(r.y + r.height / 2 - icon.y - icon.height / 2) }; });
      expect(closeGeometry.w).toBe(closeGeometry.h); expect(closeGeometry.dx).toBeLessThan(1); expect(closeGeometry.dy).toBeLessThan(1);
      await close.focus(); await page.keyboard.press("Shift+Tab"); await expect(dialog.getByRole("button", { name: "Done", exact: true })).toBeFocused({ timeout: 5000 });
      await close.focus(); await page.keyboard.press("Escape"); await expect(dialog).toBeHidden({ timeout: 5000 });
      if (await dialog.isVisible()) await close.click();
      await expect(trigger).toBeFocused({ timeout: 5000 }); await trigger.click();
      await dialog.getByRole("combobox", { name: "Bookmaker", exact: true }).selectOption("Bet365");
      await fits(page, dialog);
      const footer = await dialog.locator(".modal-sticky-footer").boundingBox(); expect(footer!.y + footer!.height).toBeLessThanOrEqual(1000);
      await page.screenshot({ path: info.outputPath(`extra-filter-${width}-${theme}-${scale}.png`) });
      await dialog.getByRole("button", { name: "Done", exact: true }).click();
      const clear = toolbar.getByRole("button", { name: "Clear Extra Place filters" });
      const a = await trigger.boundingBox(), b = await clear.boundingBox();
      expect(Math.abs(a!.x + a!.width - b!.x), "Clear belongs to the filter trigger").toBeLessThan(40);
      expect(Math.abs(a!.y + a!.height - b!.y), "Clear stays at filter's lower edge").toBeLessThan(40);
      await page.screenshot({ path: info.outputPath(`extra-toolbar-${width}-${theme}-${scale}.png`) });
      await clear.click(); await expect(clear).toBeHidden();
      await search.fill("NO-SUCH-SYNTHETIC-RUNNER"); await expect(page.locator(".data-table tbody")).not.toContainText("Synthetic CP042 runner");
      await search.fill("Synthetic CP042 runner"); await expect(page.locator(".data-table tbody")).toContainText("Synthetic CP042 runner"); await search.fill("");
    }
    await page.emulateMedia({ reducedMotion: "reduce" }); await trigger.click(); await page.keyboard.press("Escape"); await expect(dialog).toBeHidden();
  } finally { await page.unrouteAll({ behavior: "ignoreErrors" }); expect((await page.request.patch(`/api/profiles/${id}`, { data: { status: "Archived" } })).ok()).toBeTruthy(); }
});

test("All-profile cards preserve Active scope, truthful readiness and nearest-group replay", async ({ page }, info) => {
  await preflight(page); const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  const today = new Date().toISOString().slice(0, 10);
  // Rendering fixtures only: no financial or fee records are persisted.
  const profiles = Array.from({ length: 27 }, (_, i) => ({ profile_id: `synthetic-cp042-${i}`, display_name: `Synthetic CP042 ${String(i).padStart(2, "0")}`, profile_code: `C42-${i}`, status: i < 2 ? "Active" : "Archived", tracking_start_date: "2026-09-01", management_fee_percent: "0", investment_fee_percent: "0" }));
  let activeFails = false, archivedFails = false, amount = "5.00", cash = "1234567.89";
  let release!: () => void, gate: Promise<void> | null = new Promise<void>(r => release = r);
  const requests: string[] = [];
  await page.route("**/api/profiles", r => r.fulfill({ json: profiles }));
  await page.route("**/api/profiles/*/tracker-summary-sources", async r => {
    const id = r.request().url().split("/").at(-2)!; requests.push(id); if (gate) await gate;
    if ((activeFails && id === profiles[1].profile_id) || (archivedFails && Number(id.split("-").at(-1)) >= 2)) { await r.fulfill({ status: 503, json: { detail: "Synthetic source unavailable" } }); return; }
    const populated = id === profiles[0].profile_id;
    await r.fulfill({ json: {
      accounts: populated ? [{ account_id: "synthetic-account", account: "Bookmaker A", type: "Bookie", status: "Active", counts_in_cash_total: true, current_balance: cash, pending_withdrawal_amount: "0.00", last_balance_update: "", group_name: "", platform: "" }] : [],
      sportsbook_bets: populated ? [{ sportsbook_bet_id: "synthetic-bet", bookmaker: "Bookmaker A", event_name: "Synthetic result", status: "Settled", result: "Back Won", date_settled: today + "T12:00", reporting_value: amount, final_net_pnl: amount, projected_current_pnl: amount, counts_as_open: false }] : [],
      free_bets: [], casino_offers: [], each_way_extra_places: [], balance_snapshots: [],
      cash_adjustments: populated ? [{ cash_adjustment_id: "synthetic-cost", adjustment_date: today + "T12:00", adjustment_type: "Deduction", direction: "Out", amount: "7.00", signed_amount: "-7.00", affects_cash_snapshot: false, affects_investment: false }] : [],
      fee_periods: populated ? [{ fee_period_id: "synthetic-fee", profile_id: id, period_start: today, period_end: today, state: "crystallised", current_revision: { total_fee_due: "50.00", management_fee_amount: "10.00", investment_fee_amount: "40.00" }, fee_withdrawn_amount: "10.00", fee_outstanding_amount: "40.00" }] : [],
      tracker_settings: { active_date_preset: "All Dates", custom_start_date: "", custom_end_date: "", range_back_days: 0, range_forward_days: 0 },
    }});
  });
  await page.goto("/profiles");
  const totals = page.getByRole("region", { name: "All-profile headline totals" });
  const cards = totals.locator(".stat-card"), gross = cards.nth(0).locator(".financial-value"), retained = cards.nth(1).locator(".financial-value"), money = cards.nth(2).locator(".financial-value"), fees = cards.nth(3).locator(".financial-value");
  await expect(totals).toBeVisible(); await expect(totals.locator(".financial-value")).toHaveCount(0); release(); gate = null;
  await expect(gross).toHaveAttribute("aria-label", "£ 5.00"); await expect(retained).toHaveAttribute("aria-label", "£ (2.00)");
  await expect(money).toHaveAttribute("aria-label", "£ 1,234,567.89"); await expect(fees).toHaveCount(3);
  await expect(gross).toHaveAttribute("data-money-motion-cycle", /^[1-9]/);
  expect(new Set(requests)).toEqual(new Set(profiles.slice(0, 2).map(p => p.profile_id)));
  for (const [width, theme, scale] of [[1440, "light", 100], [760, "dark", 100], [390, "light", 100], [760, "dark", 200]] as const) {
    await viewport(page, width, theme, scale); await totals.scrollIntoViewIfNeeded(); await fits(page, totals);
    for (let i = 0; i < 4; i++) {
      const values = cards.nth(i).locator(".financial-value");
      const peerCycles = await cards.evaluateAll(nodes => nodes.map(node => [...node.querySelectorAll(".financial-value")].map(n => n.getAttribute("data-money-motion-cycle"))));
      const cycles = await values.evaluateAll(nodes => nodes.map(n => Number(n.getAttribute("data-money-motion-cycle"))));
      await cards.nth(i).locator(".eyebrow").click();
      const after = await values.evaluateAll(nodes => nodes.map(n => Number(n.getAttribute("data-money-motion-cycle"))));
      for (let j = 0; j < cycles.length; j++) expect(after[j], "Card label replays all and only its values").toBeGreaterThan(cycles[j]);
      const nextPeerCycles = await cards.evaluateAll(nodes => nodes.map(node => [...node.querySelectorAll(".financial-value")].map(n => n.getAttribute("data-money-motion-cycle"))));
      for (let peer = 0; peer < 4; peer++) if (peer !== i) expect(nextPeerCycles[peer]).toEqual(peerCycles[peer]);
      for (let frame = 0; frame < 4; frame++) {
        await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => r())));
        expect(await values.evaluateAll(nodes => nodes.every(node => { const a = node.getBoundingClientRect(), b = node.closest(".stat-card")!.getBoundingClientRect(); return a.x >= b.x && a.right <= b.right + 1; })), "Intermediate values fit inside card").toBe(true);
      }
    }
    await page.screenshot({ path: info.outputPath(`profile-cards-${width}-${theme}-${scale}.png`) });
  }
  // Keep the inspected settled value below the existing sticky application header.
  for (const [width, theme, scale] of [[390, "light", 100], [760, "dark", 200]] as const) {
    await viewport(page, width, theme, scale);
    for (const index of [1, 2]) {
      await cards.nth(index).evaluate(el => { const header = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0; window.scrollBy(0, el.getBoundingClientRect().top - header - 24); });
      await expect(cards.nth(index).locator(".financial-value")).toHaveAttribute("data-money-motion", "none");
      await page.screenshot({ path: info.outputPath(`settled-card-${index}-${width}-${theme}-${scale}.png`) });
    }
  }
  await viewport(page, 1440, "light", 100);
  const node = await money.elementHandle(), cycle = await money.getAttribute("data-money-motion-cycle");
  gate = new Promise<void>(r => release = r); archivedFails = true;
  await page.locator('[data-pd-id="profiles.directory.status-filter"]').selectOption("Archived");
  await expect.poll(() => requests.some(id => Number(id.split("-").at(-1)) >= 2)).toBe(true);
  await expect(totals).toHaveAttribute("aria-busy", "false");
  expect(await node!.evaluate(el => el.isConnected), "Archived read must not remount Active totals").toBe(true);
  await expect(money).toHaveAttribute("aria-label", "£ 1,234,567.89");
  const archivedFailure = page.waitForResponse(r => r.url().endsWith("/tracker-summary-sources") && r.status() === 503);
  release(); gate = null; await archivedFailure;
  await expect(page.locator('[data-pd-id^="profiles.directory.row."]').first()).toContainText("Unavailable");
  expect(await node!.evaluate(el => el.isConnected)).toBe(true);
  await expect(totals).toHaveAttribute("aria-busy", "false"); await expect(money).toHaveAttribute("aria-label", "£ 1,234,567.89");
  expect(await money.getAttribute("data-money-motion-cycle")).toBe(cycle);
  expect(new Set(requests).size, "Only visible archived page joins Active summaries").toBeLessThan(27);
  // The existing failed-source retry reuses the same request scope. Changes replace
  // motion in place; unrelated directory renders do not start a new first display.
  const grossNode = await gross.elementHandle();
  for (const [next, label, direction] of [["-5.00", "£ (5.00)", "down"], ["2.00", "£ 2.00", "up"]]) {
    amount = next;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(gross).toHaveAttribute("aria-label", label);
    await expect(gross).toHaveAttribute("data-money-motion", direction);
    expect(await grossNode!.evaluate(el => el.isConnected)).toBe(true);
    expect(await gross.locator('[aria-hidden="true"]').count()).toBeGreaterThan(0);
  }
  const unchangedCycle = await gross.getAttribute("data-money-motion-cycle");
  await page.locator('[data-pd-id="profiles.directory.search"]').fill("Synthetic CP042");
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  expect(await gross.getAttribute("data-money-motion-cycle")).toBe(unchangedCycle);
  await page.emulateMedia({ reducedMotion: "reduce" }); await expect(money).toHaveAttribute("data-money-motion", "none");
  const reducedCycle = await money.getAttribute("data-money-motion-cycle"); await cards.nth(2).locator(".eyebrow").click(); expect(await money.getAttribute("data-money-motion-cycle")).toBe(reducedCycle);
  await money.evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); getSelection()!.removeAllRanges(); getSelection()!.addRange(range); });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]); await page.keyboard.press(process.platform === "darwin" ? "Meta+c" : "Control+c"); expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("£ 1,234,567.89");
  activeFails = true; await page.reload(); await expect(cards.nth(0)).toContainText("unavailable"); await expect(totals.locator(".financial-value")).toHaveCount(0);
  activeFails = false; amount = "0.00"; cash = "0.00";
  await page.route("**/api/fund-manager/preferences/financial-motion", r => r.fulfill({ json: { enabled: false, replay_delay_ms: 1500, duration_ms: 520, stagger_ms: 80 } }));
  await page.emulateMedia({ reducedMotion: "no-preference" }); await page.reload(); await expect(gross).toHaveAttribute("aria-label", "£ -"); await expect(gross).toHaveAttribute("data-money-motion", "none"); await expect(fees.first()).toHaveAttribute("data-money-motion", "none");
  const disabled = await fees.first().getAttribute("data-money-motion-cycle"); await cards.nth(3).locator(".eyebrow").click(); expect(await fees.first().getAttribute("data-money-motion-cycle")).toBe(disabled);
  profiles.forEach(profile => { profile.status = "Archived"; }); await page.reload();
  await expect(totals.locator(".financial-value")).toHaveCount(4);
  for (const value of await totals.locator(".financial-value").all()) await expect(value).toHaveAttribute("aria-label", "£ -");
  await expect(cards.nth(3)).toContainText("No crystallised fee periods in this range");
  expect(errors).toEqual([]);
});
