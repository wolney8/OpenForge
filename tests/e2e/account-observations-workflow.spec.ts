import { expect, test } from "@playwright/test";
test.use({ actionTimeout: 15000 });

test("ledger Account review confirms exact observations and returns to the unchanged bet draft", async ({ page, playwright }, info) => {
  test.setTimeout(240000);
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Authorised synthetic session required");
  const health = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
  expect(["test", "preview"]).toContain(health.runtime_role);
  if (health.runtime_role === "preview") expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
  const cleanup = await playwright.request.newContext({ baseURL: info.project.use.baseURL, storageState: await page.context().storageState() });
  const response = await page.request.post("/api/profiles/onboarding", { data: { accounts: [], display_name: `Synthetic CP047 Observations ${Date.now()}`, profile_code: `C47-O-${Date.now()}`, enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments"], quick_actions: [], setup_path: "import", tracking_start_date: "2026-09-01" } });
  expect(response.status(), await response.text()).toBe(201);
  const profile = (await response.json()).profile, base = `/api/profiles/${profile.profile_id}`;
  try {
    let accountId = "";
    for (const [account, type] of [["Bet365", "Bookie"], ["Smarkets", "Exchange"]]) {
      const added = await page.request.post(`${base}/accounts`, { data: { account, type, status: "Active", lifecycle_status: "Active", channel: "Online", current_balance: "", restrictions: [], ...(type === "Exchange" ? { commission_rate: "0.02" } : {}) } });
      expect(added.status(), await added.text()).toBe(201); if (type === "Bookie") accountId = (await added.json()).account_id;
    }
    const created = await page.request.post(`${base}/sportsbook-bets`, { data: { event_name: "Synthetic Account review", offer_text: "CP047 Account review", bookmaker: "Bet365", offer_type: "Bet & Get", bet_type: "Single", fixture_type: "Football", match_strategy: "Standard", status: "Placed", result: "Pending", back_stake: "10", back_odds: "3", lay_odds_1: "3.1", lay_actual: "9.74", lay_matched_stake_1: "9.74", lay_commission_1: "0.02", exchange_name: "Smarkets", user_notes: "Saved note" } });
    expect(created.status(), await created.text()).toBe(201); const bet = await created.json();
    const url = `${base}/accounts/${accountId}/balance-observations`, betUrl = `${base}/sportsbook-bets/${bet.sportsbook_bet_id}`;
    let betWrites = 0; page.on("request", r => { if (r.method() === "PUT" && r.url().endsWith(betUrl)) betWrites++; });
    await page.goto(`/profiles/${profile.profile_id}/tracker/sportsbook-bets?record=${bet.sportsbook_bet_id}`);
    const editor = page.getByRole("dialog", { name: "Edit sportsbook row", exact: true });
    await editor.getByRole("tab", { name: /Settlement/ }).click();
    await editor.locator('[data-pd-id="ledger-editor.panel.settlement"]').getByText("Advanced controls", { exact: true }).click();
    const notes = editor.locator('[data-pd-id="ledger-editor.panel.settlement"]').getByRole("textbox", { name: "Notes", exact: true });
    await notes.fill("Unsaved bet context retained");
    await editor.getByRole("tab", { name: /Bet Setup/ }).click();
    const trigger = editor.getByRole("button", { name: "Review Account Bet365", exact: true });
    await trigger.click();
    const panel = page.getByRole("dialog", { name: "Account review", exact: true });
    await expect(panel).toContainText(profile.display_name);
    await expect(panel).toContainText("No recorded confirmation");
    await expect(panel.getByRole("button", { name: "Confirm balance", exact: true })).toBeDisabled();
    const amount = panel.getByRole("textbox", { name: "Observed balance", exact: true });
    await amount.fill("208.51"); await panel.getByRole("textbox", { name: "Balance observation reason" }).fill("Manual account review");
    await page.route(`**${url}`, r => r.request().method() === "POST" ? r.fulfill({ status: 503, json: { detail: "Synthetic failed confirmation" } }) : r.continue());
    await panel.getByRole("button", { name: "Confirm balance", exact: true }).click(); await expect(panel.getByRole("alert")).toHaveText("Synthetic failed confirmation");
    expect((await (await page.request.get(url)).json()).observations).toHaveLength(0);
    expect(betWrites).toBe(0);
    await expect(amount).toHaveValue("208.51"); await page.unroute(`**${url}`);
    async function confirm() { await panel.getByRole("button", { name: "Confirm balance", exact: true }).click(); await expect(panel.locator('[data-pd-id="account.review.confirmation-status"]')).toHaveText("Balance confirmed. This does not create betting profit."); }
    await confirm(); await amount.fill("208.68"); await confirm(); await confirm();
    const history = panel.getByRole("region", { name: "Previous balance observations" });
    await expect(history.locator("tbody tr")).toHaveCount(3);
    await expect(history.locator("tbody tr").nth(1)).toContainText("£ 0.17");
    await expect(history.locator("tbody tr").first()).toContainText("£ -");
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await history.getByRole("button", { name: "Copy Observed balance £ 208.68", exact: true }).first().click(); expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("208.68");
    for (const [width, theme, scale] of [[1440,"light",100],[390,"dark",100],[760,"light",200]] as const) {
      await page.setViewportSize({ width, height: 1100 }); await page.evaluate(({theme,scale}) => { document.documentElement.dataset.theme=theme; document.documentElement.style.fontSize=`${scale}%`; }, {theme,scale});
      await amount.focus(); await expect(amount).toBeFocused(); await page.keyboard.press("Tab"); await expect(panel.getByRole("textbox", { name: "Balance observation reason" })).toBeFocused();
      expect(await panel.evaluate(el => { const r=el.getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth+1 && document.documentElement.scrollWidth<=innerWidth+1; })).toBe(true);
      await amount.focus();
      await page.screenshot({ path: info.outputPath(`account-review-${width}-${theme}-${scale}.png`) });
      const fieldBounds = await amount.evaluate(el => { const r=el.getBoundingClientRect(); const panel=el.closest('[role="dialog"]')!; const p=panel.getBoundingClientRect(),f=panel.querySelector('.workflow-editor-footer')!.getBoundingClientRect(); return {field:r.toJSON(),panel:p.toJSON(),footer:f.toJSON(),visible:r.left>=p.left && r.right<=p.right && r.top>=p.top && r.bottom<=Math.min(p.bottom,f.top)+1}; });
      expect(fieldBounds.visible, JSON.stringify({width,scale,...fieldBounds})).toBe(true);
    }
    await page.emulateMedia({ reducedMotion: "reduce" }); await page.evaluate(() => document.documentElement.style.fontSize="100%");
    await amount.fill("99"); await panel.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Discard Changes", exact: true }).click(); await expect(panel).toBeHidden(); await expect(trigger).toBeFocused();
    await editor.getByRole("tab", { name: /Settlement/ }).click(); await expect(notes).toHaveValue("Unsaved bet context retained");
    expect(betWrites).toBe(0);
    const savedBet = await (await page.request.get(betUrl)).json(); expect(savedBet.user_notes).toBe("Saved note"); expect(savedBet.reporting_value).toBe(bet.reporting_value);
    expect(await (await page.request.get(`${base}/casino-offers`)).json()).toEqual([]);
    await editor.getByRole("tab", { name: /Bet Setup/ }).click(); await trigger.click(); await expect(panel.getByRole("region", { name: "Previous balance observations" }).locator("tbody tr")).toHaveCount(3); await expect(amount).toHaveValue("208.68");
    await page.keyboard.press("Escape"); await expect(panel).toBeHidden(); await expect(editor).toBeVisible(); await expect(trigger).toBeFocused();
    await editor.getByRole("button", { name: "Revert", exact: true }).click();
  } finally { const archived = await cleanup.patch(`/api/profiles/${profile.profile_id}`, { data: { status: "Archived" } }); expect(archived.ok(), await archived.text()).toBe(true); await cleanup.dispose(); }
});
