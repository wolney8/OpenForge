import { expect, test } from "@playwright/test";

test.use({ actionTimeout: 15000 });
test("daily tasks open exact records, retain clear state and refresh truthful source evidence", async ({ page, playwright }, info) => {
  test.setTimeout(240000);
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Authorised synthetic session required");
  const health = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
  expect(["test", "preview"]).toContain(health.runtime_role);
  if (health.runtime_role === "preview") expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
  const anonymous = await playwright.request.newContext({ baseURL: info.project.use.baseURL, storageState: { cookies: (await page.context().storageState()).cookies.filter(cookie => cookie.name !== "pd_session"), origins: [] } });
  expect((await anonymous.get("/api/fund-manager/notifications")).status()).toBe(401);
  if (health.runtime_role === "preview") { const denied = await anonymous.get("/tasks", { maxRedirects: 0 }); expect(denied.status()).toBe(307); expect(denied.headers().location).toContain("/login"); }
  await anonymous.dispose();
  const cleanup = await playwright.request.newContext({ baseURL: info.project.use.baseURL, storageState: await page.context().storageState() });
  const response = await page.request.post("/api/profiles/onboarding", { data: { accounts: [], display_name: `Synthetic CP049 Tasks ${Date.now()}`, profile_code: `C49-T-${Date.now()}`, management_fee_percent: "0", investment_fee_percent: "0", enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments"], quick_actions: [], setup_path: "import", tracking_start_date: "2026-09-01" } });
  expect(response.status(), await response.text()).toBe(201);
  const profile = (await response.json()).profile, base = `/api/profiles/${profile.profile_id}`;
  expect(Number(profile.management_fee_percent)).toBe(0); expect(Number(profile.investment_fee_percent)).toBe(0);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  try {
    let accountId = "";
    for (const [account, type] of [["Bet365", "Bookie"], ["Smarkets", "Exchange"]]) {
      const added = await page.request.post(`${base}/accounts`, { data: { account, type, status: "Active", lifecycle_status: "Active", channel: "Online", current_balance: type === "Bookie" ? "" : "0.00", stake_access: "Normal", promo_access: "Full", restrictions: [], ...(type === "Exchange" ? { commission_rate: "0.02" } : {}) } });
      expect(added.status(), await added.text()).toBe(201); if (type === "Bookie") accountId = (await added.json()).account_id;
    }
    const payload = { event_name: "Synthetic daily settlement", offer_text: "CP049 task routing", bookmaker: "Bet365", offer_type: "Bet & Get", bet_type: "Single", fixture_type: "Football", match_strategy: "Standard", status: "Placed", result: "Pending", back_stake: "10", back_odds: "3", lay_odds_1: "3.1", lay_actual: "9.74", lay_matched_stake_1: "9.74", lay_commission_1: "0.02", exchange_name: "Smarkets", user_notes: "Saved task note" };
    const created = await page.request.post(`${base}/sportsbook-bets`, { data: payload }); expect(created.status(), await created.text()).toBe(201);
    const bet = await created.json();
    const expiry = new Date(Date.now()+2*86400000).toISOString();
    const rewardResponse = await page.request.post(`${base}/free-bets`, { data: { ...payload, event_name: "Synthetic expiring reward", status: "Available", retention_mode: "SNR", free_bet_value: "10", expiry_datetime: expiry, origin_qual_bet_id: "", offer_group_id: "" } });
    expect(rewardResponse.status(), await rewardResponse.text()).toBe(201); const reward = await rewardResponse.json();
    await page.goto("/tasks"); await expect(page.getByRole("heading", { name: "Daily tasks", exact: true })).toBeVisible();
    await expect(page.getByRole("button", {name:"Open navigation drawer",exact:true})).toBeVisible();
    const filter = page.getByRole("combobox", { name: "Filter tasks by Profile" }); await filter.selectOption(profile.profile_id);
    const cards = page.locator('[data-pd-id="notifications.history.list"] article'); await expect(cards).toHaveCount(3);
    const settlement = page.locator(`[data-pd-id="tasks.item.${bet.sportsbook_bet_id}"]`), account = page.locator(`[data-pd-id="tasks.item.${accountId}"]`), freebet = page.locator(`[data-pd-id="tasks.item.${reward.free_bet_id}"]`);
    await expect(settlement).toContainText("result Pending"); await expect(settlement).toContainText("Due time unavailable");
    await expect(account).toContainText("Balance not recorded"); await expect(freebet).toContainText("3-day alert window");
    await expect(cards.getByRole("button", { name: /Mark task done/ })).toHaveCount(0);
    for (const [width, theme, scale] of [[1440,"light",100],[390,"dark",100],[760,"light",200]] as const) {
      await page.setViewportSize({ width, height: 920 }); await page.emulateMedia({ reducedMotion: "reduce" });
      await page.evaluate(({theme,scale}) => { document.documentElement.dataset.theme=theme; document.documentElement.style.fontSize=`${scale}%`; }, {theme,scale});
      await expect(cards).toHaveCount(3);
      const geometry = await page.locator('[data-pd-id="tasks.page"]').evaluate(root => {
        const rect=root.getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth>window.innerWidth+1, clipped:[...root.querySelectorAll<HTMLElement>('article a, article button, select, input')].some(e => { const b=e.getBoundingClientRect(); return b.width<24 || b.right>window.innerWidth+1 || b.left<0 || (e.tagName==='A' && e.scrollWidth>e.clientWidth+1); }), width:rect.width };
      }); expect(geometry.overflow).toBe(false); expect(geometry.clipped).toBe(false);
      await page.screenshot({ path: info.outputPath(`tasks-${width}-${theme}-${scale}.png`), fullPage: true });
    }
    await page.evaluate(() => { document.documentElement.style.fontSize="100%"; }); await page.setViewportSize({width:1440,height:920});
    await settlement.getByRole("link").focus(); await expect(settlement.getByRole("link")).toBeFocused(); await page.keyboard.press("Enter");
    const editor=page.getByRole("dialog",{name:"Edit sportsbook row",exact:true}); await expect(editor).toBeVisible(); await expect(editor.locator('input[value="Synthetic daily settlement"]')).toHaveValue("Synthetic daily settlement");
    await editor.getByRole("tab",{name:/Settlement/}).click(); await editor.locator('[data-pd-id="ledger-editor.panel.settlement"]').getByText("Advanced controls",{exact:true}).click();
    const notes=editor.locator('[data-pd-id="ledger-editor.panel.settlement"]').getByRole("textbox",{name:"Notes",exact:true}); await notes.fill("Task draft discarded"); await editor.getByRole("button",{name:"Revert",exact:true}).click(); await expect(notes).toHaveValue("Saved task note");
    await page.goto("/tasks"); await filter.selectOption(profile.profile_id); await expect(cards).toHaveCount(3);
    await account.getByRole("link").click(); await expect(page.getByRole("dialog",{name:"Edit account",exact:true})).toBeVisible();
    await expect(page.getByRole("dialog",{name:"Edit account",exact:true}).locator('input[value="Bet365"]')).toHaveValue("Bet365");
    await page.goto("/tasks"); await filter.selectOption(profile.profile_id);
    await page.route('**/fund-manager/notifications/state', route => route.request().method() === "PUT" ? route.fulfill({status:503,json:{detail:"Synthetic state failure"}}) : route.continue());
    await freebet.getByRole("button",{name:"Clear Review expiring Free Bet",exact:true}).click(); await freebet.getByRole("button",{name:"Clear",exact:true}).click();
    await expect(page.locator('[data-pd-id="tasks.page"] [role="alert"]')).toContainText("Unable to clear"); await expect(freebet).toBeVisible();
    await page.unroute('**/fund-manager/notifications/state');
    await freebet.getByRole("button",{name:"Clear Review expiring Free Bet",exact:true}).click(); await freebet.getByRole("button",{name:"Clear",exact:true}).click(); await expect(freebet).toHaveCount(0);
    await page.reload(); await filter.selectOption(profile.profile_id); await expect(cards).toHaveCount(2);
    await page.getByRole("combobox",{name:"Filter notifications by status"}).selectOption("cleared"); await expect(freebet).toBeVisible();
    await page.getByRole("combobox",{name:"Filter notifications by status"}).selectOption("new");
    await account.getByRole("link").click();
    await page.getByRole("dialog",{name:"Edit account",exact:true}).getByRole("button",{name:"Review Account Bet365",exact:true}).click();
    const review=page.getByRole("dialog",{name:"Account review",exact:true});
    await review.getByRole("textbox",{name:"Observed balance",exact:true}).fill("0.00");
    await review.getByRole("button",{name:"Confirm balance",exact:true}).click();
    await expect(review.locator('[data-pd-id="account.review.confirmation-status"]')).toHaveText("Balance confirmed. This does not create betting profit.");
    await review.getByRole("button",{name:"Close",exact:true}).click();
    await page.goto("/tasks"); await filter.selectOption(profile.profile_id);
    await expect(account).toHaveCount(0); await expect(settlement).toBeVisible();
    let releaseOld!: () => void, captured!: () => void;
    const held = new Promise<void>(resolve => { releaseOld = resolve; });
    const capturedResponse = new Promise<void>(resolve => { captured = resolve; });
    let first = true;
    await page.route('**/fund-manager/notifications', async route => {
      if (!first) return route.continue(); first = false;
      const old = await route.fetch(); captured(); await held; await route.fulfill({response:old});
    });
    await settlement.getByRole("link").click(); await capturedResponse;
    const settled=await page.request.put(`${base}/sportsbook-bets/${bet.sportsbook_bet_id}`,{data:{...payload,status:"Settled",result:"Back Won"}});expect(settled.ok(),await settled.text()).toBe(true);
    await page.getByRole("button",{name:"Refresh tasks",exact:true}).click(); await expect(settlement).toHaveCount(0);
    const oldFinished = page.waitForResponse(response => response.url().endsWith('/fund-manager/notifications'));
    releaseOld(); await oldFinished; await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/tasks$/); await expect(settlement).toHaveCount(0);
    await page.unroute('**/fund-manager/notifications');
    await page.route('**/fund-manager/notifications',route=>route.fulfill({status:503,json:{detail:"Synthetic unavailable"}}));
    await page.getByRole("button",{name:"Refresh tasks",exact:true}).click(); await expect(page.getByRole("alert").filter({hasText:"temporarily unavailable"})).toBeVisible(); await expect(cards).toHaveCount(0);
    await page.unroute('**/fund-manager/notifications'); await page.getByRole("button",{name:"Refresh tasks",exact:true}).click(); await expect(page.getByText("No current tasks match these filters.", {exact:true})).toBeVisible();
    await page.goto("/notifications"); await page.getByRole("searchbox",{name:"Search notifications by name or context"}).fill(profile.display_name); await expect(page.locator('[data-pd-id="notifications.history.list"]')).toContainText("Review unsettled bet");
    expect(errors).toEqual([]);
  } catch (error) { console.error("Primary workflow failure", error); throw error; } finally { const archived=await cleanup.patch(base,{data:{status:"Archived"}}); expect(archived.ok(),await archived.text()).toBe(true); await cleanup.dispose(); }
});
