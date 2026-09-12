// #91 isolated real API/browser regression. Never opens the normal/audit/manual DB.
import fs from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {chromium,request} from "@playwright/test";

const root="/tmp/openforge-account-money-91-repair",api="http://127.0.0.1:8026",web="http://localhost:3026";
const token=fs.readFileSync(`${root}/session-token`,"utf8").trim();
const client=await request.newContext({baseURL:api,extraHTTPHeaders:{Cookie:`pd_session=${token}`}});
const auth=await client.get("/auth/session");
if(auth.status()!==200||(await auth.json()).email!=="notification-acceptance@example.invalid")throw Error("Isolated synthetic owner required");
const db=new DatabaseSync(`${root}/acceptance.sqlite3`),results=[];
const profiles=await (await client.get("/profiles")).json();
async function create(code){let p=profiles.find(p=>p.profile_code===code);if(!p){const r=await client.post("/profiles/onboarding",{data:{setup_path:"import",display_name:`Synthetic ${code}`,profile_code:code,tracking_start_date:"2026-09-01",enabled_modules:["sportsbook-bets","free-bets","cash-adjustments"],accounts:[],quick_actions:[]}});if(r.status()!==201)throw Error(await r.text());const body=await r.json();p=body.profile??body;await client.patch(`/profiles/${p.profile_id}`,{data:{status:"Active"}});}return p.profile_id;}
async function account(id,name,balance){const rows=await(await client.get(`/profiles/${id}/accounts`)).json();let a=rows.find(a=>a.account===name);if(!a){const r=await client.post(`/profiles/${id}/accounts`,{data:{account:name,type:"Bank",status:"Active",channel:"Online",counts_in_cash_total:true,current_balance:balance,pending_withdrawal_amount:"0.00",last_balance_update:"2026-09-01T10:00:00Z"}});if(r.status()!==201)throw Error(await r.text());a=await r.json();}return a;}
const browser=await chromium.launch({headless:true});
try{
 const id=await create("MONEY-REPAIR"),other=await create("MONEY-CONTROL"),known=await account(id,"Bank A","10.00"),bad=await account(id,"Lloyds Bank","12.34");await account(other,"Bank A","10.00");
 for(const [width,theme] of [[1440,"light"],[760,"dark"]]){
  // Intentionally invalid legacy data is a fixture-only SQL write, not a new API bypass.
  db.prepare("UPDATE accounts SET current_balance='NaN' WHERE account_id=?").run(bad.account_id);
  const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion:"reduce"});await context.addCookies([{name:"pd_session",value:token,domain:"localhost",path:"/"}]);const page=await context.newPage();page.setDefaultTimeout(20000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(`${web}/profiles/${id}/tracker/accounts`,{waitUntil:"domcontentloaded"});
  await page.getByRole("button",{name:"Edit Lloyds Bank",exact:true}).waitFor();
  await page.evaluate(t=>{document.documentElement.dataset.theme=t;localStorage.setItem("openforge-theme",t);},theme);
  const status=page.locator('[data-pd-id="account-money.incomplete"]');await status.waitFor();if(!(await status.innerText()).includes("Lloyds Bank"))throw Error("Missing affected Account identity");
  const bankroll=page.locator(".stat-card").filter({has:page.getByText("Bankroll",{exact:true})});if(!(await bankroll.innerText()).includes("Unavailable")||!(await bankroll.innerText()).includes("Known subtotal"))throw Error("Cash falsely complete");
  const unchanged=db.prepare("SELECT current_balance FROM accounts WHERE account_id=?").get(bad.account_id).current_balance;if(unchanged!=="NaN")throw Error("Legacy source rewritten");
  const invalidExport=await client.get(`/profiles/${id}/exports/portable-profile.xlsx`);if(invalidExport.status()!==409)throw Error("Invalid export not controlled");
  await page.goto(`${web}/profiles/${id}/tracker/dashboard`,{waitUntil:"domcontentloaded"});
  await page.locator(".dashboard-health-grid").waitFor();
  await page.locator('[data-pd-id="account-money.incomplete"]').waitFor();
  if(!(await page.locator(".dashboard-health-grid").innerText()).includes("Unavailable"))throw Error("Profile cash falsely complete");
  await page.goto(`${web}/profiles/${id}/tracker/accounts`,{waitUntil:"domcontentloaded"});
  await page.getByRole("button",{name:"Edit Lloyds Bank",exact:true}).waitFor();
  await page.getByRole("button",{name:"Edit Lloyds Bank",exact:true}).click();const dialog=page.getByRole("dialog",{name:"Edit account"});await dialog.waitFor();const input=dialog.getByLabel("Current balance",{exact:true}),save=dialog.getByRole("button",{name:"Save",exact:true});
  for(const raw of ["not-money","NaN","Infinity","-Infinity","1.234"]){await input.fill(raw);await input.blur();if(await input.inputValue()!==raw||await input.getAttribute("aria-invalid")!=="true"||await save.isEnabled())throw Error(`Invalid UI accepted ${raw}`);const desc=await input.getAttribute("aria-describedby");if(!desc||!await dialog.locator(`#${desc}`).isVisible())throw Error("Inline error not associated");}
  await input.fill("12.34");await input.blur();
  const pending=dialog.getByLabel("Pending withdrawal",{exact:true});
  await pending.fill("Infinity");await pending.blur();
  if(await save.isEnabled()||await pending.getAttribute("aria-invalid")!=="true")throw Error("Pending validation bypass");
  await pending.fill("0.00");await pending.blur();
  await input.fill(".50");await input.blur();if(await input.inputValue()!=="0.50")throw Error("Commit shorthand normalization");await input.fill("12.34");await input.blur();if(!await save.isEnabled())throw Error("Correction cannot save");await input.focus();await page.keyboard.press("Tab");
  const prefix=await input.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement.querySelector(".financial-text-input-prefix").getBoundingClientRect(),s=el.parentElement.getBoundingClientRect();return {contained:p.x>=s.x&&p.right<=r.x+parseFloat(getComputedStyle(el).paddingLeft),centerDelta:Math.abs((p.y+p.height/2)-(r.y+r.height/2))};});
  const geometry=await dialog.evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,pageWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};});
  if(!prefix.contained||prefix.centerDelta>1||geometry.left<0||geometry.right>width||geometry.pageWidth>geometry.clientWidth)throw Error("Field/modal geometry regression");
  const [saved]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(`/accounts/${bad.account_id}`)&&r.request().method()==="PUT"),save.click()]);if(saved.status()!==200)throw Error("Corrected UI save failed");await dialog.waitFor({state:"hidden"});await status.waitFor({state:"hidden"});if((await client.get(`/profiles/${id}/exports/portable-profile.xlsx`)).status()!==200)throw Error("Valid export failed");
  await page.goto(`${web}/profiles/${id}/tracker/dashboard`,{waitUntil:"domcontentloaded"});await page.locator(".dashboard-health-grid").waitFor();await page.getByText("£ 22.34",{exact:true}).first().waitFor();
  results.push({width,theme,legacyUnchanged:unchanged,invalidExport:invalidExport.status(),uiInvalidPreserved:true,correctedSaved:true,prefix,geometry,pageErrors:errors});await context.close();
 }
 fs.writeFileSync(`${root}/money-repair-browser.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();await client.dispose();db.close();}
