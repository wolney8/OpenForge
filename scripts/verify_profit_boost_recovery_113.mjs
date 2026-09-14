// Real reference API responses; interception only controls delivery/failure, never expected answers.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium, expect} from '@playwright/test';
const runtime='/tmp/openforge-award-integrity-91-20260914';
const token=fs.readFileSync(runtime+'/session-token','utf8').trim();
const browser=await chromium.launch();
const evidence={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),date:new Date().toISOString(),checks:[],result:'IN PROGRESS'};
try {
 for(const [width,theme,popout] of [[1440,'light',false],[760,'dark',true]]) {
  const context=await browser.newContext({viewport:{width,height:1100},reducedMotion:'reduce'});
  await context.addCookies([{name:'pd_session',value:token,domain:'localhost',path:'/'}]);
  await context.addInitScript(t=>localStorage.setItem('openforge-theme',t),theme);
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=new URL(`http://localhost:3040${popout?'/calculator':'/fund-manager/calculators'}`);
  for(const [key,value] of Object.entries({betType:'profit_boost',backStake:'10',profitBoostMode:'displayed_odds',boostedBackOdds:'3.20',exchangeCommission:'0.02'}))url.searchParams.set(key,value);
  await page.goto(url.href);
  const breakdown=page.locator('[data-pd-id="calculators.profit-boost.breakdown"]');
  await expect(breakdown).toContainText('3.20');
  // No lay odds supplied: independent back-odds breakdown must still be available.
  await expect(breakdown).toContainText('32.00');await expect(breakdown).toContainText('22.00');
  let release,started;
  const held=new Promise(r=>release=r),entered=new Promise(r=>started=r);
  await page.route('**/fund-manager/calculators/profit-boost/preview',async route=>{
   const body=route.request().postDataJSON();
   if(body.boosted_back_odds==='4.00') {
    const response=await route.fetch();started();await held;
    await route.fulfill({response});return;
   }
   await route.continue();
  });
  const odds=page.locator('#calculator-boosted-back-odds');await odds.fill('4.00');
  await Promise.race([entered,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Prepared response never entered gate')),15000))]);
  // Old data must stop claiming to describe the current input immediately, even before debounce.
  await expect(breakdown).not.toContainText('32.00');
  await odds.fill('5.00');await expect(breakdown).toContainText('50.00');
  release();await expect(breakdown).toContainText('50.00');
  await odds.fill('not-odds');await expect(breakdown).not.toContainText('50.00');
  await page.unroute('**/fund-manager/calculators/profit-boost/preview');
  await page.route('**/fund-manager/calculators/profit-boost/preview',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Synthetic reference unavailable'})}));
  await odds.fill('3.20');await expect(breakdown.getByRole('alert')).toContainText('unavailable');
  await page.unroute('**/fund-manager/calculators/profit-boost/preview');
  await odds.fill('3.21');await expect(breakdown).toContainText('32.10');
  await expect(breakdown).toContainText('22.10'); // 10*3.21 - 10, not21.10.
  const source=page.locator('#calculator-profit-boost-mode');
  await source.selectOption('total_return');await page.locator('#calculator-total-potential-return').fill('27.86');
  for(const value of ['2.786','2.7800','27.86','27.80','17.86'])await expect(breakdown).toContainText(value);
  await source.selectOption('profit_only');await page.locator('#calculator-potential-profit').fill('22');
  for(const value of ['3.2000','32.00','22.00'])await expect(breakdown).toContainText(value);
  await source.selectOption('percentage');await page.locator('#calculator-base-back-odds').fill('3');await page.locator('#calculator-profit-boost-percent').fill('10');
  for(const value of ['3.2000','32.00','22.00'])await expect(breakdown).toContainText(value);
  await page.locator('#calculator-accepted-back-odds').fill('3.10');
  await expect(breakdown).toContainText('3.1000');
  assert.deepEqual(errors,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`${runtime}/profit-boost-recovery-${width}-${theme}.png`,fullPage:true});
  evidence.checks.push({width,theme,popout,independentOddsWithoutLay:true,lateResponseIgnored:true,invalidAndFailureDoNotPresentStaleOdds:true,recovery:true,fourIndependentSourceExamples:true,acceptedOverride:true});
  await context.close();
 }
 evidence.result='PASS';
}catch(e){evidence.result='FAIL';evidence.error=String(e);throw e;}
finally{fs.writeFileSync(runtime+'/profit-boost-recovery-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));await browser.close();}
