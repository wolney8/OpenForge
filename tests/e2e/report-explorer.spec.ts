import { expect, test } from "@playwright/test";
test.use({ extraHTTPHeaders:{Cookie:`pd_session=${process.env.OPENFORGE_E2E_SESSION_TOKEN??""}`} });
test.beforeEach(async ({ context }) => {
 const token=process.env.OPENFORGE_E2E_SESSION_TOKEN;
 if(token) await context.addCookies([{name:'pd_session',value:token,url:process.env.OPENFORGE_E2E_BASE_URL??'http://127.0.0.1:3010'}]);
});
test("Explorer: actual Personal/Managed records, filters, grouping, return and truthful readiness",async({page,request},info)=>{
 test.setTimeout(240000);
 const health=await(await request.get('/api/healthz')).json();expect(health.runtime_role).toBe('test');expect(['cp055-synthetic','cp078-reports-synthetic']).toContain(health.database_identity);
 const ids:string[]=[];const suffix=Date.now();
 const create=async(relationship:string,index:number)=>{
  const r=await request.post('/api/profiles/onboarding',{data:{setup_path:'import',display_name:`Synthetic explorer ${index} ${suffix}`,profile_code:`EX55-${suffix}-${index}`,profile_relationship:relationship,management_fee_percent:relationship==='Personal'?'0':'40',investment_fee_percent:'0',accounts:[],quick_actions:[],enabled_modules:['sportsbook-bets','free-bets','cash-adjustments'],tracking_start_date:'2026-09-01'}});
  expect(r.status(),await r.text()).toBe(201);const id=(await r.json()).profile.profile_id;ids.push(id);
  expect((await request.patch(`/api/profiles/${id}`,{data:{status:'Active'}})).ok()).toBe(true);
  const a=await request.post(`/api/profiles/${id}/accounts`,{data:{account:'Bet365',type:'Bookie',status:'Active',lifecycle_status:'Active',channel:'Online',stake_access:'Normal',promo_access:'Full',restrictions:[]}});expect(a.status(),await a.text()).toBe(201);return id;
 };
 const add=async(id:string,label:string,stake:string,result:string,date:string)=>{
  const r=await request.post(`/api/profiles/${id}/sportsbook-bets`,{data:{date_settled:date,status:'Settled',result,event_name:label,bookmaker:'Bet365',offer_type:'Bet & Get',bet_type:'Single',fixture_type:'Football',match_strategy:'No Lay',back_stake:stake,back_odds:'2.00'}});
  expect(r.status(),await r.text()).toBe(201);return r.json();
 };
 try{
  const a=await create('Personal',0),b=await create('Managed subscriber',1),c=await create('Personal',2);
  await add(a,'Synthetic win','12.34','Back Won','2026-09-23T12:00');await add(b,'Synthetic loss','2.34','Lose','2026-09-23T12:00');await add(c,'Archived win','7','Back Won','2026-09-23T12:00');
  await request.patch(`/api/profiles/${c}`,{data:{status:'Archived'}});
  await page.clock.setFixedTime(new Date('2026-09-26T12:00:00Z'));
  await page.goto(`/profiles/${a}/tracker/reports`);
  const explorer=page.locator('[data-pd-id="reports.explorer"]');const total=explorer.locator('[data-pd-id="reports.explorer.total"]');
  await expect(total.locator('.financial-value')).toHaveAttribute('aria-label','£ 12.34',{timeout:60000});
  await explorer.getByText('Filters',{exact:true}).click();await explorer.getByRole('checkbox',{name:'Bet365',exact:true}).check();await explorer.getByRole('checkbox',{name:'Sportsbook',exact:true}).check();await explorer.getByLabel('Explorer group by',{exact:true}).selectOption('betType');
  await explorer.getByLabel('Explorer metric',{exact:true}).selectOption('count');await expect(total).toHaveText('1');await expect(explorer).toContainText('Placed sportsbook records');
  await explorer.getByRole('button',{name:'Inspect Single records'}).click();await explorer.getByRole('link').filter({hasText:'Synthetic win'}).click();await expect(page).toHaveURL(/source=report-explorer/);await page.goBack();await expect(total).toHaveText('1');await expect(explorer.getByLabel('Explorer group by')).toHaveValue('betType');
  await explorer.getByLabel('Explorer metric').selectOption('pnl');
  for(const [width,theme,scale] of [[1440,'light',100],[390,'dark',100],[760,'light',200]] as const){
   await page.setViewportSize({width,height:1000});await page.evaluate(({theme,scale})=>{document.documentElement.dataset.theme=theme;document.documentElement.style.fontSize=scale+'%';},{theme,scale});await page.emulateMedia({reducedMotion:theme==='light'?'reduce':'no-preference'});
   const help=explorer.getByRole('button',{name:'About Trend And Activity Explorer'});await help.focus();await help.press('Enter');await expect(help).toHaveAttribute('aria-expanded','true');await help.press('Escape');await help.press('Tab');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   expect(await explorer.locator('select,input').evaluateAll(ns=>ns.every(n=>{const a=n.getBoundingClientRect(),b=n.closest('label')!.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;}))).toBe(true);
   await explorer.screenshot({path:info.outputPath(`explorer-${width}-${theme}.png`)});
  }
  await page.evaluate(()=>document.documentElement.style.fontSize='100%');await page.setViewportSize({width:1440,height:1000});
  await explorer.getByRole('button',{name:'Today',exact:true}).click();await expect(total.locator('.financial-value')).toHaveAttribute('aria-label','£ -');
  await explorer.getByRole('button',{name:'This month',exact:true}).click();await expect(total.locator('.financial-value')).toHaveAttribute('aria-label','£ 12.34');
  await page.goto('/reports');
  await page.getByRole('tab',{name:'Performance'}).click();
  const picker=page.locator('.profile-report-picker');await picker.locator('summary').click();
  await picker.getByLabel('Report Profile scope').selectOption('custom');await picker.getByLabel('Search Report Profiles').fill(String(suffix));
  await picker.getByRole('button',{name:'Use Matching Profiles'}).click();
  await picker.locator('label').filter({hasText:`Synthetic explorer 2 ${suffix}`}).getByRole('checkbox').uncheck();
  await picker.locator('summary').click();await expect(total.locator('.financial-value')).toHaveAttribute('aria-label','£ 10.00',{timeout:60000});
  await picker.locator('summary').click();
  await picker.locator('label').filter({hasText:`Synthetic explorer 2 ${suffix}`}).getByRole('checkbox').check();await picker.locator('summary').click();await expect(total.locator('.financial-value')).toHaveAttribute('aria-label','£ 17.00');
  const path="**/reports/combined-summary-sources";let seen=false;let release!:()=>void;const held=new Promise<void>(r=>release=r);
  await page.route(path,async route=>{seen=true;await held;await route.continue();});await page.reload();await expect.poll(()=>seen).toBe(true);await expect(total.locator('.financial-value')).toHaveCount(0);release();await expect(total.locator('.financial-value')).toHaveAttribute('aria-label','£ 17.00');await page.unroute(path);
  await page.route(path,r=>r.fulfill({status:503,json:{detail:'Synthetic failed Profile'}}));await page.reload();await expect(total).toContainText('Unavailable');await expect(total.locator('.financial-value')).toHaveCount(0);await page.unroute(path);
 }finally{await page.unrouteAll({behavior:'ignoreErrors'});for(const id of ids)await request.patch(`/api/profiles/${id}`,{data:{status:'Archived'}});}
});

test("Explorer distinguishes unknown results, undated activity, zero and rapid range changes",async({page,request})=>{
 const health=await(await request.get('/api/healthz')).json();expect(['cp055-synthetic','cp078-reports-synthetic']).toContain(health.database_identity);
 const profiles=await(await request.get('/api/profiles')).json();const profile=profiles.find((p:{display_name:string})=>p.display_name.startsWith('Synthetic explorer 0 '));expect(profile).toBeTruthy();
 const path=`/api/profiles/${profile.profile_id}/tracker-summary-sources`;const source=await(await request.get(path)).json();
 // Synthetic read-failure fixture: no operational records are mutated.
 expect(source.sportsbook_bets.length).toBeGreaterThan(0);const row=source.sportsbook_bets[0];row.final_net_pnl=null;row.reporting_value=null;row.calculation_state='review_required';
 await page.clock.setFixedTime(new Date('2026-09-26T12:00:00Z'));await page.route('**'+path,r=>r.fulfill({json:source}));await page.goto(`/profiles/${profile.profile_id}/tracker/reports`);
 const explorer=page.locator('[data-pd-id="reports.explorer"]');const total=explorer.locator('[data-pd-id="reports.explorer.total"]');
 await expect(total).toHaveText('Incomplete');await expect(explorer.getByRole('status')).toContainText('1 unavailable eligible result');
 row.final_net_pnl='0.00';row.reporting_value='0.00';row.calculation_state='resolved';await page.reload();await expect(total.locator('.financial-value')).toHaveAttribute('aria-label','£ -');
 row.date_settled='';await page.reload();await expect(total).toHaveText('Incomplete');await expect(explorer.getByRole('status')).toContainText('1 undated candidate');
 row.date_settled='2026-09-23';row.final_net_pnl='-3.00';row.reporting_value='-3.00';await page.reload();await expect(total.locator('.financial-value')).toHaveAttribute('aria-label','£ (3.00)');
 await explorer.getByRole('button',{name:'Today',exact:true}).click();await explorer.getByRole('button',{name:'This month',exact:true}).click();await explorer.getByRole('button',{name:'Custom',exact:true}).click();await explorer.getByLabel('Explorer start').fill('2026-09-23');await explorer.getByLabel('Explorer end').fill('2026-09-23');await expect(total.locator('.financial-value')).toHaveAttribute('aria-label','£ (3.00)');
});
