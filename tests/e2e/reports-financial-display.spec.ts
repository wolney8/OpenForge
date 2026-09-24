import { expect, test, type Page, type Locator } from "@playwright/test";

test.use({ actionTimeout: 15_000 });
// Synthetic response fixture; no financial rows are written to any database.
function populate(source: any) {
  const date = "2026-09-24T12:00:00";
  source.sportsbook_bets = [{ sportsbook_bet_id:"CP044-SB",bookmaker:"Synthetic Bookie",event_name:"Synthetic settled gain",offer_type:"Bet & Get",offer_name:"",status:"Settled",result:"Back Won",date_settled:date,exchange_name:"Synthetic Exchange",match_strategy:"Standard",calculated_liability_1:"20",projected_current_pnl:"100.50",final_net_pnl:"100.50",reporting_value:"100.50",lay_status:"Matched",counts_as_open:false,is_overdue:false }];
  source.free_bets = [{ free_bet_id:"CP044-FB",bookmaker:"Synthetic Bookie",event_name:"Synthetic loss",status:"Settled",result:"Lay Won",retention_mode:"SNR",date_settled:date,expiry_datetime:date,exchange_name:"Synthetic Exchange",calculated_liability_1:"0",projected_current_pnl:"-10",final_net_pnl:"-10",reporting_value:"-10",lay_status:"Matched",counts_as_open:false,is_overdue:false }];
  source.casino_offers = [{casino_offer_id:"CP044-CO",bookmaker:"Synthetic Casino",offer_name:"Synthetic casino",status:"Settled",result:"Complete",date_started:date,date_settling:date,expiry_datetime:date,resolved_net_pnl:"20",counts_as_open:false,is_overdue:false,week_label:""}];
  source.each_way_extra_places = [{each_way_extra_place_id:"CP044-EP",placed_at:date,bookmaker:"Synthetic Bookie",race:"Synthetic race",runner:"Synthetic runner",status:"Settled",result:"Extra Place",current_value:"5",final_value:"5",win_liability:"0",place_liability:"0"}];
  source.cash_adjustments = [["TopUp","200"],["Deduction","-7"],["Withdrawal","-3"]].map(([kind,value],i)=>({cash_adjustment_id:`CP044-CA-${i}`,adjustment_date:date,direction:Number(value)<0?"Out":"In",amount:String(Math.abs(Number(value))),adjustment_type:kind,linked_account:"",affects_cash_snapshot:false,affects_investment:false,description:`Synthetic ${kind}`,signed_amount:value}));
  source.tracker_settings.active_date_preset="All Dates";
  return source;
}
async function setup(page:Page) {
  await page.clock.setFixedTime(new Date("2026-09-24T12:00:00Z"));
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE!=="true","Authorised isolated/Preview access required");
  const health=await(await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL||"/healthz")).json();expect(["test","preview"]).toContain(health.runtime_role);
  if(health.runtime_role==="preview")expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
  expect((await page.request.get("/api/auth/session")).status()).toBe(200);
  const suffix=Date.now();const r=await page.request.post("/api/profiles/onboarding",{data:{accounts:[],display_name:`Synthetic CP044 Reports ${suffix}`,profile_code:`C44-${suffix}`,enabled_modules:["sportsbook-bets","free-bets","casino-offers","cash-adjustments","each-way-extra-places"],quick_actions:[],setup_path:"import",tracking_start_date:"2026-09-01"}});expect(r.status(),await r.text()).toBe(201);const id=(await r.json()).profile.profile_id;
  const path=`/api/profiles/${id}/tracker-summary-sources`;
  const source=populate(await(await page.request.get(path)).json());
  return {id,path,source,url:`/profiles/${id}/tracker/reports`};
}
function card(page:Page,region:string,label:string){return page.getByRole("region",{name:region,exact:true}).locator("article").filter({has:page.getByText(label,{exact:true})});}

test("Reports preserve complete values, independent costs and pending/failed scope readiness",async({page},info)=>{
  const {id,path,source,url}=await setup(page);
  try {
    await page.route("**"+path,r=>r.fulfill({json:source}));await page.goto(url);
    const headline=card(page,"Tracker range and reporting","Selected Range P&L");
    await expect(headline.locator(".financial-value")).toHaveAttribute("aria-label","£ 115.50");
    await page.screenshot({path:info.outputPath("reports-baseline.png"),fullPage:true});
    await expect(page.locator('article[data-motion-replay-group="true"]').filter({has:page.locator(".financial-value")})).toHaveCount(15,{timeout:1000});
    let release!:()=>void;const gate=new Promise<void>(r=>release=r);
    const settingsPath=`/api/profiles/${id}/tracker-settings`;
    await page.route("**"+settingsPath,async r=>{if(r.request().method()==="PUT")await gate;await r.continue();});
    await page.getByLabel("Change tracker date range").selectOption("Last Week");
    await expect(headline.locator(".financial-value")).toHaveCount(0,{timeout:1000});
    await expect(page.getByLabel("Change tracker date range")).toBeDisabled();
    await expect(card(page,"Report quick views","Weekly periods").locator(".financial-value")).toHaveAttribute("aria-label","£ 105.50");
    await expect(page.locator("section").filter({has:page.getByRole("heading",{name:"Module breakdown",exact:true})}).last().locator(".financial-value")).toHaveCount(0);
    release();await expect(headline.locator(".financial-value")).toHaveAttribute("aria-label","£ -");await page.unroute("**"+settingsPath);
    await expect(headline.locator(".financial-value")).toHaveAttribute("aria-label","£ -");
    // History is independent of the live tracker date range.
    await expect(card(page,"Report quick views","Weekly periods").locator(".financial-value")).toHaveAttribute("aria-label","£ 105.50");
    await page.getByLabel("Change tracker date range").selectOption("All Dates");await expect(headline.locator(".financial-value")).toHaveAttribute("aria-label","£ 115.50");
    await page.getByLabel("Change tracker date range").selectOption("Last Week");await expect(headline.locator(".financial-value")).toHaveAttribute("aria-label","£ -");
    await page.getByLabel("Change tracker date range").selectOption("All Dates");await expect(headline.locator(".financial-value")).toHaveAttribute("aria-label","£ 115.50");await expect(headline.locator(".financial-value")).toHaveAttribute("data-money-motion","none");
    source.cash_adjustments[1].signed_amount=null;
    await page.reload();
    await expect(card(page,"Report boundary summary","Retained profit").locator(".financial-value")).toHaveAttribute("aria-label","Unavailable",{timeout:1000});
    await expect(card(page,"Report boundary summary","Gross betting P&L").locator(".financial-value")).toHaveAttribute("aria-label","£ 115.50");
    const preset=page.locator('[data-pd-id="reports.period-pnl"]');
    await expect(preset.locator('[data-pd-id="reports.period-pnl.total"] .financial-value')).toHaveAttribute("aria-label","£ 115.50");
    await expect(preset.locator('[data-pd-id="reports.period-pnl.retained"] .financial-value')).toHaveAttribute("aria-label","Unavailable");
    source.cash_adjustments[1].signed_amount="-7";source.cash_adjustments[0].signed_amount=null;await page.reload();
    await expect(card(page,"Report boundary summary","Retained profit").locator(".financial-value")).toHaveAttribute("aria-label","£ 105.50");
    await expect(card(page,"Report boundary summary","Cash adjustments").locator(".financial-value")).toHaveAttribute("aria-label","Unavailable");
    source.cash_adjustments[0].signed_amount="200";
    for(const group of ["casino_offers","each_way_extra_places"]) {
      const saved=structuredClone(source[group]);
      if(group==="casino_offers")source[group][0].resolved_net_pnl=null;
      else {source[group][0].current_value=null;source[group][0].final_value=null;}
      await page.reload();await expect(headline.locator(".financial-value")).toHaveAttribute("aria-label","Unavailable");
      await expect(card(page,"Report quick views","Weekly periods").locator(".financial-value")).toHaveAttribute("aria-label","Unavailable");
      await expect(preset.locator('[data-pd-id="reports.period-pnl.total"] .financial-value')).toHaveAttribute("aria-label","Unavailable");
      await expect(card(page,"Selected range module mix","Cash Adjustments").locator(".financial-value").last()).toHaveAttribute("aria-label","£ (7.00)");
      source[group]=saved;
    }
    // Same source-record correction and authoritative Void zero count exactly once.
    source.sportsbook_bets[0].reporting_value="6";source.sportsbook_bets[0].final_net_pnl="6";await page.reload();await expect(headline.locator(".financial-value")).toHaveAttribute("aria-label","£ 21.00");
    source.sportsbook_bets[0].reporting_value="5";source.sportsbook_bets[0].final_net_pnl="5";await page.reload();await expect(headline.locator(".financial-value")).toHaveAttribute("aria-label","£ 20.00");
    Object.assign(source.each_way_extra_places[0],{status:"Void",result:"Void/NR",current_value:"0",final_value:"0"});await page.reload();await expect(headline.locator(".financial-value")).toHaveAttribute("aria-label","£ 15.00");
    // A failed save returns the previous selection and its known values.
    await page.route("**"+settingsPath,r=>r.fulfill({status:503,json:{detail:"Synthetic range save failure"}}));
    await page.getByLabel("Change tracker date range").selectOption("Last Week");await expect(page.locator(".tracker-summary-shell").getByRole("alert")).toContainText("Synthetic range save failure");
    await expect(page.getByLabel("Change tracker date range")).toHaveValue("All Dates");await expect(headline.locator(".financial-value")).toHaveAttribute("aria-label","£ 15.00");await page.unroute("**"+settingsPath);
    await page.unroute("**"+path);let allow!:()=>void;const held=new Promise<void>(r=>allow=r);
    await page.route("**"+path,async r=>{await held;await r.fulfill({json:source});});await page.reload();
    await expect(page.getByText("Loading tracker summaries",{exact:false})).toBeVisible();await expect(page.locator(".tracker-summary-shell .financial-value")).toHaveCount(0);allow();await expect(headline.locator(".financial-value")).toHaveAttribute("aria-label","£ 15.00");
    await page.unroute("**"+path);await page.route("**"+path,r=>r.fulfill({status:503,json:{detail:"Synthetic Reports failure"}}));await page.reload();await expect(page.locator(".tracker-summary-shell")).toContainText("Request failed with status 503");await expect(page.locator(".tracker-summary-shell .financial-value")).toHaveCount(0);

  }finally{await page.unrouteAll({behavior:"ignoreErrors"});expect((await page.request.patch(`/api/profiles/${id}`,{data:{status:"Archived"}})).ok()).toBeTruthy();}
});

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
    await card.screenshot({path:info.outputPath(`${prefix}-${width}-${theme}-${scale}.png`)});
  }
  await page.emulateMedia({reducedMotion:"reduce"});
  const cycle=await values.first().getAttribute("data-money-motion-cycle"); await card.locator(".eyebrow").first().click(); await expect(values.first()).toHaveAttribute("data-money-motion","none"); expect(await values.first().getAttribute("data-money-motion-cycle")).toBe(cycle);
  await card.screenshot({path:info.outputPath(`${prefix}-settled-reduced.png`)});
  const label=await values.first().getAttribute("aria-label"); await values.first().evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);getSelection()!.removeAllRanges();getSelection()!.addRange(r);});
  await page.context().grantPermissions(["clipboard-read","clipboard-write"]);await page.keyboard.press(process.platform==="darwin"?"Meta+c":"Control+c");expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(label);
  await page.evaluate(()=>{document.documentElement.style.fontSize="";});await page.setViewportSize({width:1440,height:1000});
}

test("Reports money cards contain large signed values, replay nearest cards and retain static chart inspection",async({page},info)=>{
  test.setTimeout(300_000);
  const {id,path,source,url}=await setup(page);
  try {
    source.sportsbook_bets.push({...source.sportsbook_bets[0],sportsbook_bet_id:"CP044-OPEN",event_name:"Synthetic open liability",status:"Placed",result:"Pending",counts_as_open:true,projected_current_pnl:"-1234567.89",final_net_pnl:null,reporting_value:"-1234567.89",calculated_liability_1:"1234567.89"});
    await page.route("**"+path,r=>r.fulfill({json:source}));await page.goto(url);
    const groups=page.locator('article[data-motion-replay-group="true"]').filter({has:page.locator(".financial-value")});await expect(groups).toHaveCount(15);
    await page.emulateMedia({reducedMotion:"no-preference"});
    await expect.poll(()=>groups.locator(".financial-value").evaluateAll(ns=>ns.every(n=>n.getAttribute("aria-label")==="£ -" || Number(n.getAttribute("data-money-motion-cycle"))>0))).toBe(true);
    for(let i=0;i<15;i++) {
      const value=groups.nth(i).locator(".financial-value").filter({hasNotText:"Unavailable"}).first();
      await expect.poll(async()=>Number(await value.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(0);
      const previous=await groups.evaluateAll(cards=>cards.map(c=>Array.from(c.querySelectorAll(".financial-value")).map(n=>({label:n.getAttribute("aria-label"),cycle:Number(n.getAttribute("data-money-motion-cycle"))}))));
      await groups.nth(i).locator(".eyebrow").dispatchEvent("click");
      const current=await groups.evaluateAll(cards=>cards.map(c=>Array.from(c.querySelectorAll(".financial-value")).map(n=>({label:n.getAttribute("aria-label"),cycle:Number(n.getAttribute("data-money-motion-cycle"))}))));
      for(let peer=0;peer<15;peer++)for(let value=0;value<previous[peer].length;value++) {
        if(peer===i && previous[peer][value].label!=="£ -")expect(current[peer][value].cycle).toBeGreaterThan(previous[peer][value].cycle);
        else expect(current[peer][value]).toEqual(previous[peer][value]);
      }
    }
    for(const [region,label,name] of [["Tracker range and reporting","Open current / settled final","header"],["Selected range module mix","Sportsbook","module"],["Selected range module mix","Cash Adjustments","cash"],["Report quick views","Weekly periods","formal"],["Report boundary summary","Retained profit","boundary"]])await moneyChecks(page,card(page,region,label),info,name);
    // Standard keyboard navigation remains native; financial digits add no tab stops.
    const range=page.getByLabel("Change tracker date range");await range.focus();await expect(range).toBeFocused();await range.press("Tab");expect(await page.locator(".financial-value:focus").count()).toBe(0);
    const preset=page.locator('[data-pd-id="reports.period-pnl"]');await expect(preset.locator(".financial-value[data-money-motion=none]").first()).toBeVisible();
    await page.route("**/api/fund-manager/preferences/financial-motion",r=>r.fulfill({json:{enabled:false,replay_delay_ms:1500,duration_ms:520,stagger_ms:80}}));await page.emulateMedia({reducedMotion:"no-preference"});await page.reload();
    await expect(groups).toHaveCount(15);await expect.poll(()=>groups.locator(".financial-value").evaluateAll(ns=>ns.every(n=>n.getAttribute("data-money-motion")==="none"))).toBe(true);
    const cycles=await groups.locator(".financial-value").evaluateAll(ns=>ns.map(n=>n.getAttribute("data-money-motion-cycle")));await groups.first().locator(".eyebrow").click();expect(await groups.locator(".financial-value").evaluateAll(ns=>ns.map(n=>n.getAttribute("data-money-motion-cycle")))).toEqual(cycles);
  }finally{await page.unrouteAll({behavior:"ignoreErrors"});expect((await page.request.patch(`/api/profiles/${id}`,{data:{status:"Archived"}})).ok()).toBeTruthy();}
});

test("Reports rapid Profile selection owns late results without all-Profile source reads",async({page})=>{
  const a=await setup(page),b=await setup(page);let release!:()=>void;const gate=new Promise<void>(r=>release=r);let hold=false;const reads:string[]=[];
  try {
    for(const key of ["sportsbook_bets","free_bets","casino_offers","cash_adjustments","each_way_extra_places"])b.source[key]=[];
    page.on("request",r=>{if(r.url().includes("tracker-summary-sources"))reads.push(r.url());});
    await page.route("**"+a.path,async r=>{if(hold)await gate;await r.fulfill({json:a.source});});await page.route("**"+b.path,r=>r.fulfill({json:b.source}));
    await page.goto(a.url);const headline=card(page,"Tracker range and reporting","Selected Range P&L");await expect(headline.locator(".financial-value")).toHaveAttribute("aria-label","£ 115.50");
    hold=true;await page.reload();await expect(page.getByText("Loading tracker summaries",{exact:false})).toBeVisible();
    await page.locator('[data-pd-id="profile-command.trigger"]').click();await page.locator('[data-pd-id="profile-command.search"]').fill("CP044");await page.locator(`[data-pd-id="profile-command.profile.${b.id}"]`).click();await page.locator('[data-pd-id="profile-command.route.reports"]').click();
    await expect(page).toHaveURL(new RegExp(b.url+"$"));await expect(headline.locator(".financial-value")).toHaveAttribute("aria-label","£ -");
    release();await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));await expect(headline.locator(".financial-value")).toHaveAttribute("aria-label","£ -");
    expect(reads.every(url=>url.includes(a.path)||url.includes(b.path))).toBe(true);
    await expect(card(page,"Report quick views","Weekly periods").locator(".financial-value")).toHaveAttribute("aria-label","£ -");
  }finally{release();await page.unrouteAll({behavior:"ignoreErrors"});for(const {id} of [a,b])expect((await page.request.patch(`/api/profiles/${id}`,{data:{status:"Archived"}})).ok()).toBeTruthy();}
});
