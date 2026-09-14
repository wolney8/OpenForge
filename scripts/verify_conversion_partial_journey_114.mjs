// PQA-J12 real UI + independent persistence assertions, disposable synthetic runtime only.
import fs from "node:fs";
import assert from "node:assert/strict";
import {chromium,request} from "@playwright/test";
import {execFileSync} from "node:child_process";
const corrections=process.argv.includes('--calculator-corrections');
const runtime=corrections?"/tmp/openforge-award-integrity-91-20260914":"/tmp/openforge-modal-114-repair",web=corrections?"http://localhost:3040":"http://localhost:3034";
const token=fs.readFileSync(runtime+"/session-token","utf8").trim();
const api=await request.newContext({baseURL:corrections?"http://127.0.0.1:8039":"http://127.0.0.1:8034",extraHTTPHeaders:{Cookie:`pd_session=${token}`}});
assert.equal((await(await api.get("/auth/session")).json()).email,"notification-acceptance@example.invalid");
const targets=[];
for(const n of [1,2]){
 const made=await api.post("/profiles/onboarding",{data:{setup_path:"import",display_name:`Synthetic Partial Target ${n}`,profile_code:`P${n}-${Date.now()}`,tracking_start_date:"2026-09-01",enabled_modules:["sportsbook-bets","free-bets","cash-adjustments"],accounts:[],quick_actions:[]}});
 assert.equal(made.status(),201,await made.text());const body=await made.json(),p=body.profile??body;
 await api.patch(`/profiles/${p.profile_id}`,{data:{status:"Active"}});
 let account;
 for(const [name,type] of [["Bet365","Bookie"],["Smarkets","Exchange"]]){
  const response=await api.post(`/profiles/${p.profile_id}/accounts`,{data:{account:name,type,status:"Active",lifecycle_status:"Active",channel:"Online",current_balance:"0.00",pending_withdrawal_amount:"0.00",...(type==="Exchange"?{commission_rate:"0.02"}:{})}});
  assert.equal(response.status(),201);if(type==="Bookie")account=await response.json();
 }
 targets.push({profile:p,account});
}
const browser=await chromium.launch(),observations=[];
try{
 const context=await browser.newContext({viewport:{width:760,height:1000},colorScheme:"dark",reducedMotion:"reduce"});
 await context.addCookies([{name:"pd_session",value:token,domain:"localhost",path:"/"}]);
 const page=await context.newPage();page.setDefaultTimeout(20000);
 await page.goto(`${web}/fund-manager/calculators?backStake=10.00&backOdds=3.00&layOdds=3.10&exchangeCommission=0.02`,{waitUntil:"domcontentloaded"});
 async function open(selected){
  await page.getByRole("button",{name:"Convert to opportunity",exact:true}).click();
  const dialog=page.locator('[data-pd-id="calculator-conversion.dialog"]');await dialog.waitFor();
  await dialog.getByLabel("Event / fixture",{exact:true}).fill("Synthetic partial recovery");
  await dialog.locator("label").filter({hasText:/^Offer type/}).locator("select").selectOption("Bet & Get");
  await dialog.locator("label").filter({hasText:/^Fixture type/}).locator("select").selectOption("Football");
  for(const t of selected){
   await dialog.locator("label.multi-profile-target-row").filter({hasText:t.profile.profile_code}).click();
   const select=dialog.locator(`select`).filter({has:page.locator(`option[value="${t.account.account_id}"]`)});
   await select.waitFor();await select.selectOption(t.account.account_id);
  }
  return dialog;
 }
 async function submit(dialog){
  const [response]=await Promise.all([page.waitForResponse(r=>r.url().endsWith("/calculator-conversions/standard")&&r.request().method()==="POST"),dialog.getByRole("button",{name:"Convert to opportunity",exact:true}).click()]);
  assert.equal(response.status(),200);return {body:await response.json(),request:response.request().postDataJSON()};
 }
 let dialog=await open(targets);
 // Server eligibility becomes stale after the review opened; UI must preserve the successful target.
 const t=targets[1];
 assert.equal((await api.put(`/profiles/${t.profile.profile_id}/accounts/${t.account.account_id}`,{data:{...t.account,status:"Closed",lifecycle_status:"Closed"}})).status(),200);
 const first=await submit(dialog);
 assert.deepEqual(first.body.results.map(r=>r.state),["succeeded","failed"]);
 assert(await dialog.isVisible(),"partial success incorrectly closed dialog");
 const rows=async target=>(await(await api.get(`/profiles/${target.profile.profile_id}/sportsbook-bets`)).json());
 assert.equal((await rows(targets[0])).length,1);assert.equal((await rows(t)).length,0);
 const results=dialog.getByRole("region",{name:"Conversion results"});await results.getByRole("link",{name:"Open row"}).waitFor();
 await dialog.getByLabel("Event / fixture",{exact:true}).fill("Synthetic partial recovery reviewed");
 assert.equal((await api.put(`/profiles/${t.profile.profile_id}/accounts/${t.account.account_id}`,{data:{...t.account,status:"Active",lifecycle_status:"Active"}})).status(),200);
 const retry=await submit(dialog);
 assert.equal(retry.request.conversion_intent_id,first.request.conversion_intent_id);
 assert.deepEqual(retry.request.targets.map(t=>t.profile_id),[t.profile.profile_id]);
 await dialog.waitFor({state:"hidden"});
 assert.equal((await rows(targets[0])).length,1);assert.equal((await rows(t)).length,1);
 const existing=await api.post("/fund-manager/calculator-conversions/standard",{data:retry.request});assert.equal(existing.status(),200);
 assert.equal((await existing.json()).results[0].state,"already_succeeded");
 const receipt=page.locator(".calculator-conversion-receipt");assert.equal(await receipt.getByRole("link",{name:"Open row"}).count(),2);
 dialog=await open([targets[0]]);const fresh=await submit(dialog);await dialog.waitFor({state:"hidden"});
 assert.notEqual(fresh.request.conversion_intent_id,first.request.conversion_intent_id);
 assert.equal((await rows(targets[0])).length,2);assert.equal((await rows(t)).length,1);
 assert.equal(await page.getByLabel("Back stake",{exact:true}).inputValue(),"10.00");
 const notices=await(await api.get("/fund-manager/notifications")).json();
 const hrefs=[...first.body.results.filter(r=>r.state!=="failed"),...retry.body.results,...fresh.body.results].map(r=>r.href);
 for(const href of hrefs){assert.equal(notices.filter(n=>n.notification_type==="calculator_conversion_complete"&&n.href===href).length,1);await page.goto(web+href,{waitUntil:"domcontentloaded"});await page.locator('[data-pd-id="sportsbook.editor.dialog"]').waitFor();await page.keyboard.press("Escape");}
 observations.push({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),web,profiles:targets.map(t=>t.profile.profile_id),partialStates:first.body.results.map(r=>r.state),retryOnlyUnresolved:true,retryIntentRetained:true,deliberateNewIntent:true,counts:[2,1],notificationLinks:hrefs,sourcePreserved:true});
 fs.writeFileSync(runtime+"/conversion-partial-journey.json",JSON.stringify(observations,null,2));console.log(JSON.stringify(observations));await context.close();
}catch(error){fs.writeFileSync(runtime+"/conversion-partial-journey.json",JSON.stringify({observations,blocker:String(error)},null,2));throw error;}
finally{await browser.close();await api.dispose();}
