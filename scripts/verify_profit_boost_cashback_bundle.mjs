// Real browser -> API -> SQLite proof for the owned, authenticated synthetic review runtime.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {chromium, request, expect} from '@playwright/test';

const runtime='/tmp/openforge-award-integrity-91-20260914';
const token=fs.readFileSync(runtime+'/session-token','utf8').trim();
const api=await request.newContext({baseURL:'http://127.0.0.1:8039',extraHTTPHeaders:{Cookie:'pd_session='+token}});
assert.equal((await(await api.get('/auth/session')).json()).authenticated,true);
const made=await api.post('/profiles/onboarding',{data:{setup_path:'import',display_name:'Synthetic Boost Cashback',profile_code:'BOOST-'+Date.now(),tracking_start_date:'2026-09-01',enabled_modules:['sportsbook-bets','free-bets','cash-adjustments'],accounts:[],quick_actions:[]}});
assert.equal(made.status(),201,await made.text());
const profile=(await made.json()).profile;
const pid=profile.profile_id;
assert.equal((await api.patch('/profiles/'+pid,{data:{status:'Active'}})).status(),200);
const accountIds={};
for(const [account,type] of [['Bet365','Bookie'],['Smarkets','Exchange']]) {
  const response=await api.post('/profiles/'+pid+'/accounts',{data:{account,type,status:'Active',lifecycle_status:'Active',channel:'Online',current_balance:'0.00',pending_withdrawal_amount:'0.00',...(type==='Exchange'?{commission_rate:'0.02'}:{})}});
  assert.equal(response.status(),201,await response.text());
  accountIds[type]=(await response.json()).account_id;
}
assert.equal((await api.put('/profiles/'+pid+'/exchange-commissions',{data:{exchange_name:'Smarkets',commission_rate:'0.02'}})).status(),200);

const browser=await chromium.launch({headless:true});
const evidence={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),date:new Date().toISOString(),profileId:pid,cases:[],screenshots:[]};
const database=new DatabaseSync(runtime+'/acceptance.sqlite3',{readOnly:true});
database.exec('PRAGMA busy_timeout=5000');

async function openNew(page, offerType, eventName) {
  await page.goto('http://localhost:3040/profiles/'+pid+'/tracker/sportsbook-bets');
  await page.locator('[data-pd-id="ledger.toolbar.add-row"]').click();
  const dialog=page.locator('[data-pd-id="sportsbook.editor.dialog"]');
  await dialog.waitFor();
  await dialog.getByLabel('Offer',{exact:true}).fill(eventName);
  await dialog.locator('label').filter({hasText:/^Bookmaker/}).locator('select').selectOption('Bet365');
  await dialog.locator('label').filter({hasText:/^Offer type/}).locator('select').selectOption(offerType);
  await dialog.locator('label').filter({hasText:/^Bet type/}).locator('select').selectOption('Single');
  await dialog.locator('label').filter({hasText:/^Fixture type/}).locator('select').selectOption('Football');
  await dialog.getByLabel('Event name',{exact:true}).fill(eventName);
  await dialog.getByRole('tab',{name:/Matching/}).first().click();
  return dialog;
}

async function saveAndFind(page,dialog,eventName) {
  const save=dialog.getByRole('button',{name:'Save',exact:true});
  await expect(save).toBeEnabled();
  await save.click();
  try { await expect(dialog).toBeHidden(); }
  catch (error) {
    console.error('SAVE-DIALOG',await dialog.innerText());
    throw error;
  }
  const rows=await(await api.get('/profiles/'+pid+'/sportsbook-bets')).json();
  const row=rows.find(item=>item.event_name===eventName);
  assert(row,eventName+' was not persisted');
  return row;
}

async function convertCurrent(page,eventName) {
  const convert=page.getByRole('button',{name:'Convert to opportunity',exact:true});
  await expect(convert).toBeEnabled();await convert.click();
  const dialog=page.locator('[data-pd-id="calculator-conversion.dialog"]');await dialog.waitFor();
  await dialog.getByLabel('Event / fixture',{exact:true}).fill(eventName);
  await dialog.locator('label').filter({hasText:/^Fixture type/}).locator('select').selectOption('Football');
  await dialog.locator('label.multi-profile-target-row').filter({hasText:profile.profile_code}).click();
  await dialog.locator('select').filter({has:page.locator(`option[value="${accountIds.Bookie}"]`)}).selectOption(accountIds.Bookie);
  const [response]=await Promise.all([
    page.waitForResponse(item=>item.url().endsWith('/calculator-conversions/standard')&&item.request().method()==='POST'),
    dialog.getByRole('button',{name:'Convert to opportunity',exact:true}).click(),
  ]);
  assert.equal(response.status(),200,await response.text());
  const payload=await response.json();assert.equal(payload.results[0].state,'succeeded',JSON.stringify(payload));
  await expect(dialog).toBeHidden();await expect(convert).toBeFocused();
  return payload.results[0];
}

try {
  for(const [width,theme] of [[1440,'light'],[760,'dark']]) {
    const context=await browser.newContext({viewport:{width,height:1050},permissions:['clipboard-read','clipboard-write'],reducedMotion:theme==='dark'?'reduce':'no-preference'});
    await context.addCookies([{name:'pd_session',value:token,domain:'localhost',path:'/'}]);
    await context.addInitScript(value=>localStorage.setItem('openforge-theme',value),theme);
    const page=await context.newPage(); page.setDefaultTimeout(25000);
    const errors=[];page.on('pageerror',error=>errors.push(error.message));

    const profitName=`Synthetic Profit Boost ${width}`;
    let dialog=await openNew(page,'Profit Boost',profitName);
    await dialog.getByLabel('Profit Boost entry').selectOption('total_return');
    await dialog.getByLabel('Back stake',{exact:true}).fill('10.00');
    await dialog.getByLabel('Total potential return, including stake').fill('27.86');
    await dialog.getByLabel('Actual accepted back odds').fill('2.79');
    await dialog.getByLabel('Lay odds 1').fill('3.00');
    await dialog.locator('label').filter({hasText:/^Exchange/}).locator('select').selectOption('Smarkets');
    await expect(dialog.getByText('Bookmaker total return: £27.86')).toBeVisible();
    await expect(dialog.getByText('Effective hedge odds: 2.7900')).toBeVisible();
    await page.screenshot({path:`${runtime}/bundle-profit-${width}-${theme}.png`,fullPage:true});
    evidence.screenshots.push(`bundle-profit-${width}-${theme}.png`);
    let profit=await saveAndFind(page,dialog,profitName);
    assert.equal(profit.profit_boost_mode,'total_return');
    assert.equal(profit.reference_boosted_odds,'2.7800');
    assert.equal(profit.effective_back_odds,'2.7900');
    assert.equal(profit.profit_boost_bookmaker_total_return,'27.86');
    assert.equal(JSON.parse(profit.profit_boost_source_json).total_potential_return,'27.86');
    const storedProfit=database.prepare('SELECT profit_boost_source_json,lay_actual FROM sportsbook_bets WHERE sportsbook_bet_id=?').get(profit.sportsbook_bet_id);
    assert.equal(JSON.parse(storedProfit.profit_boost_source_json).mode,'total_return');
    assert.equal(storedProfit.lay_actual,'');
    await page.goto(`http://localhost:3040/profiles/${pid}/tracker/sportsbook-bets?record=${profit.sportsbook_bet_id}`);
    dialog=page.locator('[data-pd-id="sportsbook.editor.dialog"]');await dialog.waitFor();
    await dialog.getByRole('tab',{name:/Matching/}).first().click();
    await expect(dialog.getByLabel('Profit Boost entry')).toHaveValue('total_return');
    await expect(dialog.getByLabel('Total potential return, including stake')).toHaveValue('27.86');
    await dialog.getByLabel('Lay actual').fill('9.00');
    await dialog.getByRole('button',{name:'Back Bet Placed'}).click();
    await dialog.getByRole('button',{name:'Lay Fully Placed'}).click();
    await dialog.getByRole('tab',{name:/Settlement/}).first().click();
    await dialog.locator('input[type="datetime-local"]:visible').fill('2026-09-15T11:00');
    await dialog.locator('label:visible').filter({hasText:/^Result/}).locator('select').selectOption('Back Won');
    profit=await saveAndFind(page,dialog,profitName);
    assert.equal(profit.lay_actual,'9.00');
    assert.equal(profit.final_net_pnl,'-0.10');

    const cashbackName=`Synthetic Cashback ${width}`;
    dialog=await openNew(page,'Cashback',cashbackName);
    await dialog.getByLabel('Back stake',{exact:true}).fill('10.00');
    await dialog.getByLabel('Back odds',{exact:true}).fill('3.00');
    await dialog.getByLabel('Lay odds 1').fill('3.10');
    await dialog.locator('label').filter({hasText:/^Exchange/}).locator('select').selectOption('Smarkets');
    await dialog.getByLabel('Eligible refund amount').fill('10.00');
    await dialog.getByLabel('Offer cap').fill('8.00');
    await expect(dialog.getByLabel('Eligibility')).toHaveValue('pending');
    await page.screenshot({path:`${runtime}/bundle-cashback-${width}-${theme}.png`,fullPage:true});
    evidence.screenshots.push(`bundle-cashback-${width}-${theme}.png`);
    let cashback=await saveAndFind(page,dialog,cashbackName);
    const pending=JSON.parse(cashback.conditional_benefit_json);
    assert.equal(pending.eligibility,'pending');assert.equal(pending.refund_cap,'8.00');
    assert.equal(cashback.final_net_pnl,null);
    await page.goto(`http://localhost:3040/profiles/${pid}/tracker/sportsbook-bets?record=${cashback.sportsbook_bet_id}`);
    dialog=page.locator('[data-pd-id="sportsbook.editor.dialog"]');await dialog.waitFor();
    await dialog.getByRole('tab',{name:/Matching/}).first().click();
    await expect(dialog.getByLabel('Offer cap')).toHaveValue('8.00');
    await dialog.getByLabel('Eligibility').selectOption('eligible');
    await dialog.getByLabel('Lay actual').fill('9.00');
    await dialog.getByRole('button',{name:'Back Bet Placed'}).click();
    await dialog.getByRole('button',{name:'Lay Fully Placed'}).click();
    await dialog.getByRole('tab',{name:/Settlement/}).first().click();
    await dialog.locator('input[type="datetime-local"]:visible').fill('2026-09-15T12:00');
    await dialog.getByLabel('Actual cashback receipt amount').fill('8.00');
    await dialog.getByLabel('Cashback receipt reference').fill('SYNTHETIC-RECEIPT-'+width);
    await dialog.getByLabel('Cashback receipt date').fill('2026-09-15');
    await dialog.locator('label').filter({hasText:/^Result/}).locator('select').selectOption('Lay Won + Cashback');
    cashback=await saveAndFind(page,dialog,cashbackName);
    assert.equal(cashback.final_net_pnl,'6.82');
    assert.equal(JSON.parse(cashback.conditional_benefit_json).actual_receipt_amount,'8.00');
    assert.equal(database.prepare('SELECT COUNT(*) n FROM sportsbook_bets WHERE sportsbook_bet_id=?').get(cashback.sportsbook_bet_id).n,1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    const nativeModes=[];
    if(width===1440){
      for(const source of [
        {mode:'displayed_odds',label:'Entered boosted odds',value:'3.20',reopenedValue:'3.2000'},
        {mode:'profit_only',label:'Potential profit, excluding stake',value:'22.00'},
        {mode:'percentage',label:'Base back odds',value:'3.00',extra:['Profit boost %','10']},
      ]){
        const name=`Synthetic Profit Boost ${source.mode}`;
        dialog=await openNew(page,'Profit Boost',name);
        await dialog.getByLabel('Profit Boost entry').selectOption(source.mode);
        await dialog.getByLabel('Back stake',{exact:true}).fill('10.00');
        await dialog.getByLabel(source.label).fill(source.value);
        if(source.extra)await dialog.getByLabel(source.extra[0]).fill(source.extra[1]);
        await dialog.getByLabel('Lay odds 1').fill('3.00');
        await dialog.locator('label').filter({hasText:/^Exchange/}).locator('select').selectOption('Smarkets');
        const saved=await saveAndFind(page,dialog,name);
        assert.equal(JSON.parse(saved.profit_boost_source_json).mode,source.mode);
        await page.goto(`http://localhost:3040/profiles/${pid}/tracker/sportsbook-bets?record=${saved.sportsbook_bet_id}`);
        dialog=page.locator('[data-pd-id="sportsbook.editor.dialog"]');await dialog.waitFor();await dialog.getByRole('tab',{name:/Matching/}).first().click();
        await expect(dialog.getByLabel('Profit Boost entry')).toHaveValue(source.mode);
        await expect(dialog.getByLabel(source.label)).toHaveValue(source.reopenedValue??source.value);
        nativeModes.push({mode:source.mode,id:saved.sportsbook_bet_id});
        await dialog.getByRole('button',{name:/Close/}).first().click();
      }
    }
    assert.deepEqual(errors,[]);
    await page.goto(`http://localhost:3040/profiles/${pid}/tracker/reports`);
    await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();
    await page.reload();
    await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();
    const converted={};
    if(width===1440){
      await page.goto('http://localhost:3040/fund-manager/calculators');
      await page.locator('[data-pd-id="calculators.matched-betting.calculator-offer"]').selectOption('profit_boost');
      await page.getByLabel('Boosted price source').selectOption('total_return');
      await page.getByLabel('Back stake',{exact:true}).fill('10.00');
      await page.getByRole('textbox',{name:/^Total potential return/}).fill('27.86');
      await page.getByLabel('Lay odds',{exact:true}).fill('3.00');
      await page.getByLabel('Commission (%)').fill('2');
      await expect(page.locator('[data-pd-id="calculators.profit-boost.breakdown"]')).toContainText('2.786');
      const pbTarget=await convertCurrent(page,'Synthetic converted Profit Boost');
      const pbRow=await(await api.get(`/profiles/${pid}/sportsbook-bets/${pbTarget.record_id}`)).json();
      assert.equal(JSON.parse(pbRow.profit_boost_source_json).mode,'total_return');assert.equal(pbRow.lay_actual,'');
      converted.profitBoost={id:pbRow.sportsbook_bet_id,mode:'total_return',plannedOnly:true};

      await page.locator('[data-pd-id="calculators.matched-betting.calculator-offer"]').selectOption('cashback');
      await page.getByLabel('Back stake',{exact:true}).fill('10.00');
      await page.getByLabel('Back odds',{exact:true}).fill('3.00');
      await page.getByLabel('Lay odds',{exact:true}).fill('3.10');
      await page.getByLabel('Eligible refund amount / cap').fill('10.00');
      await expect(page.getByLabel('Actual lay stake')).toHaveCount(0);
      const cbTarget=await convertCurrent(page,'Synthetic converted Cashback');
      const cbRow=await(await api.get(`/profiles/${pid}/sportsbook-bets/${cbTarget.record_id}`)).json();
      const cbMeta=JSON.parse(cbRow.conditional_benefit_json);
      assert.equal(cbMeta.eligibility,'pending');assert.equal(cbMeta.actual_receipt_amount,'');assert.equal(cbRow.lay_actual,'');
      converted.cashback={id:cbRow.sportsbook_bet_id,eligibility:'pending',receiptNotAssumed:true};
    }
    evidence.cases.push({width,theme,profitBoost:{id:profit.sportsbook_bet_id,source:'total_return',raw:'2.786',reference:'2.7800',accepted:'2.7900',bookmakerReturn:'27.86',actualLay:'9.00',final:'-0.10'},nativeModes,cashback:{id:cashback.sportsbook_bet_id,eligible:'10.00',cap:'8.00',receipt:'8.00',final:'6.82'},converted,reportReload:true,noPageOverflow:true});
    await context.close();
  }
  evidence.result='PASS';
  console.log(JSON.stringify(evidence));
} finally {
  database.close();await browser.close();await api.dispose();
  fs.writeFileSync(runtime+'/profit-boost-cashback-bundle-evidence.json',JSON.stringify(evidence,null,2));
}
