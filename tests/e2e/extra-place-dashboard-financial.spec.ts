import { expect, test, type Page, type Locator } from "@playwright/test";

test.use({ actionTimeout: 15_000 });
async function preflight(page: Page) {
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Authorised isolated/Preview session required");
  const h = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
  expect(["test", "preview"]).toContain(h.runtime_role);
  if (h.runtime_role === "preview") expect(h.database_identity).toBe("preview:plum_duff_preview_cp028");
  expect((await page.request.get("/api/auth/session")).status()).toBe(200);
}
async function create(page: Page, suffix: string) {
  const r = await page.request.post("/api/profiles/onboarding", { data: { accounts: [], display_name: `Synthetic CP043 ${suffix} ${Date.now()}`, profile_code: `C43-${suffix.toUpperCase()}-${Date.now()}`, enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments", "each-way-extra-places"], quick_actions: [], setup_path: "import", tracking_start_date: "2026-09-01" } });
  expect(r.status(), await r.text()).toBe(201); const id = (await r.json()).profile.profile_id;
  const settings = await (await page.request.get(`/api/profiles/${id}/tracker-settings`)).json();
  expect((await page.request.put(`/api/profiles/${id}/tracker-settings`, { data: { ...settings, active_date_preset: "Week (Mon-Sun)", weekly_extra_place_loss_budget: "15" } })).ok()).toBeTruthy();
  return id as string;
}
async function seed(page: Page, id: string) {
  for (const [account, type, balance] of [["Bet365", "Bookie", "100.00"], ["Smarkets", "Exchange", "50.00"]]) {
    const r = await page.request.post(`/api/profiles/${id}/accounts`, { data: { account, type, status: "Active", lifecycle_status: "Active", channel: "Online", stake_access: "Normal", promo_access: "Full", restrictions: [], current_balance: balance, pending_withdrawal_amount: "0.00", ...(type === "Exchange" ? { commission_rate: "0" } : {}) } }); expect(r.status(), await r.text()).toBe(201);
  }
  const today = new Date().toISOString().slice(0,10);
  const otherDate = new Date(today + "T12:00:00Z"); otherDate.setUTCDate(otherDate.getUTCDate() + (otherDate.getUTCDay() === 1 ? 1 : -1));
  const common = { placed_at: today + "T12:00", race: "Synthetic CP043 race", bookmaker: "Bet365", bookmaker_account: "Bet365", mode: "Extra Place", each_way_stake: "5.00", back_odds: "26.00", place_term_numerator: "1", place_term_denominator: "5", bookmaker_places: "5", exchange_places: "4", win_exchange: "Smarkets", win_lay_odds: "29.00", actual_win_lay_stake: "4.48", place_exchange: "Smarkets", place_lay_odds: "7.962", actual_place_lay_stake: "3.75" };
  const rows = [];
  for (const [runner, status, result] of [["Synthetic pending", "Placed", "Pending"], ["Synthetic settled", "Settled", "Extra Place"]]) {
    const r = await page.request.post(`/api/profiles/${id}/each-way-extra-places`, { data: { ...common, placed_at: (status === "Placed" ? otherDate.toISOString().slice(0,10) : today) + "T12:00", runner, status, result } }); expect(r.status(), await r.text()).toBe(201); rows.push(await r.json());
  }
  expect(rows[0].current_value).toBe("-1.77"); expect(rows[1].final_value).toBe("28.23"); return rows;
}
async function moneyChecks(page: Page, card: Locator, info: import("@playwright/test").TestInfo, prefix: string) {
  const values = card.locator(".financial-value");
  await page.emulateMedia({reducedMotion:"no-preference"});
  await expect.poll(()=>values.evaluateAll(ns=>ns.every(n=>["£ -","Unavailable"].includes(n.getAttribute("aria-label")??"") || Number(n.getAttribute("data-money-motion-cycle"))>0))).toBe(true);
  await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
  for (const [width, theme, scale] of [[1440,"light",100],[390,"dark",100],[760,"light",200],[760,"dark",200]] as const) {
    const beforeTheme = await values.evaluateAll(ns=>ns.map(n=>n.getAttribute("data-money-motion-cycle")));
    await page.setViewportSize({ width, height: 1000 }); await page.evaluate(({theme,scale}) => { document.documentElement.dataset.theme=theme; document.documentElement.style.fontSize=scale+"%"; }, {theme,scale});
    await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));
    expect(await values.evaluateAll(ns=>ns.map(n=>n.getAttribute("data-money-motion-cycle")))) .toEqual(beforeTheme);
    await card.scrollIntoViewIfNeeded();
    const labels = await values.evaluateAll(ns => ns.map(n => n.getAttribute("aria-label")));
    const cycles = await values.evaluateAll(ns => ns.map(n => Number(n.getAttribute("data-money-motion-cycle"))));
    await card.locator(".eyebrow").first().click();
    for (let i=0;i<labels.length;i++) if (labels[i] !== "£ -" && labels[i] !== "Unavailable") expect(Number(await values.nth(i).getAttribute("data-money-motion-cycle"))).toBeGreaterThan(cycles[i]);
    for(let frame=0;frame<4;frame++) {
      await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => r())));
      expect(await values.evaluateAll(ns => ns.every(n => {const a=n.getBoundingClientRect(),b=n.closest("article")!.getBoundingClientRect();return a.left>=b.left && a.right<=b.right+1;})), "Financial values fit their card during motion").toBe(true);
      expect(await values.evaluateAll(ns=>ns.map(n=>n.getAttribute("aria-label")))).toEqual(labels);
      expect(await values.evaluateAll(ns=>ns.every(n=>{
        const canonical=n.querySelector(".financial-value-canonical-text")!,visual=n.querySelector(".financial-value-visual")!;
        const a=canonical.getBoundingClientRect(),glyphWidth=Array.from(visual.children).reduce((sum,child)=>sum+child.getBoundingClientRect().width,0);
        return Math.abs(a.width-glyphWidth)<1.5 && !n.querySelector('[aria-live], [tabindex]') && visual.getAttribute("aria-hidden")==="true";
      })), "One final accessible value with equal-width presentation, no focusable/live digits").toBe(true);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.screenshot({path:info.outputPath(`${prefix}-${width}-${theme}-${scale}.png`)});
  }
  await page.emulateMedia({reducedMotion:"reduce"});
  const cycle=await values.first().getAttribute("data-money-motion-cycle"); await card.locator(".eyebrow").first().click(); await expect(values.first()).toHaveAttribute("data-money-motion","none"); expect(await values.first().getAttribute("data-money-motion-cycle")).toBe(cycle);
  const label=await values.first().getAttribute("aria-label"); await values.first().evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);getSelection()!.removeAllRanges();getSelection()!.addRange(r);});
  await page.context().grantPermissions(["clipboard-read","clipboard-write"]);await page.keyboard.press(process.platform==="darwin"?"Meta+c":"Control+c");expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(label);
  await page.evaluate(()=>{document.documentElement.style.fontSize="";});await page.setViewportSize({width:1440,height:1000});
}
async function command(page:Page, route:string, profile?:string) {
  await page.locator('[data-pd-id="profile-command.trigger"]').click();
  if(profile){await page.locator('[data-pd-id="profile-command.search"]').fill("CP043");await page.locator(`[data-pd-id="profile-command.profile.${profile}"]`).click();}
  await page.locator(`[data-pd-id="profile-command.route.${route}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/tracker/${route}$`));
  await expect(page.locator(`[data-pd-id="profile-command.route.${route}"]`)).toBeHidden();
}

test("Extra Places summary preserves current/final, correction/Void, scope and read readiness", async ({page},info)=>{
  await preflight(page);const id=await create(page,"extra"),path=`/api/profiles/${id}/each-way-extra-places`,settingsPath=`/api/profiles/${id}/tracker-settings`,url=`/profiles/${id}/tracker/each-way-extra-places`;
  try {
    let release!:()=>void;const gate=new Promise<void>(r=>release=r);
    await page.route("**"+path,async r=>{await gate;await r.continue();});await page.goto(url);
    const summary=page.getByRole("region",{name:"Extra Place quick view"});const card=summary.locator(".stat-card").filter({hasText:"Extra Place P&L"});const pnl=card.locator("strong .financial-value");
    await expect(summary).toBeVisible();await expect.soft(card.locator(".financial-value")).toHaveCount(0,{timeout:500});release();await page.unroute("**"+path,{behavior:"wait"});await expect(pnl).toHaveAttribute("aria-label","£ -");
    await page.route("**"+path,r=>r.fulfill({status:503,json:{detail:"Synthetic row read failure"}}));await page.reload();await expect.soft(card).toContainText("unavailable",{timeout:500});await page.unroute("**"+path);
    const rows=await seed(page,id);await page.reload();await expect(pnl).toHaveAttribute("aria-label","£ 26.46");
    const ql=card.locator('[data-pd-id="extra-place.stat.qualifying-loss"] .financial-value');await expect(ql).toHaveAttribute("aria-label","£ (3.54)");
    const budget=card.locator('[data-pd-id="extra-place.stat.weekly-loss-budget"] .financial-value');await expect(budget.nth(0)).toHaveAttribute("aria-label","£ 3.54");await expect(budget.nth(1)).toHaveAttribute("aria-label","£ 15.00");
    await page.getByRole("searchbox",{name:"Search Extra Place rows"}).fill("Synthetic pending");await expect(pnl).toHaveAttribute("aria-label","£ 26.46");await page.getByRole("searchbox",{name:"Search Extra Place rows"}).fill("");
    await page.screenshot({path:info.outputPath("extra-before-replay.png")});
    await moneyChecks(page,card,info,"extra-summary");
    for(const [result,total] of [["Unplaced","£ (3.54)"],["Void/NR","£ (1.77)"]]) {
      const r=await page.request.put(path+"/"+rows[1].each_way_extra_place_id,{data:{...rows[1],result,status:result==="Void/NR"?"Void":"Settled"}});expect(r.status(),await r.text()).toBe(200);
      await page.reload();await expect(pnl).toHaveAttribute("aria-label",total);await expect(ql).toHaveAttribute("aria-label","£ (3.54)");
    }
    let releaseRange!:()=>void;const rangeGate=new Promise<void>(r=>releaseRange=r);
    await page.route("**"+settingsPath,async r=>{await rangeGate;await r.continue();});await page.reload();await expect(summary).toBeVisible();await expect(card.locator(".financial-value")).toHaveCount(0);releaseRange();await page.unroute("**"+settingsPath,{behavior:"wait"});await expect(pnl).toHaveAttribute("aria-label","£ (1.77)");
    await page.route("**"+settingsPath,r=>r.fulfill({status:503,json:{detail:"Synthetic range failure"}}));await page.reload();await expect(card).toContainText("unavailable");await page.unroute("**"+settingsPath);
    await page.route("**"+path,async r=>{const response=await r.fetch();const data=await response.json();await r.fulfill({json:data.map((row:Record<string,unknown>)=>row.each_way_extra_place_id===rows[0].each_way_extra_place_id?{...row,current_value:null,final_value:null,qualifying_loss:null}:row)});});await page.reload();await expect(pnl).toHaveAttribute("aria-label","Unavailable");await expect(ql).toHaveAttribute("aria-label","Unavailable");await expect(budget.first()).toHaveAttribute("aria-label","Unavailable");
    await page.unroute("**"+path);
    // Known historical P&L remains usable when only reference qualifying loss is missing.
    await page.route("**"+path,async r=>{const response=await r.fetch();const data=await response.json();await r.fulfill({json:data.map((row:Record<string,unknown>)=>row.each_way_extra_place_id===rows[0].each_way_extra_place_id?{...row,current_value:"12.34",final_value:"12.34",qualifying_loss:null}:row)});});await page.reload();await expect(pnl).toHaveAttribute("aria-label","£ 12.34");await expect(ql).toHaveAttribute("aria-label","Unavailable");await page.unroute("**"+path);
    // Large signed rendering fixture: original row membership/calculations stay untouched.
    await page.route("**"+path,async r=>{const response=await r.fetch();const data=await response.json();await r.fulfill({json:data.map((row:Record<string,unknown>)=>row.each_way_extra_place_id===rows[0].each_way_extra_place_id?{...row,current_value:"-1234567.89",final_value:null,qualifying_loss:"-1234567.89"}:{...row,qualifying_loss:"0"})});});await page.emulateMedia({reducedMotion:"no-preference"});await page.reload();await expect(pnl).toHaveAttribute("aria-label","£ (1,234,567.89)");await moneyChecks(page,card,info,"extra-large");await page.unroute("**"+path);
    await page.route("**/api/fund-manager/preferences/financial-motion",r=>r.fulfill({json:{enabled:false,replay_delay_ms:1500,duration_ms:520,stagger_ms:80}}));await page.emulateMedia({reducedMotion:"no-preference"});await page.reload();await expect(pnl).toHaveAttribute("data-money-motion","none");const cycle=await pnl.getAttribute("data-money-motion-cycle");await card.locator(".eyebrow").click();expect(await pnl.getAttribute("data-money-motion-cycle")).toBe(cycle);
  }finally{await page.unrouteAll({behavior:"ignoreErrors"});expect((await page.request.patch(`/api/profiles/${id}`,{data:{status:"Archived"}})).ok()).toBeTruthy();}
});

test("Profile Dashboard cards retain meaning and cannot repaint a stale Profile or saved period",async({page},info)=>{
  await preflight(page);const a=await create(page,"dashA"),b=await create(page,"dashB");
  try {
    await seed(page,a);const today=new Date().toISOString().slice(0,10);
    for(const [adjustment_type,direction,amount] of [["Deduction","Out","7.00"],["TopUp","In","200.00"]])expect((await page.request.post(`/api/profiles/${a}/cash-adjustments`,{data:{adjustment_date:today+"T12:00",adjustment_type,direction,amount,affects_cash_snapshot:false,affects_investment:false,linked_account:"",description:"Synthetic CP043"}})).status()).toBe(201);
    const path=`/api/profiles/${a}/tracker-summary-sources`,settingsPath=`/api/profiles/${a}/tracker-settings`;
    const source=await(await page.request.get(path)).json();let failure=false,hold=false,release!:()=>void,gate:Promise<void>|null=null;
    await page.route("**"+path,async r=>{if(hold&&gate)await gate;if(failure){await r.fulfill({status:503,json:{detail:"Synthetic dashboard failure"}});return;}await r.continue();});
    await page.goto(`/profiles/${a}/tracker/dashboard`);
    const view=page.getByRole("region",{name:"Portfolio dashboard"});const hero=view.locator('[data-pd-id="dashboard.selected-range-performance"]');const pnl=hero.locator(".dashboard-hero-value .financial-value");
    await expect(pnl).toHaveAttribute("aria-label","Selected range portfolio profit and loss: £ 26.46");
    const cash=view.locator(".dashboard-mini-card").filter({has:page.getByText("Current Account Cash",{exact:true})});await expect(cash.locator("strong .financial-value")).toHaveAttribute("aria-label","£ 150.00");
    await expect(view.locator(".dashboard-mini-card").filter({has:page.getByText("Cash Movement",{exact:true})}).locator("strong .financial-value")).toHaveAttribute("aria-label","£ 193.00");
    await moneyChecks(page,cash,info,"dashboard-cash");
    await page.emulateMedia({reducedMotion:"no-preference"});
    // Warm re-entry intentionally reads cached complete data while the existing GET refreshes.
    await command(page,"reports");await expect(page).toHaveURL(new RegExp(`/profiles/${a}/tracker/reports`));
    hold=true;gate=new Promise<void>(r=>release=r);await command(page,"dashboard");await expect(pnl).toHaveAttribute("aria-label","Selected range portfolio profit and loss: £ 26.46");
    await page.route("**"+settingsPath,async r=>r.request().method()==="PUT"?r.fulfill({json:{...source.tracker_settings,active_date_preset:"Today"}}):r.continue());
    await view.locator('[data-pd-id="dashboard.period.1d"]').focus();await page.keyboard.press("Enter");await expect(view.locator('[data-pd-id="dashboard.period.1d"]')).toHaveClass(/is-active/);
    release();gate=null;hold=false;await page.unroute("**"+path,{behavior:"wait"});
    await page.route("**"+path,async r=>failure?r.fulfill({status:503,json:{detail:"Synthetic dashboard failure"}}):r.continue());
    await expect(view.locator('[data-pd-id="dashboard.period.1d"]')).toHaveClass(/is-active/);
    await expect(pnl).toHaveAttribute("aria-label","Selected range portfolio profit and loss: £ 28.23");
    await page.unroute("**"+settingsPath);
    // A failed warm refresh must not retain old authoritative money as though current.
    await command(page,"reports");failure=true;await command(page,"dashboard");await expect(page.getByText("Request failed with status 503",{exact:true})).toBeVisible();await expect.soft(view).toBeHidden({timeout:500});failure=false;
    await page.reload();await expect(pnl).toBeVisible();
    const bpath=`/api/profiles/${b}/tracker-summary-sources`;let releaseB!:()=>void;const bgate=new Promise<void>(r=>releaseB=r);await page.route("**"+bpath,async r=>{await bgate;await r.continue();});
    await command(page,"dashboard",b);await expect(page).toHaveURL(new RegExp(`/profiles/${b}/tracker/dashboard`));await expect.soft(view).toBeHidden({timeout:500});
    releaseB();await page.unroute("**"+bpath,{behavior:"wait"});await expect(pnl).toHaveAttribute("aria-label","Selected range portfolio profit and loss: £ -");
    // Return to B before A's delayed refresh finishes: late A cannot repaint B.
    let releaseA!:()=>void;const agate=new Promise<void>(r=>releaseA=r);
    await page.route("**"+path,async r=>{await agate;await r.continue();});
    await command(page,"dashboard",a);await command(page,"dashboard",b);await expect(pnl).toHaveAttribute("aria-label","Selected range portfolio profit and loss: £ -");
    releaseA();await page.unroute("**"+path,{behavior:"wait"});await expect(pnl).toHaveAttribute("aria-label","Selected range portfolio profit and loss: £ -");
    await command(page,"dashboard",a);await expect(pnl).toHaveAttribute("aria-label","Selected range portfolio profit and loss: £ 26.46");
    await page.route("**"+path,async r=>{const response=await r.fetch();const data=await response.json();data.accounts[0].current_balance="1234567.89";data.accounts[1].current_balance="-765432.10";await r.fulfill({json:data});});await page.reload();await expect(cash.locator("strong .financial-value")).toHaveAttribute("aria-label","£ 469,135.79");await moneyChecks(page,cash,info,"dashboard-large");await page.unroute("**"+path);
    await page.route("**"+path,async r=>{const response=await r.fetch();const data=await response.json();data.accounts[0].current_balance="";await r.fulfill({json:data});});await page.reload();await expect(cash.locator("strong .financial-value")).toHaveAttribute("aria-label","Unavailable");await expect(pnl).toHaveAttribute("aria-label","Selected range portfolio profit and loss: £ 26.46");
    await page.route("**/api/fund-manager/preferences/financial-motion",r=>r.fulfill({json:{enabled:false,replay_delay_ms:1500,duration_ms:520,stagger_ms:80}}));await page.emulateMedia({reducedMotion:"no-preference"});await page.reload();await expect(pnl).toHaveAttribute("data-money-motion","none");const stopped=await pnl.getAttribute("data-money-motion-cycle");await hero.locator(".eyebrow").first().click();expect(await pnl.getAttribute("data-money-motion-cycle")).toBe(stopped);
  }finally{await page.unrouteAll({behavior:"ignoreErrors"});for(const id of[a,b])expect((await page.request.patch(`/api/profiles/${id}`,{data:{status:"Archived"}})).ok()).toBeTruthy();}
});
