// Real owned synthetic API/browser; no writes, private inputs, or financial mock oracle.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium, expect} from '@playwright/test';

const runtime='/tmp/openforge-award-integrity-91-20260914';
assert.equal(execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),'repair/calculator-corrections-113');
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true});
const evidence={source,date:new Date().toISOString(),scope:'standalone/pop-out reference controls; destination journeys have separate evidence',cases:[]};
const expected={Standard:['7.18','22.98','7.02','7.04'],Underlay:['6.25','20.00','10.00','6.13'],Overlay:['10.20','32.64','-2.64','10.00'],Custom:['9.00','28.80','1.20','8.82']};
try {
  for(const [path,width,theme,motion] of [['/fund-manager/calculators',1440,'light','reduce'],['/calculator',760,'dark','no-preference'],['/calculator',1440,'dark','reduce'],['/fund-manager/calculators',760,'light','no-preference']]) {
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:motion,permissions:['clipboard-read','clipboard-write']});
    await context.addCookies([{name:'pd_session',value:fs.readFileSync(runtime+'/session-token','utf8').trim(),domain:'localhost',path:'/'}]);
    await context.addInitScript(t=>localStorage.setItem('openforge-theme',t),theme);
    const page=await context.newPage(); page.setDefaultTimeout(20000);
    const requests=[];
    page.on('request',r=>{if(r.url().endsWith('/matched-betting/preview'))requests.push(r.postDataJSON());});
    const params=new URLSearchParams({family:'matched-betting',betType:'free_bet',freeBetMode:'SNR',backStake:'10',backOdds:'4',layOdds:'4.2',exchangeCommission:'0.02',commissionUnits:'ratio',presentationMode:'Advanced',customLayDraft:'9'});
    await page.goto('http://localhost:3040'+path+'?'+params);
    const outcomes=page.locator('[data-pd-id="calculators.outcomes"]');
    await expect(outcomes).toHaveAttribute('aria-busy','false');
    await expect(page.locator('#calculator-commission')).toHaveValue('2');
    const selected=page.locator('[data-pd-id="calculators.matched-betting.copy-lay-stake"]');
    await expect(selected.getByRole('button')).toHaveAttribute('aria-label',/7\.18/);
    const reference=name=>page.locator(`[data-pd-id="calculators.matched-betting.${name.toLowerCase()}"]`);
    for(const name of ['Underlay','Overlay','Custom']) {
      const rows=reference(name).getByRole('row');
      for(const [i,label] of ['Lay stake','Liability','Back wins','Back loses'].entries()) {
        const value=expected[name][i];
        await expect(rows.nth(i)).toHaveAttribute('aria-label',new RegExp(label+': total .*'+value.replace('-','').replace('.','\\.')));
        if(value.startsWith('-'))await expect(rows.nth(i)).toHaveAttribute('aria-label',/\(2\.64\)/);
      }
      const a=await reference(name).boundingBox(),b=await outcomes.boundingBox();
      assert(Math.abs(a.x-b.x)<=1 && Math.abs(a.width-b.width)<=1,'Reference and Outcomes full-width edges');
    }
    await page.getByRole('button',{name:'Apply Underlay',exact:true}).click();
    await expect(selected.getByRole('button')).toBeEnabled();
    await expect(selected.getByRole('button')).toHaveAttribute('aria-label',/6\.25/);
    await selected.getByRole('button').click();
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'6.25');
    assert.equal(requests.at(-1).strategy,'Underlay');
    await page.getByRole('button',{name:'Apply Overlay',exact:true}).click();
    await expect(selected.getByRole('button')).toHaveAttribute('aria-label',/10\.20/);
    await expect(selected.getByRole('button')).toBeEnabled();
    const negative=reference('Overlay').locator('[data-pd-id$=".back-wins.copyable"]');
    await expect(negative.getByRole('button')).toHaveAttribute('aria-label',/\(2\.64\)/);
    await negative.getByRole('button').click();
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'-2.64');
    await page.locator('#calculator-custom-reference-lay').fill('9.00');
    await expect(selected.getByRole('button')).toHaveAttribute('aria-label',/9\.00/);
    await expect(selected.getByRole('button')).toBeEnabled();
    assert.equal(requests.at(-1).strategy,'Custom');
    assert.equal(requests.at(-1).manual_lay_stake,'9.00');
    await page.getByRole('button',{name:'Simple',exact:true}).click();
    await expect(selected.getByRole('button')).toHaveAttribute('aria-label',/7\.18/);
    await expect(selected.getByRole('button')).toBeEnabled();
    await page.getByRole('button',{name:'Advanced',exact:true}).click();
    await expect(selected.getByRole('button')).toBeEnabled();
    assert.equal(requests.at(-1).strategy,'Standard','Opening Advanced does not select another hedge');
    await expect(page.locator('#calculator-custom-reference-lay')).toHaveValue('9.00');
    // Draft changes retain the same result node but cannot copy stale output.
    await outcomes.evaluate(el=>el.dataset.identity='persistent');
    await page.locator('#calculator-back-odds').fill('not-odds');
    await expect(selected.getByRole('button')).toBeDisabled();
    await expect(outcomes).toHaveAttribute('data-identity','persistent');
    await page.locator('#calculator-back-odds').fill('4');
    await expect(selected.getByRole('button')).toBeEnabled();
    if(width===1440 && theme==='light') {
      let release,entered;
      const held=new Promise(resolve=>{entered=resolve;});
      const gate=new Promise(resolve=>{release=resolve;});
      let first=true;
      const intercept=async route=>{
        if(!first)return route.continue();
        first=false;
        const response=await route.fetch();entered();await gate;
        try {await route.fulfill({response});} catch { /* superseded request was aborted */ }
      };
      await page.route('**/matched-betting/preview',intercept);
      await page.locator('#calculator-back-odds').fill('5');
      await held;
      await expect(selected.getByRole('button')).toBeDisabled();
      await expect(page.getByRole('button',{name:'Apply Underlay',exact:true})).toBeDisabled();
      await expect(outcomes).toHaveAttribute('data-identity','persistent');
      await page.locator('#calculator-back-odds').fill('6');
      await expect(selected.getByRole('button')).toHaveAttribute('aria-label',/11\.96/);
      await expect(selected.getByRole('button')).toBeEnabled();
      release();await page.unroute('**/matched-betting/preview',intercept);
      await expect(selected.getByRole('button')).toHaveAttribute('aria-label',/11\.96/);
      await page.locator('#calculator-back-odds').fill('4');
      await expect(selected.getByRole('button')).toHaveAttribute('aria-label',/7\.18/);
    }
    for(const [percent,ratio] of [['0','0'],['2','0.02'],['5','0.05'],['2.125','0.02125']]) {
      await page.locator('#calculator-commission').fill(percent);
      await expect(outcomes).toHaveAttribute('aria-busy','false');
      await expect.poll(()=>requests.at(-1)?.exchange_commission).toBe(ratio);
    }
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page horizontal overflow');
    // Separate Normal negative-outcome check, not the positive stake clipboard.
    const normal=new URLSearchParams({...Object.fromEntries(params),betType:'qualifying',strategy:'Overlay',manualLayStake:'10.20'});
    await page.goto('http://localhost:3040'+path+'?'+normal);
    await expect(outcomes).toHaveAttribute('aria-busy','false');
    await expect(selected.getByRole('button')).toHaveAttribute('aria-label',/10\.20/);
    const normalLoss=outcomes.locator('[data-pd-id$=".copyable"]').filter({has:page.getByRole('button',{name:/Copy .*\(2\.64\)/})});
    await normalLoss.getByRole('button').click();
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'-2.64');
    await expect(normalLoss.getByRole('button')).toHaveAttribute('aria-label',/\(2\.64\)/);
    evidence.cases.push({path,width,theme,motion,result:'PASS',references:expected,negativeClipboard:'-2.64',normalOverlayLossClipboard:'-2.64',customSelected:'9.00',modeTransition:'Advanced does not change Standard; Simple restores Standard while retaining custom draft',commissionRatios:['0','0.02','0.05','0.02125']});
    await context.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(runtime+'/core-reference-controls-evidence.json',JSON.stringify(evidence,null,2));
}
console.log(JSON.stringify(evidence,null,2));
