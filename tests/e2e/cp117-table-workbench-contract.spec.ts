import { expect, test } from "@playwright/test";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";

test.use({ screenshot: "only-on-failure", trace: "retain-on-failure" });

const owned = [
  ["accounts", "accounts"],
  ["sportsbook-bets", "sportsbook"],
  ["free-bets", "free-bets"],
  ["casino-offers", "casino-offers"],
  ["each-way-extra-places", "extra-place"],
  ["cash-adjustments", "cash-adjustments"],
] as const;

for (const [route, prefix] of owned) {
  test(`${route} selects a row before opening its one governed workbench`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
    await page.goto(authURL);
    await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } });
    await page.goto(`/profiles/profile-demo-001/tracker/${route}`);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    const opener = page.locator(`[data-pd-id="${prefix}.toolbar.open-selected"]`);
    await expect(opener).toBeDisabled();
    const cell = page.locator(`[data-pd-id="${prefix}.table-scroll"] td[data-ledger-row][data-ledger-column]`).first();
    await expect(cell).toBeVisible();
    await cell.click();
    await expect(opener).toBeEnabled();
    await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
    await opener.click();
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(1);
  });
}

test("Accounts returns from a protected review to compact Access Channels on the same page", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  await page.goto("/profiles/profile-demo-001/tracker/accounts");
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  const identity = page.locator('td[data-ledger-row="ACC-BOOK-A"][data-ledger-column="account_id"]');
  await identity.click(); await page.keyboard.press("Enter");
  const review = page.locator('[data-pd-id="accounts.table-scroll.protected-cell"]');
  await expect(review).toBeVisible();
  await review.getByRole("button", { name: "Open record for review" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit account" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  const channels = page.locator('td[data-ledger-row="ACC-BOOK-A"][data-ledger-column="channel"]');
  await expect(channels).toHaveAttribute("data-ledger-editable", "true");
  await channels.click();
  await expect(channels).toHaveAttribute("data-ledger-selected", "true");
  await channels.dblclick();
  await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toBeVisible();
});

test("V2 Sportsbook and Free Bet row actions fit the compact mobile grid", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } });
  for (const route of ["sportsbook-bets", "free-bets"] as const) {
    await page.goto(`/profiles/profile-demo-001/tracker/${route}`);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    const table = page.locator(`[data-pd-id="${route === "sportsbook-bets" ? "sportsbook" : "free-bets"}.table-scroll"] table`);
    const actionHeader = table.locator("thead th:last-child");
    const width = await actionHeader.evaluate(element => element.getBoundingClientRect().width);
    expect(width).toBeLessThanOrEqual(130);
    const actions = table.locator("tbody tr").first().locator("td:last-child");
    await expect(actions.getByRole("button")).toHaveCount(2);
    await expect(actions.getByRole("button", { name: /More actions for/ })).toBeVisible();
    const bounds = await actions.evaluate(cell => {
      const right = cell.getBoundingClientRect().right;
      return [...cell.querySelectorAll("button")].map(button => button.getBoundingClientRect().right - right);
    });
    expect(bounds.every(overhang => overhang <= 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("placed Extra Place opens its governed settlement review stage", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } });
  await page.goto("/profiles/profile-demo-001/tracker/each-way-extra-places");
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  await page.locator('td[data-ledger-row="CP117-EP-001"][data-ledger-column="runner"]').click();
  await page.locator('[data-pd-id="extra-place.toolbar.open-selected"]').click();
  await expect(page.getByRole("dialog", { name: /Edit Extra Place row/ })).toBeVisible();
  await expect(page.locator('[data-pd-id="ledger-editor.tab.settlement"]')).toHaveAttribute("aria-selected", "true");
});

for (const [route] of owned) {
  test(`${route} combined selection opens one Profile-owned workbench`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
    await page.goto(authURL);
    await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } });
    await page.goto(`/tracker/${route}`);
    const opener = page.locator(`[data-pd-id="combined.${route}.open-selected"]`);
    await expect(opener).toBeDisabled();
    const cell = page.locator(`[data-pd-id="combined.${route}.table-scroll"] td[data-ledger-row][data-ledger-column]`).first();
    await expect(cell).toBeVisible();
    await cell.click();
    await expect(opener).toBeEnabled();
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(0);
    await opener.click();
    await expect(page).toHaveURL(/\/profiles\/[^/]+\/tracker\//);
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(1);
  });
}

for (const [route, prefix] of owned.filter(([route]) => route !== "sportsbook-bets")) {
  test(`${route} protects lifecycle cells until an explicit review action`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
    await page.goto(authURL);
    await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } });
    await page.goto(`/profiles/profile-demo-001/tracker/${route}`);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    const protectedColumn = route === "cash-adjustments" ? "amount" : "status";
    const status = page.locator(`[data-pd-id="${prefix}.table-scroll"] td[data-ledger-column="${protectedColumn}"]`).first();
    await status.dblclick();
    const notice = page.locator(`[data-pd-id="${prefix}.table-scroll.protected-cell"]`);
    await expect(notice).toBeVisible();
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(0);
    await notice.getByRole("button", { name: "Open record for review" }).click();
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(1);
  });
}

test("Position financial table scrolls as a read-only region", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 844 });
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  await page.goto("/");
  const table = page.locator('[data-pd-id="position.financial-table-scroll"]');
  await expect(table).toHaveAttribute("role", "region");
  await expect(table).toHaveAttribute("aria-label", /Report table/);
  await table.scrollIntoViewIfNeeded();
  await table.focus();
  const before = await table.evaluate(element => element.scrollLeft);
  await page.keyboard.press("ArrowRight");
  const after = await table.evaluate(element => element.scrollLeft);
  expect(after).toBeGreaterThanOrEqual(before);
  await table.evaluate(element => { element.scrollLeft = 0; });
  const firstCell = table.locator("td").first();
  await expect(firstCell).toBeVisible();
  const bounds = await firstCell.boundingBox();
  expect(bounds).toBeTruthy();
  await page.mouse.move(bounds!.x + Math.min(bounds!.width - 2, 40), bounds!.y + 2);
  await page.mouse.down();
  await page.mouse.move(bounds!.x - 130, bounds!.y + 2, { steps: 5 });
  await page.mouse.up();
  expect(await table.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  await expect(table.locator('[data-ledger-selected="true"]')).toHaveCount(0);
});

test("Profiles directory table pans without opening a Profile and keeps its actions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  await page.goto("/profiles");
  await page.locator('[data-pd-id="profiles.directory.details"]').locator(':scope > summary').click();
  const table = page.locator('[data-pd-id="profiles.directory.table-scroll"]');
  await expect(table).toHaveAttribute("role", "region");
  await table.scrollIntoViewIfNeeded();
  const cell = table.locator("tbody td:nth-child(2)").first();
  const bounds = await cell.boundingBox();
  expect(bounds).toBeTruthy();
  await page.mouse.move(bounds!.x + 3, bounds!.y + 3);
  await page.mouse.down();
  await page.mouse.move(bounds!.x - 130, bounds!.y + 3, { steps: 5 });
  await page.mouse.up();
  expect(await table.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  await expect(page.locator('[data-pd-id="profiles.directory.details"]')).toBeVisible();
  await expect(page.locator('[data-pd-id^="profiles.directory.row."]').first()).toBeVisible();
});

test("formal Reports tables use the same read-only pan without changing a period", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } });
  await page.goto("/reports");
  await page.locator('[data-pd-id="reports.formal.advanced"] > summary').click();
  const table = page.locator('[data-pd-id="reports.period-pnl.period-table"]');
  await expect(table).toHaveAttribute("role", "region");
  await expect(table).toHaveAttribute("aria-label", /Report table/);
  await table.scrollIntoViewIfNeeded();
  expect(await table.evaluate(element => element.scrollWidth - element.clientWidth)).toBeGreaterThan(0);
  const firstCell = table.locator("tbody td:nth-child(2)").first();
  const selectedBefore = await table.locator('button[aria-pressed="true"]').count();
  const bounds = await firstCell.boundingBox();
  expect(bounds).toBeTruthy();
  await page.mouse.move(bounds!.x + 3, bounds!.y + 3);
  await page.mouse.down();
  await page.mouse.move(Math.max(8, bounds!.x - 110), bounds!.y + 3, { steps: 5 });
  await page.mouse.up();
  expect(await table.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  expect(await table.locator('button[aria-pressed="true"]').count()).toBe(selectedBefore);
});

test("Sportsbook drag pans the grid without selecting a row or opening a workbench", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 844 });
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } });
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  const grid = page.locator('[data-pd-id="sportsbook.table-scroll"]');
  await grid.scrollIntoViewIfNeeded();
  const cell = grid.locator('td[data-ledger-column="event_name"]').first();
  const bounds = await cell.boundingBox();
  expect(bounds).toBeTruthy();
  const start = { x: bounds!.x + 3, y: bounds!.y + 3 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 140, start.y, { steps: 6 });
  await page.mouse.up();
  expect(await grid.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  await expect(grid.locator('[data-ledger-selected="true"]')).toHaveCount(0);
  await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(0);
  await expect(page.locator('[data-pd-id="sportsbook.toolbar.open-selected"]')).toBeDisabled();
});

test("combined Account Access Channels uses its compact native authority and retains a failed draft", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  const endpoint = "/api/profiles/profile-demo-001/accounts";
  const sourceResponse = await page.request.get(endpoint);
  expect(sourceResponse.ok()).toBe(true);
  const sourceRows = await sourceResponse.json() as Array<Record<string, unknown>>;
  const source = sourceRows.find(row => row.catalogue_id && row.type !== "Exchange" && row.signup_offer_status !== "Yes");
  expect(source).toBeTruthy();
  const recordId = String(source!.account_id);
  const originalChannels = source!.access_channels as string[];
  const added = originalChannels.includes("Mobile") ? "Retail" : "Mobile";
  await page.goto(`/tracker/accounts?q=${encodeURIComponent(recordId)}`);
  const cell = page.locator(`[data-pd-id="combined.accounts.table-scroll"] td[data-ledger-row="profile-demo-001::${recordId}"][data-ledger-column="channel"]`);
  await expect(cell).toBeVisible();
  await cell.dblclick();
  const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
  await expect(editor.locator('[data-pd-id="combined.accounts.cell-editor.channel"]')).toBeVisible();
  await editor.getByRole("button", { name: "Show all access channels options" }).click();
  await editor.getByRole("option", { name: added }).click();
  let rejectOnce = true;
  await page.route(`**/profiles/profile-demo-001/accounts/${recordId}`, async route => {
    if (route.request().method() === "PUT" && rejectOnce) {
      rejectOnce = false;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Synthetic retry" }) });
    } else await route.continue();
  });
  await editor.getByRole("button", { name: "Apply access channels" }).click();
  await expect(editor).toBeVisible();
  await expect(editor.getByRole("alert")).toContainText(/Synthetic retry|not confirmed|not saved/i);
  await expect(editor.locator('[data-pd-id="combined.accounts.cell-editor.channel"]')).toContainText(added);
  await editor.getByRole("button", { name: "Apply access channels" }).click();
  await expect(editor).toHaveCount(0);
  const savedResponse = await page.request.get(`${endpoint}/${recordId}`);
  expect(savedResponse.ok()).toBe(true);
  const saved = await savedResponse.json() as Record<string, unknown>;
  expect(saved.access_channels).toContain(added);
  for (const key of ["profile_id", "account_id", "current_balance", "pending_withdrawal_amount", "last_balance_update", "status", "lifecycle_status"]) expect(saved[key]).toEqual(source![key]);
  await page.reload();
  await expect(page.locator(`[data-pd-id="combined.accounts.table-scroll"] td[data-ledger-row="profile-demo-001::${recordId}"][data-ledger-column="channel"]`)).toContainText(added);
});

test("Opportunities Quick Capture chooses an owner and continues the existing unsaved draft", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  await page.goto("/opportunities");
  await page.locator('[data-pd-id="opportunities.overview"]').getByRole("button", { name: "Quick Capture" }).click();
  await expect(page).toHaveURL(/\/tracker\/sportsbook-bets\?.*entry=quick/);
  const choice = page.getByRole("region", { name: "Add Sportsbook Bets" });
  await expect(choice).toBeVisible();
  await choice.locator('[data-pd-id="combined.sportsbook-bets.new-owner"]').click();
  await page.getByRole("option", { name: "Subscriber Alpha" }).click();
  await choice.getByRole("button", { name: "Continue to Add workflow" }).click();
  await expect(page.locator('[data-pd-id="sportsbook.quick-capture.dialog"]')).toBeVisible();
  await page.locator('[data-pd-id="sportsbook.quick-capture.offer-text"]').fill("Synthetic advisory wording");
  await page.getByRole("button", { name: "Open full workbench" }).click();
  await expect(page.getByRole("dialog", { name: /Create sportsbook row/i }).getByLabel("Offer", { exact: true })).toHaveValue("Synthetic advisory wording");
  await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(1);
});
