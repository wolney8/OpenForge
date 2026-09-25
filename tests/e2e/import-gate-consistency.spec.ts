import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("import gate exposes all source decisions and keeps terminal values truthful", async ({ page, playwright }, info) => {
  test.setTimeout(240000);
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Authorised synthetic session required");
  const health = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
  expect(["test", "preview"]).toContain(health.runtime_role);
  if (health.runtime_role === "preview") expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
  const fixture = process.env.OPENFORGE_E2E_IMPORT_FIXTURE;
  expect(fixture, "Generate the synthetic apps.api.tests.import_gate_fixture first").toBeTruthy();
  const workbook = readFileSync(fixture!, "utf8").trim();
  const created = await page.request.post("/api/profiles/onboarding", {data: {
    setup_path:"import", display_name:`Synthetic CP050 Import ${Date.now()}`, profile_code:`C50-${Date.now()}`,
    management_fee_percent:"0", investment_fee_percent:"0", tracking_start_date:"2026-01-01", active_date_preset:"All Dates",
    enabled_modules:["sportsbook-bets","free-bets","cash-adjustments","casino-offers"], accounts:[], quick_actions:[],
  }});
  expect(created.status(), await created.text()).toBe(201);
  const profile = (await created.json()).profile, base = `/api/profiles/${profile.profile_id}`;
  const cleanup = await playwright.request.newContext({baseURL:info.project.use.baseURL, storageState:await page.context().storageState()});
  try {
    const analysed = await page.request.post(`${base}/workbook-imports/analyse`, {data:{source_filename:"synthetic-import-gate.xlsx",workbook_base64:workbook,effective_at:"2026-09-01T12:00:00+01:00"},timeout:90000});
    expect(analysed.status(),await analysed.text()).toBe(200);
    const workspace = await analysed.json(), run = workspace.metadata.import_run_id;
    let review = (await (await page.request.get(`${base}/workbook-imports/${run}`)).json());
    await expect.poll(async()=>{review=await (await page.request.get(`${base}/workbook-imports/${run}`)).json();return review.items.length;},{timeout:90000}).toBe(2);
    expect(review.run_status).toBe("REVIEW_REQUIRED");
    expect(review.final_import_summary.ready).toBe(false);
    expect(review.items.map((x:{category:string})=>x.category).sort()).toEqual(["accounts_partial","casino_partial"]);
    await page.goto(`/profiles/${profile.profile_id}/imports/${run}/review`);
    await expect(page.getByRole("heading",{name:"Import Review",exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"Review Accounts row 2",exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Review Accounts row 2",exact:true}).focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog",{name:"Review import mapping"});
    await expect(dialog).toContainText("Unknown");
    for(const [width,theme,scale] of [[1440,"light",100],[390,"dark",100],[760,"light",200]] as const){
      await page.setViewportSize({width,height:920}); await page.emulateMedia({reducedMotion:"reduce"});
      await page.evaluate(({theme,scale})=>{document.documentElement.dataset.theme=theme;document.documentElement.style.fontSize=`${scale}%`;},{theme,scale});
      const geometry=await dialog.evaluate(root=>{const b=root.getBoundingClientRect();return {inside:b.left>=0&&b.right<=innerWidth+1&&b.top>=0&&b.bottom<=innerHeight+1,page:document.documentElement.scrollWidth<=innerWidth+1};});
      if (!geometry.page) {
        console.log("Overflow evidence",width,theme,scale,await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>("body *")].filter(e=>{const b=e.getBoundingClientRect();return b.right>innerWidth+2&&b.width>0;}).slice(0,15).map(e=>({tag:e.tagName,id:e.dataset.pdId,class:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right}))));
        await page.screenshot({path:info.outputPath("synthetic-overflow.png"),fullPage:true});
      }
      expect(geometry).toEqual({inside:true,page:true});
      await expect(dialog.getByRole("button",{name:"Close import mapping review"})).toBeVisible();
    }
    await dialog.getByRole("button",{name:"Close import mapping review"}).click();
    await page.evaluate(()=>document.documentElement.style.fontSize="100%");await page.setViewportSize({width:1440,height:920});
    await page.getByRole("button",{name:"Review Casino Offers row 2",exact:true}).click();
    await dialog.getByRole("combobox",{name:"Decision",exact:true}).selectOption("provide_override_reason");
    await dialog.getByRole("textbox",{name:"Review note / reason",exact:true}).fill("Synthetic verified proceeds after wagering");
    const saving = page.waitForResponse(r=>r.request().method()==="PUT" && r.url().includes("/decisions/"),{timeout:15000});
    await dialog.getByRole("button",{name:"Save decision",exact:true}).click();
    const saved=await saving; expect(saved.status(),await saved.text()).toBe(200);
    expect((await saved.json()).final_import_summary.ready).toBe(false);
    await expect(dialog).not.toBeVisible();
    await page.reload(); await page.getByRole("button",{name:"Review Casino Offers row 2",exact:true}).click();
    await expect(dialog.getByRole("textbox",{name:"Review note / reason",exact:true})).toHaveValue("Synthetic verified proceeds after wagering");
    await dialog.getByRole("button",{name:"Close import mapping review"}).click();
    const staged = await page.request.post(`${base}/imports/xlsx/dry-run`,{data:{source_filename:"synthetic-import-gate.xlsx",content_base64:workbook,ledger:"sportsbook"}});
    expect(staged.status(),await staged.text()).toBe(201);const batch=await staged.json();
    expect(batch.rows.every((x:{errors:unknown[]})=>x.errors.length===0)).toBe(true);
    expect(batch.rows.find((x:{source_record_id:string})=>x.source_record_id==="SYNTHETIC-ODDS").mapped_fields.back_odds).toBe("25000002");
    const imported=await page.request.post(`${base}/imports/${batch.import_batch_id}/confirm-sportsbook`,{data:{confirmed:true,selected_staged_row_ids:batch.rows.map((x:{import_staged_row_id:string})=>x.import_staged_row_id)}});
    expect(imported.status(),await imported.text()).toBe(200);
    const rows=await (await page.request.get(`${base}/sportsbook-bets`)).json();
    expect(rows.find((x:{event_name:string})=>x.event_name==="Synthetic Void").reporting_value).toBe("0.00");
    expect(rows.find((x:{event_name:string})=>x.event_name==="Synthetic high odds").reporting_value).toBe("-12.00");
    await page.goto(`/profiles/${profile.profile_id}/tracker/sportsbook-bets`);
    await expect(page.getByText("Synthetic Void",{exact:true})).toBeVisible();
    await expect(page.getByText("Synthetic high odds",{exact:true})).toBeVisible();
    await page.reload();await expect(page.getByText("Synthetic Void",{exact:true})).toBeVisible();
  } catch(error) { console.error("Primary import gate failure",String(error)); throw error; } finally {const archived=await cleanup.patch(base,{data:{status:"Archived"}});expect(archived.status(),await archived.text()).toBe(200);await cleanup.dispose();}
});
