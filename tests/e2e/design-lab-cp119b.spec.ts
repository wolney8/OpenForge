import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
async function capture(page: import("@playwright/test").Page, name: string) {
  if (!evidence) return;
  await mkdir(evidence,{recursive:true});
  await page.screenshot({path:join(evidence,name),fullPage:false,style:"nextjs-portal { display: none !important; }"});
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async route => {
    if (route.request().url().endsWith("/api/auth/session")) {
      await route.fulfill({ json: { authenticated:true,email:"demo@example.invalid",expires_at:4102444800,name:"Synthetic Fund Manager",role:"fund_manager",session_policy:{absolute_expires_at:4102444800,auto_logout_enabled:false,effective_expires_at:4102444800,inactivity_expires_at:null,last_activity_at:1,preference_configured:true,timeout_minutes:30,valid_now:true} } });
      return;
    }
    if (route.request().url().endsWith("/api/auth/activity")) { await route.fulfill({json:{ok:true}}); return; }
    throw new Error(`Unexpected lab API request: ${route.request().url()}`);
  });
  await page.goto("/design-lab");
  await expect(page.locator('[data-pd-id="design-lab-connected.root"]')).toBeVisible();
});

test("settled description edits in place, records history, and existing Edit uses populated workbench", async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  const row=page.locator('[data-pd-id="lab.ledger.sportsbook"] tbody tr').filter({hasText:"Demo FC v Sample United"});
  await row.locator("td").nth(3).dblclick();
  await capture(page,"cp119b-inline-settled-dark.png");
  await page.getByRole("textbox",{name:"Event"}).fill("Demo FC v Sample United · revised");
  await page.getByRole("button",{name:"Save cell"}).click();
  await expect(row).toContainText("revised");
  await row.getByRole("button",{name:/Open Demo FC/}).click();
  await expect(page.getByRole("region",{name:"Synthetic Edit History"})).toContainText("Event");
  await page.getByRole("button",{name:"Edit Bet"}).click();
  await expect(page.getByRole("heading",{name:/Edit Sportsbook Bet · LAB-SB-001/})).toBeVisible();
  await expect(page.locator('[data-pd-id="lab.bet.offer-text"]')).toHaveValue("Qualifying bet");
  await capture(page,"cp119b-prefilled-workbench-dark.png");
  await expect(page.locator('[data-pd-id="lab.profile"]')).toContainText("All Profiles");
});

test("historical provider identity and Casino Game prefill without synthetic substitution", async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  const bet=page.locator('[data-pd-id="lab.ledger.sportsbook"] tbody tr[data-lab-row-id="LAB-SB-B"]');
  await bet.getByRole("button",{name:/Open/}).click();
  await page.getByRole("button",{name:"Edit Bet"}).click();
  await expect(page.locator('[data-pd-id="lab.bet.bookmaker"]')).toContainText("Bookmaker B");
  await page.getByRole("button",{name:"Cancel"}).click();
  await page.locator('[data-pd-id="lab.nav.casino"]').click();
  const casino=page.locator('[data-pd-id="lab.ledger.casino"] tbody tr[data-lab-row-id="LAB-CO-001"]');
  await casino.getByRole("button",{name:/Open/}).click();
  await page.getByRole("button",{name:"Edit Record · Preview"}).click();
  await expect(page.getByLabel("Game",{exact:true})).toHaveValue("Demo Game");
});

test("Account descriptive detail and Cash Adjustment date filter use the edited source", async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.accounts"]').click();
  const account=page.locator('[data-pd-id="lab.ledger.accounts"] tbody tr[data-lab-row-id="LAB-ACCOUNT-A"]');
  await account.locator("td").nth(10).dblclick();
  await page.getByRole("textbox",{name:"Group"}).fill("Reviewed Group");
  await page.getByRole("button",{name:"Save cell"}).click();
  await account.getByRole("button",{name:/Open/}).click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("Reviewed Group");
  await page.getByRole("button",{name:"Back to Accounts"}).click();
  await page.locator('[data-pd-id="lab.nav.cash"]').click();
  await page.getByRole("button",{name:"Filters"}).click();
  await page.getByLabel("From Date").fill("2026-10-12");
  await page.getByLabel("To Date").fill("2026-10-12");
  await expect(page.locator('[data-pd-id="lab.ledger.cash"] tbody tr')).toHaveCount(1);
  await expect(page.locator('[data-pd-id="lab.ledger.cash"] tbody tr')).toContainText("LAB-CA-001");
});

test("placed financial cell opens reviewed correction and rejects malformed or unverified financial saves", async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  const row=page.locator('[data-pd-id="lab.ledger.sportsbook"] tbody tr').filter({hasText:"Example City v Sample Town"});
  await row.locator("td").nth(8).dblclick();
  await expect(page.getByRole("heading",{name:/Edit Sportsbook Bet · LAB-SB-002/})).toBeVisible();
  await page.getByLabel("Back Odds").fill("8,5");
  await page.getByRole("button",{name:"Review Correction"}).click();
  await expect(page.getByRole("alert").filter({hasText:"without commas"})).toBeVisible();
  await page.getByLabel("Back Odds").fill("8.5");
  await page.getByRole("button",{name:/Finish \/ Review/}).click();
  await page.getByLabel("Correction reason").fill("Synthetic review");
  await page.getByRole("button",{name:"Review Correction"}).click();
  await expect(page.getByRole("alert").filter({hasText:"no validated correction fixture"})).toBeVisible();
});

test("specialist source fields prefill shared Add/Edit concepts and descriptive changes persist", async ({page}) => {
  const cases=[
    {nav:"freeBets",id:"LAB-FB-001",cell:6,label:"Offer details",value:"Reviewed award note",sourceLabel:"Offer Details"},
    {nav:"casino",id:"LAB-CO-002",cell:4,label:"Offer Name",value:"Revised Spins",sourceLabel:"Offer Name"},
    {nav:"extraPlace",id:"LAB-EP-001",cell:2,label:"Runner / Race",value:"Revised Runner / Sample Race",sourceLabel:"Runner / Race"},
    {nav:"cash",id:"LAB-CA-001",cell:10,label:"Description",value:"Reviewed capital note",sourceLabel:"Reason"},
  ] as const;
  for(const item of cases) {
    await page.locator(`[data-pd-id="lab.nav.${item.nav}"]`).click();
    const row=page.locator(`[data-pd-id="lab.ledger.${item.nav}"] tbody tr[data-lab-row-id="${item.id}"]`);
    await row.locator("td").nth(item.cell).dblclick();
    await page.getByRole("textbox",{name:item.label}).fill(item.value);
    await page.getByRole("button",{name:"Save cell"}).click();
    await expect(row).toContainText(item.value);
    await row.getByRole("button",{name:/Open/}).click();
    await page.getByRole("button",{name:"Edit Record · Preview"}).click();
    await expect(page.getByLabel(item.sourceLabel,{exact:true})).toHaveValue(item.value);
    if(item.nav==="cash") {
      await expect(page.locator('[data-pd-id="lab.concept-field.cash.investment"]')).toBeVisible();
      await expect(page.locator('[data-pd-id="lab.concept-field.cash.cash-snapshot"]')).toBeVisible();
    }
    await page.getByRole("button",{name:"Return to Ledger"}).click();
    await page.getByRole("button",{name:`Back to ${item.nav==="freeBets"?"Free Bets":item.nav==="casino"?"Casino Offers":item.nav==="extraPlace"?"Extra Place":"Cash Adjustments"}`}).click();
  }
});

test("middle-button pan, optional visibility and default restoration preserve filters", async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await page.setViewportSize({width:900,height:820});
  const ledger=page.locator('[data-pd-id="lab.ledger.sportsbook"]');
  const scroller=ledger.locator('[data-pd-id="lab.ledger-pan.sportsbook"]');
  const cell=ledger.locator("tbody tr").first().locator("td").nth(3);
  const box=await cell.boundingBox();expect(box).not.toBeNull();
  await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);
  await page.mouse.down({button:"middle"});
  await page.mouse.move(box!.x-220,box!.y+box!.height/2,{steps:8});
  await page.mouse.up({button:"middle"});
  expect(await scroller.evaluate(node=>node.scrollLeft)).toBeGreaterThan(50);
  await expect(ledger).toBeVisible();
  await page.getByRole("button",{name:"Columns",exact:true}).click();
  await page.getByRole("button",{name:"Hide Offer Details"}).click();
  await expect(ledger.locator('th[data-lab-column="4"]')).toHaveCount(0);
  await page.getByRole("button",{name:"Sort Status"}).click();
  await page.getByRole("button",{name:"Restore Default Columns"}).click();
  await expect(ledger.locator('th[data-lab-column="4"]')).toHaveCount(1);
  await expect(ledger.locator('th[data-lab-column="9"]')).toHaveAttribute("aria-sort","ascending");
});

test("collapsed navigation releases ledger width and narrow default remains full table", async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  const table=page.locator('[data-pd-id="lab.ledger-pan.sportsbook"]');
  const before=(await table.boundingBox())!.width;
  await page.getByRole("button",{name:"Collapse navigation"}).click();
  const after=(await table.boundingBox())!.width;
  expect(after-before).toBeGreaterThan(100);
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"] thead')).toBeVisible();
  await expect(page.getByRole("button",{name:"Show Labelled Details"})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
