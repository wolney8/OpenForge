// Shared presentation regression only: this is not numerical/external parity.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
const runtime='/tmp/openforge-award-integrity-91-20260914';
const browser=await chromium.launch();
const evidence={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),date:new Date().toISOString(),scope:'shared presentation only',cases:[]};
try {
 for(const family of ['matched-betting','multi-lay','sequential-lay','early-payout'])for(const width of [1440,760]) {
  const c=await browser.newContext({viewport:{width,height:1100},reducedMotion:'reduce'});
  await c.addCookies([{name:'pd_session',value:fs.readFileSync(runtime+'/session-token','utf8').trim(),domain:'localhost',path:'/'}]);
  await c.addInitScript(t=>localStorage.setItem('openforge-theme',t),width===760?'dark':'light');
  const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://localhost:3040/fund-manager/calculators?family='+family);
  const shell=p.locator('.calculator-panel-shell').last();await shell.waitFor();
  await expect(shell.locator('.calculator-segment-heading .eyebrow').filter({hasText:/back bet/i}).first()).toBeVisible();
  const g=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(g.scroll<=width+1,JSON.stringify({family,g}));
  const pair=shell.locator('.calculator-paired-segments');
  if(width===1440&&await pair.count()) {
   const labels=pair.locator('.calculator-segment-heading .eyebrow');
   const a=await labels.nth(0).boundingBox(),b=await labels.nth(1).boundingBox();assert(Math.abs(a.y-b.y)<=1,JSON.stringify({family,a,b}));
  }
  assert.deepEqual(errors,[]);evidence.cases.push({family,width,theme:width===760?'dark':'light',pageOverflow:false});await c.close();
 }
 evidence.result='PASS';
}catch(e){evidence.result='FAIL';evidence.error=String(e);throw e;}
finally{fs.writeFileSync(runtime+'/core-shared-consumers-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));await browser.close();}
