// PQA-J08: populated native Casino record through explicit result, correction and report.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium,request,expect} from '@playwright/test';
const runtime='/tmp/openforge-award-integrity-91-20260914';
const token=fs.readFileSync(runtime+'/session-token','utf8').trim();
const api=await request.newContext({baseURL:'http://127.0.0.1:8039',extraHTTPHeaders:{Cookie:'pd_session='+token}});
const made=await api.post('/profiles/onboarding',{data:{setup_path:'import',display_name:'Synthetic Casino Audit',profile_code:'CAS-'+Date.now(),tracking_start_date:'2026-09-01',enabled_modules:['sportsbook-bets','free-bets','cash-adjustments','casino-offers'],accounts:[],quick_actions:[]}});
assert.equal(made.status(),201,await made.text());const pid=(await made.json()).profile.profile_id;
await api.patch('/profiles/'+pid,{data:{status:'Active'}});
const account=await api.post('/profiles/'+pid+'/accounts',{data:{account:'Bet365',type:'Bookie',status:'Active',lifecycle_status:'Active',channel:'Online',current_balance:'0.00',pending_withdrawal_amount:'0.00'}});
assert.equal(account.status(),201,await account.text());
const browser=await chromium.launch({headless:true});const observations=[];
try{
 for(const [width,theme] of [[1440,'light'],[760,'dark']]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:theme==='dark'?'reduce':'no-preference'});
  await context.addCookies([{name:'pd_session',value:token,domain:'localhost',path:'/'}]);
  await context.addInitScript(value=>localStorage.setItem('openforge-theme',value),theme);
  const page=await context.newPage();page.setDefaultTimeout(25000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://localhost:3040/profiles/${pid}/tracker/casino-offers`);
  await page.getByRole('button',{name:'Add casino row'}).click();
  let editor=page.getByRole('dialog',{name:'Create casino row'});await editor.waitFor();
  await editor.getByLabel('Date started').fill('2026-09-15T09:00');
  await editor.getByLabel('Bookmaker').selectOption('Bet365');
  const name=`Synthetic Casino J08 ${width}`;
  await editor.getByLabel('Offer name').fill(name);
  await editor.getByLabel('Offer type').selectOption('Free Spins');
  await editor.getByRole('tab',{name:/Reward/}).click();
  await editor.getByRole('textbox',{name:/Spin stake/i}).fill('0.20');
  await editor.getByRole('textbox',{name:/Free spins awarded/i}).fill('10');
  await editor.getByRole('textbox',{name:/Converted win amount/i}).fill('2.40');
  await editor.getByRole('button',{name:'Save',exact:true}).click();await expect(editor).toBeHidden();
  let rows=await(await api.get('/profiles/'+pid+'/casino-offers')).json();let row=rows.find(item=>item.offer_name===name);assert(row);
  await page.goto(`http://localhost:3040/profiles/${pid}/tracker/casino-offers?record=${row.casino_offer_id}`);
  editor=page.getByRole('dialog',{name:'Edit casino row'});await editor.waitFor();
  await editor.getByRole('tab',{name:/Settlement/}).click();
  await editor.getByRole('textbox',{name:/Net Result/}).fill('2.10');
  await editor.locator('label').filter({hasText:/^Result/}).locator('select').selectOption('Win');
  await editor.getByRole('button',{name:'Save',exact:true}).click();await expect(editor).toBeHidden();
  row=await(await api.get(`/profiles/${pid}/casino-offers/${row.casino_offer_id}`)).json();
  assert.equal(row.final_net_pnl,'2.10');assert.equal(row.result,'Win');assert.equal(row.status,'Settled');
  await page.goto(`http://localhost:3040/profiles/${pid}/tracker/reports`);await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();await page.reload();await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(errors,[]);
  observations.push({width,theme,id:row.casino_offer_id,calculated:'2.40',confirmed:'2.10',settled:true,reportReload:true,noPageOverflow:true});
  await context.close();
 }
 const evidence={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),date:new Date().toISOString(),profileId:pid,result:'PASS',observations,limitation:'Fee-review allocation and full change-history consumer remain separate untested checks.'};
 fs.writeFileSync(runtime+'/casino-j08-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await browser.close();await api.dispose();}
