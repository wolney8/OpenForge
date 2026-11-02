import { chromium, expect, test } from "@playwright/test";
import { mkdir, rm, writeFile, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
const evidence=process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
async function capture(page:import("@playwright/test").Page,name:string){if(!evidence)return;await mkdir(evidence,{recursive:true});await page.screenshot({path:join(evidence,name),fullPage:true,style:"nextjs-portal { display: none !important; }"});}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async route => {
    if (route.request().url().endsWith("/api/auth/session")) return route.fulfill({ json: { authenticated: true, email: "demo@example.invalid", expires_at: 4102444800, role: "fund_manager", session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true } } });
    if (route.request().url().endsWith("/api/auth/activity")) return route.fulfill({ json: { ok: true } });
    throw new Error(`Unexpected lab API request: ${route.request().url()}`);
  });
  await page.goto("/design-lab");
  await expect(page.locator('[data-pd-id="design-lab-connected.root"]')).toBeVisible();
});

test("reviewed Free Bet award, SNR/SR, explicit placement, settlement and report stay linked",async({page})=>{
  await page.locator('[data-pd-id="lab.range"]').click();
  await page.getByRole("option",{name:"This Year"}).click();
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await page.locator('[data-pd-id="lab.cp116.open-source"]').click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("LAB-SB-AWARD-002");
  await page.getByRole("button",{name:"Review Free Bet Award"}).click();
  const workbench=page.locator('[data-pd-id="lab.cp116.free-bet-workbench"]');
  await expect(workbench).toContainText("LAB-SB-AWARD-002");
  await expect(page.locator('[data-pd-id="lab.breadcrumb"] [aria-current="page"]')).toHaveText("Add Free Bets");
  await capture(page,"cp116-free-bet-award-review-1440.png");
  await workbench.getByRole("button",{name:"Save Prospecting"}).click();
  await workbench.getByLabel("I verified this award externally").check();
  await workbench.getByRole("button",{name:"Confirm Reviewed Award"}).click();
  await expect(workbench).toContainText("Issued 1 Profile A Free Bet");
  await workbench.getByRole("button",{name:"Planning"}).click();
  await expect(workbench).toContainText("£ 4.05");
  await page.locator('[data-pd-id="lab.cp116.retention"]').click();
  await page.getByRole("option",{name:/SR · Stake Returned/}).click();
  await expect(workbench).toContainText("£ 4.85");
  await page.locator('[data-pd-id="lab.cp116.retention"]').click();
  await page.getByRole("option",{name:/SNR · Stake Not Returned/}).click();
  await workbench.getByRole("button",{name:"Placement"}).click();
  await workbench.getByLabel("Back bet confirmed externally").check();
  await workbench.getByLabel("Lay bet confirmed externally").check();
  await workbench.getByRole("button",{name:"Record Placement"}).click();
  await expect(workbench).toContainText("Placed");
  await workbench.getByRole("button",{name:"Settlement"}).click();
  await workbench.getByLabel("I confirm this actual Free Bet result").check();
  await workbench.getByRole("button",{name:"Confirm Settlement"}).click();
  await expect(workbench).toContainText("Confirmed fixture settlement");
  await workbench.getByRole("button",{name:"View Source-Linked Report"}).click();
  await expect(page.locator('[data-pd-id="lab.reports"]')).toContainText("LAB-FB-CP116-1");
  await expect(page.locator('[data-pd-id="lab.reports"]')).toContainText("£ 3.94");
  await capture(page,"cp116-free-bet-report-1440.png");
  await page.locator('[data-pd-id="lab.reports"]').getByRole("button",{name:/LAB-FB-CP116-1/}).click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("Settled");
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).not.toContainText("this sample remains Available");
});

test("Casino capabilities, strict confirmation and source-linked result use one fixture",async({page})=>{
  await page.locator('[data-pd-id="lab.range"]').click();
  await page.getByRole("option",{name:"This Year"}).click();
  await page.locator('[data-pd-id="lab.nav.casino"]').click();
  await page.locator('[data-pd-id="lab.concept-add.casino"]').click();
  const workbench=page.locator('[data-pd-id="lab.cp116.casino-workbench"]');
  await expect(workbench).toContainText("Setup");
  await expect(workbench.getByRole("button",{name:"Wagering"})).toHaveCount(0);
  await page.locator('[data-pd-id="lab.cp116.casino-type"]').click();
  await page.getByRole("option",{name:"Wager To Earn Reward"}).click();
  await expect(workbench.getByRole("button",{name:"Wagering"})).toBeVisible();
  await workbench.getByRole("button",{name:"Start Offer"}).click();
  await workbench.getByRole("button",{name:"Wagering"}).click();
  await page.locator('[data-pd-id="lab.cp116.casino-own-cash"]').fill("5.00");
  await workbench.getByRole("button",{name:"Reward"}).click();
  await workbench.getByRole("button",{name:"Settlement"}).click();
  await page.locator('[data-pd-id="lab.cp116.casino-cash-returned"]').fill("4.90");
  await expect(workbench).toContainText("Suggested Net Result: £ (0.10)");
  await capture(page,"cp116-casino-settlement-1440.png");
  await page.locator('[data-pd-id="lab.cp116.casino-confirmed"]').fill("-0.10");
  await page.locator('[data-pd-id="lab.cp116.casino-completed"]').fill("2026-07-26");
  await workbench.getByLabel("I confirm this actual Net Result").check();
  await workbench.getByRole("button",{name:"Confirm Casino Settlement"}).click();
  await expect(workbench).toContainText("Confirmed fixture result recorded");
  await workbench.getByRole("button",{name:"View Source-Linked Report"}).click();
  await expect(page.locator('[data-pd-id="lab.reports"]')).toContainText("LAB-CO-CP116");
});

test("Casino draft inputs reopen and connected workbenches remain contained across widths and themes",async({page})=>{
  await page.locator('[data-pd-id="lab.nav.casino"]').click();
  await page.locator('[data-pd-id="lab.concept-add.casino"]').click();
  let workbench=page.locator('[data-pd-id="lab.cp116.casino-workbench"]');
  await page.locator('[data-pd-id="lab.cp116.casino-type"]').click();
  await page.getByRole("option",{name:"Wager To Earn Reward"}).click();
  await workbench.getByRole("button",{name:"Wagering"}).click();
  await workbench.getByLabel("Bonus Credit").fill("10.00");
  await workbench.getByRole("button",{name:"Return to Ledger"}).click();
  await workbench.getByRole("button",{name:"Leave With Draft Saved"}).click();
  await page.locator('tr[data-lab-row-id="LAB-CO-CP116"]').getByRole("button",{name:/Open/}).click();
  await page.getByRole("button",{name:"Open Casino Workbench"}).click();
  workbench=page.locator('[data-pd-id="lab.cp116.casino-workbench"]');
  await workbench.getByRole("button",{name:"Wagering"}).click();
  await expect(workbench.getByLabel("Bonus Credit")).toHaveValue("10.00");
  for(const width of [1440,900,768,430,390]){
    await page.setViewportSize({width,height:900});
    for(const theme of ["light","dark"]){
      await page.evaluate(value=>document.documentElement.setAttribute("data-theme",value),theme);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),`${width}/${theme}`).toBeLessThanOrEqual(1);
      if(width===430)await capture(page,`cp116-casino-workbench-${width}-${theme}.png`);
    }
  }
});

test("actual Chromium 200% zoom contains the connected Casino workbench",async()=>{
  const baseURL=process.env.OPENFORGE_E2E_BASE_URL??"http://127.0.0.1:3010";
  const scratch=await mkdtemp(join(tmpdir(),"pd-cp116-zoom-"));
  const extension=join(scratch,"extension");await mkdir(extension);
  await writeFile(join(extension,"manifest.json"),JSON.stringify({manifest_version:3,name:"Temporary CP-116 zoom check",version:"1.0",permissions:["tabs"],background:{service_worker:"background.js"}}));
  await writeFile(join(extension,"background.js"),"chrome.runtime.onInstalled.addListener(() => {});");
  const context=await chromium.launchPersistentContext(join(scratch,"profile"),{channel:"chromium",headless:true,viewport:{width:1440,height:900},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
  try{
    const page=await context.newPage();
    await page.route("**/api/**",async route=>{
      if(route.request().url().endsWith("/api/auth/session"))return route.fulfill({json:{authenticated:true,email:"demo@example.invalid",expires_at:4102444800,role:"fund_manager",session_policy:{absolute_expires_at:4102444800,auto_logout_enabled:false,effective_expires_at:4102444800,inactivity_expires_at:null,last_activity_at:1,preference_configured:true,timeout_minutes:30,valid_now:true}}});
      if(route.request().url().endsWith("/api/auth/activity"))return route.fulfill({json:{ok:true}});
      throw new Error(`Unexpected lab API request: ${route.request().url()}`);
    });
    await page.goto(`${baseURL}/design-lab`);
    await page.locator('[data-pd-id="lab.nav.casino"]').click();
    await page.locator('[data-pd-id="lab.concept-add.casino"]').click();
    const worker=context.serviceWorkers()[0]??await context.waitForEvent("serviceworker");
    await worker.evaluate(async url=>{const tabs=(globalThis as unknown as {chrome:{tabs:{query:(filter:{url:string})=>Promise<Array<{id:number}>>;setZoom:(id:number,zoom:number)=>Promise<void>}}}).chrome.tabs;const matches=await tabs.query({url:`${url}/*`});await tabs.setZoom(matches[0].id,2);},baseURL);
    await expect.poll(()=>page.evaluate(()=>innerWidth)).toBe(720);
    await expect(page.locator('[data-pd-id="lab.cp116.casino-workbench"]')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(()=>getComputedStyle(document.documentElement).zoom)).toBe("1");
    await capture(page,"cp116-casino-workbench-actual-zoom-200.png");
  }finally{await context.close();await rm(scratch,{recursive:true,force:true});}
});

test("split award is source-specific, retry is idempotent, and unsupported settlement stays unavailable",async({page})=>{
  await page.locator('[data-pd-id="lab.profile"]').click();
  await page.getByRole("option",{name:"Profile B"}).click();
  await page.locator('[data-pd-id="lab.nav.freeBets"]').click();
  await expect(page.locator('tr[data-lab-row-id^="LAB-FB-CP116"]')).toHaveCount(0);
  await page.locator('[data-pd-id="lab.profile"]').click();
  await page.getByRole("option",{name:"Profile A"}).click();
  await page.locator('[data-pd-id="lab.concept-add.freeBets"]').click();
  const workbench=page.locator('[data-pd-id="lab.cp116.free-bet-workbench"]');
  await workbench.getByRole("button",{name:"Add Split"}).click();
  await expect(workbench).toContainText("LAB-SB-AWARD-003");
  await workbench.getByRole("button",{name:"Save Prospecting"}).click();
  await workbench.getByLabel("I verified this award externally").check();
  await workbench.getByRole("button",{name:"Simulate Next Save Failure"}).click();
  await workbench.getByRole("button",{name:"Confirm Reviewed Award"}).click();
  await expect(workbench.getByRole("alert")).toContainText("Save Failed");
  await workbench.getByRole("button",{name:"Confirm Reviewed Award"}).click();
  await expect(workbench).toContainText("Issued 2 Profile A Free Bets");
  await expect(workbench).toContainText("actual split total £ 5.00");
  await expect(page.locator('[data-pd-id="lab.cp116.award.split.0"]')).toBeDisabled();
  await expect(workbench.getByRole("button",{name:"Add Split"})).toBeDisabled();
  await expect(workbench.getByRole("button",{name:"Remove Last Split"})).toBeDisabled();
  await capture(page,"cp116-issued-award-locked-1440.png");
  await workbench.getByRole("button",{name:"Planning"}).click();
  await expect(workbench).toContainText("no fixture for this split");
  await workbench.getByRole("button",{name:"Placement"}).click();
  await workbench.getByLabel("Back bet confirmed externally").check();
  await workbench.getByLabel("Lay bet confirmed externally").check();
  await workbench.getByRole("button",{name:"Record Placement"}).click();
  await expect(workbench.getByRole("alert")).toContainText("no validated placement fixture");
});

test("Casino wagering base follows existing cash and bonus authority",async({page})=>{
  await page.locator('[data-pd-id="lab.nav.casino"]').click();
  await page.locator('[data-pd-id="lab.concept-add.casino"]').click();
  const workbench=page.locator('[data-pd-id="lab.cp116.casino-workbench"]');
  await page.locator('[data-pd-id="lab.cp116.casino-type"]').click();
  await page.getByRole("option",{name:"Wager To Earn Reward"}).click();
  await workbench.getByRole("button",{name:"Wagering"}).click();
  await page.locator('[data-pd-id="lab.cp116.casino-cash-stake"]').fill("10.00");
  await workbench.getByLabel("Wager Multiplier").fill("2");
  await expect(workbench.locator("dd").getByText("Cash Stake",{exact:true})).toBeVisible();
  await expect(workbench.getByText("£ 20.00",{exact:true})).toBeVisible();
  await workbench.getByRole("button",{name:"Setup"}).click();
  await page.locator('[data-pd-id="lab.cp116.casino-type"]').click();
  await page.getByRole("option",{name:"Deposit And Bonus Wagering"}).click();
  await workbench.getByRole("button",{name:"Wagering"}).click();
  await page.locator('[data-pd-id="lab.cp116.casino-cash-stake"]').fill("5.00");
  await workbench.getByLabel("Bonus Credit").fill("10.00");
  await expect(workbench.locator("dd").getByText("Deposit + Bonus",{exact:true})).toBeVisible();
  await expect(workbench.getByText("£ 30.00",{exact:true})).toBeVisible();
  await expect(workbench.getByLabel("Own Cash Committed")).toBeEmpty();
  await capture(page,"cp116-deposit-bonus-wagering-1440.png");
});
