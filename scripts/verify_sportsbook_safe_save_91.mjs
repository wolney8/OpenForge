// PD-QA-020 real, authenticated browser; only the explicitly owned synthetic runtime.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium, request, expect} from '@playwright/test';
const runtime='/tmp/openforge-sportsbook-safe-91-20260913';
const web='http://localhost:3038';
const token=fs.readFileSync(runtime+'/session-token','utf8').trim();
const api=await request.newContext({baseURL:'http://127.0.0.1:8038',extraHTTPHeaders:{Cookie:`pd_session=${token}`}});
assert.equal((await(await api.get('/auth/session')).json()).email,'notification-acceptance@example.invalid');
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050},permissions:['clipboard-read','clipboard-write'],reducedMotion:'reduce'});
await context.addCookies([{name:'pd_session',value:token,domain:'localhost',path:'/'}]);
const page=await context.newPage();page.setDefaultTimeout(30000);
const evidence={date:new Date().toISOString(),checks:[],errors:[]};
page.on('pageerror',e=>evidence.errors.push(e.message));
const created=await api.post('/profiles/onboarding',{data:{setup_path:'import',display_name:'Synthetic Sportsbook Repair',profile_code:`PQA-SAFE-${Date.now()}`,tracking_start_date:'2026-09-01',enabled_modules:['sportsbook-bets','free-bets','casino-offers','cash-adjustments'],accounts:[],quick_actions:[]}});
assert.equal(created.status(),201,await created.text());const body=await created.json();const id=(body.profile??body).profile_id;
assert.equal((await api.patch(`/profiles/${id}`,{data:{status:'Active'}})).status(),200);
for(const [account,type] of [['Bet365','Bookie'],['Smarkets','Exchange']]){
 const r=await api.post(`/profiles/${id}/accounts`,{data:{account,type,status:'Active',lifecycle_status:'Active',channel:'Online',current_balance:'0.00',pending_withdrawal_amount:'0.00',...(type==='Exchange'?{commission_rate:'0.02'}:{})}});
 assert.equal(r.status(),201,await r.text());
}
assert.equal((await api.put(`/profiles/${id}/exchange-commissions`,{data:{exchange_name:'Smarkets',commission_rate:'0.02'}})).status(),200);
const dialog=page.locator('[data-pd-id="sportsbook.editor.dialog"]');
try {
 for(const [width,theme] of (process.argv.includes('--legacy-only')?[]:[[1440,'light'],[760,'dark'],[1440,'dark'],[760,'light']])){
  await page.setViewportSize({width,height:1050});
  await page.goto(`${web}/profiles/${id}/tracker/sportsbook-bets`,{waitUntil:'domcontentloaded'});
  await page.evaluate(t=>{localStorage.setItem('openforge-theme',t);document.documentElement.dataset.theme=t;},theme);
  await page.getByRole('button',{name:'Add sportsbook row',exact:true}).click();await dialog.waitFor();
  await dialog.getByLabel('Offer',{exact:true}).fill('Synthetic integrity fixture');
  await dialog.locator('label').filter({hasText:/^Bookmaker/}).locator('select').selectOption('Bet365');
  await dialog.locator('label').filter({hasText:/^Bet type/}).locator('select').selectOption('Single');
  await dialog.locator('label').filter({hasText:/^Offer type/}).locator('select').selectOption('Bet & Get');
  await dialog.locator('label').filter({hasText:/^Fixture type/}).locator('select').selectOption('Football');
  await dialog.getByLabel('Event name',{exact:true}).fill(`Synthetic ${width} ${theme}`);
  const [saved]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/sportsbook-bets')&&r.request().method()==='POST'),dialog.getByRole('button',{name:'Save',exact:true}).click()]);
  assert.equal(saved.status(),201,await saved.text());const ident=(await saved.json()).sportsbook_bet_id;
  await page.goto(`${web}/profiles/${id}/tracker/sportsbook-bets?record=${ident}`,{waitUntil:'domcontentloaded'});await dialog.waitFor();
  await dialog.getByRole('tab',{name:/Matching/}).first().click();
  const stake=dialog.getByLabel('Back stake',{exact:true});
  await stake.fill('not-money');await expect(stake).toHaveValue('not-money');await expect(stake).toHaveAttribute('aria-invalid','true');
  await expect(dialog.locator('#sportsbook-money-back-stake-error')).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Save',exact:true})).toBeDisabled();
  await page.screenshot({path:`${runtime}/sportsbook-error-${width}-${theme}.png`,fullPage:true});
  assert.ok((await stake.getAttribute('aria-describedby')).includes('sportsbook-money-back-stake-error'));
  await stake.focus();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('10.00');
  await dialog.getByLabel('Back odds',{exact:true}).fill('5.00');
  // Await this real autosave boundary for the positive path. The separate PD-QA-019
  // stale-edit race is not repaired or claimed by this synchronised assertion.
  await Promise.all([page.waitForResponse(r=>r.url().endsWith(`/sportsbook-bets/${ident}`)&&r.request().method()==='PUT'),dialog.locator('label').filter({hasText:/^Exchange/}).locator('select').selectOption('Smarkets')]);
  await dialog.locator('label').filter({hasText:/^Lay odds 1/}).locator('input').fill('5.20');
  await dialog.getByRole('button',{name:'Copy Standard lay stake and mark placed',exact:true}).click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'9.65');
  const actual=dialog.getByLabel('Lay actual',{exact:true});await actual.fill('Infinity');
  await expect(actual).toHaveValue('Infinity');await expect(actual).toHaveAttribute('aria-invalid','true');
  await expect(dialog.locator('#sportsbook-money-lay-actual-error')).toBeVisible();
  await actual.fill('9.00');await actual.blur();
  await dialog.getByRole('tab',{name:/Settlement/}).first().click();
  await dialog.locator('label').filter({hasText:/^Settles/}).locator('input').filter({visible:true}).fill('2026-09-13T12:00');
  const save=dialog.getByRole('button',{name:'Save',exact:true});
  const box=await save.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width);
  assert.ok(await save.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
  const [placed]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(`/sportsbook-bets/${ident}`)&&r.request().method()==='PUT'),save.click()]);
  assert.equal(placed.status(),200,await placed.text());assert.equal((await placed.json()).calculated_liability_1,'37.80');
  await page.goto(`${web}/profiles/${id}/tracker/sportsbook-bets?record=${ident}`,{waitUntil:'domcontentloaded'});await dialog.waitFor();await dialog.getByRole('tab',{name:/Settlement/}).first().click();
  const [settled]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(`/sportsbook-bets/${ident}`)&&r.request().method()==='PUT'),dialog.locator('label').filter({hasText:/^Result/}).locator('select').filter({visible:true}).selectOption('Back Won')]);
  assert.equal(settled.status(),200);assert.equal((await settled.json()).final_net_pnl,'2.20');
  await page.reload();await dialog.waitFor();await dialog.getByRole('tab',{name:/Settlement/}).first().click();
  await dialog.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]').filter({visible:true}).click();
  const [corrected]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(`/sportsbook-bets/${ident}`)&&r.request().method()==='PUT'),dialog.locator('label').filter({hasText:/^Result/}).locator('select').filter({visible:true}).selectOption('Lay Won')]);
  assert.equal(corrected.status(),200);assert.equal((await corrected.json()).final_net_pnl,'-1.18');
  assert.equal((await(await api.get(`/profiles/${id}/sportsbook-bets/${ident}`)).json()).final_net_pnl,'-1.18');
  await page.goto(`${web}/profiles/${id}/tracker/reports`,{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();
  assert.ok(await page.getByText('£ (1.18)',{exact:true}).count() || await page.getByText(`£ (${((evidence.checks.length+1)*1.18).toFixed(2)})`,{exact:true}).count());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false);
  await page.screenshot({path:`${runtime}/sportsbook-safe-${width}-${theme}.png`,fullPage:true});
  evidence.checks.push({width,theme,id:ident,copy:'9.65',actual:'9.00',liability:'37.80',backWon:'2.20',layWon:'-1.18',pointerSave:true,noPageOverflow:true});
 }
 const persisted = JSON.parse(execFileSync('scripts/run-python.sh',['-c',"import sqlite3,sys,json; c=sqlite3.connect(sys.argv[1]); c.row_factory=sqlite3.Row; print(json.dumps([dict(r) for r in c.execute('SELECT sportsbook_bet_id,back_stake,back_odds,lay_actual,lay_matched_stake_1,result FROM sportsbook_bets WHERE profile_id=?',(sys.argv[2],))]))",runtime+'/acceptance.sqlite3',id],{encoding:'utf8'}));
 for(const check of evidence.checks){const row=persisted.find(r=>r.sportsbook_bet_id===check.id);assert.equal(row.back_stake,'10.00');assert.equal(row.back_odds,'5.00');assert.equal(row.lay_actual,'9.00');assert.equal(row.result,'Lay Won');}
 const legacy=await api.post(`/profiles/${id}/sportsbook-bets`,{data:{event_name:'Synthetic legacy correction',bookmaker:'Bet365',offer_type:'Bet & Get',bet_type:'Single',fixture_type:'Football',status:'Settled',result:'Back Won',match_strategy:'Standard',back_stake:'10.00',back_odds:'5.00',lay_odds_1:'5.20',lay_actual:'9.00',exchange_name:'Smarkets',date_settled:'2026-09-13'}});
 assert.equal(legacy.status(),201);const legacyId=(await legacy.json()).sportsbook_bet_id;
 execFileSync('scripts/run-python.sh',['-c',"import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute(\"UPDATE sportsbook_bets SET back_stake='not-money' WHERE sportsbook_bet_id=?\",(sys.argv[2],)); c.commit()",runtime+'/acceptance.sqlite3',legacyId]);
 await page.goto(`${web}/profiles/${id}/tracker/reports`,{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();
 await expect(page.locator('[data-pd-id="sportsbook-money.incomplete"]')).toContainText(legacyId);
 assert.equal((await(await api.get(`/profiles/${id}/sportsbook-bets/${legacyId}`)).json()).back_stake,'not-money');
 await page.screenshot({path:runtime+'/legacy-incomplete.png',fullPage:true});
 await page.goto(`${web}/profiles/${id}/tracker/sportsbook-bets?record=${legacyId}`,{waitUntil:'domcontentloaded'});await dialog.waitFor();await dialog.getByRole('tab',{name:/Settlement/}).first().click();
 await dialog.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]').filter({visible:true}).click();await dialog.getByRole('tab',{name:/Matching/}).first().click();
 await expect(dialog.getByLabel('Back stake',{exact:true})).toHaveValue('not-money');
 await dialog.getByLabel('Back stake',{exact:true}).fill('10.00');
 const [fixed]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(`/sportsbook-bets/${legacyId}`)&&r.request().method()==='PUT'),dialog.getByRole('button',{name:'Save Edits',exact:true}).click()]);
 assert.equal(fixed.status(),200);assert.equal((await fixed.json()).final_net_pnl,'2.20');
 await page.goto(`${web}/profiles/${id}/tracker/reports`,{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();await expect(page.locator('[data-pd-id="sportsbook-money.incomplete"]')).toHaveCount(0);
 evidence.legacy={id:legacyId,rawPreservedBeforeExplicitCorrection:true,incompleteNotice:true,correctedFinal:'2.20'};
 assert.deepEqual(evidence.errors,[]);
 evidence.profileId=id;evidence.result='PASS';
} catch(e){evidence.result='FAIL';evidence.failure=e.message;await page.screenshot({path:runtime+'/failure.png',fullPage:true});throw e;}
finally{fs.writeFileSync(runtime+(process.argv.includes('--legacy-only')?'/legacy-evidence.json':'/browser-evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));await browser.close();await api.dispose();}
