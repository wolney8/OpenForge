// #114 batch 2: dedicated synthetic runtime only; observations, not product fixes.
import fs from "node:fs";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { chromium, request } from "@playwright/test";

const root = "/tmp/openforge-platform-audit-20260912-runtime";
const api = "http://127.0.0.1:8024", web = "http://localhost:3024";
const token = fs.readFileSync(`${root}/session-token`, "utf8").trim();
const client = await request.newContext({ baseURL: api, extraHTTPHeaders: { Cookie: `pd_session=${token}` }, timeout: 12000 });
const auth = await client.get("/auth/session");
if (auth.status() !== 200 || (await auth.json()).email !== "notification-acceptance@example.invalid") throw Error("Dedicated synthetic session required");
const db = new DatabaseSync(`${root}/acceptance.sqlite3`, { readOnly: true });
const out = { revision: "f7a3b35073ecc87cdf8f8f881129f221ec44d395", date: "2026-09-12", money: [], lifecycle: [], conversions: [], rendered: [], setup: [] };
const profiles = await (await client.get("/profiles")).json();
async function profile(code) {
  const found = profiles.find(p => p.profile_code === code);
  if (found) return found.profile_id;
  const r = await client.post("/profiles/onboarding", { data: { setup_path: "import", display_name: `Synthetic ${code}`, profile_code: code, tracking_start_date: "2026-09-01", enabled_modules: ["sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments", "each-way-extra-places"], accounts: [], quick_actions: [] } });
  if (r.status() !== 201) throw Error(`Factory Profile ${r.status()} ${await r.text()}`);
  const p = await r.json(); const id = p.profile_id ?? p.profile?.profile_id;
  await client.patch(`/profiles/${id}`, { data: { status: "Active" } });
  profiles.push({ ...p, profile_id: id, profile_code: code }); return id;
}
async function account(id, name, type, extra = {}) {
  const existing = (await (await client.get(`/profiles/${id}/accounts`)).json()).find(a => a.account === name);
  if (existing) return existing;
  const r = await client.post(`/profiles/${id}/accounts`, { data: { account: name, type, status: "Active", lifecycle_status: "Active", channel: "Online", current_balance: "0.00", ...(type === "Exchange" ? { commission_rate: "0.02" } : {}), ...extra } });
  if (r.status() !== 201) throw Error(`Factory Account ${name}: ${r.status()} ${await r.text()}`);
  return r.json();
}
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
await context.addCookies([{ name: "pd_session", value: token, domain: "localhost", path: "/" }]);
const page = await context.newPage(); page.setDefaultTimeout(8000); page.setDefaultNavigationTimeout(20000);
const mode = process.argv[2] ?? "money";
async function navigate(path) { await page.goto(web + path, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(1000); }
async function capture(label) { out.rendered.push({ label, ...(await page.evaluate(() => ({ width: innerWidth, pageWidth: document.documentElement.scrollWidth, text: document.body.innerText.slice(-18000), focused: document.activeElement?.getAttribute("aria-label") }))) }); }
try {
  if (mode === "verify") {
    for(const name of ["money","boundaries","lifecycle-clean","conversion","api-followup"]){
      const captured=JSON.parse(fs.readFileSync(`${root}/audit-batch2-${name}.json`,"utf8"));
      for(const key of ["money","lifecycle","conversions"])out[key].push(...captured[key]);
    }
  }
  if (mode === "api-followup") {
    const captured=JSON.parse(fs.readFileSync(`${root}/audit-batch2-conversion.json`,"utf8"));
    const first=captured.conversions.find(x=>x.label==="Blackjack first").body;
    const target=first.results[0], stored=await client.get(`/profiles/${target.profile_id}/casino-offers/${target.record_id}`);
    out.conversions.push({label:"saved Casino reread",status:stored.status(),body:await stored.json()});
    const free=captured.conversions.find(x=>x.label==="native Free Bet destination").body.results.find(x=>x.state==="succeeded");
    const url=`/profiles/${free.profile_id}/free-bets/${free.record_id}`;
    let row=await (await client.get(url)).json();
    const before=row.user_notes;
    const preview=await client.post(`/profiles/${free.profile_id}/free-bets/preview`,{data:{...row,status:"Available",back_odds:"3",lay_odds_1:"3.1",lay_commission_1:"0.02",match_strategy:"Standard",expiry_datetime:"2099-09-12T12:00:00Z"}});
    out.lifecycle.push({label:"converted Free Bet preview",status:preview.status(),body:await preview.json()});
    for(const [label,patch] of [["actual placed",{status:"Placed",lay_actual:"6.00",lay_matched_stake_1:"6.00"}],["settled",{status:"Settled",result:"Back Won",date_settled:"2026-09-12"}]]){
      const r=await client.put(url,{data:{...row,back_odds:"3",lay_odds_1:"3.1",lay_commission_1:"0.02",match_strategy:"Standard",expiry_datetime:"2099-09-12T12:00:00Z",...patch}});row=await r.json();out.lifecycle.push({label:`converted Free Bet ${label}`,status:r.status(),body:row,provenanceRetained:row.user_notes===before});
    }
    const again=await client.put(url,{data:row});out.lifecycle.push({label:"converted Free Bet repeated settlement",status:again.status(),body:await again.json(),rows:db.prepare("SELECT count(*) AS n FROM free_bets WHERE free_bet_id=?").get(free.record_id).n});
  }
  if (mode === "money") {
    for (const [i, value] of ["12.34", "0.00", "", null, "not-money", "NaN", "Infinity", "-Infinity"].entries()) {
      const id = await profile(`AUDIT2-MONEY-${i}`);
      await account(id, "Bank A", "Bank", { catalogue_id: "BANK-DEMO-001", counts_in_cash_total: true, current_balance: "10.00" });
      let a = (await (await client.get(`/profiles/${id}/accounts`)).json()).find(a => a.account === "Lloyds Bank");
      let createStatus = "previous run";
      if (!a) {
        const r = await client.post(`/profiles/${id}/accounts`, { data: { account: "Lloyds Bank", catalogue_id: "BANK-LLOYDS", type: "Bank", status: "Active", lifecycle_status: "Active", channel: "Online", current_balance: value, counts_in_cash_total: true } });
        createStatus = r.status(); if (r.status() === 201) a = await r.json();
      }
      if (!a) a = await account(id, "Lloyds Bank", "Bank", { catalogue_id: "BANK-LLOYDS" });
      const before = db.prepare("SELECT current_balance FROM accounts WHERE account_id=?").get(a.account_id);
      const update = await client.put(`/profiles/${id}/accounts/${a.account_id}`, { data: { ...a, current_balance: value } });
      const persisted = db.prepare("SELECT current_balance FROM accounts WHERE account_id=?").get(a.account_id);
      const read = await client.get(`/profiles/${id}/accounts/${a.account_id}`);
      const summary = await client.get(`/profiles/${id}/tracker-summary-sources`);
      const exp = await client.get(`/profiles/${id}/exports/portable-profile.xlsx`);
      await navigate(`/profiles/${id}/tracker/accounts`); const accountText = await page.locator("main").innerText();
      await navigate(`/profiles/${id}/tracker/dashboard`); const dashboard = await page.locator("main").innerText();
      await navigate(`/profiles/${id}/tracker/reports`); const report = await page.locator("main").innerText();
      out.money.push({ value, id, accountId: a.account_id, createStatus, updateStatus: update.status(), before, persisted, readStatus: read.status(), read: await read.json(), summaryStatus: summary.status(), summaryAccounts: summary.status() === 200 ? (await summary.json()).accounts.map(a => ({ account: a.account, current_balance: a.current_balance })) : await summary.text(), exportStatus: exp.status(), exportError: exp.status() !== 200 ? await exp.text() : null, accountText, dashboard, report });
      console.log(JSON.stringify({ value, createStatus, updateStatus: update.status(), persisted, exportStatus: exp.status() }));
    }
    await navigate("/performance"); await capture("combined summary with invalid constituents");
  }
  if (mode === "money-ui" || mode === "money-ui-direct" || mode === "reflow") {
    if (mode.startsWith("money-ui")) {
      for (let i=0;mode === "money-ui" && i<8;i++) {
        const p=profiles.find(p=>p.profile_code===`AUDIT2-MONEY-${i}`);
        await navigate(`/profiles/${p.profile_id}/tracker/dashboard`);
        try { await page.locator(".dashboard-health-grid").waitFor({state:"visible",timeout:15000}); } catch(e) { out.setup.push({label:`money ${i} settled dashboard`,error:e.message.slice(0,150)}); }
        out.rendered.push({label:`settled money dashboard ${i}`,values:await page.locator(".dashboard-health-grid .financial-value").evaluateAll(es=>es.map(e=>e.getAttribute("aria-label"))),alerts:await page.getByRole("alert").allTextContents()});
      }
      const id=await profile("AUDIT2-UI-MONEY"); const acc=await account(id,"Bank A","Bank",{catalogue_id:"BANK-DEMO-001",current_balance:"10.00"});
      await navigate(`/profiles/${id}/tracker/accounts`); await page.getByRole("button",{name:"Edit Bank A",exact:true}).waitFor({state:"visible",timeout:20000}); await page.getByRole("button",{name:"Edit Bank A",exact:true}).click(); const dialog=page.getByRole("dialog",{name:"Edit account"}); await dialog.waitFor();
      await dialog.getByLabel("Current balance",{exact:true}).fill("NaN"); await dialog.getByLabel("Current balance",{exact:true}).blur();
      const [r]=await Promise.all([page.waitForResponse(r=>r.url().includes(`/accounts/${acc.account_id}`)&&r.request().method()==="PUT"),dialog.getByRole("button",{name:"Save",exact:true}).click()]);
      out.money.push({label:"real UI NaN save",status:r.status(),request:r.request().postDataJSON(),persisted:db.prepare("SELECT current_balance FROM accounts WHERE account_id=?").get(acc.account_id),closed:!(await dialog.isVisible())}); await capture("UI malformed Account balance");
    }
    for (const [width,scale] of [[320,1],[1440,2],[320,2],[760,1]]) {
      await page.setViewportSize({width,height:1000}); await navigate("/calculator"); await page.getByLabel("Back stake",{exact:true}).waitFor({state:"visible",timeout:20000}); await page.evaluate(scale=>document.documentElement.style.fontSize=`${16*scale}px`,scale); await page.waitForTimeout(600);
      out.rendered.push({label:"separate reflow condition",width,scale,...await page.evaluate(()=>({pageWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}))});
    }
  }
  if (mode === "boundaries") {
    const id=await profile("AUDIT2-BOUNDARY"), other=await profile("AUDIT2-BOUNDARY-OTHER");
    await account(other,"BetMGM","Bookie");
    const data={event_name:"Synthetic boundary event",bookmaker:"BetMGM",status:"Placed",result:"Pending",retention_mode:"SNR",free_bet_value:"10",back_odds:"5",match_strategy:"Standard",lay_odds_1:"5.2",lay_actual:"7",lay_matched_stake_1:"7",lay_commission_1:"0.02",exchange_name:"Smarkets",expiry_datetime:"2099-09-12T12:00:00Z"};
    for(const [label,p,patch] of [["foreign-only Account name",id,{}],["missing Profile","AUDIT2-NO-PROFILE",{}],["malformed money",id,{free_bet_value:"not-money"}],["missing stake",id,{free_bet_value:""}]]) {
      const freeId=`AUDIT2-BOUND-${label.replaceAll(" ","-")}`; const before=db.prepare("SELECT count(*) AS n FROM free_bets WHERE free_bet_id=?").get(freeId).n;
      const r=await client.post(`/profiles/${p}/free-bets`,{data:{...data,...patch,free_bet_id:freeId}});out.lifecycle.push({label,status:r.status(),body:await r.text(),before,persisted:db.prepare("SELECT free_bet_id,profile_id,bookmaker,free_bet_value FROM free_bets WHERE free_bet_id=?").all(freeId)});
    }
    await client.patch(`/profiles/${other}`,{data:{status:"Archived"}});
    const r=await client.post(`/profiles/${other}/free-bets`,{data:{...data,free_bet_id:"AUDIT2-ARCHIVED"}});out.lifecycle.push({label:"archived Profile",status:r.status(),body:await r.text(),persisted:db.prepare("SELECT free_bet_id FROM free_bets WHERE free_bet_id='AUDIT2-ARCHIVED'").all()});
    const acc=await account(id,"Bank A","Bank",{catalogue_id:"BANK-DEMO-001",current_balance:"10.00"});
    for(const value of ["not-money","NaN","Infinity","-Infinity"]){ const r=await client.put(`/profiles/${id}/accounts/${acc.account_id}`,{data:{...acc,pending_withdrawal_amount:value}});out.money.push({label:"pending withdrawal malformed",value,status:r.status(),persisted:db.prepare("SELECT pending_withdrawal_amount FROM accounts WHERE account_id=?").get(acc.account_id)}); }
  }
  if (mode.startsWith("lifecycle") || mode === "conversion" || mode === "ui") {
    const clean = mode === "lifecycle-clean";
    const a = await profile(clean ? "AUDIT2-LIFE-C" : "AUDIT2-LIFE-A"), b = await profile("AUDIT2-LIFE-B");
    const book = await account(a, "Bet365", "Bookie"), exchange = await account(a, "Smarkets", "Exchange");
    const bookB = await account(b, "Bet365", "Bookie", { restrictions: ["Bonus Restricted"] });
    await account(b, "Smarkets", "Exchange");
    if (mode.startsWith("lifecycle")) {
      const prefix = clean ? "AUDIT2-C" : "AUDIT2";
      const qualId = `${prefix}-QUAL`;
      const source = await (await client.get("/profiles/profile-notification-acceptance/sportsbook-bets/sportsbook-notification-acceptance")).json();
      let qual = await client.get(`/profiles/${a}/sportsbook-bets/${qualId}`);
      if (qual.status() === 404) qual = await client.post(`/profiles/${a}/sportsbook-bets`, { data: { ...source, sportsbook_bet_id: qualId, event_name: "Synthetic award source", status: "Prospecting", result: "Pending", related_free_bet_id: "", back_stake: "10", back_odds: "3", lay_actual: "", lay_matched_stake_1: "" } });
      for (const retention of ["SNR", "SR"]) {
        // Independent exact fixture: SNR 40/5.18 ->7.72, liability32.42, branches7.58/7.57;
        // SR 50/5.18 ->9.65, liability40.53, branches9.47/9.46. Explicit actual=7.00:
        // liability29.40, SNR win10.60, SR win20.60, lay-win6.86.
        const data = { free_bet_id: `${prefix}-${retention}`, event_name: `Synthetic ${retention} fixture`, offer_text: "Synthetic awarded credit", bookmaker: "Bet365", offer_type: "Bet & Get", bet_type: "Single", fixture_type: "Football", offer_name: "Synthetic award", status: "Available", result: "Pending", retention_mode: retention, free_bet_value: "10.00", back_odds: "5.00", match_strategy: "Standard", lay_odds_1: "5.20", lay_actual: "", lay_matched_stake_1: "", lay_commission_1: "0.02", exchange_name: "Smarkets", expiry_datetime: "2099-09-12T12:00:00Z", date_settled: "", origin_qual_bet_id: qualId, offer_group_id: `${prefix}-AWARD`, user_notes: "Synthetic native lifecycle" };
        const existed = await client.get(`/profiles/${a}/free-bets/${data.free_bet_id}`);
        const create = existed.status() === 404 ? await client.post(`/profiles/${a}/free-bets`, { data }) : existed;
        const preview = await client.post(`/profiles/${a}/free-bets/preview`, { data });
        const entry = { retention, createStatus: create.status(), previewStatus: preview.status(), preview: await preview.json(), stages: [] };
        await navigate(`/profiles/${a}/tracker/free-bets?record=${data.free_bet_id}`);
        const editor = page.locator('[data-pd-id="free-bets.editor.dialog"]');
        try {
          await editor.waitFor({ state: "visible" });
          entry.focusedInside = await editor.evaluate(el => el.contains(document.activeElement));
          await editor.locator('[data-pd-id="ledger-editor.tab.matching"]').click();
          const copy = editor.getByRole("button", { name: /^Copy .*free-bet lay stake/ }).first();
          entry.copyName = await copy.getAttribute("aria-label"); await copy.click();
          entry.copied = await page.evaluate(() => navigator.clipboard.readText()); await page.waitForTimeout(800);
          entry.afterCopy = await (await client.get(`/profiles/${a}/free-bets/${data.free_bet_id}`)).json();
          await editor.getByRole("button", { name: "Save", exact: true }).click(); await page.waitForTimeout(1000);
          entry.afterSave = await (await client.get(`/profiles/${a}/free-bets/${data.free_bet_id}`)).json();
          entry.saveClosed = !(await editor.isVisible());
          await capture(`${retention} populated matching/copy`);
        } catch (e) { entry.browserBlocker = e.message.slice(0,400); await capture(`${retention} blocked matching`); }
        for (const [label, patch] of [["placed actual 7", { status: "Placed", lay_actual: "7.00", lay_matched_stake_1: "7.00" }], ["settled back win", { status: "Settled", result: "Back Won", lay_actual: "7.00", lay_matched_stake_1: "7.00", date_settled: "2026-09-12T12:00:00Z" }]]) {
          const r = await client.put(`/profiles/${a}/free-bets/${data.free_bet_id}`, { data: { ...data, ...patch } });
          entry.stages.push({ label, status: r.status(), row: await r.json() });
        }
        const repeat = await client.put(`/profiles/${a}/free-bets/${data.free_bet_id}`, { data: { ...data, status: "Settled", result: "Back Won", lay_actual: "7.00", lay_matched_stake_1: "7.00", date_settled: "2026-09-12T12:00:00Z" } });
        entry.repeatStatus = repeat.status(); entry.rowsWithId = db.prepare("SELECT count(*) AS n FROM free_bets WHERE free_bet_id=?").get(data.free_bet_id).n;
        entry.audit = db.prepare("SELECT action FROM free_bet_audit WHERE free_bet_id=?").all(data.free_bet_id);
        entry.crossReadStatus = (await client.get(`/profiles/${b}/free-bets/${data.free_bet_id}`)).status();
        entry.missingFieldStatus = (await client.post(`/profiles/${a}/free-bets`, { data: { ...data, free_bet_id: `AUDIT2-INVALID-${retention}`, status: "Placed", event_name: "", match_strategy: "" } })).status();
        if (!clean) entry.malformedPlacedStatus = (await client.post(`/profiles/${a}/free-bets`, { data: { ...data, free_bet_id: `AUDIT2-BAD-${retention}`, status: "Placed", free_bet_value: "NaN" } })).status();
        else entry.malformedProbe = "Retained on AUDIT2-LIFE-A; clean Profile is independent, not repaired";
        await navigate(`/profiles/${a}/tracker/free-bets?record=${data.free_bet_id}`); await capture(`${retention} reopen settlement`);
        out.lifecycle.push(entry); console.log(JSON.stringify({ retention, create: entry.createStatus, preview: entry.preview, copy: entry.copied, blocker: entry.browserBlocker, stages: entry.stages.map(s => ({ label: s.label, status: s.status, final: s.row.final_net_pnl })) }));
      }
      await navigate(`/profiles/${a}/tracker/reports`); await capture("settled SNR/SR Profile report");
      const summary = await client.get(`/profiles/${a}/tracker-summary-sources`);
      const removal = await client.delete(`/profiles/${a}/sportsbook-bets/${qualId}`);
      out.lifecycle.push({ notices: await (await client.get("/fund-manager/notifications")).json(), sourcesStatus: summary.status(), sources: summary.status() === 200 ? await summary.json() : await summary.text(), sourceRemoval: { status: removal.status(), detail: removal.status() !== 204 ? await removal.text() : null, linkedRemaining: db.prepare("SELECT free_bet_id,origin_qual_bet_id FROM free_bets WHERE origin_qual_bet_id=?").all(qualId) } });
    }
    if (mode === "ui") {
      for (const [width, theme] of [[1440,"light"], [760,"dark"]]) {
        await page.setViewportSize({ width, height: 1000 }); await navigate("/calculator");
        await page.evaluate(t => { localStorage.setItem("openforge-theme", t); document.documentElement.dataset.theme = t; document.documentElement.style.colorScheme = t; }, theme);
        await page.getByLabel(/^Exchange commission/).fill("0.02");
        await page.getByLabel("Back stake", { exact: true }).fill("10"); await page.getByLabel("Back odds", { exact: true }).fill("3"); await page.getByLabel("Lay odds", { exact: true }).fill("3.1");
        const action = page.getByRole("button", { name: "Convert to opportunity", exact: true }); await action.waitFor(); await action.click();
        const dialog = page.locator('[data-pd-id="calculator-conversion.dialog"]'); await dialog.waitFor();
        await dialog.getByLabel("Event / fixture").fill(`Synthetic browser conversion ${width}`); await dialog.getByLabel(/^Offer type/i).selectOption("Bet & Get"); await dialog.getByLabel(/^Fixture type/i).selectOption("Football");
        await dialog.getByRole("checkbox", { name: /Synthetic AUDIT2-LIFE-A/ }).check(); await dialog.getByLabel("Bookmaker Account").selectOption(book.account_id);
        const entry = { width, theme, focusedInside: await dialog.evaluate(el => el.contains(document.activeElement)), geometry: await dialog.evaluate(el => { let r=el.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,pageWidth:document.documentElement.scrollWidth}; }) };
        console.log(JSON.stringify({label:"conversion UI ready",width, controls:await dialog.locator("label").allTextContents(),selects:await dialog.locator("select").evaluateAll(els=>els.map(e=>({value:e.value,disabled:e.disabled}))),buttonEnabled:await dialog.getByRole("button",{name:"Convert to opportunity",exact:true}).isEnabled()}));
        let r;
        try { [r] = await Promise.all([page.waitForResponse(r => r.url().includes("calculator-conversions/standard") && r.request().method() === "POST", {timeout:12000}), dialog.getByRole("button", { name: "Convert to opportunity", exact: true }).click()]); }
        catch(e) { entry.pointerFailure=e.message.slice(0,1800); entry.afterGeometry=await dialog.evaluate(el=>{let r=el.getBoundingClientRect();let b=el.querySelector(".modal-primary-button").getBoundingClientRect(); return {dialog:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},button:{x:b.x,y:b.y,width:b.width,height:b.height},hit:document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.className};}); out.conversions.push(entry); await capture(`conversion pointer failure ${width}`); await dialog.getByRole("button",{name:"Convert to opportunity",exact:true}).focus(); [r]=await Promise.all([page.waitForResponse(r=>r.url().includes("calculator-conversions/standard")&&r.request().method()==="POST",{timeout:12000}),page.keyboard.press("Enter")]); entry.keyboardRecovery=true; }
        entry.status = r.status(); entry.request = r.request().postDataJSON(); entry.body = await r.json();
        await page.waitForTimeout(900); entry.closed = !(await dialog.isVisible()); entry.focusReturned = await action.evaluate(el => el === document.activeElement); entry.receipt = await page.locator('[data-pd-id="calculators.matched-betting.conversion-receipt"]').allTextContents(); entry.links = await page.getByRole("link", { name: "Open row" }).evaluateAll(els => els.map(e=>e.getAttribute("href"))); entry.inputs = { stake:await page.getByLabel("Back stake", {exact:true}).inputValue(),odds:await page.getByLabel("Back odds", {exact:true}).inputValue() };
        // Replay after a confirmed commit; this does NOT inject a timeout/lost response.
        const retry = await client.post("/fund-manager/calculator-conversions/standard", { data: entry.request }); entry.retry = await retry.json();
        out.conversions.push(entry); await capture(`lean populated conversion ${width}/${theme}`);
      }
      for (const [width, scale] of [[320,1],[1440,2],[320,2],[760,1]]) {
        await page.setViewportSize({width,height:1000}); await navigate("/calculator"); await page.evaluate(scale=>document.documentElement.style.fontSize=`${16*scale}px`,scale); await page.waitForTimeout(300); out.rendered.push({label:"separate reflow condition",width,scale,...await page.evaluate(()=>({pageWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}))});
      }
    }
    if (mode === "conversion") {
      const calculator = { bet_type: "qualifying", free_bet_mode: "SNR", promotion_mode: "standard", strategy: "Standard", back_stake: "10", back_odds: "3", lay_odds: "3.1", exchange_commission: "0.02", manual_lay_stake: "", promotion_value: "", bonus_trigger: "Lay Wins", retention_percent: "70", underlay_factor: "0.928", overlay_factor: "1.300" };
      const payload = (c = calculator, intent = "AUDIT2-CONVERT-1") => ({ source: { calculator_family: "matched-betting", calculator_version: "matched-betting-v1", calculator_mode: c.bet_type, canonical_inputs: { ...c, exchange: "Smarkets" }, created_at: "2026-09-12T12:00:00Z" }, calculator: c, targets: [{ profile_id: a, account_id: book.account_id }, { profile_id: b, account_id: bookB.account_id }], event_name: "Synthetic audit conversion", offer_type: "Bet & Get", bet_type: "Single", fixture_type: "Football", conversion_intent_id: intent });
      for (const [label, data] of [["partial", payload()], ["same-operation retry", payload()], ["deliberate new intent", payload(calculator, "AUDIT2-CONVERT-2")], ["native Free Bet destination", payload({ ...calculator, bet_type: "free_bet" }, "AUDIT2-FREE-1")], ["cross-Profile Account", { ...payload(calculator, "AUDIT2-CROSS"), targets: [{ profile_id: b, account_id: book.account_id }] }], ["unsupported Bonus SR", payload({ ...calculator, bet_type: "bonus_lock_in", bonus_backing_bet: "SR", promotion_value: "10" }, "AUDIT2-BLOCKED")]]) {
        const r = await client.post("/fund-manager/calculator-conversions/standard", { data }); out.conversions.push({ label, status: r.status(), body: await r.json() });
      }
      const unsigned = { activity_source: "own_cash", calculator_family: "blackjack_strategy", calculator_version: "blackjack-session-v1", conversion_eligible: true, ended_at: "2026-09-12T12:30:00Z", hands: [{ dealer_card: "6", hand_number: 1, hands: [{ actual_actions: ["Stand"], actual_return: "20.00", cards: ["10", "K"], classification: "hard", committed_stake: "10.00", label: "Player", outcome: "Win", recommendation_sequence: ["Stand"], starting_stake: "10.00", total: 20 }] }], monetary: { ending_balance: "110.00", free_credit_value: null, recorded_hand_net: "10.00", session_result: "10.00", starting_balance: "100.00", withdrawable_result: null }, rules: { dealer_hits_soft_17: false, surrender_allowed: false }, session_mode: "live_play", started_at: "2026-09-12T12:00:00Z", table_type: "digital_rng", total_hands: 1 };
      function sorted(v) { return Array.isArray(v) ? v.map(sorted) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sorted(v[k])])) : v; }
      const hash = crypto.createHash("sha256").update(JSON.stringify(sorted(unsigned))).digest("hex");
      const snapshot = { ...unsigned, source_checksum: hash, source_id: `blackjack-session-${hash.slice(0,20)}` };
      for (const [label, id, acc] of [["Blackjack first", a, book], ["Blackjack retry", a, book], ["Blackjack same snapshot other Profile", b, bookB], ["Blackjack tampered mode/checksum", a, book]]) {
        const r = await client.post("/fund-manager/calculator-conversions/blackjack", { data: { snapshot: label.includes("tampered") ? { ...snapshot, session_mode: "simulation" } : snapshot, profile_id: id, casino_account: acc.account, casino_account_id: acc.account_id, activity_name: "Synthetic audited Blackjack session" } }); out.conversions.push({ label, status: r.status(), body: await r.json() });
      }
      out.conversions.push({ notices: await (await client.get("/fund-manager/notifications")).json(), attempts: db.prepare("SELECT source_id,source_checksum,target_profile_id,target_account,state,destination_record_id FROM calculator_conversion_targets").all() });
      console.log(JSON.stringify(out.conversions, null, 2));
    }
  }
} catch (e) { out.setup.push({ mode, error: e.message, stack: e.stack?.slice(0,600), controls: await page.locator("label").allTextContents() }); await capture(`${mode} interruption`); console.log(JSON.stringify(out.setup)); }
finally {
  // Fixed independent expectations, never generated by application calculation functions.
  out.checks=[];
  const check=(label,actual,expected)=>out.checks.push({label,actual,expected,result:JSON.stringify(actual)===JSON.stringify(expected)?"PASS":"FAIL"});
  for(const x of out.money) if("value"in x){const valid=["12.34","0.00",""].includes(x.value); if(x.updateStatus)check(`Account update ${x.value}`,x.updateStatus,valid?200:422);if(x.label?.includes("pending"))check(`pending withdrawal rejects ${x.value}`,x.status,422);}
  for(const x of out.lifecycle) if(x.retention){const snr=x.retention==="SNR";check(`${x.retention} reference`,x.preview.base_reference_lay_stake,snr?"7.72":"9.65");check(`${x.retention} liability`,x.preview.calculated_liability_1,snr?"32.42":"40.53");check(`${x.retention} copy`,x.copied,snr?"7.72":"9.65");check(`${x.retention} actual settlement`,x.stages.at(-1).row.final_net_pnl,snr?"10.60":"20.60");check(`${x.retention} no duplicate row`,x.rowsWithId,1);}
  for(const x of out.conversions){if(x.label==="Blackjack same snapshot other Profile")check("completed session cannot clone across Profiles",x.status,409);if(x.label==="cross-Profile Account")check("foreign Account denied",x.status,422);if(x.label==="unsupported Bonus SR")check("unsupported source denied",x.status,422);}
  for(const x of out.lifecycle){if(x.label==="converted Free Bet preview")check("converted SNR reference",x.body.base_reference_lay_stake,"6.49");if(x.label==="converted Free Bet settled") {check("converted SNR explicit actual settlement",x.body.final_net_pnl,"7.40");check("converted provenance retained",x.provenanceRetained,true);}if(x.label==="converted Free Bet repeated settlement")check("converted settlement no duplicate",x.rows,1);}
  fs.writeFileSync(`${root}/audit-batch2-${mode}.json`, JSON.stringify(out, null, 2)); console.log(JSON.stringify({mode,checks:out.checks,setup:out.setup},null,2)); await browser.close(); await client.dispose(); db.close();
}
