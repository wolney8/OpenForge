import { chromium, expect, test } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
async function capture(page: import("@playwright/test").Page, name: string) {
  if (!evidence) return;
  await mkdir(evidence, {recursive:true});
  await page.screenshot({path:join(evidence,name),fullPage:false,style:"nextjs-portal { display: none !important; }"});
}

test.beforeEach(async ({page}) => {
  await page.route("**/api/**", async route => {
    if (route.request().url().endsWith("/api/auth/session")) return route.fulfill({json:{authenticated:true,email:"demo@example.invalid",expires_at:4102444800,name:"Synthetic Fund Manager",role:"fund_manager",session_policy:{absolute_expires_at:4102444800,auto_logout_enabled:false,effective_expires_at:4102444800,inactivity_expires_at:null,last_activity_at:1,preference_configured:true,timeout_minutes:30,valid_now:true}}});
    if (route.request().url().endsWith("/api/auth/activity")) return route.fulfill({json:{ok:true}});
    throw new Error(`Unexpected lab API request: ${route.request().url()}`);
  });
  await page.goto("/design-lab");
  await expect(page.locator('[data-pd-id="design-lab-connected.root"]')).toBeVisible();
});

test("floating Event editor keeps row and column geometry and supports Enter, Escape and click-away",async ({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  const row=page.locator('tr[data-lab-row-id="LAB-SB-001"]');
  const cell=row.locator('td[data-lab-column="2"]');
  const beforeRow=(await row.boundingBox())!, beforeCell=(await cell.boundingBox())!;
  await cell.dblclick();
  const editor=page.locator('[data-pd-id="lab.floating-cell-editor"]');
  await expect(editor).toBeVisible();
  const duringRow=(await row.boundingBox())!, duringCell=(await cell.boundingBox())!;
  expect(Math.abs(beforeRow.height-duringRow.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(beforeCell.width-duringCell.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(beforeCell.height-duringCell.height)).toBeLessThanOrEqual(1);
  expect((await editor.boundingBox())!.width).toBeGreaterThan(beforeCell.width);
  await expect(editor.getByRole("button",{name:"Save"})).toHaveCount(0);
  await capture(page,"cp119c-floating-event-dark.png");
  await editor.getByRole("textbox").fill("Reviewed synthetic event");
  await page.keyboard.press("Enter");
  await expect(row).toContainText("Reviewed synthetic event");
  await cell.dblclick();
  await editor.getByRole("textbox").fill("Discarded change");
  await page.keyboard.press("Escape");
  await expect(row).not.toContainText("Discarded change");
  await cell.dblclick();
  await editor.getByRole("textbox").fill("Tab reviewed event");
  await page.keyboard.press("Tab");
  await expect(row).toContainText("Tab reviewed event");
  await expect(row.locator('td[data-lab-column="3"]')).toBeFocused();
  await row.locator('td[data-lab-column="3"]').dblclick();
  await editor.getByRole("textbox").fill("Reviewed Campaign");
  await page.keyboard.press("Shift+Tab");
  await expect(row).toContainText("Reviewed Campaign");
  await expect(cell).toBeFocused();
  await row.locator('td[data-lab-column="3"]').dblclick();
  await editor.getByRole("textbox").fill("Outside click campaign");
  const filters=page.getByRole("button",{name:"Filters",exact:true});
  await filters.click();
  await expect(row).toContainText("Outside click campaign");
  await expect(filters).toBeFocused();
});

test("compact Account choice and governed status use the shared field path",async ({page})=>{
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  const row=page.locator('tr[data-lab-row-id="LAB-SB-PROSPECT-B"]');
  await row.locator('td[data-lab-column="1"]').dblclick({position:{x:8,y:20}});
  const editor=page.locator('[data-pd-id="lab.floating-cell-editor"]');
  await expect(editor.getByRole("listbox")).toBeVisible();
  await expect(editor.getByText("Bookmaker B")).toBeVisible();
  await expect(editor.locator('.pd-combobox-field')).toHaveCount(0);
  await page.keyboard.press("Escape");
  await row.locator('td[data-lab-column="9"]').dblclick();
  await expect(editor.getByRole("listbox")).toBeVisible();
  await editor.getByRole("option",{name:"Placed",exact:true}).click();
  await expect(page.getByRole("heading",{name:/Edit Sportsbook Bet · LAB-SB-PROSPECT-B/})).toBeVisible();
  await expect(page.getByText("Confirm external Back")).toHaveCount(0);
});

test("invalid odds remain in floating editor; typed execution evidence is independent of lifecycle labels",async ({page})=>{
  await page.locator('[data-pd-id="lab.nav.extraPlace"]').click();
  const row=page.locator('tr[data-lab-row-id="LAB-EP-001"]');
  await row.locator('td[data-lab-column="4"]').dblclick();
  const editor=page.locator('[data-pd-id="lab.floating-cell-editor"]');
  await editor.getByRole("textbox").fill("8,5");
  await page.keyboard.press("Enter");
  await expect(editor).toBeVisible();
  await expect(editor.getByRole("alert")).toContainText("without commas");
  await page.getByRole("button",{name:"Filters",exact:true}).click();
  await expect(editor).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await page.locator('tr[data-lab-row-id="LAB-SB-001"]').getByRole("button",{name:/Open/}).click();
  await page.getByRole("button",{name:"Edit Bet"}).click();
  await page.getByRole("button",{name:/Placement/}).click();
  await expect(page.getByRole("button",{name:"Not Recorded"})).toHaveCount(2);
  await page.getByRole("button",{name:"Cancel"}).click();
  await page.getByRole("button",{name:"Back to Sportsbook Bets"}).click();
  await page.locator('tr[data-lab-row-id="LAB-SB-PARTIAL"]').getByRole("button",{name:/Open/}).click();
  await page.getByRole("button",{name:"Edit Bet"}).click();
  await page.getByRole("button",{name:/Placement/}).click();
  await expect(page.getByText("Partial hedge: 4.00 matched of 10.00 requested")).toBeVisible();
});

test("inline and workbench descriptive edits share a record and audit; dependent values need review",async ({page})=>{
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  const settled=page.locator('tr[data-lab-row-id="LAB-SB-001"]');
  await settled.locator('td[data-lab-column="2"]').dblclick();
  await page.locator('[data-pd-id="lab.floating-cell-editor"]').getByRole("textbox").fill("Inline reviewed event");
  await page.keyboard.press("Enter");
  await settled.getByRole("button",{name:/Open/}).click();
  await page.getByRole("button",{name:"Edit Bet"}).click();
  await page.getByRole("button",{name:/Finish \/ Review/}).click();
  await page.getByRole("textbox",{name:"Event Name"}).fill("Workbench reviewed event");
  await page.getByRole("button",{name:"Save Existing Bet"}).click();
  await expect(settled).toContainText("Workbench reviewed event");
  await settled.getByRole("button",{name:/Open/}).click();
  await expect(page.getByText(/Inline reviewed event.*inline synthetic audit/)).toBeVisible();
  await expect(page.getByText(/Workbench reviewed event.*workbench synthetic audit/)).toBeVisible();
  await page.getByRole("button",{name:"Back to Sportsbook Bets"}).click();
  const prospect=page.locator('tr[data-lab-row-id="LAB-SB-PROSPECT-B"]');
  await prospect.locator('td[data-lab-column="5"]').dblclick();
  const editor=page.locator('[data-pd-id="lab.floating-cell-editor"]');
  await editor.getByRole("option",{name:"Underlay",exact:true}).click();
  await expect(prospect).toContainText("Underlay");
  await expect(prospect.getByRole("button",{name:/Review Value dependencies/})).toBeVisible();
  await expect(prospect.locator('td[data-lab-column="8"]')).toContainText("Unavailable");
  await expect(prospect.locator('td[data-lab-column="8"]')).toHaveClass(/gridNeedsReview/);
  await prospect.locator('td[data-lab-column="5"]').dblclick();
  await editor.getByRole("option",{name:"Standard"}).click();
  await expect(prospect.getByRole("button",{name:/Review Value dependencies/})).toHaveCount(0);
  await expect(prospect.locator('td[data-lab-column="8"]')).not.toHaveClass(/gridNeedsReview/);
});

test("compact Bookmaker choices support keyboard selection and narrow viewport containment",async ({page})=>{
  await page.locator('[data-pd-id="lab.nav.extraPlace"]').click();
  await page.setViewportSize({width:390,height:844});
  const row=page.locator('tr[data-lab-row-id="LAB-EP-001"]');
  const cell=row.locator('td[data-lab-column="2"]');
  await cell.scrollIntoViewIfNeeded();
  await cell.dblclick({position:{x:10,y:20}});
  const editor=page.locator('[data-pd-id="lab.floating-cell-editor"]');
  await expect(editor.getByRole("listbox")).toBeVisible();
  const box=(await editor.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x+box.width).toBeLessThanOrEqual(391);
  await capture(page,"cp119c-compact-choice-open-390.png");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(row).toContainText("Bookmaker C");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await capture(page,"cp119c-compact-choice-390.png");
});

test("light theme floating editor keeps one focus treatment at intermediate width",async ({page})=>{
  await page.evaluate(()=>localStorage.setItem("openforge-theme","light"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme","light");
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await page.setViewportSize({width:900,height:800});
  const cell=page.locator('tr[data-lab-row-id="LAB-SB-001"] td[data-lab-column="2"]');
  await cell.scrollIntoViewIfNeeded();
  await cell.dblclick();
  const editor=page.locator('[data-pd-id="lab.floating-cell-editor"]');
  await expect(editor).toBeVisible();
  const focus=await editor.evaluate(node=>({border:getComputedStyle(node).borderWidth,innerOutline:getComputedStyle(node.querySelector("input")!).outlineStyle}));
  expect(focus.border).not.toBe("0px");
  expect(focus.innerOutline).toBe("none");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await capture(page,"cp119c-floating-event-light-900.png");
});

test("actual Chromium 200% zoom keeps the floating editor inside the viewport",async ()=>{
  const baseURL=process.env.OPENFORGE_E2E_BASE_URL??"http://127.0.0.1:3010";
  const scratch=await mkdtemp(join(tmpdir(),"pd-cp119c-zoom-"));
  const extension=join(scratch,"extension");
  await mkdir(extension);
  await writeFile(join(extension,"manifest.json"),JSON.stringify({manifest_version:3,name:"Temporary CP-119C zoom check",version:"1.0",permissions:["tabs"],background:{service_worker:"background.js"}}));
  await writeFile(join(extension,"background.js"),"chrome.runtime.onInstalled.addListener(() => {});");
  const context=await chromium.launchPersistentContext(join(scratch,"profile"),{channel:"chromium",headless:true,viewport:{width:1440,height:900},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
  try {
    const page=await context.newPage();
    await page.route("**/api/**",async route=>{
      if(route.request().url().endsWith("/api/auth/session"))return route.fulfill({json:{authenticated:true,email:"demo@example.invalid",expires_at:4102444800,name:"Synthetic Fund Manager",role:"fund_manager",session_policy:{absolute_expires_at:4102444800,auto_logout_enabled:false,effective_expires_at:4102444800,inactivity_expires_at:null,last_activity_at:1,preference_configured:true,timeout_minutes:30,valid_now:true}}});
      if(route.request().url().endsWith("/api/auth/activity"))return route.fulfill({json:{ok:true}});
      throw new Error(`Unexpected lab API request: ${route.request().url()}`);
    });
    await page.goto(`${baseURL}/design-lab`);
    await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
    const worker=context.serviceWorkers()[0]??await context.waitForEvent("serviceworker");
    await worker.evaluate(async url=>{const tabs=(globalThis as unknown as {chrome:{tabs:{query:(filter:{url:string})=>Promise<Array<{id:number}>>;setZoom:(id:number,zoom:number)=>Promise<void>}}}).chrome.tabs;const matches=await tabs.query({url:`${url}/*`});await tabs.setZoom(matches[0].id,2);},baseURL);
    await expect.poll(()=>page.evaluate(()=>innerWidth)).toBe(720);
    const cell=page.locator('tr[data-lab-row-id="LAB-SB-001"] td[data-lab-column="2"]');
    await cell.scrollIntoViewIfNeeded();
    await cell.dblclick();
    const editor=page.locator('[data-pd-id="lab.floating-cell-editor"]');
    const box=(await editor.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(721);
    expect(await page.evaluate(()=>getComputedStyle(document.documentElement).zoom)).toBe("1");
    await capture(page,"cp119c-floating-editor-actual-zoom-200.png");
  } finally {await context.close();await rm(scratch,{recursive:true,force:true});}
});
