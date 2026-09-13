// Genuine issued children only; never seed origin/group IDs to impersonate the award path.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,request} from '@playwright/test';
const runtime='/tmp/openforge-populated-audit-114-20260913';
const fixture=JSON.parse(fs.readFileSync(runtime+'/populated-fixture.json'));
const token=fs.readFileSync(runtime+'/session-token','utf8').trim();
const api=await request.newContext({baseURL:'http://127.0.0.1:8036',extraHTTPHeaders:{Cookie:`pd_session=${token}`}});
const all=await(await api.get(`/profiles/${fixture.profileId}/free-bets`)).json();
const children=all.filter(r=>r.origin_qual_bet_id===fixture.sportsbookId&&r.source_award_group_id);
assert(children.length,'Real browser award path must have created children first');
const observations={date:new Date().toISOString(),children:[],errors:[],responses:[]};
const browser=await chromium.launch({headless:true});
let lastPage;
try{
 for(const mode of ['SNR','SR']){
  const row=children.find(r=>r.retention_mode===mode&&r.status==='Available');
  if(!row){observations.children.push({mode,status:'BLOCKED',reason:'No genuine available issued child for this retention mode'});continue;}
  const half=row.free_bet_value==='5.00';const reference=mode==='SNR'?(half?'3.86':'7.72'):(half?'4.83':'9.65');
  const actual=half?'3.50':'7.00';const expected=mode==='SNR'?(half?'5.30':'10.60'):(half?'10.30':'20.60');
  const context=await browser.newContext({viewport:{width:mode==='SNR'?1440:760,height:1050},permissions:['clipboard-read','clipboard-write'],reducedMotion:'reduce'});
  await context.addCookies([{name:'pd_session',value:token,domain:'localhost',path:'/'}]);
  const page=await context.newPage();lastPage=page;page.setDefaultTimeout(20000);
  page.on('response',async r=>{if(r.url().includes('/free-bets')&&r.request().method()!=='GET')observations.responses.push({path:new URL(r.url()).pathname,status:r.status(),body:await r.json().catch(()=>null)});});
  await context.addInitScript(t=>localStorage.setItem('openforge-theme',t),mode==='SNR'?'light':'dark');
  const url=`http://localhost:3036/profiles/${fixture.profileId}/tracker/free-bets?record=${row.free_bet_id}`;
  await page.goto(url,{waitUntil:'domcontentloaded'});const dialog=page.locator('[data-pd-id="free-bets.editor.dialog"]');await dialog.waitFor();
  await dialog.getByRole('tab',{name:/Matching/}).first().click();
  await dialog.getByLabel('Back odds',{exact:true}).fill('5.00');
  if(await dialog.locator('label').filter({hasText:/^Exchange/}).locator('select').inputValue()!=='Smarkets'){
   const [exchange]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/free-bets/'+row.free_bet_id)&&r.request().method()==='PUT'),dialog.locator('label').filter({hasText:/^Exchange/}).locator('select').selectOption('Smarkets')]);
   assert.equal(exchange.status(),200);
  }
  await dialog.getByLabel('Lay odds 1',{exact:true}).fill('5.20');await dialog.getByLabel('Lay odds 1',{exact:true}).blur();
  fs.writeFileSync(runtime+'/genuine-child-matching-'+mode+'.txt',await dialog.innerText());
  await page.screenshot({path:runtime+'/genuine-child-matching-'+mode+'.png',fullPage:true});
  await dialog.getByRole('button',{name:'Copy Standard free-bet lay stake and mark placed',exact:true}).click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),reference);
  await dialog.getByLabel('Lay actual',{exact:true}).fill(actual);await dialog.getByLabel('Lay actual',{exact:true}).blur();
  await dialog.getByRole('tab',{name:/Settlement/}).first().click();
  await dialog.locator('label').filter({hasText:/^Settles/}).locator('input').filter({visible:true}).fill('2026-09-13T12:00');
  const [placed]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/free-bets/'+row.free_bet_id)&&r.request().method()==='PUT'),dialog.getByRole('button',{name:'Save',exact:true}).click()]);
  assert.equal(placed.status(),200,await placed.text());await page.goto(url,{waitUntil:'domcontentloaded'});await dialog.waitFor();
  await dialog.getByRole('tab',{name:/Settlement/}).first().click();
  const [settled]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/free-bets/'+row.free_bet_id)&&r.request().method()==='PUT'),dialog.locator('label').filter({hasText:/^Result/}).locator('select').filter({visible:true}).selectOption('Back Won')]);
  assert.equal(settled.status(),200,await settled.text());const value=await settled.json();assert.equal(value.final_net_pnl,expected);
  assert.equal(value.origin_qual_bet_id,fixture.sportsbookId);assert.equal(value.source_award_group_id,row.source_award_group_id);
  await page.screenshot({path:runtime+'/genuine-child-'+mode+'.png',fullPage:true});
  observations.children.push({mode,id:row.free_bet_id,reference,copied:reference,actual,expected,actualFinal:value.final_net_pnl,parent:value.origin_qual_bet_id,group:value.source_award_group_id});
  await context.close();
 }
}catch(e){observations.errors.push(e.message);throw e;}
finally{fs.writeFileSync(runtime+'/genuine-child-evidence.json',JSON.stringify(observations,null,2));await browser.close();await api.dispose();}
