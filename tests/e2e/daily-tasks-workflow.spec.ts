import { expect, test } from "@playwright/test";

test.use({ actionTimeout: 15000 });

test("Daily Tasks scales through lifecycle views, combined filters and stable pagination", async ({ page }) => {
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const task = (index: number, overrides: Record<string, unknown> = {}) => ({
    audience: "fund_manager", security_tag: "fund_manager_only", kind: "task", task_state: "new",
    notification_id: `TASK-${String(index).padStart(3, "0")}`, notification_type: index % 2 ? "account_review" : "settlement_review",
    title: `Review synthetic task ${index}`, ledger_label: index % 2 ? "Profile Accounts" : "Sportsbook Bets",
    bookmaker_label: index % 3 ? "Bookmaker A" : "Bookmaker B", message: `Structured evidence for synthetic task ${index}.`,
    profile_id: index % 2 ? "PROFILE-A" : "PROFILE-B", profile_name: index % 2 ? "Profile Alpha" : "Profile Beta",
    record_id: `RECORD-${index}`, due_at: "", settles_at: "", created_at: now.toISOString(),
    href: `/profiles/${index % 2 ? "PROFILE-A" : "PROFILE-B"}/tracker/accounts?record=RECORD-${index}&source=tasks`,
    completion_href: "", tone: "warning", ...overrides,
  });
  const tasks = [
    ...Array.from({ length: 124 }, (_, index) => task(index + 1)),
    task(30, { due_at: tomorrow.toISOString(), notification_id: "TASK-UPCOMING", title: "Upcoming synthetic review" }),
    task(31, { due_at: yesterday.toISOString(), notification_id: "TASK-OVERDUE", title: "Overdue synthetic review" }),
    task(32, { task_state: "done", notification_id: "TASK-DONE", title: "Completed synthetic review" }),
  ];
  let feedRequests = 0;
  let persisted = { read_keys: [] as string[], dismissed_ids: [] as string[] };
  const preferences = {};
  await page.route("**/fund-manager/notifications/state", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON() as typeof persisted; persisted = body;
    }
    await route.fulfill({ status: 200, json: persisted });
  });
  await page.route("**/fund-manager/notifications/preferences", (route) => route.fulfill({ status: 200, json: { preferences } }));
  await page.route("**/fund-manager/notifications", async (route) => {
    feedRequests += 1;
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({ status: 200, json: tasks });
  });

  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Daily Tasks", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Today —/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: /Today 124/ })).toHaveAttribute("aria-selected", "true");
  expect(feedRequests).toBe(1);
  await expect(page.locator('[data-pd-id^="tasks.item."]')).toHaveCount(16);
  await expect(page.getByText("Page 1 of 8 · 124 rows").first()).toBeVisible();
  const firstPageIds = await page.locator('[data-pd-id^="tasks.item."]').evaluateAll((rows) => rows.map((row) => row.getAttribute("data-pd-id")));
  await page.getByRole("button", { name: "Next", exact: true }).first().click();
  await expect(page.locator('[data-pd-id^="tasks.item."]')).toHaveCount(16);
  const secondPageIds = await page.locator('[data-pd-id^="tasks.item."]').evaluateAll((rows) => rows.map((row) => row.getAttribute("data-pd-id")));
  expect(secondPageIds.some((id) => firstPageIds.includes(id))).toBe(false);

  await page.getByRole("searchbox", { name: "Search Daily Tasks" }).fill("task 21");
  await expect(page.getByText("Page 1 of 1 · 1 rows").first()).toBeVisible();
  await expect(page.locator('[data-pd-id="tasks.item.TASK-021"]')).toBeVisible();
  await page.getByRole("searchbox", { name: "Search Daily Tasks" }).fill("");
  await page.getByText("More Filters", { exact: true }).click();
  await page.getByRole("combobox", { name: "Filter Tasks By Profile" }).selectOption("PROFILE-B");
  await page.getByRole("combobox", { name: "Filter Tasks By Bookmaker" }).selectOption("Bookmaker A");
  await page.getByRole("combobox", { name: "Filter Tasks By Type" }).selectOption("settlement_review");
  await page.getByRole("combobox", { name: "Filter Tasks By Source" }).selectOption("deterministic");
  await expect(page.locator('[data-pd-id^="tasks.item."]')).not.toHaveCount(0);
  await expect(page.locator('[data-pd-id^="tasks.item."] td[data-label="Profile"]')).toHaveText(Array(await page.locator('[data-pd-id^="tasks.item."]').count()).fill("Profile Beta"));
  await page.getByRole("combobox", { name: "Sort Daily Tasks" }).selectOption("bookmaker");
  await page.getByRole("combobox", { name: "Filter Tasks By Profile" }).selectOption("all");
  await page.getByRole("combobox", { name: "Filter Tasks By Bookmaker" }).selectOption("all");
  await page.getByRole("combobox", { name: "Filter Tasks By Type" }).selectOption("all");

  await page.getByRole("tab", { name: /Upcoming 1/ }).click(); await expect(page.locator('[data-pd-id="tasks.item.TASK-UPCOMING"]')).toBeVisible();
  await page.getByRole("tab", { name: /Overdue 1/ }).click(); await expect(page.locator('[data-pd-id="tasks.item.TASK-OVERDUE"]')).toBeVisible();
  await page.getByRole("tab", { name: /Completed 1/ }).click(); await expect(page.locator('[data-pd-id="tasks.item.TASK-DONE"]')).toBeVisible();
  await page.getByRole("tab", { name: /Today 124/ }).click();
  const first = page.locator('[data-pd-id="tasks.item.TASK-001"]');
  await first.getByText("Evidence", { exact: true }).click(); await expect(first).toContainText("Structured evidence");
  await first.getByRole("button", { name: "Complete Review synthetic task 1" }).click();
  await page.getByRole("tab", { name: /Completed 2/ }).click(); await expect(first).toBeVisible();
  await first.getByRole("button", { name: "Restore Review synthetic task 1" }).click(); await expect(first).toHaveCount(0);

  await page.getByRole("tab", { name: /Today 124/ }).click();
  await page.getByRole("searchbox", { name: "Search Daily Tasks" }).fill("absent item");
  await expect(page.getByText("No today tasks match these controls.", { exact: true })).toBeVisible();
  for (const width of [390, 760]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.locator('[data-pd-id="tasks.page"]').evaluate(() => ({ pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1, tableContained: document.querySelector('[data-pd-id="tasks.table-scroll"]')!.scrollWidth >= document.querySelector('[data-pd-id="tasks.table-scroll"]')!.clientWidth, tabsContained: document.querySelector('[data-pd-id="tasks.tabs"]')!.scrollWidth >= document.querySelector('[data-pd-id="tasks.tabs"]')!.clientWidth }));
    expect(geometry, `${width}px Daily Tasks geometry`).toEqual({ pageOverflow: false, tableContained: true, tabsContained: true });
  }
});

test("daily tasks open exact records, retain clear state and refresh truthful source evidence", async ({ page, playwright }, info) => {
  test.setTimeout(240000);
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Authorised synthetic session required");
  const health = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
  expect(["test", "candidate", "preview"]).toContain(health.runtime_role);
  if (health.runtime_role === "candidate") expect(health.database_identity).toBe("cp058-owner-review-synthetic");
  if (health.runtime_role === "preview") expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
  const anonymous = await playwright.request.newContext({ baseURL: process.env.OPENFORGE_E2E_API_BASE_URL, storageState: { cookies: [], origins: [] } });
  if (health.runtime_role !== "candidate") expect((await anonymous.get("/fund-manager/notifications")).status()).toBe(401);
  if (health.runtime_role === "preview") { const denied = await anonymous.get("/tasks", { maxRedirects: 0 }); expect(denied.status()).toBe(307); expect(denied.headers().location).toContain("/login"); }
  await anonymous.dispose();
  const cleanup = await playwright.request.newContext({ baseURL: info.project.use.baseURL, storageState: await page.context().storageState() });
  const response = await page.request.post("/api/profiles/onboarding", { data: { accounts: [], display_name: `Synthetic CP049 Tasks ${Date.now()}`, profile_code: `C49-T-${Date.now()}`, profile_relationship: "Personal", management_fee_percent: "0", investment_fee_percent: "0", enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments"], quick_actions: [], setup_path: "import", tracking_start_date: "2026-09-01" } });
  expect(response.status(), await response.text()).toBe(201);
  const profile = (await response.json()).profile, base = `/api/profiles/${profile.profile_id}`;
  expect(Number(profile.management_fee_percent)).toBe(0); expect(Number(profile.investment_fee_percent)).toBe(0);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  try {
    let accountId = "";
    for (const [account, type] of [["Bet365", "Bookie"], ["Smarkets", "Exchange"]]) {
      const added = await page.request.post(`${base}/accounts`, { data: { account, type, status: "Active", lifecycle_status: "Active", channel: "Online", current_balance: type === "Bookie" ? "" : "0.00", stake_access: "Normal", promo_access: "Full", restrictions: [], ...(type === "Exchange" ? { commission_rate: "0.02" } : {}) } });
      expect(added.status(), await added.text()).toBe(201); if (type === "Bookie") accountId = (await added.json()).account_id;
    }
    const payload = { event_name: "Synthetic daily settlement", offer_text: "CP049 task routing", bookmaker: "Bet365", offer_type: "Bet & Get", bet_type: "Single", fixture_type: "Football", match_strategy: "Standard", status: "Placed", result: "Pending", back_stake: "10", back_odds: "3", lay_odds_1: "3.1", lay_actual: "9.74", lay_matched_stake_1: "9.74", lay_commission_1: "0.02", exchange_name: "Smarkets", user_notes: "Saved task note" };
    const created = await page.request.post(`${base}/sportsbook-bets`, { data: payload }); expect(created.status(), await created.text()).toBe(201);
    const bet = await created.json();
    const expiry = new Date(Date.now()+2*86400000).toISOString();
    const rewardResponse = await page.request.post(`${base}/free-bets`, { data: { ...payload, event_name: "Synthetic expiring reward", status: "Available", retention_mode: "SNR", free_bet_value: "10", expiry_datetime: expiry, origin_qual_bet_id: "", offer_group_id: "" } });
    expect(rewardResponse.status(), await rewardResponse.text()).toBe(201); const reward = await rewardResponse.json();
    await page.goto("/tasks"); await expect(page.getByRole("heading", { name: "Daily Tasks", exact: true })).toBeVisible();
    await expect(page.getByRole("button", {name:"Open navigation drawer",exact:true})).toBeVisible();
    await page.getByText("More Filters", { exact: true }).click();
    const filter = page.getByRole("combobox", { name: "Filter Tasks By Profile" }); await filter.selectOption(profile.profile_id);
    const cards = page.locator('[data-pd-id^="tasks.item."]'); await expect(cards).toHaveCount(2);
    const settlement = page.locator('[data-pd-id^="tasks.item."]').filter({ hasText: bet.sportsbook_bet_id }), account = page.locator('[data-pd-id^="tasks.item."]').filter({ hasText: accountId }), freebet = page.locator('[data-pd-id^="tasks.item."]').filter({ hasText: reward.free_bet_id });
    await expect(settlement).toContainText("Ready now · no deadline");
    await expect(account).toContainText("Balance not recorded");
    await page.getByRole("tab", { name: /Upcoming/ }).click(); await expect(freebet).toBeVisible(); await expect(freebet).toContainText("3-day alert window");
    await page.getByRole("tab", { name: /Today/ }).click();
    for (const [width, theme, scale] of [[1440,"light",100],[390,"dark",100],[760,"light",200]] as const) {
      await page.setViewportSize({ width, height: 920 }); await page.emulateMedia({ reducedMotion: "reduce" });
      await page.evaluate(({theme,scale}) => { document.documentElement.dataset.theme=theme; document.documentElement.style.fontSize=`${scale}%`; }, {theme,scale});
      await expect(cards).toHaveCount(2);
      const geometry = await page.locator('[data-pd-id="tasks.page"]').evaluate(root => {
        const rect=root.getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth>window.innerWidth+1, clipped:[...root.querySelectorAll<HTMLElement>('button, select, input')].filter(e => !e.closest('[data-pd-id="tasks.table-scroll"], [data-pd-id="tasks.tabs"]')).some(e => { const b=e.getBoundingClientRect(); return b.width<24 || b.right>window.innerWidth+1 || b.left<0; }), width:rect.width };
      }); expect(geometry.overflow).toBe(false); expect(geometry.clipped).toBe(false);
      await page.screenshot({ path: info.outputPath(`tasks-${width}-${theme}-${scale}.png`), fullPage: true });
    }
    await page.evaluate(() => { document.documentElement.style.fontSize="100%"; }); await page.setViewportSize({width:1440,height:920});
    await settlement.getByRole("link", { name: "Open", exact: true }).focus(); await expect(settlement.getByRole("link", { name: "Open", exact: true })).toBeFocused(); await Promise.all([page.waitForURL(/sportsbook-bets/, { timeout: 30000 }), page.keyboard.press("Enter")]);
    const editor=page.getByRole("dialog",{name:"Edit sportsbook row",exact:true}); await expect(editor).toBeVisible({ timeout: 15000 }); await expect(editor.locator('input[value="Synthetic daily settlement"]')).toHaveValue("Synthetic daily settlement");
    await editor.getByRole("tab",{name:/Settlement/}).click(); await editor.locator('[data-pd-id="ledger-editor.panel.settlement"]').getByText("Advanced controls",{exact:true}).click();
    const notes=editor.locator('[data-pd-id="ledger-editor.panel.settlement"]').getByRole("textbox",{name:"Notes",exact:true}); await notes.fill("Task draft discarded"); await editor.getByRole("button",{name:"Revert",exact:true}).click(); await expect(notes).toHaveValue("Saved task note");
    await page.goto("/tasks"); await page.getByText("More Filters", { exact: true }).click(); await filter.selectOption(profile.profile_id); await expect(cards).toHaveCount(2);
    await account.getByRole("link", { name: "Open", exact: true }).click(); await expect(page.getByRole("dialog",{name:"Edit account",exact:true})).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("dialog",{name:"Edit account",exact:true}).locator('input[value="Bet365"]')).toHaveValue("Bet365");
    await page.goto("/tasks"); await page.getByText("More Filters", { exact: true }).click(); await filter.selectOption(profile.profile_id); await page.getByRole("tab", { name: /Upcoming/ }).click();
    await page.route('**/fund-manager/notifications/state', route => route.request().method() === "PUT" ? route.fulfill({status:503,json:{detail:"Synthetic state failure"}}) : route.continue());
    await freebet.getByRole("button",{name:"Complete Review expiring Free Bet",exact:true}).click();
    await expect(page.locator('[data-pd-id="tasks.page"] [role="alert"]')).toContainText("Unable to complete"); await expect(freebet).toBeVisible();
    await page.unroute('**/fund-manager/notifications/state');
    await freebet.getByRole("button",{name:"Complete Review expiring Free Bet",exact:true}).click(); await expect(freebet).toHaveCount(0);
    await page.reload(); await page.getByText("More Filters", { exact: true }).click(); await filter.selectOption(profile.profile_id); await page.getByRole("tab", { name: /Completed/ }).click(); await expect(freebet).toBeVisible();
    await page.getByRole("tab", { name: /Today/ }).click();
    await account.getByRole("link", { name: "Open", exact: true }).click();
    await page.getByRole("dialog",{name:"Edit account",exact:true}).getByRole("button",{name:"Review Account Bet365",exact:true}).click();
    const review=page.getByRole("dialog",{name:"Account review",exact:true});
    await review.getByRole("textbox",{name:"Observed balance",exact:true}).fill("0.00");
    await review.getByRole("button",{name:"Confirm balance",exact:true}).click();
    await expect(review.locator('[data-pd-id="account.review.confirmation-status"]')).toHaveText("Balance confirmed. This does not create betting profit.");
    await review.getByRole("button",{name:"Close",exact:true}).click();
    await page.goto("/tasks"); await page.getByText("More Filters", { exact: true }).click(); await filter.selectOption(profile.profile_id);
    await expect(account).toHaveCount(0); await expect(settlement).toBeVisible();
    let releaseOld!: () => void, captured!: () => void;
    const held = new Promise<void>(resolve => { releaseOld = resolve; });
    const capturedResponse = new Promise<void>(resolve => { captured = resolve; });
    let first = true;
    await page.route('**/fund-manager/notifications', async route => {
      if (!first) return route.continue(); first = false;
      const old = await route.fetch(); captured(); await held; await route.fulfill({response:old});
    });
    await settlement.getByRole("link", { name: "Open", exact: true }).click(); await capturedResponse;
    const settled=await page.request.put(`${base}/sportsbook-bets/${bet.sportsbook_bet_id}`,{data:{...payload,status:"Settled",result:"Back Won"}});expect(settled.ok(),await settled.text()).toBe(true);
    await page.getByRole("button",{name:"Refresh Tasks",exact:true}).click(); await expect(settlement).toHaveCount(0);
    const oldFinished = page.waitForResponse(response => response.url().endsWith('/fund-manager/notifications'));
    releaseOld(); await oldFinished; await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/tasks$/); await expect(settlement).toHaveCount(0);
    await page.unroute('**/fund-manager/notifications');
    await page.route('**/fund-manager/notifications',route=>route.fulfill({status:503,json:{detail:"Synthetic unavailable"}}));
    await page.getByRole("button",{name:"Refresh Tasks",exact:true}).click(); await expect(page.getByRole("alert").filter({hasText:"temporarily unavailable"})).toBeVisible(); await expect(cards).toHaveCount(0);
    await page.unroute('**/fund-manager/notifications'); await page.getByRole("button",{name:"Refresh Tasks",exact:true}).click(); await expect(page.getByText("No today tasks match these controls.", {exact:true})).toBeVisible();
    await page.goto("/notifications"); await page.getByRole("searchbox",{name:"Search notifications by name or context"}).fill(profile.display_name); await expect(page.locator('[data-pd-id="notifications.history.list"]')).toContainText("Review unsettled bet");
    expect(errors).toEqual([]);
  } catch (error) { console.error("Primary workflow failure", error); throw error; } finally { const archived=await cleanup.patch(base,{data:{status:"Archived"}}); expect(archived.ok(),await archived.text()).toBe(true); await cleanup.dispose(); }
});
