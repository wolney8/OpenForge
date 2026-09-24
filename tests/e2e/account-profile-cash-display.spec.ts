import { expect, test, type Page, type Locator } from "@playwright/test";

test.use({ actionTimeout: 15_000 });
async function preflight(page: Page) {
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Authorised isolated/Preview session required");
  const health = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
  expect(["test", "preview"]).toContain(health.runtime_role);
  if (health.runtime_role === "preview") expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
  expect((await page.request.get("/api/auth/session")).status()).toBe(200);
}
async function geometry(page: Page, region: Locator) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const controls = await region.locator("input:visible,select:visible,button:visible").evaluateAll((nodes) => nodes.map((node) => {
    const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width };
  }));
  for (const item of controls) { expect(item.x).toBeGreaterThanOrEqual(0); expect(item.right).toBeLessThanOrEqual(page.viewportSize()!.width); }
  for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
    const a = controls[i], b = controls[j];
    expect(a.right <= b.x + 1 || b.right <= a.x + 1 || a.bottom <= b.y + 1 || b.bottom <= a.y + 1).toBe(true);
  }
  const selectedFits = await region.locator("select:visible").evaluateAll((nodes) => nodes.every((node) => {
    const select = node as HTMLSelectElement, style = getComputedStyle(select);
    const context = document.createElement("canvas").getContext("2d")!; context.font = style.font;
    return context.measureText(select.selectedOptions[0]?.text ?? "").width <= select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) + 1;
  }));
  expect(selectedFits, "Full selected dropdown text remains readable").toBe(true);
}

test("Profile directory controls retain scope and readable compact keyboard selection", async ({ page }, info) => {
  await preflight(page); const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  const stamp=Date.now();
  const created=await page.request.post("/api/profiles/onboarding",{data:{accounts:[],display_name:`Synthetic CP041 directory ${stamp}`,profile_code:`C41-D-${stamp}`,enabled_modules:["sportsbook-bets","free-bets","cash-adjustments"],quick_actions:[],setup_path:"import",tracking_start_date:"2026-09-01"}});
  expect(created.status(),await created.text()).toBe(201);const id=(await created.json()).profile.profile_id;
  expect((await page.request.patch(`/api/profiles/${id}`,{data:{status:"Archived"}})).ok()).toBeTruthy();
  await page.goto("/profiles");
  const controls = page.locator(".fund-manager-control-bar.is-directory");
  const search = page.locator('[data-pd-id="profiles.directory.search"]');
  const status = page.locator('[data-pd-id="profiles.directory.status-filter"]');
  await expect(search).toBeVisible();
  for (const [width, theme, scale] of [[1440,"light",100],[1000,"dark",100],[860,"light",100],[760,"dark",100],[390,"light",100],[1440,"dark",200],[760,"light",200]] as const) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(({theme,scale}) => { document.documentElement.dataset.theme=theme; document.documentElement.style.fontSize=scale+"%"; }, {theme,scale});
    await controls.scrollIntoViewIfNeeded(); await expect(search).toBeVisible();
    expect((await search.boundingBox())!.width).toBeGreaterThan(100);
    await geometry(page, controls);
    await search.focus(); await search.press("Tab"); await expect(status).toBeFocused();
    await status.selectOption("Archived"); await search.fill("Synthetic CP041 directory");
    await expect(status).toHaveValue("Archived");
    const rows=page.locator('[data-pd-id^="profiles.directory.row."]');
    await expect(rows.first()).toBeVisible();
    for (const row of await rows.all()) { await expect(row).toContainText("Synthetic CP041 directory"); await expect(row).toContainText("Archived"); }
    await search.fill("NO-SUCH-SYNTHETIC-CP041-PROFILE");
    await expect(page.locator('[data-pd-id="profiles.directory.empty"]')).toBeVisible();
    await status.selectOption("Active"); await expect(status).toHaveValue("Active");
    await page.screenshot({ path: info.outputPath(`directory-${width}-${theme}-${scale}.png`) });
  }
  expect(errors).toEqual([]);
});

for (const module of ["accounts", "cash-adjustments"]) test(`${module}: truthful financial reads, contained motion and explicit saved edits`, async ({page}, info) => {
  test.setTimeout(300_000); await preflight(page);
  const stamp=Date.now(); const created=await page.request.post("/api/profiles/onboarding",{data:{
    accounts:[],display_name:`Synthetic CP041 ${module} ${stamp}`,profile_code:`C41-${stamp}`,
    enabled_modules:["sportsbook-bets","free-bets","cash-adjustments"],quick_actions:[],setup_path:"import",tracking_start_date:"2026-09-01"}});
  expect(created.status(),await created.text()).toBe(201);const id=(await created.json()).profile.profile_id;
  const path=`/api/profiles/${id}/${module}`, route=`/profiles/${id}/tracker/${module}`;
  const summary=page.getByRole("region",{name:module==="accounts"?"Account quick view":"Cash-adjustment quick view"});
  const label=module==="accounts"?"Bookmaker balances":"Cash Adjustment Net";
  const card=summary.locator(".stat-card").filter({has:page.getByText(label,{exact:true})});const money=card.locator(".financial-value");
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message)); let writes=0;
  page.on("request",r=>{if(r.url().includes(path)&&r.method()!=="GET")writes++;});
  try {
    let release!:()=>void;const gate=new Promise<void>(r=>release=r);
    await page.route("**"+path,async r=>{await gate;await r.continue();});await page.goto(route);await expect(summary).toBeVisible();
    await expect(summary.locator(".financial-value")).toHaveCount(0);await expect(summary).toHaveAttribute("aria-busy","true");
    const loaded=page.waitForResponse(r=>r.url().endsWith(path));release();await loaded;await page.unroute("**"+path);
    await expect(money).toHaveAttribute("aria-label","£ -"); await expect(money).toHaveAttribute("data-money-motion","none");
    await page.route("**"+path,r=>r.fulfill({status:503,json:{detail:"Synthetic read unavailable"}}));await page.reload();
    await expect(card).toContainText("unavailable");await expect(summary.locator(".financial-value")).toHaveCount(0);await page.unroute("**"+path);
    // The existing identity hook also reads Accounts and rejects this deliberate 503.
    if(module==="accounts") await expect.poll(()=>errors).toEqual(["Unable to load bookmaker brand catalogue."]);
    else expect(errors).toEqual([]);
    errors.length=0;
    for(const [account,type,balance] of [["Bet365","Bookie","1234567.89"],["Smarkets","Exchange","-14.01"]]) {
      const response=await page.request.post(`/api/profiles/${id}/accounts`,{data:{account,type,status:"Active",lifecycle_status:"Active",channel:"Online",stake_access:"Normal",promo_access:"Full",restrictions:[],current_balance:balance,pending_withdrawal_amount:"0.00",...(type==="Exchange"?{commission_rate:"0.02"}:{})}});
      expect(response.status(),await response.text()).toBe(201);
    }
    if(module==="cash-adjustments") {
      for(const [kind,direction,amount,date] of [["Deduction","Out","1234567.89","2026-09-24T12:00"],["TopUp","In","5.00","2026-09-01T12:00"]]) {
        const response=await page.request.post(path,{data:{adjustment_date:date,direction,amount,adjustment_type:kind,affects_investment:false,affects_cash_snapshot:false,linked_account:"Bet365",description:"Synthetic CP041 "+kind}});expect(response.status(),await response.text()).toBe(201);
      }
      const settingsPath=`/api/profiles/${id}/tracker-settings`;
      const settings=await(await page.request.get(settingsPath)).json();expect((await page.request.put(settingsPath,{data:{...settings,active_date_preset:"All Dates"}})).ok()).toBeTruthy();
      let releaseRange!:()=>void;const rangeGate=new Promise<void>(r=>releaseRange=r);
      await page.route("**"+settingsPath,async r=>{await rangeGate;await r.continue();});await page.reload();await expect(summary).toBeVisible();
      await expect(summary.locator(".financial-value")).toHaveCount(0);
      const ranged=page.waitForResponse(r=>r.url().endsWith(settingsPath));releaseRange();await ranged;await page.unroute("**"+settingsPath);
      await expect(money).toHaveAttribute("aria-label","£ (1,234,562.89)");
      await page.route("**"+settingsPath,r=>r.fulfill({status:503,json:{detail:"Synthetic range unavailable"}}));await page.reload();await expect(card).toContainText("unavailable");await expect(summary.locator(".financial-value")).toHaveCount(0);await page.unroute("**"+settingsPath);
    }
    await page.reload(); const expected=module==="accounts"?"£ 1,234,567.89":"£ (1,234,562.89)";
    await expect(money).toHaveAttribute("aria-label",expected); const before=await(await page.request.get(path)).json();writes=0;
    for(const [width,theme,scale] of [[1440,"light",100],[760,"dark",100],[390,"light",100],[760,"dark",200]] as const){
      await page.setViewportSize({width,height:1000});await page.evaluate(({theme,scale})=>{document.documentElement.dataset.theme=theme;document.documentElement.style.fontSize=scale+"%";},{theme,scale});
      await card.scrollIntoViewIfNeeded();const cycle=Number(await money.getAttribute("data-money-motion-cycle"));await card.locator(".eyebrow").click();
      expect(Number(await money.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(cycle);
      for(let frame=0;frame<4;frame++){
        await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));
        const bounds=await card.boundingBox(),value=await money.boundingBox();expect(value!.x).toBeGreaterThanOrEqual(bounds!.x);expect(value!.x+value!.width).toBeLessThanOrEqual(bounds!.x+bounds!.width+1);await expect(money).toHaveAttribute("aria-label",expected);
      }
      const clipped=await page.locator(".data-table .financial-value, .data-table .ledger-financial-value, .data-table .accounts-financial-chip").evaluateAll(values=>values.filter(value=>{const v=value.getBoundingClientRect(),cell=value.closest('td')!.getBoundingClientRect();return v.x<cell.x||v.right>cell.right+1;}).length);
      expect(clipped,"No internally clipped table money").toBe(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      await page.screenshot({path:info.outputPath(`${module}-${width}-${theme}-${scale}.png`)});
    }
    await page.emulateMedia({reducedMotion:"reduce"});await expect(money).toHaveAttribute("data-money-motion","none");
    const cycle=await money.getAttribute("data-money-motion-cycle");await card.locator(".eyebrow").click();expect(await money.getAttribute("data-money-motion-cycle")).toBe(cycle);
    await money.evaluate(el=>{const selection=getSelection()!,range=document.createRange();range.selectNodeContents(el);selection.removeAllRanges();selection.addRange(range);});
    await page.context().grantPermissions(["clipboard-read","clipboard-write"]);await page.keyboard.press(process.platform==="darwin"?"Meta+c":"Control+c");expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(expected);
    expect(await(await page.request.get(path)).json()).toEqual(before);expect(writes).toBe(0);
    await page.setViewportSize({width:760,height:1000});await page.evaluate(()=>{document.documentElement.style.fontSize="";});
    const search=page.getByRole("searchbox",{name:module==="accounts"?"Search accounts":"Search cash-adjustment rows"});await search.fill(module==="accounts"?"Bet365":"Synthetic CP041 Deduction");
    const row=page.locator(".data-table tbody tr").filter({hasText:module==="accounts"?"Bet365":"Synthetic CP041 Deduction"});
    await row.getByRole("button",{name:/Edit /}).click();
    const dialog=module==="accounts"?page.getByRole("dialog",{name:"Edit account",exact:true}):page.locator('[data-pd-id="cash-adjustments.editor.dialog"]');await expect(dialog).toBeVisible();
    if(module==="cash-adjustments") {const unlock=dialog.getByRole("button",{name:"Edit cash-adjustment row",exact:true});if(await unlock.count())await unlock.click();await dialog.getByRole("tab",{name:/Notes/}).click();}
    const notes=dialog.getByRole("textbox",{name:module==="accounts"?"Notes":"Description",exact:true});const original=await notes.inputValue();await notes.fill("Synthetic CP041 discarded note");expect(writes).toBe(0);
    await dialog.getByRole("button",{name:module==="accounts"?"Cancel":/^Close cash-adjustment editor$/}).click();
    await page.getByRole("button",{name:/Discard changes/i}).click();await expect(dialog).toBeHidden();expect(await(await page.request.get(path)).json()).toEqual(before);
    await row.getByRole("button",{name:/Edit /}).click();if(module==="cash-adjustments"){const unlock=dialog.getByRole("button",{name:"Edit cash-adjustment row",exact:true});if(await unlock.count())await unlock.click();await dialog.getByRole("tab",{name:/Notes/}).click();}
    await expect(notes).toHaveValue(original);await notes.fill("Synthetic CP041 saved note");
    const node=await money.elementHandle(),priorCycle=await money.getAttribute("data-money-motion-cycle");
    await dialog.getByRole("button",{name:module==="accounts"?"Save":"Save Edits",exact:true}).click();await expect(dialog).toBeHidden();
    expect(await node!.evaluate(el=>el.isConnected)).toBe(true);expect(await money.getAttribute("data-money-motion-cycle")).toBe(priorCycle);await expect(money).toHaveAttribute("aria-label",expected);
    const after=await(await page.request.get(path)).json();const noteKey=module==="accounts"?"notes":"description";expect(after.filter((r:Record<string,string>)=>r[noteKey]==="Synthetic CP041 saved note")).toHaveLength(1);
    for(let i=0;i<before.length;i++)for(const key of module==="accounts"?["account_id","profile_id","current_balance","pending_withdrawal_amount","stake_access","promo_access"]:["cash_adjustment_id","profile_id","amount","signed_amount","adjustment_type","direction","affects_cash_snapshot","affects_investment"])expect(after[i][key],key).toEqual(before[i][key]);
    await search.fill(module==="accounts"?"Bet365":"Synthetic CP041 saved note");await page.locator(".data-table tbody tr").filter({hasText:module==="accounts"?"Bet365":"Synthetic CP041 saved note"}).getByRole("button",{name:/Edit /}).click();if(module==="cash-adjustments")await dialog.getByRole("tab",{name:/Notes/}).click();await expect(notes).toHaveValue("Synthetic CP041 saved note");
    const footer=dialog.locator(".workflow-editor-footer");await footer.getByRole("button",{name:module==="accounts"?"Save":"Edit cash-adjustment row",exact:true}).focus();const b=await footer.boundingBox();expect(b!.x).toBeGreaterThanOrEqual(0);expect(b!.x+b!.width).toBeLessThanOrEqual(760);expect(b!.y+b!.height).toBeLessThanOrEqual(1001);
    await page.emulateMedia({reducedMotion:"no-preference"});
    await page.route("**/api/fund-manager/preferences/financial-motion",r=>r.fulfill({json:{enabled:false,replay_delay_ms:1500,duration_ms:520,stagger_ms:80}}));
    await page.reload();await expect(money).toHaveAttribute("aria-label",expected);await expect(money).toHaveAttribute("data-money-motion","none");
    const offCycle=await money.getAttribute("data-money-motion-cycle");await card.locator(".eyebrow").click();expect(await money.getAttribute("data-money-motion-cycle")).toBe(offCycle);
    if(module==="accounts") {
      await page.route("**"+path,async route=>{const response=await route.fetch();const data=await response.json();await route.fulfill({json:data.map((row:Record<string,unknown>)=>({...row,current_balance:null}))});});
      await page.reload();await expect(money).toHaveAttribute("aria-label","Unavailable");
      await expect(page.locator(".accounts-data-table .financial-value[aria-label='Unavailable']")).toHaveCount(2);
    }
    expect(errors).toEqual([]);
  }finally{await page.unrouteAll({behavior:"ignoreErrors"});expect((await page.request.patch(`/api/profiles/${id}`,{data:{status:"Archived"}})).ok()).toBeTruthy();}
});


test("Account Catalogue and shared Settings toolbars align wrapped controls", async ({page},info)=>{
  await preflight(page);await page.goto("/settings#catalogue");
  await expect(page.locator('[data-pd-id="account-catalogue.section"]')).toHaveAttribute("aria-busy","false");
  const controls=page.locator('[data-pd-id="account-catalogue.controls"]');
  const search=controls.getByRole("searchbox"),type=controls.locator('[data-pd-id="account-catalogue.type-filter"]'),status=controls.locator('[data-pd-id="account-catalogue.status-filter"]');
  for(const [width,theme,scale]of [[1440,"light",100],[1000,"dark",100],[760,"light",100],[390,"dark",100],[1440,"light",200],[760,"dark",200]] as const){
    await page.setViewportSize({width,height:1000});await page.evaluate(({theme,scale})=>{document.documentElement.dataset.theme=theme;document.documentElement.style.fontSize=scale+"%";},{theme,scale});
    await controls.scrollIntoViewIfNeeded();await geometry(page,controls);
    const a=await search.boundingBox(),b=await type.boundingBox();if(width>860)expect(Math.abs(a!.y-b!.y)).toBeLessThan(2);
    await search.focus();await search.press("Tab");await expect(type).toBeFocused();await type.selectOption("Exchange");await status.selectOption("Active");await search.fill("Smarkets");
    const rows=page.locator(".account-catalogue-table tbody tr");await expect(rows).toHaveCount(1);await expect(rows).toContainText("Smarkets");await expect(rows).toContainText("Exchange");await expect(rows).toContainText("Active");
    await search.fill("");await type.selectOption("All");await status.selectOption("All");await page.screenshot({path:info.outputPath(`catalogue-${width}-${theme}-${scale}.png`)});
  }
  for(const name of ["Lists","Database","Quick Actions"]){
    await page.getByRole("tab",{name,exact:true}).click();
    const peer=page.locator('.settings-table-toolbar:visible').first();await expect(peer).toBeVisible();
    for(const [width,scale]of [[1000,100],[1440,200],[390,100]]){
      await page.setViewportSize({width,height:1000});await page.evaluate(scale=>{document.documentElement.style.fontSize=scale+"%";},scale);await peer.scrollIntoViewIfNeeded();await geometry(page,peer);
      const first=await peer.locator('input').first().boundingBox(),second=await peer.locator('select').first().boundingBox();if(width>860)expect(Math.abs(first!.y-second!.y)).toBeLessThan(2);
    }
  }
});
