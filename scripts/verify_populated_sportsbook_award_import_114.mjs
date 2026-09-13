// Audit only: genuine browser writes against a separately owned synthetic runtime.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium, request} from '@playwright/test';
const runtime='/tmp/openforge-populated-audit-114-20260913';
const web='http://localhost:3036';
const token=fs.readFileSync(runtime+'/session-token','utf8').trim();
const api=await request.newContext({baseURL:'http://127.0.0.1:8036',extraHTTPHeaders:{Cookie:`pd_session=${token}`}});
assert.equal((await(await api.get('/auth/session')).json()).email,'notification-acceptance@example.invalid');
const evidence={applicationSource:'6d2276e00d0a1a540f48f7ecc253e864ad30d5e3',candidate:'c460f2a3074ede07bf7db9e30cec8c7e137ed6fa',date:new Date().toISOString(),journeys:{},errors:[]};
if(fs.existsSync(runtime+'/populated-evidence.json')&&!process.argv.includes('--import'))evidence.journeys=JSON.parse(fs.readFileSync(runtime+'/populated-evidence.json')).journeys;
let fixture;
if(fs.existsSync(runtime+'/populated-fixture.json'))fixture=JSON.parse(fs.readFileSync(runtime+'/populated-fixture.json'));
else {
 const created=await api.post('/profiles/onboarding',{data:{setup_path:'import',display_name:'Synthetic Populated Audit',profile_code:`PQA-${Date.now()}`,tracking_start_date:'2026-09-01',enabled_modules:['sportsbook-bets','free-bets','casino-offers','cash-adjustments'],accounts:[],quick_actions:[]}});
 assert.equal(created.status(),201,await created.text());const body=await created.json();fixture={profileId:(body.profile??body).profile_id};
 assert.equal((await api.patch(`/profiles/${fixture.profileId}`,{data:{status:'Active'}})).status(),200);
 for(const [account,type] of [['Bet365','Bookie'],['Smarkets','Exchange']]){
  const r=await api.post(`/profiles/${fixture.profileId}/accounts`,{data:{account,type,status:'Active',lifecycle_status:'Active',channel:'Online',current_balance:'0.00',pending_withdrawal_amount:'0.00',...(type==='Exchange'?{commission_rate:'0.02'}:{})}});
  assert.equal(r.status(),201,await r.text());fixture[type+'Id']=(await r.json()).account_id;
 }
 assert.equal((await api.put(`/profiles/${fixture.profileId}/exchange-commissions`,{data:{exchange_name:'Smarkets',commission_rate:'0.02'}})).status(),200);
 fs.writeFileSync(runtime+'/populated-fixture.json',JSON.stringify(fixture,null,2));
}
let id=fixture.profileId;
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050},colorScheme:'light',reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
await context.addCookies([{name:'pd_session',value:token,domain:'localhost',path:'/'}]);
const page=await context.newPage();page.setDefaultTimeout(20000);
page.on('pageerror',e=>evidence.errors.push(e.message));
const snapshot=async name=>{
 fs.writeFileSync(runtime+'/'+name+'.txt',await page.locator('body').innerText());
 await page.screenshot({path:runtime+'/'+name+'.png',fullPage:true});
};
try {
 if(process.argv.includes('--inspect')){
  const sports=await(await api.get(`/profiles/${id}/sportsbook-bets`)).json();
  const free=await(await api.get(`/profiles/${id}/free-bets`)).json();
  const accounts=await(await api.get(`/profiles/${id}/accounts`)).json();
  evidence.journeys.persisted={sports,free,accounts,batches:await(await api.get(`/profiles/${id}/imports`)).json()};
  assert.equal(sports.find(r=>r.event_name==='Synthetic imported event').final_net_pnl,'2.20');
  assert.equal(accounts.find(r=>r.current_balance==='12.34').pending_withdrawal_amount,'0.00');
  const importedChild=free.find(r=>r.event_name==='Synthetic imported child');
  evidence.journeys.importLineage={storedParent:importedChild.origin_qual_bet_id,resolvesNativeIdentity:sports.some(r=>r.sportsbook_bet_id===importedChild.origin_qual_bet_id)};
  await page.goto(web+'/profiles',{waitUntil:'domcontentloaded'});
  for(const [width,theme] of [[1440,'light'],[760,'dark']]){
   await page.setViewportSize({width,height:1050});await page.evaluate(t=>{localStorage.setItem('openforge-theme',t);document.documentElement.dataset.theme=t;},theme);
   for(const [ledger,record] of [['sportsbook-bets',sports.find(r=>r.event_name==='Synthetic imported event').sportsbook_bet_id],['free-bets',importedChild.free_bet_id],['accounts','']]){
    await page.goto(`${web}/profiles/${id}/tracker/${ledger}${record?'?record='+record:''}`,{waitUntil:'domcontentloaded'});
    if(record)await page.getByRole('dialog').waitFor();
    await snapshot(`import-reopen-${ledger}-${width}-${theme}`);
    evidence.journeys[`${ledger}-${width}-${theme}`]={pageOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),focusInDialog:record?await page.getByRole('dialog').evaluate(e=>e.contains(document.activeElement)):null};
    if(record){await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});}
   }
  }
  await page.goto(`${web}/profiles/${id}/tracker/reports`,{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();await snapshot('populated-final-report');
  evidence.journeys.reportObserved={expectedAllSettled:'16.62',observedMatches:await page.getByText('£ 16.62',{exact:true}).count()};
  await page.reload();await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();await snapshot('populated-final-report-reload');
  await page.goto(`${web}/profiles/${id}/tracker/settings#import-export`,{waitUntil:'domcontentloaded'});
  await page.getByLabel('Import/export ledger',{exact:true}).selectOption('accounts');
  const exportLink=page.getByRole('link',{name:'Export Accounts XLSX',exact:true});await exportLink.waitFor();
  const [download]=await Promise.all([page.waitForEvent('download'),exportLink.click()]);await download.saveAs(runtime+'/browser-accounts-export.xlsx');evidence.journeys.browserExport={filename:download.suggestedFilename(),failure:await download.failure()};
  if(process.argv.includes('--removal')){
   await page.goto(`${web}/profiles/${id}/tracker/sportsbook-bets?record=${fixture.sportsbookId}`,{waitUntil:'domcontentloaded'});
   const parent=page.locator('[data-pd-id="sportsbook.editor.dialog"]');await parent.waitFor();await parent.getByRole('tab',{name:/Free Bet/}).first().click();
   const linked=parent.locator('[data-pd-id="sportsbook.free-bet-bridge.linked-free-bets"]');await linked.waitFor();
   const issued=free.filter(r=>r.origin_qual_bet_id===fixture.sportsbookId&&r.source_award_group_id);
   evidence.journeys.removal={settledButtonDisabled:[]};
   for(const r of issued.filter(r=>r.status==='Settled'))evidence.journeys.removal.settledButtonDisabled.push({id:r.free_bet_id,disabled:await linked.getByRole('button',{name:'Remove linked free bet '+r.free_bet_id,exact:true}).isDisabled()});
   const removable=issued.find(r=>r.status==='Available');
   const removeButton=linked.getByRole('button',{name:'Remove linked free bet '+removable.free_bet_id,exact:true});
   if(await removeButton.isDisabled())evidence.journeys.removal.unplacedFailure={expected:'Permitted unplaced/unsettled child removal',actual:await removeButton.getAttribute('title'),result:'FAIL; journey PARTIAL, no forced click'};
   else{
    await removeButton.click();
    const [removed]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/free-bets/'+removable.free_bet_id)&&r.request().method()==='DELETE'),linked.getByRole('button',{name:'Remove',exact:true}).click()]);
    evidence.journeys.removal.unplacedStatus=removed.status();
   }
   await snapshot('award-removal-guard');
   const before=await(await api.get(`/profiles/${id}/free-bets`)).json();
   const deleted=await api.delete(`/profiles/${id}/sportsbook-bets/${fixture.sportsbookId}`);
   const after=await(await api.get(`/profiles/${id}/free-bets`)).json();
   evidence.journeys.removal.sourceDeletion={status:deleted.status(),expected:'Controlled denial while placed/settled descendants exist',retainedChildCount:after.filter(r=>r.origin_qual_bet_id===fixture.sportsbookId).length,childrenBefore:before,childrenAfter:after};
   await page.goto(`${web}/profiles/${id}/tracker/reports`,{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();await snapshot('after-source-removal-report');
  }
 } else if(process.argv.includes('--import')){
  await page.goto(`${web}/profiles/${id}/tracker/settings`,{waitUntil:'domcontentloaded'});
  await page.goto(`${web}/profiles/${id}/tracker/settings#import-export`,{waitUntil:'domcontentloaded'});
  await page.locator('[data-pd-id="spreadsheet-transfer.import-file"]').waitFor({state:'attached'});
  for(const name of ['accounts-invalid','accounts-valid','sportsbook-valid','free-bets-linked']){
   const before={accounts:await(await api.get(`/profiles/${id}/accounts`)).json(),sports:await(await api.get(`/profiles/${id}/sportsbook-bets`)).json(),free:await(await api.get(`/profiles/${id}/free-bets`)).json()};
   const [uploaded]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/imports/xlsx/dry-run')),page.locator('[data-pd-id="spreadsheet-transfer.import-file"]').setInputFiles(runtime+'/'+name+'.xlsx')]);
   const batch=await uploaded.json();evidence.journeys[name]={uploadStatus:uploaded.status(),batch};
   const review=page.getByRole('dialog',{name:'Spreadsheet import review'});await review.waitFor();
   await snapshot(name+'-review');
   if(name.includes('invalid')){
    const after={accounts:await(await api.get(`/profiles/${id}/accounts`)).json(),sports:await(await api.get(`/profiles/${id}/sportsbook-bets`)).json(),free:await(await api.get(`/profiles/${id}/free-bets`)).json()};
    assert.deepEqual(after,before);evidence.journeys[name].zeroBusinessWrites=true;
   } else {
    const acknowledgement=review.getByRole('checkbox',{name:/I confirm/});
    if(await acknowledgement.count()){
     await acknowledgement.check();
     const [confirmed]=await Promise.all([page.waitForResponse(r=>r.url().includes('/confirm-')&&r.request().method()==='POST'),review.getByRole('button',{name:'Create backup and import selected',exact:true}).click()]);
     evidence.journeys[name].confirmStatus=confirmed.status();evidence.journeys[name].confirmation=await confirmed.json();
     await snapshot(name+'-confirmed');
    } else evidence.journeys[name].blocker='No selectable compatible rows: inspect recorded staging errors, not fabricated success';
   }
   await review.getByRole('button',{name:'Close import review dialog',exact:true}).click();await review.waitFor({state:'hidden'});
  }
  evidence.journeys.importPersisted={accounts:await(await api.get(`/profiles/${id}/accounts`)).json(),sports:await(await api.get(`/profiles/${id}/sportsbook-bets`)).json(),free:await(await api.get(`/profiles/${id}/free-bets`)).json()};
  const exported=await api.get(`/profiles/${id}/imports/accounts/export.xlsx`);evidence.journeys.export={status:exported.status(),bytes:(await exported.body()).length};
 } else {
 await page.goto(`${web}/profiles/${id}/tracker/sportsbook-bets`,{waitUntil:'domcontentloaded'});
 if(!fixture.sportsbookId){
  await page.getByRole('button',{name:'Add sportsbook row',exact:true}).click();
  const dialog=page.locator('[data-pd-id="sportsbook.editor.dialog"]');await dialog.waitFor();
  await dialog.getByLabel('Offer',{exact:true}).fill('Synthetic audit qualifying offer');
  await dialog.locator('label').filter({hasText:/^Bookmaker/}).locator('select').selectOption('Bet365');
  await dialog.locator('label').filter({hasText:/^Bet type/}).locator('select').selectOption('Single');
  await dialog.locator('label').filter({hasText:/^Offer type/}).locator('select').selectOption('Bet & Get');
  await dialog.locator('label').filter({hasText:/^Fixture type/}).locator('select').selectOption('Football');
  await dialog.getByLabel('Event name',{exact:true}).fill('Synthetic audit Team A v Team B');
  const [saved]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/sportsbook-bets')&&r.request().method()==='POST'),dialog.getByRole('button',{name:'Save',exact:true}).click()]);
  assert.equal(saved.status(),201,await saved.text());fixture.sportsbookId=(await saved.json()).sportsbook_bet_id;
  fs.writeFileSync(runtime+'/populated-fixture.json',JSON.stringify(fixture,null,2));
 }
 await page.goto(`${web}/profiles/${id}/tracker/sportsbook-bets?record=${fixture.sportsbookId}`,{waitUntil:'domcontentloaded'});
 const dialog=page.locator('[data-pd-id="sportsbook.editor.dialog"]');await dialog.waitFor();
 if(!process.argv.includes('--award')){
 await dialog.getByRole('tab',{name:/Matching/}).first().click();
 await dialog.getByLabel('Back stake',{exact:true}).fill('10.00');
 await dialog.getByLabel('Back odds',{exact:true}).fill('5.00');
 await dialog.locator('label').filter({hasText:/^Exchange/}).locator('select').selectOption('Smarkets');
 await dialog.locator('label').filter({hasText:/^Lay odds 1/}).locator('input').fill('5.20');
 await dialog.locator('label').filter({hasText:/^Lay odds 1/}).locator('input').blur();
 await snapshot('sportsbook-matching');
 const copy=dialog.getByRole('button',{name:'Copy Standard lay stake and mark placed',exact:true});await copy.click();
 assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'9.65');
 await dialog.getByLabel('Lay actual',{exact:true}).fill('9.00');await dialog.getByLabel('Lay actual',{exact:true}).blur();
 await dialog.getByRole('tab',{name:/Settlement/}).first().click();
 await dialog.locator('label').filter({hasText:/^Settles/}).locator('input').filter({visible:true}).fill('2026-09-13T12:00');
 const [placed]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(`/sportsbook-bets/${fixture.sportsbookId}`)&&r.request().method()==='PUT'),dialog.getByRole('button',{name:'Save',exact:true}).click()]);
 assert.equal(placed.status(),200,await placed.text());evidence.journeys.J07={copied:'9.65',actual:'9.00',placed:await placed.json()};
 await page.goto(`${web}/profiles/${id}/tracker/sportsbook-bets?record=${fixture.sportsbookId}`,{waitUntil:'domcontentloaded'});await dialog.waitFor();
 await dialog.getByRole('tab',{name:/Settlement/}).first().click();
 const [settled]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(`/sportsbook-bets/${fixture.sportsbookId}`)&&r.request().method()==='PUT'),dialog.locator('label').filter({hasText:/^Result/}).locator('select').selectOption('Back Won')]);
 assert.equal(settled.status(),200,await settled.text());evidence.journeys.J07.settled=await settled.json();
 await snapshot('sportsbook-settled');
 console.log('SETTLED',JSON.stringify(evidence.journeys.J07.settled));
 }
 await page.reload();await dialog.waitFor();await dialog.getByRole('tab',{name:/Settlement/}).first().click();
 const editSettled=dialog.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]').filter({visible:true});
 if(await editSettled.count())await editSettled.click();
 const resultSelect=dialog.locator('label').filter({hasText:/^Result/}).locator('select').filter({visible:true});
 const corrected=await resultSelect.inputValue()==='Lay Won'?await api.get(`/profiles/${id}/sportsbook-bets/${fixture.sportsbookId}`):(await Promise.all([page.waitForResponse(r=>r.url().endsWith(`/sportsbook-bets/${fixture.sportsbookId}`)&&r.request().method()==='PUT'),resultSelect.selectOption('Lay Won')]))[0];
 assert.equal(corrected.status(),200,await corrected.text());evidence.journeys.J07??={};evidence.journeys.J07.corrected=await corrected.json();
 await dialog.getByRole('tab',{name:/Free Bet/}).first().click();
 const bridge=dialog.locator('[data-pd-id="sportsbook.free-bet-bridge.inline"]');await bridge.waitFor();
 await bridge.getByLabel('Free-bet value',{exact:true}).fill('10.00');
 await bridge.locator('label').filter({hasText:/^Retention mode/}).locator('select').selectOption('SNR');
 await bridge.getByLabel('Expiry',{exact:true}).fill('2026-09-20T12:00');
 const create=dialog.getByRole('button',{name:'Create free bet from sportsbook row',exact:true});
 if(!evidence.journeys.J11?.single){
  const [issued]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/free-bets')&&r.request().method()==='POST'),create.click()]);
  assert.equal(issued.status(),201,await issued.text());evidence.journeys.J11={single:await issued.json()};
 }
 await dialog.getByRole('button',{name:'Expand free-bet award splits',exact:true}).click();
 await dialog.getByRole('button',{name:'Add split free bet',exact:true}).click();
 await bridge.getByLabel('Split value',{exact:true}).nth(0).fill('5.00');
 await bridge.getByLabel('Split value',{exact:true}).nth(1).fill('5.00');
 await bridge.locator('.bridge-split-retention select').nth(1).selectOption('SR');
 const before=await(await api.get(`/profiles/${id}/free-bets`)).json();let calls=0;
 await page.route('**/profiles/'+id+'/free-bets',async route=>{
  if(route.request().method()==='POST'&&++calls===2)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Synthetic second-child failure'})});
  await route.continue();
 });
 await Promise.all([page.waitForResponse(r=>r.url().endsWith('/free-bets')&&r.status()===503),create.click()]);
 const failed=await(await api.get(`/profiles/${id}/free-bets`)).json();
 evidence.journeys.J11.partial={before:before.length,after:failed.length,children:failed};
 await page.unroute('**/profiles/'+id+'/free-bets');
 const [retried]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/free-bets')&&r.request().method()==='POST'),create.click()]);
 assert.equal(retried.status(),201);await page.getByText(/Created 2 free bets/).first().waitFor();
 evidence.journeys.J11.retryChildren=await(await api.get(`/profiles/${id}/free-bets`)).json();await snapshot('award-partial-retry');
 evidence.journeys.J11.partial.result=failed.length===before.length?'PASS':'FAIL';
 evidence.journeys.J11.retryResult={result:'FAIL',expectedNewChildren:2,observedNewChildren:evidence.journeys.J11.retryChildren.length-before.length,expectedCredit:'10.00',observedCredit:'15.00',explanation:'First child committed before simulated second-child503; retry generated a new group'};
 await page.goto(`${web}/profiles/${id}/tracker/reports`,{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();await snapshot('sportsbook-report');await page.reload();await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();await snapshot('sportsbook-report-reload');
 evidence.journeys.J07.report={method:'Actual rendered weekly/monthly reports and reload; no invented report-summary API',url:page.url()};
 }
} catch(e){evidence.journeys.current={status:'HARNESS OR PRODUCT FAILURE',message:e.message};await snapshot('failure');throw e;}
finally {fs.writeFileSync(runtime+(process.argv.includes('--inspect')?'/inspect-evidence.json':process.argv.includes('--import')?'/import-evidence.json':'/populated-evidence.json'),JSON.stringify(evidence,null,2));fs.appendFileSync(runtime+'/runs.jsonl',JSON.stringify(evidence)+'\n');await browser.close();await api.dispose();}
