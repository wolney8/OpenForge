// Geometry/keyboard checks only; complete native/conversion journeys are separately recorded.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium,request,expect} from '@playwright/test';
const runtime='/tmp/openforge-award-integrity-91-20260914';
const token=fs.readFileSync(runtime+'/session-token','utf8').trim();
const api=await request.newContext({baseURL:'http://127.0.0.1:8039',extraHTTPHeaders:{Cookie:'pd_session='+token}});
assert.equal((await(await api.get('/auth/session')).json()).email,'notification-acceptance@example.invalid');
const made=await api.post('/profiles/onboarding',{data:{setup_path:'import',display_name:'Synthetic Core Geometry',profile_code:'CORE-GEO-'+Date.now(),tracking_start_date:'2026-09-01',enabled_modules:['sportsbook-bets','free-bets','cash-adjustments'],accounts:[],quick_actions:[]}});
assert.equal(made.status(),201,await made.text());const pid=(await made.json()).profile.profile_id;
assert.equal((await api.patch('/profiles/'+pid,{data:{status:'Active'}})).status(),200);
let exchange;
for(const [account,type] of [['Bet365','Bookie'],['Smarkets','Exchange']]) {
 const r=await api.post('/profiles/'+pid+'/accounts',{data:{account,type,status:'Active',lifecycle_status:'Active',channel:'Online',current_balance:'0.00',pending_withdrawal_amount:'0.00',...(type==='Exchange'?{commission_rate:'0.02'}:{})}});
 assert.equal(r.status(),201,await r.text());if(type==='Exchange')exchange=await r.json();
}
assert.equal((await api.put('/profiles/'+pid+'/exchange-commissions',{data:{exchange_name:'Smarkets',commission_rate:'0.02'}})).status(),200);
const browser=await chromium.launch();const evidence={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),date:new Date().toISOString(),checks:[],result:'IN PROGRESS'};
let page;
try {
 for(const [basis,width,theme,textScale] of [['Normal',1440,'light',100],['Normal',760,'dark',100],['SNR',390,'light',100],['SNR',1440,'dark',200],['SNR',760,'light',200],['Normal',390,'dark',100]]) {
  const ledger=basis==='SNR'?'free-bets':'sportsbook-bets',prefix=basis==='SNR'?'free-bets':'sportsbook';
  const plan={schema_version:'lay-plan-v1',calculation_contract_version:basis==='SNR'?'snr-outcome-target-v1':'workbook-reference-v1',backing_basis:basis,back_stake:'10.00',back_odds:'4.00',lay_odds:'4.20',selected_strategy:basis==='SNR'?'Underlay':'Standard',exchange_name:'Smarkets',exchange_account_id:exchange.account_id,commission_units:'ratio',commission:'0.02',commission_origin:'override',reviewed_planned_lay_stake:basis==='SNR'?'6.25':'9.57'};
  const r=await api.post('/profiles/'+pid+'/'+ledger,{data:{event_name:'Synthetic geometry '+basis,bookmaker:'Bet365',offer_type:'Bet & Get',bet_type:'Single',fixture_type:'Football',status:basis==='SNR'?'Available':'Prospecting',result:'Pending',retention_mode:'SNR',free_bet_value:'10.00',back_stake:'10.00',back_odds:'4.00',lay_odds_1:'4.20',exchange_name:'Smarkets',match_strategy:plan.selected_strategy,lay_actual:'',lay_matched_stake_1:'',lay_plan_json:JSON.stringify(plan)}});
  assert.equal(r.status(),201,await r.text());const row=await r.json(),id=row[basis==='SNR'?'free_bet_id':'sportsbook_bet_id'];
  const context=await browser.newContext({viewport:{width,height:1100},reducedMotion:theme==='light'?'reduce':'no-preference'});
  await context.addCookies([{name:'pd_session',value:token,domain:'localhost',path:'/'}]);
  await context.addInitScript(t=>localStorage.setItem('openforge-theme',t),theme);
  page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://localhost:3040/profiles/${pid}/tracker/${ledger}?record=${id}`);
  const dialog=page.locator(`[data-pd-id="${prefix}.editor.dialog"]`);await dialog.waitFor();
  assert(await dialog.evaluate(el=>el.contains(document.activeElement)),'Initial modal focus');
  if(textScale===200)await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  await dialog.getByRole('tab',{name:/Matching/}).first().click();const core=dialog.locator(`[data-pd-id="${prefix}.matching.core-planner"]`);
  await core.getByRole('button',{name:'Advanced',exact:true}).click();
  await expect(core.getByRole('button',{name:'Apply Underlay',exact:true})).toBeEnabled();
  await core.locator('[data-pd-id$=".paired-segments"]').scrollIntoViewIfNeeded();
  const geometry=await dialog.evaluate(el=>{const b=el.querySelector('.workflow-editor-body'),r=el.getBoundingClientRect();return{dialog:r.toJSON(),bodyWidth:b.clientWidth,bodyScroll:b.scrollWidth,pageWidth:document.documentElement.scrollWidth,viewport:innerWidth,inputs:[...el.querySelectorAll('.calculator-paired-segment input,.calculator-paired-segment select')].filter(e=>e.getClientRects().length).map(e=>({box:e.getBoundingClientRect().toJSON(),parent:e.closest('.field-control').getBoundingClientRect().toJSON()}))};});
  assert(geometry.bodyScroll<=geometry.bodyWidth+1,JSON.stringify(geometry));assert(geometry.pageWidth<=width+1,JSON.stringify(geometry));
  assert(geometry.inputs.every(({box,parent})=>box.left>=parent.left-1&&box.right<=parent.right+1),JSON.stringify(geometry));
  for(const name of ['Underlay','Overlay','Custom']) {const a=await core.locator(`[data-pd-id$=".${name.toLowerCase()}"]`).boundingBox(),b=await core.locator('[data-pd-id$=".outcomes"]').boundingBox();assert(Math.abs(a.x-b.x)<=1&&Math.abs(a.width-b.width)<=1);}
  await page.screenshot({path:`${runtime}/core-geometry-${basis}-${width}-${theme}-${textScale}.png`,fullPage:true});
  const save=dialog.getByRole('button',{name:'Save',exact:true});await save.scrollIntoViewIfNeeded();
  const buttonOverlaps=await dialog.locator('.workflow-editor-footer button').evaluateAll(buttons=>{
    const visible=buttons.filter(button=>button.getClientRects().length).map(button=>({label:button.textContent.trim(),box:button.getBoundingClientRect()}));
    return visible.flatMap((a,i)=>visible.slice(i+1).filter(b=>Math.min(a.box.right,b.box.right)-Math.max(a.box.left,b.box.left)>1&&Math.min(a.box.bottom,b.box.bottom)-Math.max(a.box.top,b.box.top)>1).map(b=>[a.label,b.label]));
  });
  assert.deepEqual(buttonOverlaps,[],JSON.stringify({basis,width,theme,buttonOverlaps}));
  assert(await save.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return el===hit||el.contains(hit);}),'Pointer Save unobstructed');
  const controls=dialog.locator('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]').filter({visible:true});
  await controls.last().focus();await page.keyboard.press('Tab');assert(await dialog.evaluate(el=>el.contains(document.activeElement)));
  await controls.first().focus();await page.keyboard.press('Shift+Tab');assert(await dialog.evaluate(el=>el.contains(document.activeElement)));
  await core.getByLabel('Custom Lay',{exact:true}).fill('9.00');await page.keyboard.press('Escape');
  const confirm=page.locator('[data-pd-id="unsaved-changes.dialog"]');await expect(confirm).toBeVisible();
  assert(await confirm.evaluate(el=>el.contains(document.activeElement)),'Nested confirmation initial focus');
  await confirm.getByRole('button').last().focus();await page.keyboard.press('Tab');
  assert(await confirm.evaluate(el=>el.contains(document.activeElement)),'Nested confirmation Tab containment');
  await confirm.getByRole('button').first().focus();await page.keyboard.press('Shift+Tab');
  assert(await confirm.evaluate(el=>el.contains(document.activeElement)),'Nested confirmation Shift-Tab containment');
  await page.keyboard.press('Escape');await expect(confirm).toBeHidden();await expect(dialog).toBeVisible();
  assert(await dialog.evaluate(el=>el.contains(document.activeElement)),'Nested Escape returns to parent editor');
  await page.keyboard.press('Escape');await expect(confirm).toBeVisible();
  await confirm.getByRole('button',{name:'Keep Editing',exact:true}).click();await expect(confirm).toBeHidden();
  await expect(core.getByLabel('Custom Lay',{exact:true})).toHaveValue('9.00');
  await expect(save).toBeEnabled();
  // A failed pending request must retain this active editor and its latest draft.
  const mutationPath=`/profiles/${pid}/${ledger}/${id}`;
  let release,entered;
  const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
  await page.route('**'+mutationPath,async route=>{
    if(!['PUT','PATCH'].includes(route.request().method()))return route.continue();
    entered();await gate;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Synthetic pending save unavailable'})});
  });
  await save.click();
  await Promise.race([started,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Save never reached pending gate')),15000))]);
  await page.keyboard.press('Escape');await expect(dialog).toBeVisible();await expect(confirm).toBeHidden();
  assert(await dialog.evaluate(el=>el.contains(document.activeElement)),'Pending Escape retains active focus');
  release();await expect(dialog.getByText('Synthetic pending save unavailable',{exact:false}).first()).toBeVisible();
  const failedGeometry=await dialog.evaluate(el=>{const body=el.querySelector('.workflow-editor-body'),error=el.querySelector('[data-pd-id$=".save-error"]');return {bodyWidth:body.clientWidth,bodyScroll:body.scrollWidth,error:error.getBoundingClientRect().toJSON(),dialog:el.getBoundingClientRect().toJSON()};});
  assert(failedGeometry.bodyScroll<=failedGeometry.bodyWidth+1,JSON.stringify(failedGeometry));
  assert(failedGeometry.error.right<=failedGeometry.dialog.right+1,JSON.stringify(failedGeometry));
  await expect(core.getByLabel('Custom Lay',{exact:true})).toHaveValue('9.00');
  const unchanged=await(await api.get(mutationPath)).json();assert.equal(JSON.parse(unchanged.lay_plan_json).selected_strategy,plan.selected_strategy);
  await page.unroute('**'+mutationPath);await expect(save).toBeEnabled();
  // An undelivered request is not a commit: preserve the editor and report honestly.
  await page.route('**'+mutationPath,route=>route.abort('failed'));
  await save.click();await expect(dialog.locator('[data-pd-id$=".save-error"]')).toContainText(/not confirmed/);
  await expect(core.getByLabel('Custom Lay',{exact:true})).toHaveValue('9.00');
  assert.equal(JSON.parse((await(await api.get(mutationPath)).json()).lay_plan_json).selected_strategy,plan.selected_strategy);
  await page.unroute('**'+mutationPath);await expect(save).toBeEnabled();
  await save.click();await expect(dialog).toBeHidden();
  const recovered=await(await api.get(mutationPath)).json();assert.equal(JSON.parse(recovered.lay_plan_json).selected_strategy,'Custom');
  assert.equal(JSON.parse(recovered.lay_plan_json).reviewed_planned_lay_stake,'9.00');assert.equal(recovered.lay_actual,'');
  assert.deepEqual(errors,[]);evidence.checks.push({basis,width,theme,textScale,geometry,initialFocus:true,focusTrap:true,dirtyEscapePreservesDraft:true,pointerSave:true,pendingEscapePreservesEditor:true,failedSavePreservesDraftAndStoredPlan:true,realRetryPersists:true});
  await context.close();
 }
 evidence.result='PASS';
} catch(e) {evidence.result='FAIL';evidence.error=String(e);if(page)await page.screenshot({path:runtime+'/core-geometry-failure.png',fullPage:true});throw e;}
finally{fs.writeFileSync(runtime+'/core-planner-geometry-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));await browser.close();await api.dispose();}
