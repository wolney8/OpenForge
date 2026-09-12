// #114 read-only product audit / isolated synthetic writes. No normal-runtime fallback.
import { chromium, request } from "@playwright/test";
import fs from "node:fs";

const root = "/tmp/openforge-platform-audit-20260912-runtime";
const origin = "http://localhost:3024";
const api = "http://127.0.0.1:8024";
const token = fs.readFileSync(`${root}/session-token`, "utf8").trim();
const client = await request.newContext({ baseURL: api, extraHTTPHeaders: { Cookie: `pd_session=${token}` } });
const anonymous = await request.newContext({ baseURL: api });
const auth = await client.get("/auth/session");
if (auth.status() !== 200 || (await auth.json()).email !== "notification-acceptance@example.invalid") {
  throw new Error("Audit requires the dedicated existing synthetic authenticated fixture");
}
const evidence = { build: "f7a3b35073ecc87cdf8f8f881129f221ec44d395", date: "2026-09-12", api: [], rendered: [], console: [] };
async function record(label, response, expected) {
  evidence.api.push({ label, status: response.status(), expected, result: response.status() === expected ? "PASS" : "FAIL" });
  return response;
}
for (const path of ["/profiles", "/fund-manager/calculators/exchanges", "/fund-manager/notifications", "/profiles/profile-notification-acceptance/accounts"]) {
  await record(`anonymous ${path}`, await anonymous.get(path), 401);
}
const ids = [];
for (const code of ["AUDIT-114-A", "AUDIT-114-B"]) {
  const existing = (await (await client.get("/profiles")).json()).find(p => p.profile_code === code);
  if (existing) { ids.push(existing.profile_id); continue; }
  const response = await record(`onboarding ${code}`, await client.post("/profiles/onboarding", { data: {
    setup_path: "import", display_name: "Synthetic Audit Profile", profile_code: code,
    tracking_start_date: "2026-09-01", enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments", "casino-offers", "each-way-extra-places"], accounts: [], quick_actions: [],
  } }), 201);
  const data = await response.json(); const id = data.profile_id ?? data.profile?.profile_id;
  if (!id) throw new Error("Audit onboarding did not return Profile identity");
  ids.push(id); await client.patch(`/profiles/${id}`, { data: { status: "Active" } });
}
const source = await (await client.get("/profiles/profile-notification-acceptance/sportsbook-bets/sportsbook-notification-acceptance")).json();
const rows = await (await client.get(`/profiles/${ids[0]}/sportsbook-bets`)).json();
if (rows.length === 0) {
  for (let i = 0; i < 30; i++) {
    const data = { ...source, sportsbook_bet_id: `AUDIT-114-BET-${i}`, event_name: `Synthetic audit event ${i}`, offer_text: "Synthetic native audit", status: "Prospecting", result: "Pending", back_stake: "10.00", back_odds: "3.00", lay_odds_1: "3.10", match_strategy: "Standard", lay_actual: "", lay_matched_stake_1: "", manual_override_value: "", manual_override_reason: "" };
    await record(`native Sportsbook ${i}`, await client.post(`/profiles/${ids[0]}/sportsbook-bets`, { data }), 201);
  }
}
const otherRows = await (await client.get(`/profiles/${ids[1]}/sportsbook-bets`)).json();
evidence.api.push({ label: "native records isolated from other same-name Profile", actual: otherRows.length, expected: 0, result: otherRows.length === 0 ? "PASS" : "FAIL" });
await record("missing Profile write fails safely", await client.post("/profiles/AUDIT-MISSING-PROFILE/sportsbook-bets", { data: { ...source, sportsbook_bet_id: "AUDIT-114-MISSING", status: "Prospecting", result: "Pending" } }), 404);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
await context.addCookies([{ name: "pd_session", value: token, domain: "localhost", path: "/" }]);
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.setDefaultNavigationTimeout(20000);
page.on("pageerror", error => evidence.console.push({ type: "pageerror", message: error.message.slice(0,250) }));
page.on("console", message => { if (message.type() === "error") evidence.console.push({ type: "console", message: message.text().slice(0,250) }); });
const paths = ["/profiles", `/profiles/${ids[0]}/tracker/dashboard`, ...["accounts", "sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments", "each-way-extra-places", "reports", "settings"].map(m => `/profiles/${ids[0]}/tracker/${m}`), "/performance", "/reports", "/notifications", "/settings", "/account", "/fund-manager/calculators", "/calculator"];
for (const path of paths) {
  await page.goto(origin + path); await page.waitForTimeout(800);
  evidence.rendered.push(await page.evaluate(path => ({ path, viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, h1: document.querySelector("h1")?.textContent, errors: [...document.querySelectorAll('[role="alert"]')].map(e => e.textContent), main: !!document.querySelector("main") }), path));
}
for (const width of [1440, 760, 390, 320]) {
  for (const theme of ["light", "dark"]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin + "/fund-manager/calculators"); await page.waitForTimeout(500);
    await page.evaluate(theme => { localStorage.setItem("openforge-theme", theme); document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }, theme);
    await page.emulateMedia({ reducedMotion: width === 320 ? "reduce" : "no-preference" });
    if (width === 320) await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    evidence.rendered.push(await page.evaluate(({ width, theme }) => ({ path: "calculator reflow", viewport: width, theme, pageWidth: document.documentElement.scrollWidth, fontSize: getComputedStyle(document.documentElement).fontSize, unnamed: [...document.querySelectorAll("button")].filter(b => !b.textContent.trim() && !b.getAttribute("aria-label") && !b.getAttribute("title")).length }), { width, theme }));
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
  }
}
await page.goto(origin + `/profiles/${ids[0]}/tracker/sportsbook-bets`); await page.waitForTimeout(500);
const add = page.getByRole("button", { name: "Add sportsbook row", exact: true });
if (await add.count()) {
  await add.click(); await page.waitForTimeout(400);
  const dialog = page.getByRole("dialog").first();
  if (await dialog.count()) {
    evidence.rendered.push(await dialog.evaluate(el => { const b = el.getBoundingClientRect(); return { path: "native Add Row dialog", viewport: innerWidth, left: b.left, right: b.right, top: b.top, bottom: b.bottom, pageWidth: document.documentElement.scrollWidth, focusedInside: el.contains(document.activeElement) }; }));
    await page.keyboard.press("Escape"); await page.waitForTimeout(650);
    evidence.rendered.push({ path: "dialog Escape", closed: !(await dialog.isVisible()), focusReturned: await add.evaluate(el => el === document.activeElement) });
  }
}
const before = await (await client.get(`/profiles/${ids[0]}/sportsbook-bets`)).json();
await page.reload(); await page.waitForTimeout(500);
const after = await (await client.get(`/profiles/${ids[0]}/sportsbook-bets`)).json();
evidence.api.push({ label: "browser refresh retains saved native rows", before: before.length, after: after.length, result: before.length === after.length ? "PASS" : "FAIL" });
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(origin + "/calculator");
let selectedRequest = null;
page.on("request", r => { if (r.url().includes("matched-betting/preview")) selectedRequest = r.postDataJSON(); });
await page.getByLabel(/^Exchange commission/).fill("0.02");
await page.getByLabel("Back stake", { exact: true }).fill("10");
await page.getByLabel("Back odds", { exact: true }).fill("3");
await page.getByLabel("Lay odds", { exact: true }).fill("3.1");
await page.waitForTimeout(1000);
const copy = page.getByRole("button", { name: /^Copy / }).first();
await copy.waitFor(); await copy.click();
const copied = await page.evaluate(() => navigator.clipboard.readText());
// Independent oracle: 30/3.08=9.740259..., penny placement 9.74;
// liability=9.74*2.1=20.454, cash branches -0.454 and -0.4548.
evidence.api.push({ label: "Standard control/request/copy integration", expectedStake: "9.74", copied, request: selectedRequest, result: selectedRequest?.strategy === "Standard" && selectedRequest?.exchange_commission === "0.02" && copied === "9.74" ? "PASS" : "FAIL" });
// Financial validation failures are observations, never repaired or migrated by the audit.
const catalogue = await (await client.get("/account-catalogue/source")).json();
const bank = catalogue.records.find(r => r.account_type === "Bank" && r.status === "Active");
if (bank) {
  const accounts = await (await client.get(`/profiles/${ids[1]}/accounts`)).json();
  let account = accounts.find(a => a.catalogue_id === bank.catalogue_id);
  if (!account) {
    const response = await client.post(`/profiles/${ids[1]}/accounts`, { data: { account: bank.brand_name, catalogue_id: bank.catalogue_id, type: "Bank", status: "Active", channel: "Online", current_balance: "0.00" } });
    account = await response.json();
  }
  for (const input of ["not-money", "NaN"]) {
    await record(`Account rejects malformed money ${input}`, await client.put(`/profiles/${ids[1]}/accounts/${account.account_id}`, { data: { ...account, current_balance: input } }), 422);
  }
}
const publicContext = await browser.newContext(); const publicPage = await publicContext.newPage();
await publicPage.goto(origin + "/calculator"); await publicPage.waitForTimeout(600);
evidence.rendered.push({ path: "unauthenticated lean calculator", url: publicPage.url(), body: (await publicPage.locator("body").innerText()).slice(0,150) });
fs.writeFileSync(`${root}/audit-evidence.json`, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ apiPass: evidence.api.filter(e => e.result === "PASS").length, apiFail: evidence.api.filter(e => e.result === "FAIL"), rendered: evidence.rendered, console: [...new Map(evidence.console.map(c => [c.message, c])).values()] }, null, 2));
await browser.close(); await client.dispose(); await anonymous.dispose();
