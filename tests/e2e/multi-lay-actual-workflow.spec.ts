import { expect, test } from "@playwright/test";
test.use({ actionTimeout: 15000 });

test("Normal Multi-Lay records changed-odds fills, survives Save/Discard and settles actual cash", async ({ page, playwright }, info) => {
  test.setTimeout(240_000);
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Authorised synthetic session required");
  const health = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
  expect(["test", "preview"]).toContain(health.runtime_role);
  if (health.runtime_role === "preview") expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
  const cleanup = await playwright.request.newContext({ baseURL: info.project.use.baseURL, storageState: await page.context().storageState() });
  const response = await page.request.post("/api/profiles/onboarding", { data: { accounts: [], display_name: `Synthetic CP047 MultiLay ${Date.now()}`, profile_code: `C47-${Date.now()}`, enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments"], quick_actions: [], setup_path: "import", tracking_start_date: "2026-09-01" } });
  expect(response.status(), await response.text()).toBe(201);
  const profile = (await response.json()).profile, base = `/api/profiles/${profile.profile_id}`;
  try {
    let exchangeId = "";
    for (const [account, type] of [["Bet365", "Bookie"], ["Smarkets", "Exchange"]]) {
      const added = await page.request.post(`${base}/accounts`, { data: { account, type, status: "Active", lifecycle_status: "Active", channel: "Online", restrictions: [], ...(type === "Exchange" ? { commission_rate: "0.05" } : {}) } });
      expect(added.status(), await added.text()).toBe(201); if (type === "Exchange") exchangeId = (await added.json()).account_id;
    }
    const plan = await page.request.post(`${base}/sportsbook-bets`, { data: { event_name: "CP047 synthetic market", offer_text: "CP047 operational Normal", bookmaker: "Bet365", offer_type: "Bet & Get", bet_type: "Single", fixture_type: "Football", match_strategy: "Multilay", status: "Prospecting", result: "Pending", back_stake: "10", back_odds: "4", lay_odds_1: "2.5", exchange_name: "Smarkets", date_settled: "2026-09-25T12:00", multi_lay_outcome_1_name: "Home", multi_lay_outcomes_json: JSON.stringify([{ id: "outcome1", label: "Home", layOdds: "2.5", commission: "0.05", calculationVersion: "multi-lay-v2", backingType: "normal" }, { id: "outcome2", label: "Away", layOdds: "3", commission: "0.02" }]) } });
    expect(plan.status(), await plan.text()).toBe(201); const row = await plan.json(); const url = `${base}/sportsbook-bets/${row.sportsbook_bet_id}`;
    const route = `/profiles/${profile.profile_id}/tracker/sportsbook-bets?record=${row.sportsbook_bet_id}`;
    await page.goto(route);
    const editor = page.getByRole("dialog");
    const actual = editor.locator('[data-pd-id="sportsbook.multi-lay.actual"]');
    await editor.getByRole("tab", { name: /Matching/ }).click();
    await actual.getByRole("button", { name: "Record actual placements", exact: true }).click();
    await actual.getByLabel("Actual Exchange Account", { exact: true }).selectOption(exchangeId);
    await actual.getByLabel("Exchange market", { exact: true }).fill("Match winner");
    await actual.getByLabel("Actual market commission (%)", { exact: true }).fill("5");
    for (const [leg, index, stake, odds] of [["Home", 1, "6", "2.5"], ["Home", 2, "4", "3"], ["Away", 1, "8", "4"]] as const) {
      await actual.getByRole("button", { name: `Add fill for ${leg}`, exact: true }).click();
      await actual.getByLabel(`${leg} fill ${index} matched stake`, { exact: true }).fill(stake);
      await actual.getByLabel(`${leg} fill ${index} actual odds`, { exact: true }).fill(odds);
    }
    for (const leg of ["Home", "Away"]) await actual.getByLabel(`${leg} unmatched stake`, { exact: true }).fill("0");
    await expect(actual.locator('[data-pd-id="sportsbook.multi-lay.actual.outcomes"]')).toContainText("£ 7.10");
    await expect(actual.getByLabel("Actual exchange exposure: £ 14.00", { exact: true })).toBeVisible();
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await actual.getByRole("button", { name: "Copy Actual exchange exposure £ 14.00", exact: true }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("14.00");
    expect((await (await page.request.get(url)).json()).status).toBe("Prospecting");
    const save = async () => { const pending = page.waitForResponse(r => r.url().endsWith(url) && r.request().method() === "PUT", { timeout: 15000 }); await editor.getByRole("button", { name: "Save", exact: true }).click(); const r = await pending; expect(r.status(), await r.text()).toBe(200); return r.json(); };
    // A rejected save leaves the complete draft available for retry.
    await page.route(`**${url}`, async r => { if (r.request().method() === "PUT") { return r.fulfill({ status: 503, json: { detail: "Synthetic temporary write failure" } }); } return r.continue(); });
    const failure = page.waitForResponse(r => r.url().endsWith(url) && r.request().method() === "PUT");
    await editor.getByRole("button", { name: "Save", exact: true }).click(); expect((await failure).status()).toBe(503); await page.unroute(`**${url}`);
    await expect(actual.getByLabel("Home fill 2 actual odds", { exact: true })).toHaveValue("3");
    expect((await (await page.request.get(url)).json()).status).toBe("Prospecting");
    await save();
    expect((await (await page.request.get(url)).json()).reporting_value).toBe("7.10");
    await page.goto(route); await editor.getByRole("tab", { name: /Matching/ }).click();
    await expect(actual.getByLabel("Home fill 2 actual odds", { exact: true })).toHaveValue("3");
    // Explicit Revert preserves saved actuals and Notes stay financially neutral.
    await actual.getByLabel("Home fill 2 matched stake", { exact: true }).fill("99");
    await editor.getByRole("button", { name: "Revert", exact: true }).click();
    await expect(actual.getByLabel("Home fill 2 matched stake", { exact: true })).toHaveValue("4");
    for (const [width, theme, scale] of [[1440, "light", 100], [390, "dark", 100], [760, "light", 200]] as const) {
      await page.setViewportSize({ width, height: 1100 });
      await page.evaluate(({ theme, scale }) => { document.documentElement.dataset.theme = theme; document.documentElement.style.fontSize = `${scale}%`; }, { theme, scale });
      const geometry = await actual.evaluate(el => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1,
        clipped: [...el.querySelectorAll<HTMLInputElement>("input,select")].filter(n => { const r = n.getBoundingClientRect(), p = n.parentElement!.getBoundingClientRect(); return r.width > 0 && (r.left < p.left - 1 || r.right > p.right + 1); }).map(n => n.getAttribute("aria-label") || n.name) }));
      expect(geometry, `${width}/${theme}/${scale}`).toEqual({ overflow: false, clipped: [] });
      await actual.getByLabel("Home fill 1 matched stake", { exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath(`actual-${width}-${theme}-${scale}.png`), fullPage: false });
      await actual.getByLabel("Away unmatched stake", { exact: true }).focus(); await expect(actual.getByLabel("Away unmatched stake", { exact: true })).toBeFocused(); await page.keyboard.press("Tab");
      expect(await actual.evaluate(el => el.contains(document.activeElement))).toBe(true);
      const focus = actual.getByLabel("Home fill 1 matched stake", { exact: true });
      await focus.focus();
      expect(await focus.evaluate(el => { const r=el.getBoundingClientRect(); const dialog=el.closest('[role="dialog"]')!.getBoundingClientRect(); const footer=el.closest('[role="dialog"]')!.querySelector('.workflow-editor-footer')!.getBoundingClientRect(); return r.top >= dialog.top-1 && r.bottom <= Math.min(dialog.bottom,footer.top)+1; }), `${width}/${scale}: focused field clears the footer`).toBe(true);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => document.documentElement.style.fontSize = "100%"); await page.setViewportSize({ width: 1440, height: 1100 });
    await editor.getByRole("tab", { name: /Settlement/ }).click();
    await editor.getByRole("combobox", { name: "Result", exact: true }).selectOption("Outcome 2 Won");
    const settled = await save(); expect(settled.final_net_pnl).toBe("16.00");
    await page.goto(route); await editor.getByRole("tab", { name: /Settlement/ }).click();
    await expect(editor.getByRole("combobox", { name: "Result", exact: true })).toHaveValue("Outcome 2 Won");
    await editor.locator("summary").filter({ hasText: "History" }).click();
    await expect(editor.locator(".financial-history-list")).toContainText("Placement recorded");
    await expect(editor.locator(".financial-history-list")).toContainText("Settled");
    const settledHistory = editor.locator(".financial-history-event").filter({ hasText: "Settled" }).first();
    await expect(settledHistory).toContainText("£ 16.00");
    await settledHistory.getByText("Recorded fills", { exact: true }).click();
    await expect(settledHistory.locator("tbody tr")).toHaveCount(3);
    const history = await (await page.request.get(`${base}/financial-history/sportsbook/${row.sportsbook_bet_id}`)).json();
    expect(history.map((e: { operation: string }) => e.operation)).toContain("placement_recorded");
    expect(history.map((e: { operation: string }) => e.operation)).toContain("settled");
    await page.screenshot({ path: info.outputPath("normal-multi-lay-settled.png"), fullPage: false });
    await page.goto(`/profiles/${profile.profile_id}/tracker/reports`);
    const report = page.locator('[data-pd-id="reports.period-pnl"]');
    const total = report.locator('[data-pd-id="reports.period-pnl.total"] .financial-value');
    await expect(total).toHaveAttribute("aria-label", "£ 16.00", { timeout: 60000 });
    await report.getByLabel("P&L week containing").fill("2026-09-25");
    await expect(total).toHaveAttribute("aria-label", "£ 16.00");
    await expect(report.locator('[data-pd-id="reports.period-pnl.records"] > ul > li')).toHaveCount(1);
    const correction = { ...settled, result: "Outcome 1 Won", multi_lay_correction_reason: "Synthetic corrected outcome" };
    for (let attempt = 0; attempt < 2; attempt++) {
      const saved = await page.request.put(url, { data: correction });
      expect(saved.status(), await saved.text()).toBe(200);
      expect((await saved.json()).reporting_value).toBe("21.00");
    }
    await page.reload(); await expect(total).toHaveAttribute("aria-label", "£ 21.00", { timeout: 60000 });
    await expect(report.locator('[data-pd-id="reports.period-pnl.records"] > ul > li')).toHaveCount(1);
    const correctedHistory = await (await page.request.get(`${base}/financial-history/sportsbook/${row.sportsbook_bet_id}`)).json();
    expect(correctedHistory.filter((e: { operation: string }) => e.operation === "corrected")).toHaveLength(1);
  } finally {
    const archived = await cleanup.patch(`/api/profiles/${profile.profile_id}`, { data: { status: "Archived" } });
    expect(archived.ok(), await archived.text()).toBe(true); await cleanup.dispose();
  }
});
