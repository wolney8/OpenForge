// Independent SNR/SR expectations; isolated modal repair fixture only.
import fs from "node:fs";
import assert from "node:assert/strict";
import {chromium,request} from "@playwright/test";
const runtime="/tmp/openforge-modal-114-repair",web="http://localhost:3034";
const token=fs.readFileSync(runtime+"/session-token","utf8").trim();
const api=await request.newContext({baseURL:"http://127.0.0.1:8034",extraHTTPHeaders:{Cookie:`pd_session=${token}`}});
assert.equal((await(await api.get("/auth/session")).json()).email,"notification-acceptance@example.invalid");
const made=await api.post("/profiles/onboarding",{data:{setup_path:"import",display_name:"Synthetic Free Bet Full Journey",profile_code:`FBJ-${Date.now()}`,tracking_start_date:"2026-09-01",enabled_modules:["sportsbook-bets","free-bets","cash-adjustments"],accounts:[],quick_actions:[]}});
assert.equal(made.status(),201);const body=await made.json(),id=(body.profile??body).profile_id;
await api.patch(`/profiles/${id}`,{data:{status:"Active"}});
for(const [account,type] of [["Bet365","Bookie"],["Smarkets","Exchange"]])assert.equal((await api.post(`/profiles/${id}/accounts`,{data:{account,type,status:"Active",lifecycle_status:"Active",channel:"Online",current_balance:"0.00",pending_withdrawal_amount:"0.00",...(type==="Exchange"?{commission_rate:"0.02"}:{})}})).status(),201);
assert.equal((await api.put(`/profiles/${id}/exchange-commissions`,{data:{exchange_name:"Smarkets",commission_rate:"0.02"}})).status(),200);
const browser=await chromium.launch({headless:true}),observations=[];
try{
 const context=await browser.newContext({viewport:{width:760,height:1000},colorScheme:"light",permissions:["clipboard-read","clipboard-write"],reducedMotion:"reduce"});
 await context.addCookies([{name:"pd_session",value:token,domain:"localhost",path:"/"}]);
 const page=await context.newPage();page.setDefaultTimeout(20000);
 for(const [retention,reference,final] of [["SNR","7.72","10.60"],["SR","9.65","20.60"]]){
  const response=await api.post(`/profiles/${id}/free-bets`,{data:{event_name:`Synthetic ${retention} full journey`,offer_type:"Bet & Get",bet_type:"Single",fixture_type:"Football",bookmaker:"Bet365",status:"Available",result:"Pending",retention_mode:retention,match_strategy:"Standard",free_bet_value:"10.00",back_odds:"5.00",lay_odds_1:"5.20",lay_actual:"",lay_matched_stake_1:"",exchange_name:"Smarkets",date_settled:"2026-09-13T12:00:00"}});
  assert.equal(response.status(),201,await response.text());const row=await response.json();assert.equal(row.base_reference_lay_stake,reference);
  const url=`${web}/profiles/${id}/tracker/free-bets?record=${row.free_bet_id}`;
  await page.goto(url,{waitUntil:"domcontentloaded"});let dialog=page.locator('[data-pd-id="free-bets.editor.dialog"]');await dialog.waitFor();
  await dialog.getByRole("tab",{name:/Matching/}).first().click();
  const copy=dialog.getByRole("button",{name:"Copy Standard free-bet lay stake and mark placed",exact:true});await copy.click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),reference);
  await dialog.getByLabel("Lay actual",{exact:true}).fill("7.00");await dialog.getByLabel("Lay actual",{exact:true}).blur();
  const [placed]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(`/free-bets/${row.free_bet_id}`)&&r.request().method()==="PUT"),dialog.getByRole("button",{name:"Save",exact:true}).click()]);
  assert.equal(placed.status(),200);assert.equal((await placed.json()).status,"Placed");await dialog.waitFor({state:"hidden"});
  await page.goto(url,{waitUntil:"domcontentloaded"});dialog=page.locator('[data-pd-id="free-bets.editor.dialog"]');await dialog.waitFor();
  await dialog.getByRole("tab",{name:/Settlement/}).first().click();
  const result=dialog.locator("label").filter({hasText:/^Result/}).locator("select");
  const [settled]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(`/free-bets/${row.free_bet_id}`)&&r.request().method()==="PUT"),result.selectOption("Back Won")]);
  assert.equal(settled.status(),200);const value=await settled.json();assert.equal(value.status,"Settled");assert.equal(value.final_net_pnl,final);
  const reopened=await(await api.get(`/profiles/${id}/free-bets/${row.free_bet_id}`)).json();
  assert.equal(reopened.lay_actual,"7.00");assert.equal(reopened.final_net_pnl,final);
  observations.push({retention,reference,copied:reference,actual:"7.00",status:"Settled",result:"Back Won",final});
 }
 await page.goto(`${web}/profiles/${id}/tracker/reports`,{waitUntil:"domcontentloaded"});
 await page.getByText("£ 31.20",{exact:true}).first().waitFor();
 await page.screenshot({path:runtime+"/free-bet-report-half-light.png",fullPage:true});
 await page.reload({waitUntil:"domcontentloaded"});await page.getByText("£ 31.20",{exact:true}).first().waitFor();
 await context.close();
 fs.writeFileSync(runtime+"/free-bet-complete-journey.json",JSON.stringify({profileId:id,observations,combinedReport:"31.20",refresh:true},null,2));console.log(JSON.stringify(observations));
}catch(error){fs.writeFileSync(runtime+"/free-bet-complete-journey.json",JSON.stringify({profileId:id,observations,blocker:String(error)},null,2));throw error;}
finally{await browser.close();await api.dispose();}
