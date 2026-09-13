// PD-QA-004: real pointer/keyboard journeys, only the disposable repair runtime.
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, request } from "@playwright/test";
const runtime="/tmp/openforge-modal-114-repair", web="http://localhost:3034";
const token=fs.readFileSync(runtime+"/session-token","utf8").trim();
const api=await request.newContext({baseURL:"http://127.0.0.1:8034",extraHTTPHeaders:{Cookie:`pd_session=${token}`}});
assert.equal((await (await api.get("/auth/session")).json()).email,"notification-acceptance@example.invalid");
const created=await api.post("/profiles/onboarding",{data:{setup_path:"import",display_name:"Synthetic Modal Review",profile_code:`MOD-${Date.now()}`,tracking_start_date:"2026-09-01",enabled_modules:["sportsbook-bets","free-bets","casino-offers","cash-adjustments"],accounts:[],quick_actions:[]}});
assert.equal(created.status(),201,await created.text());
const body=await created.json(), id=(body.profile??body).profile_id;
assert.equal((await api.patch(`/profiles/${id}`,{data:{status:"Active"}})).status(),200);
let bookieId;
for(const [account,type] of [["Bet365","Bookie"],["Smarkets","Exchange"]]){
 const response=await api.post(`/profiles/${id}/accounts`,{data:{account,type,status:"Active",lifecycle_status:"Active",channel:"Online",current_balance:"0.00",pending_withdrawal_amount:"0.00",...(type==="Exchange"?{commission_rate:"0.02"}:{})}});
 assert.equal(response.status(),201);if(type==="Bookie")bookieId=(await response.json()).account_id;
}
const browser=await chromium.launch({headless:true}), observations=[];
try{
 for(const width of (process.argv.includes("--blackjack-only")?[]:[1440,760,390]))for(const theme of ["light","dark"]){
  const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion:"reduce"});
  await context.addCookies([{name:"pd_session",value:token,domain:"localhost",path:"/"}]);
  const page=await context.newPage();page.setDefaultTimeout(20000);
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  page.on("request",r=>{if(r.url().includes("calculator-conversions"))console.log("CONVERSION REQUEST",r.url());});
  await page.goto(`${web}/fund-manager/calculators?backStake=10.00&backOdds=3.00&layOdds=3.10&exchangeCommission=0.02`,{waitUntil:"domcontentloaded"});
  await page.evaluate(t=>{document.documentElement.dataset.theme=t;localStorage.setItem("openforge-theme",t);},theme);
  const convert=page.getByRole("button",{name:"Convert to opportunity",exact:true});await convert.waitFor();
  await convert.click();
  const dialog=page.locator('[data-pd-id="calculator-conversion.dialog"]');await dialog.waitFor();
  assert(await dialog.evaluate(el=>el.contains(document.activeElement)),"conversion initial focus");
  await dialog.getByLabel("Event / fixture",{exact:true}).fill(`Synthetic ${width} ${theme}`);
  await dialog.locator("label").filter({hasText:/^Offer type/}).locator("select").selectOption("Bet & Get");
  await dialog.locator("label").filter({hasText:/^Fixture type/}).locator("select").selectOption("Football");
  await dialog.locator("label.multi-profile-target-row").filter({hasText:(body.profile??body).profile_code}).click();
  const account=dialog.locator("label").filter({hasText:/^Bookmaker Account/}).locator("select");
  await account.locator(`option[value="${bookieId}"]`).waitFor({state:"attached"});
  await account.selectOption(bookieId);
  const save=dialog.getByRole("button",{name:"Convert to opportunity",exact:true});await save.scrollIntoViewIfNeeded();
  if(width===760&&theme==="dark"){
    const before=await(await api.get(`/profiles/${id}/sportsbook-bets`)).json();
    await page.route("**/fund-manager/calculator-conversions/standard",async route=>{
      await new Promise(resolve=>setTimeout(resolve,500));
      await route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({detail:"Synthetic temporary outage"})});
    });
    const unavailable=page.waitForResponse(r=>r.url().endsWith("/calculator-conversions/standard")&&r.status()===503);
    await save.click();await page.keyboard.press("Escape");
    assert(await dialog.isVisible(),"pending conversion Escape discarded form");
    await unavailable;await dialog.getByRole("alert").waitFor();
    assert.equal(await dialog.getByLabel("Event / fixture",{exact:true}).inputValue(),`Synthetic ${width} ${theme}`);
    assert.deepEqual(await(await api.get(`/profiles/${id}/sportsbook-bets`)).json(),before);
    await page.unroute("**/fund-manager/calculator-conversions/standard");
  }
  assert(await save.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return el===hit||el.contains(hit);}),"conversion pointer intercepted");
  const [saved]=await Promise.all([page.waitForResponse(r=>r.url().includes("/calculator-conversions/")&&r.request().method()==="POST"),save.click()]);
  assert.equal(saved.status(),200,await saved.text());const response=await saved.json();
  assert(response.results.every(x=>x.state!=="failed"),JSON.stringify(response.results));
  await dialog.waitFor({state:"hidden"});
  assert(await convert.evaluate(el=>el===document.activeElement),"conversion return focus");
  const receipt=page.locator(".calculator-conversion-receipt");await receipt.waitFor();
  assert((await receipt.innerText()).includes("Synthetic Modal Review"));
  const row=response.results[0], reopened=await api.get(`/profiles/${id}/sportsbook-bets/${row.record_id}`);
  assert.equal(reopened.status(),200);
  const record=await reopened.json();assert.equal(record.status,"Prospecting");
  assert.equal(await page.getByLabel("Back stake",{exact:true}).inputValue(),"10.00");
  await receipt.getByRole("link",{name:"Open row"}).click();
  const native=page.locator('[data-pd-id="sportsbook.editor.dialog"]');await native.waitFor();
  const frames=await native.evaluate(async el=>{
    const frames=[];
    for(let i=0;i<6;i++){await new Promise(requestAnimationFrame);const r=el.getBoundingClientRect();frames.push({x:r.x,y:r.y,width:r.width,height:r.height});}
    return frames;
  });
  assert(frames.every(r=>r.x>=0&&r.x+r.width<=width&&r.height>0),"intermediate modal containment");
  assert(await native.evaluate(el=>el.contains(document.activeElement)),"sportsbook initial focus");
  const buttons=native.locator("button:not(:disabled)").filter({visible:true});
  await buttons.last().focus();await page.keyboard.press("Tab");
  assert(await native.evaluate(el=>el.contains(document.activeElement)),"sportsbook tab containment");
  await page.keyboard.press("Escape");await native.waitFor({state:"hidden"});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  assert(!overflow,"page overflow");
  assert.deepEqual(errors,[]);
  observations.push({width,theme,conversionSave:200,receipt:true,focusReturn:true,sportsbookFocusEscape:true,recordId:row.record_id,sourcePreserved:true});
  console.log(JSON.stringify(observations.at(-1)));await context.close();
 }
 const context=await browser.newContext({viewport:{width:760,height:1000},colorScheme:"dark",reducedMotion:"reduce",recordVideo:{dir:runtime+"/review-video"}});
 await context.addCookies([{name:"pd_session",value:token,domain:"localhost",path:"/"}]);
 const page=await context.newPage();page.setDefaultTimeout(20000);
 await page.goto(`${web}/fund-manager/calculators?family=blackjack`,{waitUntil:"domcontentloaded"});
 await page.getByLabel("Blackjack session mode",{exact:true}).selectOption("live_play");
 await page.getByRole("button",{name:"Session Setup",exact:true}).click();
 const setup=page.getByRole("dialog",{name:"Blackjack Session Setup"});await setup.waitFor();
 await setup.getByLabel("Blackjack activity source",{exact:true}).selectOption("own_cash");
 await setup.locator("#blackjack-starting-balance").fill("20.00");
 await setup.locator("#blackjack-ending-balance").fill("15.00");
 await setup.getByRole("button",{name:"Done",exact:true}).click();await setup.waitFor({state:"hidden"});
 await page.locator("#blackjack-hand-stake").fill("5.00");await page.locator("#blackjack-hand-stake").blur();
 for(const rank of ["6","10","7"])await page.getByRole("radiogroup").getByRole("radio",{name:rank,exact:true}).click();
 await page.getByRole("button",{name:"Suggested action Stand",exact:true}).waitFor();
 await page.getByRole("button",{name:"Suggested action Stand",exact:true}).click();
 await page.getByRole("group",{name:/outcome/}).getByRole("button",{name:"Loss",exact:true}).click();
 await page.getByText("You have played 1 hand",{exact:true}).waitFor();
 const saveActivity=page.locator('[data-pd-id="calculators.blackjack.save-activity"]');
 await saveActivity.click();
 const dialog=page.locator('[data-pd-id="calculator-conversion.dialog"]');await dialog.waitFor();
 await dialog.locator("label.multi-profile-target-row").filter({hasText:(body.profile??body).profile_code}).click();
 const account=dialog.locator("label").filter({hasText:/^Casino Account/}).locator("select");
 await account.locator(`option[value="${bookieId}"]`).waitFor({state:"attached"});await account.selectOption(bookieId);
 const save=dialog.getByRole("button",{name:"Save as Casino activity",exact:true});
 const [saved]=await Promise.all([page.waitForResponse(r=>r.url().endsWith("/calculator-conversions/blackjack")&&r.request().method()==="POST"),save.click()]);
 assert.equal(saved.status(),200,await saved.text());const response=await saved.json(), payload=saved.request().postDataJSON();
  assert(response.results.every(x=>x.state!=="failed"),JSON.stringify(response.results));await dialog.waitFor({state:"hidden"});
 assert(await saveActivity.evaluate(el=>el===document.activeElement),"Blackjack conversion focus return");
 await page.getByText("Casino activity saved",{exact:true}).waitFor();
 const retry=await api.post("/fund-manager/calculator-conversions/blackjack",{data:payload});assert.equal(retry.status(),200);
 assert.equal((await retry.json()).results[0].record_id,response.results[0].record_id);
 const other=await api.post(`/profiles/${id}/accounts`,{data:{account:"BetMGM",type:"Bookie",status:"Active",lifecycle_status:"Active",channel:"Online",current_balance:"0.00",pending_withdrawal_amount:"0.00"}});
 assert.equal(other.status(),201);const second=await api.post("/fund-manager/calculator-conversions/blackjack",{data:{...payload,casino_account:"BetMGM",casino_account_id:(await other.json()).account_id}});
 assert.equal(second.status(),409,await second.text());
 const activities=await (await api.get(`/profiles/${id}/casino-offers`)).json();assert.equal(activities.length,1);
 assert.equal(activities[0].final_net_pnl,"-5.00");
 await page.reload({waitUntil:"domcontentloaded"});await page.getByText("You have played 1 hand",{exact:true}).waitFor();
 await page.screenshot({path:runtime+"/combined-blackjack-half-dark.png",fullPage:true});
 const history=page.locator('[data-pd-id="calculators.blackjack.history"]');await history.locator("summary").click();await history.locator("summary").click();
 const sources=await(await api.get(`/profiles/${id}/tracker-summary-sources`)).json();
 assert.deepEqual(sources.casino_offers.map(row=>row.final_net_pnl),["-5.00"]);
 await page.goto(`${web}/profiles/${id}/tracker/reports`,{waitUntil:"domcontentloaded"});
 await page.getByText("£ (5.00)",{exact:true}).first().waitFor();
 observations.push({journey:"blackjack-live-to-casino",width:760,theme:"dark",stake:"5.00",reviewedBalanceResult:"-5.00",savedResult:"-5.00",retrySameRecord:true,secondAccountRejected:409,oneActivity:true,refreshHistory:true});
 await context.close();
 fs.writeFileSync(runtime+"/modal-conversion-browser.json",JSON.stringify({profileId:id,observations},null,2));
}catch(error){
 fs.writeFileSync(runtime+"/modal-conversion-browser.json",JSON.stringify({profileId:id,observations,blocker:String(error)},null,2));throw error;
}finally{await browser.close();await api.dispose();}
