import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async route => {
    if (route.request().url().endsWith("/api/auth/session")) return route.fulfill({json:{authenticated:true,email:"demo@example.invalid",role:"fund_manager",expires_at:4102444800,session_policy:{absolute_expires_at:4102444800,auto_logout_enabled:false,effective_expires_at:4102444800,inactivity_expires_at:null,last_activity_at:1,preference_configured:true,timeout_minutes:30,valid_now:true}}});
    if (route.request().url().endsWith("/api/auth/activity")) return route.fulfill({json:{ok:true}});
    throw new Error(`Unexpected lab API request: ${route.request().url()}`);
  });
  await page.goto("/design-lab");
});

test("Board and List bulk tracking respect visible groups, avoid duplicates, and hide the zero badge", async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  const trigger = page.locator('[data-pd-id="lab.header-trigger.tracked"]');
  await expect(trigger.locator('span[aria-hidden="true"]')).toHaveCount(1);
  await page.getByRole("button",{name:"Board",exact:true}).click();
  const todo = page.locator('[data-lab-board-state="To Do"]');
  const count = await todo.locator('[data-pd-id^="lab.task."]').count();
  await todo.getByRole("button",{name:/Track All To Do/}).click();
  await expect(trigger).toHaveAttribute("aria-label",`Tracked Tasks, ${count} active`);
  await expect(todo.getByRole("button",{name:/Untrack All To Do/})).toBeVisible();
  await todo.getByRole("button",{name:/Untrack All To Do/}).click();
  await expect(trigger).toHaveAttribute("aria-label","Tracked Tasks, 0 active");
  await expect(trigger.locator('span').filter({hasText:"0"})).toHaveCount(0);
  await page.getByRole("button",{name:"List",exact:true}).click();
  await page.locator('[data-pd-id="lab.today.bulk.needs-action"]').click();
  const afterNeeds = await page.locator('[data-pd-id^="lab.tracked-task."]').count();
  await page.locator('[data-pd-id="lab.today.bulk.recurring-work"]').click();
  await expect(page.locator('[data-pd-id^="lab.tracked-task."]')).toHaveCount(afterNeeds + 5);
  await page.locator('[data-pd-id="lab.today.bulk.opportunities-and-suggestions"]').click();
  await expect(page.locator('[data-pd-id^="lab.tracked-task."]')).toHaveCount(afterNeeds + 8);
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await expect(trigger).toHaveAttribute("aria-label",`Tracked Tasks, ${afterNeeds + 8} active`);
});

test("tracked completion preserves source authority and retains resolved history", async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  await page.locator('[data-pd-id="lab.task.reload"]').click();
  await page.locator('[data-pd-id="lab.task-track.reload"]').click();
  const banner = page.locator('[data-pd-id="lab.active-task"]');
  await banner.locator('[data-pd-id="lab.tracked-task.reload"]').getByRole("button",{name:/Mark .* Done/}).click();
  await expect(page.locator('[data-pd-id="lab.header-trigger.tracked"]')).toHaveAttribute("aria-label","Tracked Tasks, 0 active");
  await page.locator('[data-pd-id="lab.header-trigger.tracked"]').click();
  await expect(page.getByText("Completed History (1)")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator('[data-pd-id="lab.task.task:LAB-ACCOUNT-C"]').click();
  await page.locator('[data-pd-id="lab.task-track.task:LAB-ACCOUNT-C"]').click();
  await banner.locator('[data-pd-id="lab.tracked-task.task:LAB-ACCOUNT-C"]').getByRole("button",{name:/Mark .* Done/}).click();
  await expect(banner).toContainText("requires source resolution");
  await expect(banner.locator('[data-pd-id="lab.tracked-task.task:LAB-ACCOUNT-C"]')).toContainText("To Do");
  await page.locator('[data-pd-id="lab.today.detail"]').getByRole("button",{name:"Review Account"}).click();
  await page.locator('[data-pd-id="lab.record-detail"]').getByRole("button",{name:"Review balance"}).click();
  await page.getByLabel("Observed Current Balance").fill("0.00");
  await page.getByRole("button",{name:/Confirm balance observation/}).click();
  await expect(page.locator('[data-pd-id="lab.header-trigger.tracked"]')).toHaveAttribute("aria-label","Tracked Tasks, 0 active");
  await page.locator('[data-pd-id="lab.header-trigger.tracked"]').click();
  await page.getByText("Completed History (2)").click();
  await expect(page.locator('[data-pd-id="lab.header-tracked-task.task:LAB-ACCOUNT-C"]')).toContainText("Source Resolved");
  await expect(page.locator('[data-pd-id="lab.header-tracked-task.task:LAB-ACCOUNT-C"]')).toContainText("Done");
});

test("Board Track All covers each active state and advisory review remains an annotation", async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  for (const [id,state] of [["task:LAB-SB-OVERDUE","In Progress"],["task:LAB-SB-PARTIAL","Blocked"],["reload","Do Later"]] as const) {
    await page.locator(`[data-pd-id="lab.task.${id}"]`).click();
    await page.locator(`[data-pd-id="lab.task-state.${id}"]`).click();
    await page.getByRole("option",{name:state,exact:true}).click();
    await page.getByRole("button",{name:"Close Task Details"}).click();
  }
  await page.getByRole("button",{name:"Board",exact:true}).click();
  for (const state of ["In Progress","Blocked","Do Later"] as const) {
    const column=page.locator(`[data-lab-board-state="${state}"]`);
    await column.getByRole("button",{name:new RegExp(`Track All ${state}`)}).click();
    await expect(column.getByRole("button",{name:new RegExp(`Untrack All ${state}`)})).toBeVisible();
  }
  const suggestion=page.locator('[data-pd-id="lab.task.advisory"]');
  await suggestion.click();
  await page.locator('[data-pd-id="lab.task-track.advisory"]').click();
  await page.locator('[data-pd-id="lab.header-trigger.tracked"]').click();
  await page.locator('[data-pd-id="lab.header-tracked-task.advisory"]').getByRole("button",{name:/Mark .* Done/}).click();
  await expect(page.locator('[data-pd-id="lab.header-tracked-panel"]')).toContainText("Offer availability remains unverified");
  await expect(page.locator('[data-pd-id="lab.header-tracked-task.advisory"]')).not.toBeVisible();
});

test("ledger choices, native dates and canonical GBP survive inline editing", async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  const sportsbook = page.locator('tr[data-lab-row-id="LAB-SB-PROSPECT-B"]');
  await expect(sportsbook.locator('td[data-lab-column="1"] .material-symbols-outlined').filter({hasText:"arrow_drop_down"})).toBeVisible();
  await expect(sportsbook.locator('td[data-lab-column="9"] .material-symbols-outlined').filter({hasText:"arrow_drop_down"})).toBeVisible();
  await sportsbook.locator('td[data-lab-column="0"]').dblclick();
  await expect(page.locator('[data-pd-id="lab.floating-cell-editor"] input[type="date"]')).toHaveValue("");
  await page.keyboard.press("Escape");
  await page.locator('[data-pd-id="lab.nav.extraPlace"]').click();
  const dated = page.locator('tr[data-lab-row-id="LAB-EP-001"]');
  await dated.locator('td[data-lab-column="0"]').dblclick();
  await expect(page.locator('[data-pd-id="lab.floating-cell-editor"] input[type="datetime-local"]')).toHaveValue("2026-11-07T14:30");
  await page.keyboard.press("Escape");
  const row = page.locator('tr[data-lab-row-id="LAB-EP-002"]');
  await expect(row.locator('td[data-lab-column="5"] .material-symbols-outlined').filter({hasText:"arrow_drop_down"})).toBeVisible();
  await row.locator('td[data-lab-column="3"]').dblclick();
  await page.locator('[data-pd-id="lab.floating-cell-editor"] input').fill("2");
  await page.keyboard.press("Enter");
  await expect(row.locator('td[data-lab-column="3"]')).toContainText("£ 2.00");
  await expect(row.getByRole("button",{name:/Review Qual Loss dependencies/})).toBeVisible();
  await page.locator('[data-pd-id="lab.nav.cash"]').click();
  await page.locator('tr[data-lab-row-id="LAB-CA-001"] td[data-lab-column="1"]').dblclick();
  await expect(page.locator('[data-pd-id="lab.concept.cash"] input[type="date"]')).toHaveValue("2026-10-12");
});

test("Free Bet and Casino expiry use populated pickers without inventing a time",async ({page}) => {
  await page.locator('[data-pd-id="lab.nav.freeBets"]').click();
  await page.locator('tr[data-lab-row-id="LAB-FB-001"] td[data-lab-column="1"]').dblclick();
  await expect(page.locator('[data-pd-id="lab.concept.freeBets"] input[type="date"]')).toHaveValue("2026-11-10");
  await page.getByRole("button",{name:"Return to Ledger"}).click();
  await page.locator('[data-pd-id="lab.nav.casino"]').click();
  await page.locator('tr[data-lab-row-id="LAB-CO-002"] td[data-lab-column="1"]').dblclick();
  await expect(page.locator('[data-pd-id="lab.floating-cell-editor"] input[type="date"]')).toHaveValue("2026-11-08");
  await page.keyboard.press("Escape");
  await expect(page.locator('tr[data-lab-row-id="LAB-CO-002"] td[data-lab-column="1"]')).toContainText("8 Nov 2026");
});
