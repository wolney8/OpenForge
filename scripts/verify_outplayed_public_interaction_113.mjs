// Public linked calculator only: no login bypass, member tracking or wager execution.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
const runtime='/tmp/openforge-award-integrity-91-20260914';
const source='https://bonusaccumulator.com/calc/outplayed/odds-calculator-v3/index.php';
const browser=await chromium.launch();const evidence={date:new Date().toISOString(),source,linkedFrom:'https://outplayed.com/round-robin-bet-calculator',method:'Actual public Chromium native-select events, keyboard numeric/slider entry and pointer Copy (not full keyboard accessibility certification)',checks:[]};
try {
 for(const width of [760,390]) {
  const context=await browser.newContext({viewport:{width,height:1050},permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage();await page.goto(source,{waitUntil:'domcontentloaded'});
  await page.locator('#betType').selectOption('fsnr');
  await expect(page.locator('#betType')).toHaveValue('fsnr');
  for(const [id,value]of[['backStake','10'],['backOdds','4'],['layOdds','4.2'],['layCommission','2']]) {
   await page.locator('#'+id).focus();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type(value);await page.keyboard.press('Tab');
  }
  await page.locator('#betMode').selectOption('advanced');
  await expect(page.locator('#betMode')).toHaveValue('advanced');
  await page.locator('#calculate').focus();await page.keyboard.press('Enter');
  const text=await page.locator('body').innerText();
  for(const value of ['6.25','20.00','10.00','6.13','7.18','22.98','7.02','7.04','10.20','32.64','2.64'])assert(text.includes(value),value);
  await page.getByText('Copy',{exact:true}).filter({visible:true}).first().click();
  const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.equal(copied,'6.25');
  await page.locator('.ui-slider-handle').focus();await page.keyboard.press('Home');
  await expect(page.locator('body')).toContainText('9.00');
  const customText=await page.locator('body').innerText();
  for(const value of ['28.80','1.20','8.82'])assert(customText.includes(value),value);
  const geometry=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert(geometry.page<=geometry.viewport+1,JSON.stringify(geometry));
  await page.screenshot({path:`${runtime}/op-public-keyboard-${width}.png`,fullPage:true});
  evidence.checks.push({width,settings:{basis:'SNR',stake:'10',backOdds:'4',layOdds:'4.2',backCommissionPercent:'0',layCommissionPercent:'2'},text,customText,copied,geometry});
  await context.close();
 }
 evidence.result='PASS';
}catch(e){evidence.result='FAIL';evidence.error=String(e);throw e;}
finally{fs.writeFileSync(runtime+'/op-public-keyboard-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));await browser.close();}
