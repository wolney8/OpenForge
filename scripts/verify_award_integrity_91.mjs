// Genuine authenticated award UI against the owned disposable runtime only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium,request,expect} from '@playwright/test';
const runtime='/tmp/openforge-award-integrity-91-20260914';
const api=await request.newContext({baseURL:'http://127.0.0.1:8039',extraHTTPHeaders:{
  Cookie:'pd_session='+fs.readFileSync(runtime+'/session-token','utf8').trim()}});
assert.equal((await(await api.get('/auth/session')).json()).email,'notification-acceptance@example.invalid');
const token=fs.readFileSync(runtime+'/session-token','utf8').trim();
const made=await api.post('/profiles/onboarding',{data:{setup_path:'import',
  display_name:'Synthetic Award Integrity',profile_code:'PQA-AWARD-'+Date.now(),
  tracking_start_date:'2026-09-01',enabled_modules:['sportsbook-bets','free-bets','cash-adjustments'],
  accounts:[],quick_actions:[]}});
assert.equal(made.status(),201,await made.text());
const body=await made.json(),pid=(body.profile??body).profile_id;
assert.equal((await api.patch('/profiles/'+pid,{data:{status:'Active'}})).status(),200);
for(const [account,type] of [['Bet365','Bookie'],['Smarkets','Exchange']]){
  const r=await api.post('/profiles/'+pid+'/accounts',{data:{account,type,status:'Active',
    lifecycle_status:'Active',channel:'Online',current_balance:'0.00',pending_withdrawal_amount:'0.00',
    ...(type==='Exchange'?{commission_rate:'0.02'}:{})}});
  assert.equal(r.status(),201,await r.text());
}
assert.equal((await api.put('/profiles/'+pid+'/exchange-commissions',
  {data:{exchange_name:'Smarkets',commission_rate:'0.02'}})).status(),200);
const browser=await chromium.launch({headless:true});
const evidence={date:new Date().toISOString(),profileId:pid,variants:[],errors:[],result:'IN PROGRESS'};
let page;
const sql=()=>JSON.parse(execFileSync('/Users/will_work/Scripts/Homelab/OpenForge/.venv/bin/python',[
  '-c',"import sqlite3,json,sys; c=sqlite3.connect(sys.argv[1]); c.row_factory=sqlite3.Row; print(json.dumps({t:[dict(r) for r in c.execute('SELECT * FROM '+t+' WHERE profile_id=?',(sys.argv[2],))] for t in ['sportsbook_bets','free_bets','sportsbook_bet_audit','free_bet_audit']}))",
  runtime+'/acceptance.sqlite3',pid],{encoding:'utf8'}));
try{
 for(const [width,theme] of [[1440,'light'],[760,'dark'],[1440,'dark'],[760,'light']]){
  const context=await browser.newContext({viewport:{width,height:1050},
    reducedMotion:theme==='light'?'reduce':'no-preference',permissions:['clipboard-read','clipboard-write']});
  await context.addCookies([{name:'pd_session',value:token,domain:'localhost',path:'/'}]);
  await context.addInitScript(t=>localStorage.setItem('openforge-theme',t),theme);
  page=await context.newPage();page.setDefaultTimeout(25000);
  page.on('pageerror',e=>evidence.errors.push(e.message));
  const seed=await api.post('/profiles/'+pid+'/sportsbook-bets',{data:{
    event_name:'Synthetic Award '+width+' '+theme,offer_text:'Synthetic qualifying award',
    offer_name:'Synthetic qualifying award',bookmaker:'Bet365',offer_type:'Bet & Get',
    bet_type:'Single',fixture_type:'Football',status:'Settled',result:'Lay Won',
    back_stake:'10.00',back_odds:'5.00',lay_odds_1:'5.20',lay_actual:'9.00',
    exchange_name:'Smarkets',match_strategy:'Standard',date_settled:'2026-09-14T12:00:00'}});
  assert.equal(seed.status(),201,await seed.text());const sid=(await seed.json()).sportsbook_bet_id;
  const url='http://localhost:3039/profiles/'+pid+'/tracker/sportsbook-bets?record='+sid;
  const awardpath='/profiles/'+pid+'/sportsbook-bets/'+sid+'/free-bet-awards';
  const dialog=page.locator('[data-pd-id="sportsbook.editor.dialog"]');
  async function open(){
    await page.goto(url,{waitUntil:'domcontentloaded'});await dialog.waitFor();
    await dialog.getByRole('tab',{name:/Settlement/}).first().click();
    const edit=dialog.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]').filter({visible:true});
    if(await edit.count())await edit.click();
    await dialog.getByRole('tab',{name:/Free Bet/}).first().click();
  }
  await open();
  const bridge=dialog.locator('[data-pd-id="sportsbook.free-bet-bridge.inline"]');
  await bridge.getByLabel('Free-bet value',{exact:true}).fill('10.00');
  await bridge.getByLabel('Expiry',{exact:true}).fill('2026-09-20T12:00');
  const create=dialog.getByRole('button',{name:'Create free bet from sportsbook row',exact:true});
  const box=await create.boundingBox();assert(box);
  await create.focus();await page.keyboard.press('Tab');
  assert(await dialog.evaluate(el=>el.contains(document.activeElement)));
  await page.keyboard.press('Shift+Tab');await expect(create).toBeFocused();
  assert(await create.evaluate(el=>{const r=el.getBoundingClientRect();
    const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===el||el.contains(hit);}));
  let lostResponseIds=null;
  if(width===1440&&theme==='light'){
    let resolveCommitted;
    const committed=new Promise(resolve=>{resolveCommitted=resolve;});
    await page.route('**'+awardpath,async route=>{
      const response=await route.fetch();assert.equal(response.status(),201);
      const issued=await response.json();lostResponseIds=issued.free_bet_ids;
      await route.abort('failed');resolveCommitted();
    });
    await create.click();await committed;
    await expect(dialog.getByText('Award response was not confirmed. Retry this review with its retained operation identity.',{exact:true})).toBeVisible();
    assert.equal(sql().free_bets.filter(r=>r.origin_qual_bet_id===sid).length,1);
    await page.unroute('**'+awardpath);await open();
  }
  const [single]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(awardpath)&&r.request().method()==='POST'),create.click()]);
  assert.equal(single.status(),201,await single.text());const first=await single.json();
  assert.equal(first.free_bet_ids.length,1);assert.equal(first.issued_face_value,'10.00');
  if(lostResponseIds)assert.deepEqual(first.free_bet_ids,lostResponseIds);
  await expect(create).toHaveText('Create Another Free Bet');
  const linked=dialog.locator('[data-pd-id="sportsbook.free-bet-bridge.linked-free-bets"]');
  const remove=linked.getByRole('button',{name:'Remove linked free bet '+first.free_bet_ids[0],exact:true});
  await expect(remove).toBeEnabled();await remove.click();
  const [deleted]=await Promise.all([page.waitForResponse(r=>r.request().method()==='DELETE'&&r.url().endsWith('/free-bets/'+first.free_bet_ids[0])),
    linked.getByRole('button',{name:'Remove',exact:true}).click()]);
  assert.equal(deleted.status(),204);
  assert.equal((await(await api.get('/profiles/'+pid+'/sportsbook-bets/'+sid)).json()).final_net_pnl,'-1.18');
  await create.click(); // Explicit new review, not issuance.
  await dialog.getByRole('button',{name:'Expand free-bet award splits',exact:true}).click();
  await dialog.getByRole('button',{name:'Add split free bet',exact:true}).click();
  await bridge.getByLabel('Split value',{exact:true}).nth(0).fill('5.00');
  await bridge.getByLabel('Split value',{exact:true}).nth(1).fill('5.00');
  await bridge.locator('.bridge-split-retention select').nth(1).selectOption('SR');
  fs.writeFileSync(runtime+'/fail-second-child','synthetic fault');
  const before=sql();
  const [failed]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(awardpath)&&r.status()===500),create.click()]);
  const attempted=failed.request().postDataJSON();const op=attempted.operation_id;
  assert.deepEqual(sql().free_bets,before.free_bets);
  assert.deepEqual(sql().free_bet_audit,before.free_bet_audit);
  assert.deepEqual(sql().sportsbook_bets,before.sportsbook_bets);
  await open();
  await dialog.getByRole('button',{name:'Expand free-bet award splits',exact:true}).click();
  await expect(bridge.getByLabel('Split value',{exact:true}).nth(1)).toHaveValue('5.00');
  const [retried]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(awardpath)&&r.request().method()==='POST'),create.click()]);
  assert.equal(retried.request().postDataJSON().operation_id,op);
  assert.equal(retried.status(),201,await retried.text());const split=await retried.json();
  assert.equal(split.free_bet_ids.length,2);assert.equal(split.issued_face_value,'10.00');
  assert.equal(sql().free_bets.filter(r=>r.origin_qual_bet_id===sid).length,2);
  await page.screenshot({path:runtime+'/award-'+width+'-'+theme+'.png',fullPage:true});
  for(const [index,mode,reference,expected] of [[0,'SNR','3.86','5.30'],[1,'SR','4.83','10.30']]){
    const ident=split.free_bet_ids[index];
    const childurl='http://localhost:3039/profiles/'+pid+'/tracker/free-bets?record='+ident;
    await page.goto(childurl,{waitUntil:'domcontentloaded'});
    const editor=page.locator('[data-pd-id="free-bets.editor.dialog"]');await editor.waitFor();
    await editor.getByRole('tab',{name:/Matching/}).first().click();
    const exchangeSelect=editor.locator('label').filter({hasText:/^Exchange/}).locator('select');
    if(await exchangeSelect.inputValue()!=='Smarkets'){
      const [exchange]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/free-bets/'+ident)&&r.request().method()==='PUT'&&r.request().postDataJSON().exchange_name==='Smarkets'),
        exchangeSelect.selectOption('Smarkets')]);
      assert.equal(exchange.status(),200);
    }
    await editor.getByLabel('Back odds',{exact:true}).fill('5.00');
    await editor.getByLabel('Lay odds 1',{exact:true}).fill('5.20');
    await editor.getByLabel('Lay odds 1',{exact:true}).blur();
    await editor.getByRole('button',{name:'Copy Standard free-bet lay stake and mark placed',exact:true}).click();
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),reference);
    await editor.getByLabel('Lay actual',{exact:true}).fill('3.50');
    await editor.getByLabel('Lay actual',{exact:true}).blur();
    await editor.getByRole('tab',{name:/Settlement/}).first().click();
    await editor.locator('label').filter({hasText:/^Settles/}).locator('input').filter({visible:true}).fill('2026-09-14T12:00');
    const [placed]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/free-bets/'+ident)&&r.request().method()==='PUT'),
      editor.getByRole('button',{name:'Save',exact:true}).click()]);
    assert.equal(placed.status(),200,await placed.text());
    await page.goto(childurl,{waitUntil:'domcontentloaded'});await editor.waitFor();
    await editor.getByRole('tab',{name:/Settlement/}).first().click();
    const [settled]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/free-bets/'+ident)&&r.request().method()==='PUT'),
      editor.locator('label').filter({hasText:/^Result/}).locator('select').filter({visible:true}).selectOption('Back Won')]);
    assert.equal(settled.status(),200,await settled.text());
    const value=await settled.json();assert.equal(value.final_net_pnl,expected);
    assert.equal(value.origin_qual_bet_id,sid);assert.equal(value.source_award_group_id,op);
  }
  await open();
  for(const ident of split.free_bet_ids)await expect(linked.getByRole('button',
    {name:'Remove linked free bet '+ident,exact:true})).toBeDisabled();
  const beforeDenied=sql();assert.equal((await api.delete('/profiles/'+pid+'/sportsbook-bets/'+sid)).status(),409);
  assert.deepEqual(sql(),beforeDenied);
  await page.goto('http://localhost:3039/profiles/'+pid+'/tracker/reports',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();
  await page.reload();await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();
  const records=await(await api.get('/profiles/'+pid+'/free-bets')).json();
  const sources=await(await api.get('/profiles/'+pid+'/sportsbook-bets')).json();
  const final=records.reduce((a,r)=>a+Number(r.final_net_pnl??0),0)+sources.reduce((a,r)=>a+Number(r.final_net_pnl??0),0);
  assert(Math.abs(final-(evidence.variants.length+1)*14.42)<0.00001);
  const displayedTotal=((evidence.variants.length+1)*14.42).toFixed(2);
  await expect(page.locator('.financial-value').filter({hasText:displayedTotal}).first()).toBeVisible();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  evidence.variants.push({width,theme,sourceId:sid,operationId:op,childIds:split.free_bet_ids,
    single10Removed:true,secondChildFailureRollback:true,refreshRetrySameIdentity:true,
    lostCommittedResponseReusedIds:lostResponseIds!==null,
    copied:['3.86','4.83'],actual:'3.50',final:['5.30','10.30'],sourceFinal:'-1.18',
    offerFinal:'14.42',pointerSave:true,noPageOverflow:true});
  await context.close();
 }
 assert.deepEqual(evidence.errors,[]);evidence.result='PASS';
}catch(error){evidence.result='FAIL';evidence.error=error.message;
 if(page&&!page.isClosed()){fs.writeFileSync(runtime+'/failure.txt',await page.locator('body').innerText());
 await page.screenshot({path:runtime+'/failure.png',fullPage:true});}throw error;
}finally{fs.writeFileSync(runtime+'/browser-evidence.json',JSON.stringify(evidence,null,2));
 await browser.close();await api.dispose();}
