// Read-only follow-up on prepared converted SNR/SR; do not replay settlement or edit records.
import fs from "node:fs";
import assert from "node:assert/strict";
import {chromium, request} from "@playwright/test";
import {DatabaseSync} from "node:sqlite";
const runtime="/tmp/openforge-modal-114-repair",web="http://localhost:3034";
const token=fs.readFileSync(runtime+"/session-token","utf8").trim();
const fixture=JSON.parse(fs.readFileSync(runtime+"/free-bet-converted-journey.json","utf8"));
const api=await request.newContext({baseURL:"http://127.0.0.1:8034",extraHTTPHeaders:{Cookie:`pd_session=${token}`}});
assert.equal((await(await api.get("/auth/session")).json()).email,"notification-acceptance@example.invalid");
const response=await api.get(`/profiles/${fixture.profileId}/free-bets`);
assert.equal(response.status(),200);
const rows=(await response.json()).filter(r=>["SNR","SR"].includes(r.retention_mode)&&r.user_notes.includes("Calculator source:"));
assert.equal(rows.length,2,"Prepared converted fixture must remain unambiguous");
const browser=await chromium.launch({headless:true}), observations=[];
const database=new DatabaseSync(runtime+"/acceptance.sqlite3",{readOnly:true});
const businessSnapshot=()=>({rows:database.prepare("SELECT * FROM free_bets WHERE profile_id=? ORDER BY free_bet_id").all(fixture.profileId),audits:database.prepare("SELECT * FROM free_bet_audit WHERE profile_id=? ORDER BY audit_id").all(fixture.profileId)});
const before=businessSnapshot();
try{
 for(const width of [1440,760])for(const theme of ["light","dark"]){
  const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion:"reduce"});
  await context.addCookies([{name:"pd_session",value:token,domain:"localhost",path:"/"}]);
  const page=await context.newPage();page.setDefaultTimeout(20000);
  for(const row of rows){
   await page.goto(`${web}/profiles/${fixture.profileId}/tracker/free-bets?record=${row.free_bet_id}`,{waitUntil:"domcontentloaded"});
   const dialog=page.locator('[data-pd-id="free-bets.editor.dialog"]');await dialog.waitFor();
   await dialog.getByRole("tab",{name:/Settlement/}).first().click();
   const advanced=dialog.getByRole("button",{name:"Advanced controls",exact:true});
   assert.equal(await advanced.getAttribute("aria-expanded"),"false");
   await advanced.focus();await page.keyboard.press("Enter");
   assert.equal(await advanced.getAttribute("aria-expanded"),"true");
   // Source inspection and rendered DOM confirm a single Notes textarea. Exact getByLabel
   // includes initial textarea text in label.textContent; inspect the actual accessibility tree.
   const notes=dialog.getByRole("textbox",{name:"Notes",exact:true});assert.equal(await notes.count(),1);
   const notesAccessibility=await notes.ariaSnapshot();
   assert(notesAccessibility.startsWith('- textbox "Notes"'),"Source label must stay distinct from textarea value");
   await notes.scrollIntoViewIfNeeded();
   assert.equal(await notes.inputValue(),row.user_notes,"User-visible provenance must equal saved source note");
   assert.equal(await dialog.getByLabel("Origin qualifying bet ID",{exact:true}).inputValue(),row.origin_qual_bet_id);
   assert.equal(row.origin_qual_bet_id,"","Calculator conversion is not a sportsbook-issued award");
   const tabs=await dialog.getByRole("tab").allTextContents();
   assert(!tabs.some(t=>/history/i.test(t)),"Update finding if an actual history consumer now exists");
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false);
   await advanced.click();assert.equal(await advanced.getAttribute("aria-expanded"),"false");
   await page.keyboard.press("Escape");await dialog.waitFor({state:"hidden"});
   const reread=await(await api.get(`/profiles/${fixture.profileId}/free-bets/${row.free_bet_id}`)).json();
   assert.equal(reread.user_notes,row.user_notes);assert.equal(reread.final_net_pnl,row.final_net_pnl);
   observations.push({width,theme,id:row.free_bet_id,retention:row.retention_mode,provenanceDisclosure:"Settlement → Advanced controls → Notes",disclosureKeyboardOperable:true,sourceNoteMatches:true,notesAccessibility,awardParent:"not applicable: calculator conversion",recordHistoryConsumer:"MISSING",tabs:tabs.map(t=>t.trim()),financialResultUnchanged:row.final_net_pnl});
  }
  await context.close();
 }
 assert.deepEqual(businessSnapshot(),before,"Read-only source review must not change Free Bet records or business audits");
 fs.writeFileSync(runtime+"/free-bet-lineage-surfaces.json",JSON.stringify({status:"PARTIAL",observations,businessRecordsAuditsUnchanged:true,remaining:"Financial record-change audit exists in persistence, but no user-visible complete Free Bet change-history consumer was found."},null,2));
 console.log(JSON.stringify({status:"PARTIAL",provenanceCases:observations.length,remaining:"User-visible Free Bet record-change history absent; calculator provenance reachable; award parent legitimately absent."}));
}finally{database.close();await browser.close();await api.dispose();}
