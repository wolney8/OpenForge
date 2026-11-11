import { expect, test } from "@playwright/test";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
test.use({ video: "on", trace: "retain-on-failure", screenshot: "only-on-failure" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
});

async function dismissCookieNotice(page: import("@playwright/test").Page) {
  const acknowledge = page.locator('[data-pd-id="cookie-notice.acknowledge"]');
  if (await acknowledge.isVisible()) await acknowledge.click();
}

test("global Profile scope stays in the same module and local filtering stays subordinate", async ({ page }, info) => {
  await page.goto("/");
  await page.locator('[data-pd-id="ux-v2.nav.accounts"]').click();
  await expect(page).toHaveURL(/\/tracker\/accounts$/);
  await expect(page.locator('[data-pd-id="combined.accounts.page"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="combined.accounts.table-scroll"] tbody tr')).toHaveCount(6);
  await page.locator('[data-pd-id="combined.accounts.profile-filter"]').click();
  await page.getByRole("option", { name: "Subscriber Bravo" }).click();
  await expect(page).toHaveURL(/\/tracker\/accounts\?profile=profile-demo-002/);
  await expect(page.locator('[data-pd-id="combined.accounts.table-scroll"] tbody tr')).toHaveCount(0);
  await expect(page.locator('[data-pd-id="ux-v2.profile-scope"]')).toContainText("All Profiles");
  await page.locator('[data-pd-id="ux-v2.profile-scope"]').click();
  await page.getByRole("option", { name: "Subscriber Alpha" }).click();
  await expect(page).toHaveURL(/\/profiles\/profile-demo-001\/tracker\/accounts$/);
  await expect(page.getByRole("heading", { name: "Accounts", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Position" })).toHaveAttribute("href", "/?scope=profile-demo-001");
  await page.locator('[data-pd-id="ux-v2.profile-scope"]').click();
  await page.getByRole("option", { name: "Subscriber Bravo" }).click();
  await expect(page).toHaveURL(/\/profiles\/profile-demo-002\/tracker\/accounts$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/profiles\/profile-demo-001\/tracker\/accounts$/);
  await page.locator('[data-pd-id="ux-v2.profile-scope"]').click();
  await page.getByRole("option", { name: "All Profiles" }).click();
  await expect(page).toHaveURL(/\/tracker\/accounts$/);
  await expect(page.locator('[data-pd-id="ux-v2.profile-scope"]')).toContainText("All Profiles");
  await expect(page.locator('[data-pd-id="combined.accounts.table-scroll"] tbody tr')).toHaveCount(6);
  await dismissCookieNotice(page);
  await page.screenshot({ path: info.outputPath("combined-accounts-desktop.png") });
  const ledgerSearch = page.getByRole("searchbox", { name: "Search Accounts" });
  await ledgerSearch.fill("Bookmaker A");
  await expect(page.locator('[data-pd-id="combined.accounts.table-scroll"] tbody tr')).toHaveCount(1);
  await ledgerSearch.clear();
  await expect(page.locator('[data-pd-id="combined.accounts.table-scroll"] tbody tr')).toHaveCount(6);
  await page.getByRole("button", { name: "Add Account", exact: true }).click();
  await expect(page.getByRole("button", { name: "Continue to Add workflow" })).toBeDisabled();
  await page.locator('[data-pd-id="combined.accounts.new-owner"]').click();
  await page.getByRole("option", { name: "Subscriber Alpha" }).click();
  await page.getByRole("button", { name: "Continue to Add workflow" }).click();
  await expect(page).toHaveURL(/\/profiles\/profile-demo-001\/tracker\/accounts\?create=1&returnTo=/);
  await expect(page.locator('[data-pd-id="tracker.return-to-combined"]')).toHaveAttribute("href", "/tracker/accounts");
  await expect(page.getByRole("dialog", { name: "Create account" })).toBeVisible();
});

test("all six combined ledgers use authorised reads and a native owner handoff", async ({ page }, info) => {
  test.setTimeout(90_000);
  const selectedRange = await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } });
  expect(selectedRange.status()).toBe(200);
  for (const module of ["accounts", "sportsbook-bets", "free-bets", "casino-offers", "each-way-extra-places", "cash-adjustments"]) {
    await page.goto(`/tracker/${module}`);
    await expect(page.locator(`[data-pd-id="combined.${module}.page"]`)).toBeVisible();
    if (module === "sportsbook-bets") await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Tracker" })).toHaveAttribute("href", "/tracker");
    const table = page.locator(`[data-pd-id="combined.${module}.table-scroll"]`);
    await expect(table).toBeVisible();
    await expect(page.getByText(/Partial read:/)).toHaveCount(0);
    const nativeLink = table.locator("tbody a").first();
    await expect(nativeLink).toHaveAttribute("href", new RegExp(`/profiles/profile-demo-001/tracker/${module}\\?record=`));
    await nativeLink.click();
    await expect(page).toHaveURL(new RegExp(`/profiles/profile-demo-001/tracker/${module}\\?record=`));
    await expect(page.locator('[data-pd-id="tracker.return-to-combined"]')).toHaveAttribute("href", `/tracker/${module}`);
    if (module === "each-way-extra-places") await expect(page.locator('[data-pd-id="extra-place.editor.dialog"]')).toBeVisible();
    if (module === "cash-adjustments") await expect(page.locator('[data-pd-id="cash-adjustments.editor.dialog"]')).toBeVisible();
  }
  await page.goto("/tracker/accounts");
  const first = page.locator('[data-pd-id="combined.accounts.table-scroll"] tbody a').first();
  await expect(first).toHaveAttribute("href", /\/profiles\/profile-demo-001\/tracker\/accounts\?record=/);
  const firstHref = await first.getAttribute("href");
  await first.click();
  await expect(page).toHaveURL(/\/profiles\/profile-demo-001\/tracker\/accounts\?record=/);
  await expect(page.getByRole("heading", { name: "Accounts", exact: true, level: 1 })).toBeVisible();
  const accountEditor = page.getByRole("dialog", { name: "Edit account" });
  await expect(accountEditor).toBeVisible();
  const recordId = new URL(firstHref!, "http://127.0.0.1:3127").searchParams.get("record");
  const readAccount = async () => (await (await page.request.get("/api/profiles/profile-demo-001/accounts")).json() as Array<{ account_id: string; notes: string; current_balance: string }>).find(row => row.account_id === recordId);
  const before = await readAccount();
  expect(before).toBeTruthy();
  const updatedNotes = `${before!.notes ?? ""} CP-137 synthetic owner handoff`.trim();
  await accountEditor.getByRole("textbox", { name: "Notes", exact: true }).fill(updatedNotes);
  await accountEditor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(accountEditor).toHaveCount(0);
  const after = await readAccount();
  expect(after?.notes).toBe(updatedNotes);
  expect(after?.current_balance).toBe(before?.current_balance);
  await page.reload();
  await expect(page.locator('[data-pd-id="tracker.return-to-combined"]')).toBeVisible();
  await page.locator('[data-pd-id="tracker.return-to-combined"]').click();
  await expect(page.locator('[data-pd-id="combined.accounts.page"]')).toBeVisible();
  const foreignRead = await page.request.get("/api/profiles/profile-foreign/accounts");
  if (foreignRead.ok()) expect(await foreignRead.json()).toEqual([]);
  else expect([403, 404]).toContain(foreignRead.status());
  await dismissCookieNotice(page);
  await page.screenshot({ path: info.outputPath("native-account-handoff-saved-returned.png") });
});

test("Position, Today and Reports commands preserve individual global scope", async ({ page }) => {
  await page.goto("/?scope=profile-demo-001");
  await expect(page.locator('[data-pd-id="ux-v2.profile-scope"]')).toContainText("Subscriber Alpha");
  await expect(page.locator('[data-pd-id="position.overview"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="position.overview"]').getByRole("link", { name: /All tasks/ })).toHaveAttribute("href", "/tasks?scope=profile-demo-001");
  await expect(page.locator('[data-pd-id="ux-v2.nav.reports"]')).toHaveAttribute("href", "/reports?scope=profile-demo-001");
  await page.locator('[data-pd-id="ux-v2.nav.today"]').click();
  await expect(page).toHaveURL(/\/tasks\?scope=profile-demo-001$/);
  await page.locator('[data-pd-id="ux-v2.nav.reports"]').click();
  await expect(page).toHaveURL(/\/reports\?scope=profile-demo-001$/);
});

test("tracked banner survives refresh, hides independently and returns from header", async ({ page }, info) => {
  await page.goto("/tasks");
  const track = page.locator('[data-pd-id^="tasks.v2.track."]').first();
  await expect(track).toBeVisible();
  if (await track.getAttribute("aria-pressed") !== "true") await track.click();
  const banner = page.locator('[data-pd-id="v2.active-task"]');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("Tracked Tasks (1 active");
  await dismissCookieNotice(page);
  await page.screenshot({ path: info.outputPath("today-tracked-banner.png") });
  await page.getByRole("button", { name: "Collapse Tracked Tasks" }).click();
  await expect(page.getByRole("button", { name: "Expand Tracked Tasks" })).toBeVisible();
  await page.getByRole("button", { name: "Hide Tracked Tasks Banner" }).click();
  await expect(banner).toHaveCount(0);
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await page.locator('[data-pd-id="ux-v2.header.tracked-show-banner"]').click();
  await expect(banner).toBeVisible();
  await page.reload();
  await expect(banner).toBeVisible();
  await expect(page.locator('[data-pd-id="tasks.v2.collections"]')).toContainText("Tracked Tasks (1)");
  const separate = await page.context().browser()!.newContext();
  try {
    const newPage = await separate.newPage();
    await newPage.goto(authURL);
    await newPage.goto(`${new URL(page.url()).origin}/tasks`);
    await expect(newPage.locator('[data-pd-id="v2.active-task"]')).toContainText("Tracked Tasks (1 active");
  } finally { await separate.close(); }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(banner).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: info.outputPath("today-tracked-banner-mobile.png") });
  await page.locator('[data-pd-id^="tasks.v2.track."]').first().click();
  await expect(page.locator('[data-pd-id="tasks.v2.collections"]')).toContainText("Tracked Tasks (0)");
});

test("populated banner is bounded and Profile scope changes its view without changing annotations", async ({ page }, info) => {
  const rows = Array.from({ length: 13 }, (_, index) => ({
    profile_id: index < 8 ? "profile-demo-001" : "profile-demo-002",
    profile_name: index < 8 ? "Subscriber Alpha" : "Subscriber Bravo",
    occurrence_key: `TASK-${index + 1}`, source_key: `SOURCE-${index + 1}`, title: `Synthetic task ${index + 1}`,
    source_status: index === 12 ? "changed" : "active", tracked: true, work_state: "To Do", blocked_reason: null, review_date: null,
    version: 1, updated_at: "2026-11-05T08:00:00Z",
  }));
  await page.route("**/api/fund-manager/tasks/annotations", route => route.fulfill({ status: 200, json: rows }));
  await page.goto("/tasks");
  const banner = page.locator('[data-pd-id="v2.active-task"]');
  await expect(banner).toContainText("Tracked Tasks (12 active · 1 history)");
  await page.locator('[data-pd-id="tasks.loading-shell"]').waitFor({ state: "hidden" });
  const tray = banner.locator('[class*="trackedRows"]');
  expect(await tray.evaluate(node => node.clientHeight)).toBeLessThanOrEqual(420);
  expect(await tray.evaluate(node => node.scrollHeight)).toBeGreaterThan(await tray.evaluate(node => node.clientHeight));
  await dismissCookieNotice(page);
  await tray.evaluate(node => { node.scrollTop = 0; });
  await page.screenshot({ path: info.outputPath("tracked-banner-13-items.png"), fullPage: true });
  await banner.getByText("Source history and unavailable tasks (1)").click();
  await expect(banner).toContainText("Source changed");
  await tray.evaluate(node => { node.scrollTop = node.scrollHeight; });
  await page.screenshot({ path: info.outputPath("tracked-history-13-items.png"), fullPage: true });
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await expect(page.locator('[data-pd-id="ux-v2.header.tracked-view-all"]')).toBeVisible();
  const previewGeometry = await page.locator('[class*="trackedPanelRows"] [data-pd-id^="tracked-task."]').evaluateAll(nodes => nodes.map(node => {
    const row = node.getBoundingClientRect();
    const actions = node.querySelector('[class*="trackedActions"]')?.getBoundingClientRect();
    return { top: row.top, bottom: row.bottom, actionsTop: actions?.top, actionsBottom: actions?.bottom };
  }));
  expect(previewGeometry).toHaveLength(5);
  for (let index = 0; index < previewGeometry.length; index += 1) {
    const row = previewGeometry[index];
    expect(row.actionsTop).toBeGreaterThanOrEqual(row.top);
    expect(row.actionsBottom).toBeLessThanOrEqual(row.bottom);
    if (index > 0) expect(row.top).toBeGreaterThanOrEqual(previewGeometry[index - 1].bottom);
  }
  await page.screenshot({ path: info.outputPath("tracked-header-preview-13-items.png") });
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await page.locator('[data-pd-id="ux-v2.profile-scope"]').click();
  await page.getByRole("option", { name: "Subscriber Alpha" }).click();
  await expect(page).toHaveURL(/\/tasks\?scope=profile-demo-001/);
  await expect(banner).toContainText("Tracked Tasks (8 active");
  await expect(page.locator('[data-pd-id="ux-v2.header.tasks"]')).toHaveAccessibleName("Tracked Tasks, 8 active");
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await expect(page.locator('[data-pd-id="ux-v2.header.tracked-view-all"]')).toHaveAttribute("href", "/tasks?scope=profile-demo-001&collection=tracked");
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await page.locator('[data-pd-id="ux-v2.profile-scope"]').click();
  await page.getByRole("option", { name: "All Profiles" }).click();
  await expect(banner).toContainText("Tracked Tasks (12 active · 1 history)");
});

test("combined identities remain distinct and a failed Profile read is explicit", async ({ page }) => {
  const account = (profileId: string) => ({ profile_id: profileId, account_id: "DUP-001", account: "Bookmaker A", type: "Bookmaker", status: "Open", current_balance: "10.00" });
  await page.route("**/api/profiles/profile-demo-001/accounts", route => route.fulfill({ status: 200, json: [account("profile-demo-001")] }));
  await page.route("**/api/profiles/profile-demo-002/accounts", route => route.fulfill({ status: 200, json: [account("profile-demo-002")] }));
  await page.goto("/tracker/accounts");
  await expect(page.locator('[data-pd-id="combined.accounts.table-scroll"] tbody tr')).toHaveCount(2);
  const hrefs = await page.locator('[data-pd-id="combined.accounts.table-scroll"] tbody a').evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
  expect(hrefs).toEqual(expect.arrayContaining([
    expect.stringContaining("/profiles/profile-demo-001/tracker/accounts?record=DUP-001&returnTo="),
    expect.stringContaining("/profiles/profile-demo-002/tracker/accounts?record=DUP-001&returnTo="),
  ]));
  await page.unroute("**/api/profiles/profile-demo-002/accounts");
  await page.route("**/api/profiles/profile-demo-002/accounts", route => route.fulfill({ status: 503, json: { detail: "Synthetic read failure" } }));
  await page.getByRole("button", { name: "Refresh" }).click();
  await expect(page.getByText("Partial read: Subscriber Bravo unavailable.", { exact: false })).toBeVisible();
  await expect(page.locator('[data-pd-id="combined.accounts.table-scroll"] tbody tr')).toHaveCount(1);
  await expect(page.getByText("1 records across loaded Profiles")).toBeVisible();
});

test("a delayed combined read cannot appear after switching global Profile", async ({ page }) => {
  let releaseRead: () => void = () => {};
  let readStarted: () => void = () => {};
  const holdRead = new Promise<void>(resolve => { releaseRead = resolve; });
  const started = new Promise<void>(resolve => { readStarted = resolve; });
  await page.route("**/api/profiles/profile-demo-001/accounts", async route => {
    readStarted();
    await holdRead;
    try { await route.fulfill({ status: 200, json: [{ profile_id: "profile-demo-001", account_id: "STALE-ALPHA", account: "Stale Alpha Account" }] }); }
    catch { /* Navigation may cancel the retired read. */ }
  });
  try {
    await page.goto("/tracker/accounts");
    await started;
    await page.locator('[data-pd-id="ux-v2.profile-scope"]').click();
    await page.getByRole("option", { name: "Subscriber Bravo" }).click();
    await expect(page).toHaveURL(/\/profiles\/profile-demo-002\/tracker\/accounts$/);
    releaseRead();
    await expect(page.getByRole("heading", { name: "Accounts", exact: true, level: 1 })).toBeVisible();
    await expect(page.getByText("Stale Alpha Account")).toHaveCount(0);
  } finally { releaseRead(); }
});

test("combined ledger mobile details and full spreadsheet remain available", async ({ page }) => {
  const selectedRange = await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } });
  expect(selectedRange.status()).toBe(200);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tracker/sportsbook-bets");
  const details = page.locator('[data-pd-id="combined.sportsbook-bets.details"]');
  await expect(page.locator('[data-pd-id="combined.sportsbook-bets.table-scroll"]')).toBeVisible();
  await page.getByRole("button", { name: "Show Labelled Details" }).click();
  await expect(details.locator("article").first()).toBeVisible();
  await expect(details.locator("dt").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Show Full Table" }).click();
  await expect(page.locator('[data-pd-id="combined.sportsbook-bets.table-scroll"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="combined.sportsbook-bets.table-scroll"] tbody a').first()).toBeVisible();
  await page.getByRole("button", { name: "Show Labelled Details" }).click();
  await details.getByRole("button", { name: /Open full record for/ }).first().click();
  await expect(page).toHaveURL(/\/profiles\/profile-demo-001\/tracker\/sportsbook-bets\?record=/);
});

for (const mode of ["light", "dark"] as const) {
  test(`Today page head matches the Lab at split-view width: ${mode}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto("/design-lab");
    await page.getByRole("button", { name: /All tasks/ }).click();
    await page.evaluate(value => { localStorage.setItem("openforge-theme", value); document.documentElement.dataset.theme = value; }, mode);
    // The Lab centers its heading beside a synthetic range control. Today has no
    // authoritative range, so compare the shared page-head boundary instead.
    const labHead = await page.locator('main[data-pd-id="lab.main"] h1').locator('xpath=../..').boundingBox();
    await page.screenshot({ path: info.outputPath(`lab-today-900-${mode}.png`), fullPage: true });
    await page.goto("/tasks");
    await expect(page.locator('[data-pd-id^="tasks.v2.row."]').first()).toBeVisible();
    const realHead = await page.locator('[data-pd-id="tasks.page-header"]').boundingBox();
    expect(labHead && realHead).toBeTruthy();
    expect(Math.abs(realHead!.x - labHead!.x)).toBeLessThanOrEqual(4);
    expect(Math.abs(realHead!.y - labHead!.y)).toBeLessThanOrEqual(12);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`v2-today-900-${mode}.png`), fullPage: true });
  });
}

test("changing global scope respects the native unsaved editor guard", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/cash-adjustments");
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  const range = page.locator('[data-pd-id="tracker.range-card.select"]');
  await range.click();
  await page.getByRole("option", { name: "All Dates", exact: true }).click();
  await expect(range).toContainText("All Dates");
  const cell = page.locator('td[data-ledger-row="CA-SEED-001"][data-ledger-column="description"]');
  await cell.click();
  await page.keyboard.press("F2");
  const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
  await expect(editor).toBeVisible();
  await editor.getByRole("button", { name: "Edit cash-adjustment row" }).click();
  const description = editor.getByRole("textbox", { name: "Description", exact: true });
  await description.fill("Synthetic unsaved scope guard");
  await page.locator('[data-pd-id="ux-v2.profile-scope"]').click();
  await page.getByRole("option", { name: "All Profiles" }).click();
  const guard = page.locator('[data-pd-id="unsaved-changes.dialog"]');
  await expect(guard).toBeVisible();
  await guard.locator('[data-pd-id="unsaved-changes.keep-editing"]').click();
  await expect(page).toHaveURL(/\/profiles\/profile-demo-001\/tracker\/cash-adjustments/);
  await expect(description).toHaveValue("Synthetic unsaved scope guard");
  await page.locator('[data-pd-id="ux-v2.profile-scope"]').click();
  await page.getByRole("option", { name: "All Profiles" }).click();
  await guard.getByRole("button", { name: "Discard Changes" }).click();
  await expect(page).toHaveURL(/\/tracker\/cash-adjustments$/);
});
