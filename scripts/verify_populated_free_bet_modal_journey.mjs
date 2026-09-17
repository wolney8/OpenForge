// Independent SNR/SR expectations; isolated modal repair fixture only.
import fs from "node:fs";
import assert from "node:assert/strict";
import {chromium,request} from "@playwright/test";
const runtime=process.env.OPENFORGE_FREE_BET_RUNTIME??"/tmp/openforge-modal-114-repair";
const web=process.env.OPENFORGE_FREE_BET_WEB??"http://localhost:3034";
const apiBase=process.env.OPENFORGE_FREE_BET_API??"http://127.0.0.1:8034";
const converted=process.argv.includes("--converted");
const token=fs.readFileSync(runtime+"/session-token","utf8").trim();
const api=await request.newContext({baseURL:apiBase,extraHTTPHeaders:{Cookie:`pd_session=${token}`}});
const session=await(await api.get("/auth/session")).json();
assert.equal(session.authenticated,true);assert.equal(session.role,"fund_manager");
const made=await api.post("/profiles/onboarding",{data:{setup_path:"import",display_name:"Synthetic Free Bet Full Journey",profile_code:`FBJ-${Date.now()}`,tracking_start_date:"2026-09-01",enabled_modules:["sportsbook-bets","free-bets","cash-adjustments"],accounts:[],quick_actions:[]}});
assert.equal(made.status(),201);const body=await made.json(),id=(body.profile??body).profile_id;
await api.patch(`/profiles/${id}`,{data:{status:"Active"}});
for(const [account,type] of [["Bet365","Bookie"],["Smarkets","Exchange"]])assert.equal((await api.post(`/profiles/${id}/accounts`,{data:{account,type,status:"Active",lifecycle_status:"Active",channel:"Online",current_balance:"0.00",pending_withdrawal_amount:"0.00",...(type==="Exchange"?{commission_rate:"0.02"}:{})}})).status(),201);
assert.equal((await api.put(`/profiles/${id}/exchange-commissions`,{data:{exchange_name:"Smarkets",commission_rate:"0.02"}})).status(),200);
const browser=await chromium.launch({headless:true}),observations=[];
try{
 const context=await browser.newContext({viewport:{width:760,height:1000},colorScheme:"light",permissions:["clipboard-read","clipboard-write"],reducedMotion:"reduce"});
 await context.addCookies([{name:"pd_session",value:token,domain:"localhost",path:"/"}]);
 const page=await context.newPage();page.setDefaultTimeout(40000);
 for(const [retention,reference,final] of (converted?[["SNR","6.49","7.40"],["SR","9.74","17.40"]]:[["SNR","7.72","10.60"],["SR","9.65","20.60"]])){
  let row;
  if(converted){
   await page.goto(`${web}/fund-manager/calculators?betType=free_bet&freeBetMode=${retention}&backStake=10.00&backOdds=3.00&layOdds=3.10&exchangeCommission=0.02`,{waitUntil:"networkidle"});
   assert.equal(await page.locator("#calculator-bet-type").inputValue(),retention);
   const convert=page.locator('[data-pd-id="calculators.matched-betting.convert"]');await convert.waitFor();console.log("CONVERT",retention);await convert.click();
   const conversion=page.locator('[data-pd-id="calculator-conversion.dialog"]');await conversion.waitFor();
   await conversion.getByLabel("Event / fixture",{exact:true}).fill(`Synthetic converted ${retention}`);
   await conversion.locator("label").filter({hasText:/^Offer type/}).locator("select").selectOption("Bet & Get");
   await conversion.locator("label").filter({hasText:/^Fixture type/}).locator("select").selectOption("Football");
   await conversion.locator("label.multi-profile-target-row").filter({hasText:(body.profile??body).profile_code}).click();
   const account=conversion.locator("label").filter({hasText:/^Bookmaker Account/}).locator("select");
   await account.locator("option").filter({hasText:/Bet365/}).waitFor({state:"attached"});
   await account.selectOption(await account.locator("option").filter({hasText:/Bet365/}).getAttribute("value"));
   const [saved]=await Promise.all([page.waitForResponse(r=>r.url().endsWith("/calculator-conversions/standard")&&r.request().method()==="POST"),conversion.getByRole("button",{name:"Convert to opportunity",exact:true}).click()]);
   assert.equal(saved.status(),200);const result=(await saved.json()).results[0];assert.notEqual(result.state,"failed");
   await conversion.waitFor({state:"hidden"});
   await page.locator(".calculator-conversion-receipt").getByRole("link",{name:"Open row"}).click();
   row=await(await api.get(`/profiles/${id}/free-bets/${result.record_id}`)).json();
   assert.equal(row.status,"Prospecting");assert(row.user_notes.includes("Calculator source:"),"conversion provenance missing");
  }else{
   const response=await api.post(`/profiles/${id}/free-bets`,{data:{event_name:`Synthetic ${retention} full journey`,offer_type:"Bet & Get",bet_type:"Single",fixture_type:"Football",bookmaker:"Bet365",status:"Available",result:"Pending",retention_mode:retention,match_strategy:"Standard",free_bet_value:"10.00",back_odds:"5.00",lay_odds_1:"5.20",lay_actual:"",lay_matched_stake_1:"",exchange_name:"Smarkets",date_settled:"2026-09-13T12:00:00"}});
   assert.equal(response.status(),201,await response.text());row=await response.json();
  }
  if(!converted)assert.equal(row.base_reference_lay_stake,reference);
  const url=`${web}/profiles/${id}/tracker/free-bets?record=${row.free_bet_id}`;
  await page.goto(url,{waitUntil:"domcontentloaded"});let dialog=page.locator('[data-pd-id="free-bets.editor.dialog"]');await dialog.waitFor();
  if(converted){
   await dialog.getByRole("tab",{name:/Settlement/}).first().click();
   await dialog.getByLabel("Settles",{exact:true}).fill("2026-09-13T12:00");
   const [available]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(`/free-bets/${row.free_bet_id}`)&&r.request().method()==="PUT"&&r.request().postDataJSON()?.status==="Available"),dialog.locator("label").filter({hasText:/^Status/}).locator("select").selectOption("Available")]);
   assert.equal(available.status(),200);assert.equal((await available.json()).base_reference_lay_stake,reference);
  }
  await dialog.getByRole("tab",{name:/Matching/}).first().click();
  const copy=dialog.locator('[data-pd-id="free-bets.matching.core-planner.selected-reference.lay-stake.copyable"] button');
  const versionedPlan=await copy.count()>0;
  if(versionedPlan)await copy.click();
  else await dialog.getByRole("button",{name:/Copy Standard free-bet lay stake and mark placed/}).click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),reference);
  await dialog.getByLabel(versionedPlan?"Actual matched stake":"Lay actual",{exact:true}).fill(converted?"6.00":"7.00");
  if(versionedPlan)await dialog.getByRole("button",{name:"Confirm actual placement",exact:true}).click();
  const [placed]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(`/free-bets/${row.free_bet_id}`)&&r.request().method()==="PUT"),dialog.getByRole("button",{name:"Save",exact:true}).click()]);
  assert.equal(placed.status(),200);assert.equal((await placed.json()).status,"Placed");await dialog.waitFor({state:"hidden"});
  await page.goto(url,{waitUntil:"domcontentloaded"});dialog=page.locator('[data-pd-id="free-bets.editor.dialog"]');await dialog.waitFor();
  await dialog.getByRole("tab",{name:/Settlement/}).first().click();
  const result=dialog.locator("label").filter({hasText:/^Result/}).locator("select");
  console.log("BEFORE SETTLEMENT",{retention,id:row.free_bet_id,result:await result.inputValue(),disabled:await result.isDisabled()});
  assert.equal(await result.inputValue(),"Pending","fresh placed hand must await an actual result");
  const [settled]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(`/free-bets/${row.free_bet_id}`)&&r.request().method()==="PUT"),result.selectOption("Back Won")]);
  assert.equal(settled.status(),200);const value=await settled.json();assert.equal(value.status,"Settled");assert.equal(value.final_net_pnl,final);
  const reopened=await(await api.get(`/profiles/${id}/free-bets/${row.free_bet_id}`)).json();
  assert.equal(reopened.lay_actual,converted?"6.00":"7.00");assert.equal(reopened.final_net_pnl,final);
  const historyPanel=dialog.locator('[data-pd-id="free_bet.editor.history"]');
  await historyPanel.locator("summary").click();
  await historyPanel.getByText("Created",{exact:true}).waitFor();
  await historyPanel.getByText("Placement recorded",{exact:true}).waitFor();
  await historyPanel.getByText("Settled",{exact:true}).waitFor();
  const history=await(await api.get(`/profiles/${id}/financial-history/free_bet/${row.free_bet_id}`)).json();
  observations.push({retention,reference,copied:reference,actual:converted?"6.00":"7.00",status:"Settled",result:"Back Won",final,history:history.map(event=>event.operation)});
 }
 await page.goto(`${web}/profiles/${id}/tracker/reports`,{waitUntil:"domcontentloaded"});
 await page.getByText(converted?"£ 24.80":"£ 31.20",{exact:true}).first().waitFor();
 await page.screenshot({path:runtime+"/free-bet-report-half-light.png",fullPage:true});
 await page.reload({waitUntil:"domcontentloaded"});await page.getByText(converted?"£ 24.80":"£ 31.20",{exact:true}).first().waitFor();
 await context.close();
 fs.writeFileSync(runtime+(converted?"/free-bet-converted-journey.json":"/free-bet-complete-journey.json"),JSON.stringify({profileId:id,observations,combinedReport:converted?"24.80":"31.20",refresh:true,...(converted?{journeyStatus:"PASS",historyLineage:"Calculator provenance and the governed created, placement and settlement history are visible after reopen."}:{})},null,2));console.log(JSON.stringify(observations));
}catch(error){fs.writeFileSync(runtime+(converted?"/free-bet-converted-journey.json":"/free-bet-complete-journey.json"),JSON.stringify({profileId:id,observations,blocker:String(error)},null,2));throw error;}
finally{await api.patch(`/profiles/${id}`,{data:{status:"Archived"}});await browser.close();await api.dispose();}
