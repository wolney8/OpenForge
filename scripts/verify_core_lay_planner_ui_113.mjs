// Only the existing owned, authenticated synthetic review runtime. Never operational data.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {chromium, request, expect} from '@playwright/test';
const runtime='/tmp/openforge-award-integrity-91-20260914';
const token=fs.readFileSync(runtime+'/session-token','utf8').trim();
const api=await request.newContext({baseURL:'http://127.0.0.1:8039',extraHTTPHeaders:{Cookie:'pd_session='+token}});
assert.equal((await(await api.get('/auth/session')).json()).email,'notification-acceptance@example.invalid');
const made=await api.post('/profiles/onboarding',{data:{setup_path:'import',display_name:'Synthetic Core Planner',profile_code:'CORE-'+Date.now(),tracking_start_date:'2026-09-01',enabled_modules:['sportsbook-bets','free-bets','cash-adjustments'],accounts:[],quick_actions:[]}});
assert.equal(made.status(),201,await made.text()); const pid=(await made.json()).profile.profile_id;
assert.equal((await api.patch('/profiles/'+pid,{data:{status:'Active'}})).status(),200);
const accounts={};
for(const [account,type] of [['Bet365','Bookie'],['Smarkets','Exchange']]) {
 const r=await api.post('/profiles/'+pid+'/accounts',{data:{account,type,status:'Active',lifecycle_status:'Active',channel:'Online',current_balance:'0.00',pending_withdrawal_amount:'0.00',...(type==='Exchange'?{commission_rate:'0.02'}:{})}});
 assert.equal(r.status(),201,await r.text()); accounts[type]=await r.json();
}
assert.equal((await api.put('/profiles/'+pid+'/exchange-commissions',{data:{exchange_name:'Smarkets',commission_rate:'0.02'}})).status(),200);
const browser=await chromium.launch({headless:true});
const evidence={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),date:new Date().toISOString(),profileId:pid,cases:[]};
const database=new DatabaseSync(runtime+'/acceptance.sqlite3',{readOnly:true});
// Independent inspection must respect SQLite's existing brief writer transaction.
database.exec('PRAGMA busy_timeout=5000');
function stored(ledger,id) {
 assert(['free-bets','sportsbook-bets'].includes(ledger));
 const table=ledger==='free-bets'?'free_bets':'sportsbook_bets',key=ledger==='free-bets'?'free_bet_id':'sportsbook_bet_id';
 return database.prepare(`SELECT * FROM ${table} WHERE profile_id=? AND ${key}=?`).get(pid,id);
}
try {
 for(const [basis,width,theme] of (process.argv.includes('--normal-only')?[['Normal',760,'dark']]:[['SNR',1440,'light'],['Normal',760,'dark'],['SNR',760,'dark'],['Normal',1440,'light']])) {
 const ledger=basis==='SNR'?'free-bets':'sportsbook-bets',prefix=basis==='SNR'?'free-bets':'sportsbook';
 const planned=basis==='SNR'?'6.25':'9.57',chosen=basis==='SNR'?'Underlay':'Standard';
 // Both back-win branches: 10*(4-1) - 6*(4.2-1) = 10.80.
 const backWon='10.80',layWon=basis==='SNR'?'5.88':'-4.12';
 const eventName=`Synthetic Core Native ${basis} ${width} ${theme}`;
 const context=await browser.newContext({viewport:{width,height:1100},permissions:['clipboard-read','clipboard-write'],reducedMotion:theme==='light'?'reduce':'no-preference'});
 await context.addCookies([{name:'pd_session',value:token,domain:'localhost',path:'/'}]);
 await context.addInitScript(t=>localStorage.setItem('openforge-theme',t),theme);
 const page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',e=>console.log('PAGEERROR',e.message));
 page.on('response',async r=>{if(r.url().endsWith('/matched-betting/preview')&&r.status()!==200)console.log('REFERENCE ERROR',r.status(),await r.text());});
 await page.goto('http://localhost:3040/profiles/'+pid+'/tracker/'+ledger);
 await page.locator('[data-pd-id="ledger.toolbar.add-row"]').click();
 const dialog=page.locator(`[data-pd-id="${prefix}.editor.dialog"]`);await dialog.waitFor();
 if(basis==='Normal')await dialog.getByLabel('Offer',{exact:true}).fill('Synthetic core planning');
 await dialog.locator('label').filter({hasText:/^Bookmaker/}).locator('select').selectOption('Bet365');
 await dialog.locator('label').filter({hasText:/^Offer type/}).locator('select').selectOption('Bet & Get');
 await dialog.locator('label').filter({hasText:/^Bet type/}).locator('select').selectOption('Single');
 await dialog.locator('label').filter({hasText:/^Fixture type/}).locator('select').selectOption('Football');
 await dialog.getByLabel('Event name',{exact:true}).fill(eventName);
 await dialog.getByRole('tab',{name:/Matching/}).first().click();
 const core=dialog.locator(`[data-pd-id="${prefix}.matching.core-planner"]`);await core.waitFor();
 if(process.argv.includes('--inspect')) console.log('MATCHING FORM',await core.innerText());
 await core.getByLabel(basis==='SNR'?'Free bet value':'Back stake',{exact:true}).fill('10.00');
 await core.getByLabel('Back odds',{exact:true}).fill('4.00');
 await core.getByLabel('Lay odds',{exact:true}).fill('4.20');
 await core.locator('label').filter({hasText:/^Exchange/}).locator('select').selectOption(accounts.Exchange.account_id);
 await expect(core.getByLabel('Planning Commission (%)',{exact:true})).toHaveValue('2');
 await core.getByRole('button',{name:'Advanced',exact:true}).click();
 try {await expect(core.getByRole('button',{name:'Apply Underlay',exact:true})).toBeEnabled();}
 catch(e) {console.log('CORE FAILED STATE',await core.innerText());throw e;}
 await core.getByRole('button',{name:'Apply '+chosen,exact:true}).click();
 const selected=core.locator('[data-pd-id$=".selected-reference"]');
 await expect(selected.getByRole('row').first()).toHaveAttribute('aria-label',new RegExp(planned.replace('.','\\.')));
 await selected.getByRole('row').first().getByRole('button').click();
 assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),planned);
 await core.locator('[data-pd-id$=".paired-segments"]').scrollIntoViewIfNeeded();
 await page.screenshot({path:`${runtime}/core-native-${basis}-${width}-${theme}.png`,fullPage:true});
 const save=dialog.getByRole('button',{name:'Save',exact:true});await expect(save).toBeEnabled();
 await save.click();await expect(dialog).toBeHidden();
 const rows=await(await api.get('/profiles/'+pid+'/'+ledger)).json();
 let row=rows.find(r=>r.event_name===eventName);assert(row);
 const id=row[basis==='SNR'?'free_bet_id':'sportsbook_bet_id'],url='http://localhost:3040/profiles/'+pid+'/tracker/'+ledger+'?record='+id;
 let plan=JSON.parse(row.lay_plan_json);
 assert.equal(plan.selected_strategy,chosen);assert.equal(plan.reviewed_planned_lay_stake,planned);
 assert.equal(row.lay_actual,'');assert.equal(row.lay_matched_stake_1,'');
 assert.equal(row.lay_status,'Not Laid');
 assert.equal(stored(ledger,id).lay_actual,'');assert.equal(stored(ledger,id).lay_commission_1,'');
 await page.goto(url);await dialog.waitFor();await dialog.getByRole('tab',{name:/Matching/}).first().click();
 await core.getByRole('button',{name:'Advanced',exact:true}).click();
 await expect(core.getByRole('button',{name:'Apply Underlay',exact:true})).toBeEnabled();
 await expect(core.getByLabel('Planning Commission (%)')).toHaveValue('2');
 await expect(selected.getByRole('row').first()).toHaveAttribute('aria-label',new RegExp(planned.replace('.','\\.')));
 const expected={Underlay:['6.25','20.00','10.00','6.13'],Overlay:['10.20','32.64','-2.64','10.00'],Custom:['9.00','28.80','1.20','8.82']};
 await core.getByLabel('Custom Lay',{exact:true}).fill('9.00');
 await expect(selected.getByRole('row').first()).toHaveAttribute('aria-label',/9\.00/);
 for(const name of (basis==='SNR'?['Underlay','Overlay','Custom']:[])) {
  const reference=core.locator(`[data-pd-id$=".${name.toLowerCase()}"]`);
  for(const [i,value] of expected[name].entries())await expect(reference.getByRole('row').nth(i)).toHaveAttribute('aria-label',new RegExp(value.replace('-','').replace('.','\\.')));
  const a=await reference.boundingBox(),b=await core.locator('[data-pd-id$=".outcomes"]').boundingBox();assert(Math.abs(a.x-b.x)<=1&&Math.abs(a.width-b.width)<=1);
 }
 await core.getByRole('button',{name:'Apply '+chosen,exact:true}).click();
 await expect(selected.getByRole('row').first()).toHaveAttribute('aria-label',new RegExp(planned.replace('.','\\.')));
 if(basis==='SNR'&&width===1440) {
  for(const [percentage,ratio] of [['0','0'],['5','0.05'],['2.125','0.02125'],['2','0.02']]) {
   await core.getByLabel('Planning Commission (%)').fill(percentage);
   await expect(selected.getByRole('row').first().getByRole('button')).toBeEnabled();
   await expect(save).toBeEnabled();await save.click();await expect(dialog).toBeHidden();
   const savedRow=await(await api.get('/profiles/'+pid+'/'+ledger+'/'+id)).json();
   assert.equal(JSON.parse(savedRow.lay_plan_json).commission,ratio);assert.equal(JSON.parse(savedRow.lay_plan_json).commission_origin,'override');
   assert.equal(savedRow.lay_actual,'');
   await page.goto(url);await dialog.waitFor();await dialog.getByRole('tab',{name:/Matching/}).first().click();
   await expect(core.getByLabel('Planning Commission (%)')).toHaveValue(percentage);
   await expect(selected.getByRole('row').first().getByRole('button')).toBeEnabled();
  }
  const result=core.locator('[data-pd-id$=".outcomes"]');await result.evaluate(el=>el.dataset.testIdentity='persistent');
  let entered,release;const held=new Promise(r=>entered=r),gate=new Promise(r=>release=r);let first=true;
  const intercept=async route=>{if(!first)return route.continue();first=false;const response=await route.fetch();entered();await gate;try{await route.fulfill({response});}catch{/* superseded aborted request */}};
  await page.route('**/matched-betting/preview',intercept);
  await core.getByLabel('Back odds',{exact:true}).fill('5.00');
  await Promise.race([held,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Held preview request was not intercepted')),20000))]);
  await expect(selected.getByRole('row').first().getByRole('button')).toBeDisabled();await expect(save).toBeDisabled();
  await core.getByLabel('Back odds',{exact:true}).fill('6.00');
  // Underlay endpoint 10*(6-2)/(4.2-1) = 12.50, independent.
  await expect(selected.getByRole('row').first()).toHaveAttribute('aria-label',/12\.50/);
  await expect(selected.getByRole('row').first().getByRole('button')).toBeEnabled();release();await page.unroute('**/matched-betting/preview',intercept);
  await expect(selected.getByRole('row').first()).toHaveAttribute('aria-label',/12\.50/);
  await core.getByLabel('Back odds',{exact:true}).fill('4.00');await expect(selected.getByRole('row').first()).toHaveAttribute('aria-label',/6\.25/);
  await core.getByLabel('Custom Lay',{exact:true}).fill('9.00');await expect(selected.getByRole('row').first()).toHaveAttribute('aria-label',/9\.00/);
  const slider=core.getByRole('slider',{name:'Custom lay stake slider'});await slider.focus();await page.keyboard.press('ArrowRight');
  await expect(selected.getByRole('row').first().getByRole('button')).toBeEnabled();
  const current=await core.getByLabel('Custom Lay',{exact:true}).inputValue();
  assert.notEqual(current,'9.00');await selected.getByRole('row').first().getByRole('button').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),current);
  await expect(result).toHaveAttribute('data-test-identity','persistent');
  await core.getByRole('button',{name:'Simple',exact:true}).click();await expect(selected.getByRole('row').first()).toHaveAttribute('aria-label',/7\.18/);
  await core.getByRole('button',{name:'Advanced',exact:true}).click();await expect(selected.getByRole('row').first()).toHaveAttribute('aria-label',/7\.18/);
  await core.getByRole('button',{name:'Apply Underlay',exact:true}).click();await expect(selected.getByRole('row').first()).toHaveAttribute('aria-label',/6\.25/);
 }
 await core.getByLabel('Actual matched stake',{exact:true}).fill('6.00');
 await core.getByLabel('Actual lay odds',{exact:true}).fill('4.20');
 await core.getByLabel('Actual Commission (%)',{exact:true}).fill('2');
 await core.getByRole('button',{name:'Confirm actual placement',exact:true}).click();
 await expect(save).toBeEnabled();await save.click();await expect(dialog).toBeHidden();
 row=await(await api.get('/profiles/'+pid+'/'+ledger+'/'+id)).json();
 assert.equal(row.lay_actual,'6.00');assert.equal(row.lay_commission_1,'0.02');assert.equal(row.calculated_liability_1,'19.20');
 assert.equal(JSON.parse(row.lay_plan_json).reviewed_planned_lay_stake,planned);
 await page.goto(url);await dialog.waitFor();await dialog.getByRole('tab',{name:/Matching/}).first().click();
 await expect(core.getByLabel('Planning Commission (%)',{exact:true})).toBeVisible();
 let releasePlan,enteredPlan;
 const heldPlan=new Promise(resolve=>releasePlan=resolve),preparedPlan=new Promise(resolve=>enteredPlan=resolve);
 await page.route('**/matched-betting/preview',async route=>{
   if(route.request().postDataJSON().exchange_commission!=='0.05')return route.continue();
   const response=await route.fetch();enteredPlan();await heldPlan;await route.fulfill({response});
 });
 await core.getByLabel('Planning Commission (%)',{exact:true}).fill('5');
 await Promise.race([preparedPlan,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Plan response did not enter gate')),20000))]);
 await dialog.getByRole('tab',{name:/Settlement/}).first().click();
 const settlement=page.waitForResponse(r=>r.url().endsWith('/'+ledger+'/'+id)&&r.request().method()==='PUT');
 await dialog.locator('label').filter({hasText:/^Result/}).locator('select').filter({visible:true}).selectOption('Back Won');
 releasePlan();const settled=await settlement;
 await page.unroute('**/matched-betting/preview');
 assert.equal(settled.status(),200,await settled.text());row=await settled.json();
 assert.equal(row.final_net_pnl,backWon);assert.equal(row.scenario_pnl_if_lay_wins,layWon);
 assert.equal(JSON.parse(row.lay_plan_json).commission,'0.05');
 assert.equal(stored(ledger,id).lay_actual,'6.00');assert.equal(stored(ledger,id).lay_commission_1,'0.02');assert.equal(stored(ledger,id).result,'Back Won');
 await page.goto('http://localhost:3040/profiles/'+pid+'/tracker/reports');
 await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();
 const total=((evidence.cases.filter(c=>c.kind.startsWith('native')).reduce((sum,c)=>sum+Math.round(Number(c.backWon)*100),0)+Math.round(Number(backWon)*100))/100).toFixed(2);
 await expect(page.locator('.financial-value').filter({hasText:total}).first()).toBeVisible();
 await page.reload();await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 evidence.cases.push({kind:'native '+basis,width,theme,id,plan:planned,actual:'6.00',commission:'0.02',liability:'19.20',backWon,layWon,references:basis==='SNR'?expected:undefined,copy:planned,report:total});
 await context.close();
 }
 if(!process.argv.includes('--normal-only')) for(const [basis,strategy,width,theme] of [['SNR','Underlay',1440,'light'],['SNR','Overlay',760,'dark'],['Normal','Standard',760,'dark'],['SNR','Custom',1440,'light']]) {
  const ledger=basis==='SNR'?'free-bets':'sportsbook-bets',prefix=basis==='SNR'?'free-bets':'sportsbook';
  const stake={Underlay:'6.25',Overlay:'10.20',Custom:'9.00',Standard:basis==='SNR'?'7.18':'9.57'}[strategy];
  const context=await browser.newContext({viewport:{width,height:1100},permissions:['clipboard-read','clipboard-write'],reducedMotion:theme==='light'?'reduce':'no-preference'});
  await context.addCookies([{name:'pd_session',value:token,domain:'localhost',path:'/'}]);
  await context.addInitScript(t=>localStorage.setItem('openforge-theme',t),theme);
  const page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const params=new URLSearchParams({family:'matched-betting',betType:basis==='SNR'?'free_bet':'qualifying',freeBetMode:'SNR',backStake:'10.00',backOdds:'4.00',layOdds:'4.20',exchangeCommission:'0.02',commissionUnits:'ratio',presentationMode:'Advanced',strategy,manualLayStake:strategy==='Custom'?'9.00':'',customLayDraft:'9.00',exchange:'Smarkets'});
  const path=width===760?'/calculator':'/fund-manager/calculators';
  await page.goto('http://localhost:3040'+path+'?'+params);
  const sourceCopy=page.locator('[data-pd-id="calculators.matched-betting.copy-lay-stake"] button');
  await expect(sourceCopy).toBeEnabled();await expect(sourceCopy).toHaveAttribute('aria-label',new RegExp(stake.replace('.','\\.')));
  await sourceCopy.click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),stake);
  await page.screenshot({path:`${runtime}/core-standalone-${basis}-${strategy}-${width}-${theme}.png`,fullPage:true});
  const convert=page.getByRole('button',{name:'Convert to opportunity',exact:true});await convert.click();
  const dialog=page.locator('[data-pd-id="calculator-conversion.dialog"]');await dialog.waitFor();
  await dialog.getByLabel('Event / fixture',{exact:true}).fill(`Synthetic converted ${basis} ${strategy}`);
  await dialog.locator('label').filter({hasText:/^Offer type/}).locator('select').selectOption('Bet & Get');
  await dialog.locator('label').filter({hasText:/^Fixture type/}).locator('select').selectOption('Football');
  const profile=await(await api.get('/profiles/'+pid)).json();
  await dialog.locator('label.multi-profile-target-row').filter({hasText:profile.profile_code}).click();
  await dialog.locator('select').filter({has:page.locator(`option[value="${accounts.Bookie.account_id}"]`)}).selectOption(accounts.Bookie.account_id);
  const [saved]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/calculator-conversions/standard')&&r.request().method()==='POST'),dialog.getByRole('button',{name:'Convert to opportunity',exact:true}).click()]);
  assert.equal(saved.status(),200,await saved.text());const body=await saved.json();assert.equal(body.results[0].state,'succeeded',JSON.stringify(body));
  await expect(dialog).toBeHidden();await expect(convert).toBeFocused();
  await expect(page.locator('.calculator-conversion-receipt').getByRole('link',{name:'Open row'})).toHaveCount(1);
  assert.equal(await page.locator('#calculator-back-stake').inputValue(),'10.00');
  const target=body.results[0],recordUrl='/profiles/'+pid+'/'+ledger+'/'+target.record_id;
  let row=await(await api.get(recordUrl)).json(),plan=JSON.parse(row.lay_plan_json);
  assert.equal(plan.selected_strategy,strategy);assert.equal(plan.reviewed_planned_lay_stake,stake);assert(plan.source_identity&&plan.source_checksum);
  assert.equal(row.lay_actual,'');assert.equal(row.lay_matched_stake_1,'');
  assert.equal(row.lay_status,'Not Laid');
  assert.equal(stored(ledger,target.record_id).lay_actual,'');assert.equal(stored(ledger,target.record_id).lay_commission_1,'');
  const retry=await api.post('/fund-manager/calculator-conversions/standard',{data:saved.request().postDataJSON()});
  assert.equal(retry.status(),200);assert.equal((await retry.json()).results[0].record_id,target.record_id);
  const table=ledger==='free-bets'?'free_bets':'sportsbook_bets';
  assert.equal(database.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE profile_id=? AND lay_plan_json LIKE ?`).get(pid,'%'+plan.source_checksum+'%').n,1);
  const readUrl='http://localhost:3040'+target.href;
  await page.goto(readUrl);const editor=page.locator(`[data-pd-id="${prefix}.editor.dialog"]`);await editor.waitFor();
  await editor.getByRole('tab',{name:/Matching/}).first().click();const core=editor.locator(`[data-pd-id="${prefix}.matching.core-planner"]`);
  if(strategy==='Standard')await core.getByRole('button',{name:'Advanced',exact:true}).click();
  const selected=core.locator('[data-pd-id$=".selected-reference"]');
  await expect(selected.getByRole('row').first()).toHaveAttribute('aria-label',new RegExp(stake.replace('.','\\.')));
  await expect(core.getByLabel('Planning Commission (%)')).toHaveValue('2');
  await expect(selected.getByRole('row').first().getByRole('button')).toBeEnabled();
  await selected.getByRole('row').first().getByRole('button').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),stake);
  assert.equal((await(await api.get(recordUrl)).json()).lay_actual,'','Copy must not place');
  await core.locator('[data-pd-id$=".paired-segments"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${runtime}/core-embedded-${basis}-${strategy}-${width}-${theme}.png`,fullPage:true});
  const geometry=await core.locator('[data-pd-id$=".paired-segments"]').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,headings:[...el.querySelectorAll('.calculator-segment-heading')].map(e=>e.getBoundingClientRect().toJSON())}));
  assert(geometry.scroll<=geometry.width+1,JSON.stringify(geometry));
  if(width===1440)assert(Math.abs(geometry.headings[0].top-geometry.headings[1].top)<=1,JSON.stringify(geometry));
  await core.getByLabel('Actual matched stake',{exact:true}).fill('6.00');
  await core.getByLabel('Actual Commission (%)').fill('2');await core.getByRole('button',{name:'Confirm actual placement',exact:true}).click();
  const save=editor.getByRole('button',{name:'Save',exact:true});await expect(save).toBeEnabled();await save.click();await expect(editor).toBeHidden();
  row=await(await api.get(recordUrl)).json();assert.equal(row.calculated_liability_1,'19.20');assert.equal(row.lay_commission_1,'0.02');
  assert.equal(JSON.parse(row.lay_plan_json).reviewed_planned_lay_stake,stake);
  await page.goto(readUrl);await editor.waitFor();await editor.getByRole('tab',{name:/Settlement/}).first().click();
  const [settled]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(recordUrl)&&r.request().method()==='PUT'),editor.locator('label').filter({hasText:/^Result/}).locator('select').filter({visible:true}).selectOption('Back Won')]);
  assert.equal(settled.status(),200,await settled.text());row=await settled.json();
  const backWon='10.80';assert.equal(row.final_net_pnl,backWon);
  assert.equal(stored(ledger,target.record_id).lay_actual,'6.00');assert.equal(stored(ledger,target.record_id).lay_commission_1,'0.02');assert.equal(stored(ledger,target.record_id).result,'Back Won');
  await page.goto('http://localhost:3040/profiles/'+pid+'/tracker/reports');await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();
  const total=((evidence.cases.reduce((sum,c)=>sum+Math.round(Number(c.backWon)*100),0)+Math.round(Number(backWon)*100))/100).toFixed(2);
  await expect(page.locator('.financial-value').filter({hasText:total}).first()).toBeVisible();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  evidence.cases.push({kind:'converted '+basis,strategy,width,theme,id:target.record_id,plan:stake,copy:stake,actual:'6.00',commission:'0.02',liability:'19.20',backWon,report:total,sourceChecksum:plan.source_checksum,geometry,receipt:true,retryReusedId:true});
  await context.close();
 }
 evidence.reviewRecords=[];
 for(const basis of process.argv.includes('--normal-only')?['Normal']:['Normal','SNR']) {
  const ledger=basis==='SNR'?'free-bets':'sportsbook-bets';
  const reference=evidence.cases.find(c=>c.kind==='native '+basis);
  const original=await(await api.get('/profiles/'+pid+'/'+ledger+'/'+reference.id)).json();
  const plan=JSON.parse(original.lay_plan_json);plan.revision=0;plan.source_identity='';plan.source_checksum='';
  const response=await api.post('/profiles/'+pid+'/'+ledger,{data:{event_name:'Synthetic review '+basis,offer_text:'Synthetic review plan',bookmaker:'Bet365',offer_type:'Bet & Get',bet_type:'Single',fixture_type:'Football',status:basis==='SNR'?'Available':'Prospecting',result:'Pending',retention_mode:'SNR',free_bet_value:'10.00',back_stake:'10.00',back_odds:'4.00',lay_odds_1:'4.20',exchange_name:'Smarkets',match_strategy:plan.selected_strategy,lay_actual:'',lay_matched_stake_1:'',lay_plan_json:JSON.stringify(plan)}});
  assert.equal(response.status(),201,await response.text());const row=await response.json(),id=row[basis==='SNR'?'free_bet_id':'sportsbook_bet_id'];
  assert.equal(stored(ledger,id).lay_actual,'');
  evidence.reviewRecords.push({basis,id,href:'/profiles/'+pid+'/tracker/'+ledger+'?record='+id});
 }
 evidence.result='PASS';console.log(JSON.stringify(evidence));
} finally {database.close();await browser.close();await api.dispose();fs.writeFileSync(runtime+'/core-lay-planner-ui-evidence.json',JSON.stringify(evidence,null,2));}
