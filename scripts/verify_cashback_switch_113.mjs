// Independent conditional-refund equations; real calculator API, no simulated business save.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
const runtime='/tmp/openforge-award-integrity-91-20260914';
const token=fs.readFileSync(runtime+'/session-token','utf8').trim();
const browser=await chromium.launch();
const evidence={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),date:new Date().toISOString(),checks:[],result:'IN PROGRESS'};
try {
 for(const [width,theme,popout] of [[1440,'light',false],[760,'dark',true]]) {
  const context=await browser.newContext({viewport:{width,height:1100},reducedMotion:'reduce'});
  await context.addCookies([{name:'pd_session',value:token,domain:'localhost',path:'/'}]);
  await context.addInitScript(t=>localStorage.setItem('openforge-theme',t),theme);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.setDefaultTimeout(15000);
  const url=new URL(`http://localhost:3040${popout?'/calculator':'/fund-manager/calculators'}`);
  for(const [key,value] of Object.entries({betType:'qualifying',backStake:'10',backOdds:'4',layOdds:'4.2',exchangeCommission:'0.02',strategy:'Custom',manualLayStake:'9',customLayDraft:'9',customMinimum:'7',customMaximum:'12',presentationMode:'Advanced',promotionValue:'5',cashbackRewardKind:'free_bet',retentionPercent:'20'}))url.searchParams.set(key,value);
  await page.goto(url.href);
  const offer=page.locator('#calculator-calculator-offer');
  const prepared=page.waitForResponse(r=>r.url().endsWith('/calculators/matched-betting/preview')&&r.request().postDataJSON()?.bet_type==='cashback');
  await offer.selectOption('cashback');
  const response=await prepared,request=response.request().postDataJSON(),data=await response.json();
  assert.equal(response.status(),200,JSON.stringify(data));
  assert.equal(request.strategy,'Standard');assert.equal(request.manual_lay_stake,'');
  assert.equal(request.custom_reference_lay_stake,'','Custom draft must not leak from a different offer');
  assert.equal(request.cashback_reward_kind,'cash');assert.equal(request.promotion_value,'10');
  assert.equal(request.retention_percent,'70');
  // ROUND_HALF_UP(40/4.18)=9.57; 30-9.57*3.2=-.624 -> -.62;
  // -10+9.57*.98=-.6214 -> -.62; conditional cash10 is added once ->9.38.
  assert.equal(data.selected_lay_stake,'9.57');assert.equal(data.pnl_if_back_wins,'-0.62');
  assert.equal(data.pnl_if_lay_wins,'-0.62');assert.equal(data.promotion_trigger_result,'9.38');
  const capResponse=page.waitForResponse(r=>r.url().endsWith('/calculators/matched-betting/preview')&&r.request().postDataJSON()?.promotion_value==='5');
  await page.locator('#calculator-promotion-value').fill('5');
  const capped=await(await capResponse).json();assert.equal(capped.promotion_trigger_result,'4.38');
  const creditResponse=page.waitForResponse(r=>r.url().endsWith('/calculators/matched-betting/preview')&&r.request().postDataJSON()?.cashback_reward_kind==='free_bet');
  await page.locator('#calculator-cashback-reward-kind').selectOption('free_bet');
  const credit=await(await creditResponse).json();assert.equal(credit.cashback_credit_face_value,'5.00');
  assert.equal(credit.cashback_estimated_retained_value,'3.50');assert.equal(credit.promotion_trigger_result,'-0.62');
  await expect(page.locator('[data-pd-id="calculators.cashback.credit"]')).toContainText('not cash profit');
  await expect(page.locator('[data-pd-id="calculators.matched-betting.convert"]')).toHaveCount(0);
  await offer.selectOption('qualifying');await offer.selectOption('cashback');
  await expect(page.locator('#calculator-promotion-value')).toHaveValue('10');
  await expect(page.locator('#calculator-cashback-reward-kind')).toHaveValue('cash');
  await page.locator('[data-pd-id="calculators.matched-betting.reset"]').click();
  await expect(page.locator('#calculator-back-stake')).toHaveValue('');
  assert.deepEqual(errors,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`${runtime}/cashback-switch-${width}-${theme}.png`,fullPage:true});
  evidence.checks.push({width,theme,popout,request,data,capped,credit,noCrossOfferCustomOrRewardLeak:true,reset:true,creditConversionBlocked:true});
  await context.close();
 }
 evidence.result='PASS';
}catch(e){evidence.result='FAIL';evidence.error=String(e);throw e;}
finally{fs.writeFileSync(runtime+'/cashback-switch-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));await browser.close();}
