// PD-QA-019: real authenticated API, bounded response gates, no timing sleeps.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,request,expect} from '@playwright/test';
const runtime='/tmp/openforge-award-integrity-91-20260914';
const token=fs.readFileSync(runtime+'/session-token','utf8').trim();
const api=await request.newContext({baseURL:'http://127.0.0.1:8039',extraHTTPHeaders:{Cookie:'pd_session='+token}});
assert.equal((await(await api.get('/auth/session')).json()).email,'notification-acceptance@example.invalid');
const created=await api.post('/profiles/onboarding',{data:{setup_path:'import',display_name:'Synthetic Latest Edit',profile_code:'PQA-LATEST-'+Date.now(),tracking_start_date:'2026-09-01',enabled_modules:['sportsbook-bets','free-bets','cash-adjustments'],accounts:[],quick_actions:[]}});
assert.equal(created.status(),201,await created.text());const pid=(await created.json()).profile.profile_id;
assert.equal((await api.patch('/profiles/'+pid,{data:{status:'Active'}})).status(),200);
for(const [account,type] of [['Bet365','Bookie'],['Smarkets','Exchange'],['Betfair Exchange','Exchange']]){
  const accountResponse=await api.post('/profiles/'+pid+'/accounts',{data:{account,type,status:'Active',lifecycle_status:'Active',channel:'Online',current_balance:'0.00',pending_withdrawal_amount:'0.00',...(type==='Exchange'?{commission_rate:'0.02'}:{})}});
  assert.equal(accountResponse.status(),201,await accountResponse.text());
  if(type==='Exchange')assert.equal((await api.put('/profiles/'+pid+'/exchange-commissions',{data:{exchange_name:account,commission_rate:'0.02'}})).status(),200);
}
const browser=await chromium.launch({headless:true});const results=[];
try{
 for(const [width,theme] of [[1440,'light'],[760,'dark'],[1440,'dark'],[760,'light']]){
  const row=await api.post('/profiles/'+pid+'/free-bets',{data:{event_name:'Synthetic rapid edit',offer_text:'Synthetic latest edit',bookmaker:'Bet365',offer_type:'Bet & Get',bet_type:'Single',fixture_type:'Football',status:'Available',result:'Pending',retention_mode:'SNR',free_bet_value:'10.00',back_odds:'',lay_odds_1:'',lay_actual:'',exchange_name:'',match_strategy:'Standard'}});
  assert.equal(row.status(),201,await row.text());const id=(await row.json()).free_bet_id;
  const context=await browser.newContext({viewport:{width,height:1050},reducedMotion:theme==='light'?'reduce':'no-preference'});
  await context.addCookies([{name:'pd_session',value:token,domain:'localhost',path:'/'}]);
  await context.addInitScript(t=>localStorage.setItem('openforge-theme',t),theme);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:3040/profiles/'+pid+'/tracker/free-bets?record='+id);
  const dialog=page.locator('[data-pd-id="free-bets.editor.dialog"]');await dialog.waitFor();
  await dialog.getByRole('tab',{name:/Matching/}).first().click();
  const exchange=dialog.locator('label').filter({hasText:/^Exchange/}).locator('select');
  const first=(await exchange.inputValue())==='Smarkets'?'Betfair Exchange':'Smarkets';const last=first==='Smarkets'?'Betfair Exchange':'Smarkets';
  let release,started;const gate=new Promise(resolve=>release=resolve);const pending=new Promise(resolve=>started=resolve);
  const path='**/free-bets/'+id;
  await page.route(path,async route=>{
    if(route.request().method()!=='PUT'||route.request().postDataJSON().exchange_name!==first){await route.continue();return;}
    const response=await route.fetch();assert.equal(response.status(),200);started();await gate;
    await route.fulfill({response});
  });
  await exchange.selectOption(first);
  await expect.poll(async()=>Boolean(await dialog.getByRole('button',{name:/Saving/}).count())).toBe(true);
  await pending;
  // Deliberately edit BEFORE releasing the older acknowledgement, including a queued dropdown.
  await dialog.getByLabel('Back odds',{exact:true}).fill('5.00');
  await dialog.getByLabel('Lay odds 1',{exact:true}).fill('5.20');
  await dialog.getByLabel('Lay actual',{exact:true}).fill('7.00');
  await exchange.selectOption(last);release();
  await expect(exchange).toHaveValue(last);
  await expect(dialog.getByLabel('Back odds',{exact:true})).toHaveValue('5.00');
  await expect(dialog.getByLabel('Lay odds 1',{exact:true})).toHaveValue('5.20');
  await expect(dialog.getByLabel('Lay actual',{exact:true})).toHaveValue('7.00');
  await expect.poll(async()=>{const read=await(await api.get('/profiles/'+pid+'/free-bets/'+id)).json();return [read.exchange_name,read.back_odds,read.lay_odds_1,read.lay_actual];}).toEqual([last,'5.00','5.20','7.00']);
  await page.unroute(path);
  const save=dialog.getByRole('button',{name:'Save',exact:true});
  // Queued dropdown save has acknowledged the latest text, so an unchanged Save is disabled.
  await expect(save).toBeDisabled();
  await dialog.getByLabel('Lay actual',{exact:true}).fill('7.50');
  await expect(save).toBeEnabled();await save.focus();
  const geometry=await dialog.evaluate(el=>{const b=el.querySelector('.workflow-editor-body');const d=el.getBoundingClientRect();const s=[...el.querySelectorAll('.workflow-editor-footer button')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};});return {bodyWidth:b.clientWidth,scrollWidth:b.scrollWidth,scrollLeft:b.scrollLeft,left:d.left,right:d.right,buttons:s};});
  assert(geometry.scrollWidth<=geometry.bodyWidth+1,JSON.stringify(geometry));assert.equal(geometry.scrollLeft,0);
  assert(geometry.buttons.every(b=>b.left>=geometry.left&&b.right<=geometry.right));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await save.click();await expect(dialog).toBeHidden();
  const persisted=await(await api.get('/profiles/'+pid+'/free-bets/'+id)).json();
  assert.equal(persisted.lay_actual,'7.50');
  assert.equal(persisted.base_reference_lay_stake,'7.72');
  let lostAcknowledgementReload=false;
  if(width===1440&&theme==='light'){
    await page.goto('http://localhost:3040/profiles/'+pid+'/tracker/free-bets?record='+id);await dialog.waitFor();
    await dialog.getByRole('tab',{name:/Matching/}).first().click();
    const mutation='**/profiles/'+pid+'/free-bets/'+id;
    await page.route(mutation,async route=>{
      if(route.request().method()!=='PUT'){await route.continue();return;}
      const response=await route.fetch();assert.equal(response.status(),200);await route.abort('failed');
    });
    await dialog.getByLabel('Lay actual',{exact:true}).fill('7.60');
    await dialog.getByRole('button',{name:'Save',exact:true}).click();
    await dialog.getByRole('alert').waitFor();
    assert.equal(await dialog.getByLabel('Lay actual',{exact:true}).inputValue(),'7.60');
    assert.equal((await(await api.get('/profiles/'+pid+'/free-bets/'+id)).json()).lay_actual,'7.60');
    await page.unroute(mutation);await page.reload();await dialog.waitFor();
    await dialog.getByRole('tab',{name:/Matching/}).first().click();
    await expect(dialog.getByLabel('Lay actual',{exact:true})).toHaveValue('7.60');
    lostAcknowledgementReload=true;
  }else await page.reload();
  assert.deepEqual(errors,[]);
  results.push({width,theme,first,last,delayedAcknowledgement:true,latestTextRetained:true,queuedDropdownPersisted:true,lostAcknowledgementReload,reference:'7.72',geometry});
  await context.close();
 }
 console.log(JSON.stringify({scope:'latest edit + native modal containment',profile:pid,status:'PASS',results},null,2));
}finally{await browser.close();await api.dispose();}
