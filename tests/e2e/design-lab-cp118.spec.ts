import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
const evidence=process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
async function capture(page:import("@playwright/test").Page,name:string){if(!evidence)return;await mkdir(evidence,{recursive:true});await page.screenshot({path:join(evidence,name),fullPage:true,style:"nextjs-portal { display: none !important; }"});}

test.beforeEach(async ({page}) => {
  await page.route("**/api/**", async route => {
    if (route.request().url().endsWith("/api/auth/session")) { await route.fulfill({json:{authenticated:true,email:"demo@example.invalid",role:"fund_manager",expires_at:4102444800,session_policy:{absolute_expires_at:4102444800,auto_logout_enabled:false,effective_expires_at:4102444800,inactivity_expires_at:null,last_activity_at:1,preference_configured:true,timeout_minutes:30,valid_now:true}}});return; }
    if (route.request().url().endsWith("/api/auth/activity")) { await route.fulfill({json:{ok:true}});return; }
    throw new Error(`Unexpected Design Lab API call: ${route.request().url()}`);
  });
  await page.goto("/design-lab");
  await expect(page.locator('[data-pd-id="design-lab-connected.root"]')).toBeVisible();
});

test("copy failure is distinct and retry targets only failed Profile",async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  await page.locator('[data-pd-id="lab.task.reload"]').click();
  await page.locator('[data-pd-id="lab.today.detail"]').getByRole("button",{name:"Review Offer"}).click();
  const flow=page.locator('[data-pd-id="lab.offer-workflow"]');
  await flow.getByLabel("I reviewed Profile B's Limited Account warning").check();
  await flow.getByRole("button",{name:/Preview per-Profile drafts/i}).click();
  await flow.getByLabel("Simulate Profile B save failure on this attempt").check();
  await flow.getByRole("button",{name:/Confirm Simulated Copy/i}).click();
  await expect(flow.locator(".status-toast")).toContainText("Copy Failed — Profile B");
  await expect(flow.locator('[data-result="Failed"]')).toContainText("Retry this Profile");
  await expect(flow.locator('[data-result="Created"]')).toHaveCount(1);
  await expect(flow.locator('[data-result="Blocked"]')).toHaveCount(1);
  await capture(page,"copy-failed-1440.png");
  await flow.getByRole("button",{name:"Retry Failed Target"}).click();
  await expect(flow.locator('[data-result="Created"]')).toHaveCount(2);
  await expect(flow.locator('[data-result="Failed"]')).toHaveCount(0);
  await capture(page,"copy-recovered-1440.png");
});

test("workbench cards align on every step and range returns after editor",async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await page.locator('[data-pd-id="lab.add.page"]').click();
  await expect(page.locator('[data-pd-id="lab.range"]')).toHaveCount(0);
  const geometry:Record<string,number>={};
  for (const width of [1440,900]) {
    await page.setViewportSize({width,height:900});
    for (const name of ["Offer","Requirements","Matching","Placement","Finish / Review"]) {
      await page.getByRole("navigation",{name:"Bet workbench sections"}).getByRole("button",{name:new RegExp(name)}).click();
      const edges=await page.locator('[data-pd-id="lab.entry.page"]').evaluate(node => {
        const a=node.querySelector('[class*="entryFields"]')!.getBoundingClientRect();
        const b=node.querySelector('[class*="calcSummary"]')!.getBoundingClientRect();
        return {a:a.top,b:b.top};
      });
      expect(Math.abs(edges.a-edges.b),`${width}px ${name}`).toBeLessThanOrEqual(2);
      geometry[`${width}px ${name}`]=Math.abs(edges.a-edges.b);
    }
    await capture(page,`workbench-aligned-${width}.png`);
  }
  if(evidence)await writeFile(join(evidence,"workbench-card-geometry.json"),JSON.stringify(geometry,null,2));
  const cookieNotice=page.locator('[data-pd-id="cookie-notice"]');
  if(await cookieNotice.isVisible()) await cookieNotice.getByRole("button",{name:"Understood"}).click();
  await page.getByRole("button",{name:"Cancel"}).click();
  await expect(page.locator('[data-pd-id="lab.range"]')).toBeVisible();
});

test("Today task annotation does not settle source; active tray follows navigation",async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  const task=page.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]');
  await task.click();
  const detail=page.locator('[data-pd-id="lab.today.detail"]');
  await detail.getByRole("combobox",{name:/work state/i}).click();
  await page.getByRole("option",{name:"In Progress"}).click();
  await detail.getByRole("button",{name:"Track Task"}).click();
  await expect(page.locator('[data-pd-id="lab.active-task"]')).toContainText("In Progress");
  await capture(page,"today-task-tray-1440.png");
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await expect(page.locator('[data-pd-id="lab.active-task"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).toContainText("Demo Rovers v Sample Albion");
});

test("Today cards and active task remain contained at narrow widths",async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  await page.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]').click();
  await page.locator('[data-pd-id="lab.today.detail"]').getByRole("button",{name:"Track Task"}).click();
  for (const width of [430,390]) {
    await page.setViewportSize({width,height:844});
    await expect(page.locator('[data-pd-id="lab.active-task"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await capture(page,`today-task-tray-${width}.png`);
  }
});

test("derived task work states annotate but cannot claim completion",async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  const derived=page.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]');
  await derived.click();
  const detail=page.locator('[data-pd-id="lab.today.detail"]');
  const state=detail.getByRole("combobox",{name:/work state/i});
  await state.click();
  await expect(page.getByRole("option",{name:"Done",exact:true})).toHaveCount(0);
  await page.getByRole("option",{name:"Blocked"}).click();
  await detail.getByRole("textbox",{name:/blocked reason/i}).fill("Awaiting external result");
  await expect(detail.getByRole("textbox",{name:/blocked reason/i})).toHaveValue("Awaiting external result");
  await state.click();
  await page.getByRole("option",{name:"Do Later"}).click();
  await detail.getByLabel(/resume date/i).fill("2026-11-04");
  await expect(detail.getByLabel(/resume date/i)).toHaveValue("2026-11-04");
  await detail.getByRole("button",{name:"Track Task"}).click();
  await expect(page.locator('[data-pd-id="lab.active-task"]')).toContainText("Do Later");
  await page.locator('[data-pd-id="lab.task.reload"]').click();
  await page.locator('[data-pd-id="lab.today.detail"]').getByRole("combobox",{name:/work state/i}).click();
  await expect(page.getByRole("option",{name:"Done",exact:true})).toHaveCount(1);
});

test("chart modes preserve source values and unsupported modes remain unavailable",async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.reports"]').click();
  const chart=page.locator('[data-pd-id="lab.report-chart"]');
  const values=await chart.locator('button[aria-label^="Open "]').allTextContents();
  await chart.getByRole("radio",{name:"Line"}).click();
  await expect(chart.getByRole("radio",{name:"Line"})).toHaveAttribute("aria-checked","true");
  expect(await chart.locator('button[aria-label^="Open "]').allTextContents()).toEqual(values);
  await capture(page,"reports-line-1440.png");
  await page.keyboard.press("ArrowLeft");
  await expect(chart.getByRole("radio",{name:"Bar",exact:true})).toHaveAttribute("aria-checked","true");
  await expect(chart.getByRole("radio",{name:"Bar",exact:true})).toBeFocused();
  await expect(chart.getByRole("radio",{name:"Stacked Bar"})).toBeDisabled();
  await expect(chart.getByRole("radio",{name:"Candlestick"})).toBeDisabled();
});

test("specialist concepts retain fields and never claim a financial save",async ({page}) => {
  for (const section of ["freeBets","casino","extraPlace","cash"] as const) {
    await page.locator(`[data-pd-id="lab.nav.${section}"]`).click();
    await page.locator(`[data-pd-id="lab.concept-add.${section}"]`).click();
    const concept=page.locator(`[data-pd-id="lab.concept.${section}"]`);
    await expect(concept).toBeVisible();
    await expect(page.locator('[data-pd-id="lab.range"]')).toHaveCount(0);
    const cardTops=await concept.locator('[class*="columns"] > [class*="card"]').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
    expect(cardTops).toHaveLength(2);
    expect(Math.abs(cardTops[0]-cardTops[1]),section).toBeLessThanOrEqual(2);
    await expect(concept.getByRole("button",{name:/Save Unavailable/})).toBeDisabled();
    if (section === "freeBets") {
      await expect(concept.getByLabel("Free Bet Type")).toBeVisible();
      await expect(concept.getByRole("button",{name:"Back / Lay Preparation"})).toBeVisible();
    }
    if (section === "casino") {
      await expect(concept.getByRole("button",{name:"Wagering"})).toHaveCount(0);
      await concept.getByRole("combobox",{name:"Offer Type"}).click();
      await page.getByRole("option",{name:"Deposit and Bonus Wagering"}).click();
      await expect(concept.getByRole("button",{name:"Wagering"})).toBeVisible();
      await expect(concept.getByRole("button",{name:"Reward"})).toBeVisible();
    }
    if (section === "extraPlace") {
      await expect(concept.getByLabel("Win Lay Odds")).toBeVisible();
      await expect(concept.getByLabel("Place Lay Odds")).toBeVisible();
    }
    if (section === "cash") { await expect(concept).toContainText("Moving cash is not betting profit."); await expect(concept).toContainText("Audit History: No entries before a governed save"); }
    await capture(page,`concept-${section}-1440.png`);
    await concept.getByText("Required Ledger Columns · Preserved").click();
    await expect(concept.getByRole("listitem")).not.toHaveCount(0);
    await concept.getByRole("button",{name:"Return to Ledger"}).click();
    await expect(page.locator('[data-pd-id="lab.range"]')).toBeVisible();
  }
});

test("specialist concept fields stay contained at narrow width in both themes",async ({page}) => {
  for (const section of ["freeBets","casino","extraPlace","cash"] as const) {
    await page.setViewportSize({width:1440,height:900});
    await page.locator(`[data-pd-id="lab.nav.${section}"]`).click();
    await page.locator(`[data-pd-id="lab.concept-add.${section}"]`).click();
    await page.setViewportSize({width:430,height:900});
    for (const theme of ["light","dark"]) {
      await page.evaluate(value => document.documentElement.setAttribute("data-theme",value),theme);
      await expect(page.locator(`[data-pd-id="lab.concept.${section}"]`)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth-innerWidth),`${section}/${theme}`).toBeLessThanOrEqual(1);
      await capture(page,`concept-${section}-430-${theme}.png`);
    }
    await page.locator(`[data-pd-id="lab.concept.${section}"]`).getByRole("button",{name:"Return to Ledger"}).click();
  }
});

test("wide table pans by pointer on cell surface and remains keyboard scrollable",async ({page}) => {
  await page.setViewportSize({width:1000,height:800});
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  const cookieNotice=page.locator('[data-pd-id="cookie-notice"]');
  if(await cookieNotice.isVisible()) await cookieNotice.getByRole("button",{name:"Understood"}).click();
  const scroller=page.locator('[data-pd-id="lab.ledger-pan.sportsbook"]');
  const cell=scroller.locator("tbody tr").first().locator("td").nth(4);
  await scroller.evaluate(node => {node.scrollLeft=180;});
  const before=await scroller.evaluate(node => node.scrollLeft);
  const box=await cell.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x+1,box!.y+box!.height-3);
  await page.mouse.down();
  await page.mouse.move(box!.x-79,box!.y+box!.height-3,{steps:8});
  await page.mouse.up();
  const after=await scroller.evaluate(node => node.scrollLeft);
  expect(after).toBeGreaterThan(before+25);
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toHaveCount(0);
  await scroller.focus();await page.keyboard.press("ArrowRight");
  expect(await scroller.evaluate(node => node.scrollLeft)).toBeGreaterThan(after);
});

test("Prospecting edit survives detail return while Placed financial cell requires correction",async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  const ledger=page.locator('[data-pd-id="lab.ledger.sportsbook"]');
  const prospectBefore=ledger.locator('tbody tr[aria-label*="Sample reload"]');
  await prospectBefore.locator("td").nth(3).dblclick();
  await page.getByRole("textbox",{name:"event"}).fill("Edited synthetic selection");
  await page.keyboard.press("Enter");
  const prospectAfter=ledger.locator('tbody tr[aria-label*="Edited synthetic selection"]');
  await expect(prospectAfter).toContainText("Edited synthetic selection");
  await prospectAfter.getByRole("button",{name:/Open Edited synthetic selection/}).click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("Edited synthetic selection");
  await page.getByRole("button",{name:"Back to Sportsbook Bets"}).click();
  await expect(prospectAfter).toContainText("Edited synthetic selection");
  await ledger.locator("tbody tr").filter({hasText:"LAB-SB-002"}).locator("td").nth(8).dblclick();
  await expect(page.getByRole("heading",{name:/Edit Sportsbook Bet · LAB-SB-002/})).toBeVisible();
  await expect(page.getByRole("button",{name:"Review Correction"})).toBeVisible();
});
