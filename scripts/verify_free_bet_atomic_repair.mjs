// PD-QA-014: only this disposable authenticated synthetic repair runtime.
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { chromium, request } from "@playwright/test";
const runtime="/tmp/openforge-free-bet-atomic-91-repair";
const api="http://127.0.0.1:8030", web="http://localhost:3030";
const token=fs.readFileSync(`${runtime}/session-token`,"utf8").trim();
const client=await request.newContext({baseURL:api,extraHTTPHeaders:{Cookie:`pd_session=${token}`}});
const auth=await client.get("/auth/session");
if(auth.status()!==200 || (await auth.json()).email!=="notification-acceptance@example.invalid") throw Error("Synthetic owner guard");
const created=await client.post("/profiles/onboarding",{data:{
  setup_path:"import",display_name:"Synthetic Free Bet Repair",profile_code:`FB-${Date.now()}`,
  tracking_start_date:"2026-09-01",enabled_modules:["sportsbook-bets","free-bets","cash-adjustments"],accounts:[],quick_actions:[],
}});
if(created.status()!==201)throw Error(await created.text());
const p=await created.json(), id=(p.profile??p).profile_id;
await client.patch(`/profiles/${id}`,{data:{status:"Active"}});
for(const [name,type] of [["Bet365","Bookie"],["Smarkets","Exchange"]]){
  const response=await client.post(`/profiles/${id}/accounts`,{data:{
    account:name,type,status:"Active",lifecycle_status:"Active",channel:"Online",
    current_balance:"0.00",pending_withdrawal_amount:"0.00",
    ...(type==="Exchange"?{commission_rate:"0.02"}:{}),
  }});
  if(response.status()!==201)throw Error(await response.text());
}
await client.put(`/profiles/${id}/exchange-commissions`,{data:{exchange_name:"Smarkets",commission_rate:"0.02"}});
const browser=await chromium.launch({headless:true}), observations=[];
try{
  for(const width of (process.argv.includes("--legacy-only") ? [] : [1440,760]))for(const theme of ["light","dark"]){
    const made=await client.post(`/profiles/${id}/free-bets`,{data:{
      event_name:`Synthetic ${width} ${theme}`,offer_type:"Bet & Get",bet_type:"Single",fixture_type:"Football",
      bookmaker:"Bet365",status:"Placed",result:"Pending",retention_mode:"SNR",match_strategy:"Standard",
      free_bet_value:"10.00",back_odds:"5.00",lay_odds_1:"5.20",lay_actual:"7.00",lay_matched_stake_1:"7.00",
      exchange_name:"Smarkets",date_settled:"2026-09-12",
    }});
    if(made.status()!==201)throw Error(await made.text());
    const row=await made.json(), context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion:"reduce"});
    await context.addCookies([{name:"pd_session",value:token,domain:"localhost",path:"/"}]);
    const page=await context.newPage();page.setDefaultTimeout(20000);
    const errors=[];page.on("pageerror",e=>{errors.push(e.message);console.log("PAGE ERROR",e.message);});
    await page.goto(`${web}/profiles/${id}/tracker/free-bets?record=${row.free_bet_id}`,{waitUntil:"domcontentloaded"});
    await page.evaluate(t=>{document.documentElement.dataset.theme=t;localStorage.setItem("openforge-theme",t);},theme);
    const dialog=page.getByRole("dialog");await dialog.waitFor();
    // Native stepper, pointer interaction only: never force an obstructed click.
    await dialog.getByRole("tab",{name:/Matching/}).first().click();
    const input=dialog.getByLabel("Free-bet value",{exact:true}), save=dialog.getByRole("button",{name:"Save",exact:true});
    await input.waitFor();
    console.log("EDITOR READY",width,theme);
    for(const raw of ["NaN","Infinity","-Infinity","not-money","1.234"]){
      await input.fill(raw);
      console.log("ENTERED",raw);
      await page.waitForTimeout(100);
      if(!await input.count()){
        console.log("EDITOR AFTER INVALID",await page.locator("body").innerText());
        throw Error("Free-bet input disappeared after invalid entry");
      }
      await input.blur();
      if(await input.inputValue()!==raw || await input.getAttribute("aria-invalid")!=="true" || await save.isEnabled())throw Error(`Invalid input accepted ${raw}`);
      const desc=(await input.getAttribute("aria-describedby")??"").split(" ").find(x=>x.endsWith("-error"));
      if(!desc || !await dialog.locator(`#${desc}`).isVisible())throw Error("Associated field error absent");
    }
    await input.fill("10.00");await input.blur();
    const lay=dialog.getByLabel("Lay actual",{exact:true});await lay.fill("not-money");
    if(await save.isEnabled())throw Error("Invalid actual stake accepted");
    const previewUpdated=page.waitForResponse(r=>r.url().endsWith("/free-bets/preview")&&r.request().postDataJSON()?.lay_actual==="6.00");
    await lay.fill("6.00");await lay.blur();
    const previewResponse=await previewUpdated;
    if(previewResponse.status()!==200)throw Error("Valid corrected preview failed");
    if(!await save.isEnabled())throw Error("Correction does not enable save");
    await input.focus();await page.keyboard.press("Tab");
    const geometry=await dialog.evaluate(el=>{const r=el.getBoundingClientRect();return{
      left:r.left,right:r.right,top:r.top,bottom:r.bottom,
      pageWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,
    };});
    if(geometry.left<0||geometry.right>width||geometry.pageWidth>geometry.clientWidth)throw Error("Modal/page overflow");
    console.log("BEFORE SAVE",width,theme,await dialog.locator("form").evaluateAll(forms=>forms.map(form=>({
      valid:form.checkValidity(),invalid:[...form.querySelectorAll(":invalid")].map(el=>({name:el.getAttribute("aria-label")??el.name,type:el.type,value:el.value,message:el.validationMessage})),
    }))));
    let saved;
    try{
      [saved]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(`/free-bets/${row.free_bet_id}`)&&r.request().method()==="PUT"),save.click()]);
    }catch(error){
      console.log("SAVE FAILURE",await dialog.innerText());
      observations.push({width,theme,result:"BLOCKED",blocker:"PD-QA-004: pointer Save produced no PUT after corrected preview",invalidPreserved:true,inlineAssociated:true,geometry,pageErrors:errors});
      await context.close();
      continue;
    }
    if(saved.status()!==200)throw Error(await saved.text());
    await dialog.waitFor({state:"hidden"});
    const reopened=await client.get(`/profiles/${id}/free-bets/${row.free_bet_id}`);
    if((await reopened.json()).lay_actual!=="6.00")throw Error("Save/reopen mismatch");
    await page.reload({waitUntil:"domcontentloaded"});
    observations.push({width,theme,invalidPreserved:true,inlineAssociated:true,correctedSave:saved.status(),reopenedActual:"6.00",geometry,pageErrors:errors});
    await context.close();
  }
  const legacy=await client.post(`/profiles/${id}/free-bets`,{data:{
    event_name:"Synthetic legacy-invalid Free Bet",offer_type:"Bet & Get",bet_type:"Single",fixture_type:"Football",
    bookmaker:"Bet365",status:"Settled",result:"Back Won",retention_mode:"SNR",match_strategy:"Standard",
    free_bet_value:"10.00",back_odds:"5.00",lay_odds_1:"5.20",lay_actual:"7.00",lay_matched_stake_1:"7.00",
    exchange_name:"Smarkets",date_settled:"2026-09-12",
  }});
  if(legacy.status()!==201)throw Error(await legacy.text());
  const legacyId=(await legacy.json()).free_bet_id;
  const database=new DatabaseSync(`${runtime}/acceptance.sqlite3`);
  database.prepare("UPDATE free_bets SET free_bet_value='NaN' WHERE free_bet_id=?").run(legacyId);
  const context=await browser.newContext({viewport:{width:760,height:1000},colorScheme:"dark",reducedMotion:"reduce"});
  await context.addCookies([{name:"pd_session",value:token,domain:"localhost",path:"/"}]);
  const page=await context.newPage();page.setDefaultTimeout(20000);
  const errors=[], consoleErrors=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",message=>{if(message.type()==="error")consoleErrors.push(message.text());});
  for(const route of ["free-bets","dashboard","reports"]){
    await page.goto(`${web}/profiles/${id}/tracker/${route}`,{waitUntil:"domcontentloaded"});
    await page.locator('[data-pd-id="free-bet-money.incomplete"]').waitFor();
    await page.getByText("Unavailable",{exact:true}).first().waitFor();
    if(!await page.locator('[data-pd-id="free-bet-money.incomplete"]').innerText().then(text=>text.includes(legacyId)))throw Error("Missing correction identity");
    observations.push({route,legacyPnl:"Unavailable",diagnostic:true,pageErrors:[...errors],consoleErrors:[...consoleErrors]});
  }
  if(database.prepare("SELECT free_bet_value FROM free_bets WHERE free_bet_id=?").get(legacyId).free_bet_value!=="NaN")throw Error("Legacy source was rewritten");
  database.close();await context.close();
  if(errors.length)throw Error("Legacy route runtime error");
  fs.writeFileSync(`${runtime}/${process.argv.includes("--legacy-only")?"free-bet-legacy-browser":"free-bet-browser"}.json`,JSON.stringify(observations,null,2));
  console.log(JSON.stringify(observations,null,2));
  if(observations.some(item=>item.result==="BLOCKED"))process.exitCode=1;
}catch(error){
  fs.writeFileSync(`${runtime}/free-bet-browser.json`,JSON.stringify({observations,blocker:String(error)},null,2));
  throw error;
}finally{await browser.close();await client.dispose();}
