import { expect, test } from "@playwright/test";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const preview = "/design-lab/sportsbook-proposals?amendment=operations";

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
});

test("four preview rows switch one animated warning panel and preserve identity and draft", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(preview);
  const rows = page.locator('[data-pd-id^="lab.proposal.row."]');
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0).getByRole("button", { name: /Show 3 recorded warnings/ })).toBeVisible();
  await expect(rows.nth(1).getByRole("button", { name: /Show 1 recorded warnings/ })).toBeVisible();
  await expect(rows.nth(2).getByRole("button", { name: /Show 2 recorded warnings/ })).toBeVisible();
  await expect(rows.nth(3).locator("[aria-controls^='lab-proposal-warning']")).toHaveCount(0);
  const details = page.locator('[class*="warningDetailRow"]');
  expect(await details.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height))).toEqual([0.5, 0.5, 0.5]);
  await rows.nth(0).getByRole("button", { name: /Show 3 recorded warnings/ }).click();
  await page.waitForTimeout(80);
  const intermediate = await details.first().evaluate(node => node.getBoundingClientRect().height);
  expect(intermediate).toBeGreaterThan(1);
  expect(intermediate).toBeLessThan(165);
  await page.waitForTimeout(220);
  const firstHeight = await details.first().evaluate(node => node.getBoundingClientRect().height);
  expect(firstHeight).toBeGreaterThan(130);
  await rows.nth(1).getByRole("button", { name: /Show 1 recorded warnings/ }).click();
  await rows.nth(0).getByRole("button", { name: /Show 3 recorded warnings/ }).click();
  await page.waitForTimeout(260);
  const switchedHeights = await details.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  expect(switchedHeights[0]).toBeGreaterThan(130);
  expect(switchedHeights[1]).toBeLessThan(1);
  expect(switchedHeights[2]).toBeLessThan(1);
  await expect(page.locator('[data-pd-id="lab.proposal.warnings"]')).toContainText("Arsenal v Chelsea · Profile A");
  await page.screenshot({ path: info.outputPath("three-warnings-open.png"), fullPage: true });
  await rows.nth(1).getByRole("button", { name: /Show 1 recorded warnings/ }).click();
  await page.waitForTimeout(260);
  const heights = await details.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  expect(heights[0]).toBeLessThan(1);
  expect(heights[1]).toBeGreaterThan(65);
  expect(heights[2]).toBeLessThan(1);
  await expect(page.locator('[data-pd-id="lab.proposal.warnings.DEMO-002"]')).toContainText("Ipswich Town v Norwich City · Profile B");
  await page.locator('[data-pd-id="lab.proposal.warnings.DEMO-002"]').getByRole("button", { name: "Review Back confirmation" }).click();
  await expect(page.locator('[data-pd-id="lab.proposal.workbench"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="lab.proposal.workbench"]')).toContainText("Ipswich Town v Norwich City · Profile B");
  await expect(page.locator('[data-operation-focus="back"]')).toBeFocused();
  await page.locator('[data-operation-focus="back"]').fill("12.00");
  await page.getByRole("button", { name: "Return to ledger" }).click();
  await expect(rows.nth(1).getByRole("button", { name: /Show 1 recorded warnings/ })).toBeFocused();
  await page.locator('[data-pd-id="lab.proposal.warnings.DEMO-002"]').getByRole("button", { name: "Review Back confirmation" }).click();
  await expect(page.locator('[data-operation-focus="back"]')).toHaveValue("12.00");
  await page.getByRole("button", { name: "Return to ledger" }).click();
  const date = rows.nth(1).getByRole("button", { name: /Edit Settles date and time/ });
  await date.click();
  const input = rows.nth(1).getByRole("textbox", { name: /Settles date and time/ });
  await input.fill("2026-12-01T15:00");
  await page.getByRole("textbox", { name: "Search proposal rows" }).fill("Arsenal");
  await expect(rows).toHaveCount(1);
  await page.getByRole("textbox", { name: "Search proposal rows" }).fill("Ipswich");
  await expect(rows).toHaveCount(1);
  await expect(rows.first().getByRole("textbox", { name: /Settles date and time/ })).toHaveValue("2026-12-01T15:00");
  await rows.first().getByRole("button", { name: "Apply date" }).click();
  await expect(rows.first()).toContainText("Tue 1st Dec - 15:00");
  await page.getByRole("textbox", { name: "Search proposal rows" }).fill("");
  await page.getByRole("combobox", { name: "Rows per page" }).selectOption("2");
  await expect(rows).toHaveCount(2);
  await expect(page.getByText("4 synthetic records · Page 1 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Leeds United v Sunderland");
  await expect(rows.nth(1)).toContainText("Ipswich Town v Norwich City");
  await expect(rows.nth(1)).toContainText("Tue 1st Dec - 15:00");
  await expect(page.locator('[data-pd-id="lab.proposal.warnings.DEMO-002"]').locator("xpath=ancestor::tr")).toHaveAttribute("aria-hidden", "true");
  await page.getByRole("combobox", { name: "Sort proposal rows" }).selectOption("event");
  await expect(rows.first()).toContainText("Arsenal v Chelsea");
  await page.locator('[data-pd-id="lab.proposal.profile"]').click();
  await page.getByRole("option", { name: "Profile B" }).click();
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Ipswich Town v Norwich City");
  await expect(rows.first()).toContainText("Tue 1st Dec - 15:00");
  expect(await page.locator('[data-pd-id="lab.proposal.warnings.DEMO-001"]').count()).toBe(0);
});

test("warning panel uses reduced motion and remains contained at mobile width", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(preview);
  await page.getByRole("button", { name: /Show 2 recorded warnings/ }).click();
  const panel = page.locator('[data-pd-id="lab.proposal.warnings.DEMO-003"]');
  await expect(panel).toBeVisible();
  expect(await panel.locator("..").locator("..").evaluate(node => parseFloat(getComputedStyle(node).transitionDuration))).toBeLessThan(0.001);
  const panelWidth = await panel.evaluate(node => node.getBoundingClientRect().width);
  const scrollWidth = await page.locator('[class*="proposalTableScroll"]').evaluate(node => node.getBoundingClientRect().width);
  expect(panelWidth).toBeLessThanOrEqual(scrollWidth + 1);
  expect(await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth))).toBe(0);
  await page.screenshot({ path: info.outputPath("mobile-two-warnings.png"), fullPage: true });
  await panel.getByRole("button", { name: /Close warnings/ }).focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Show 2 recorded warnings/ })).toBeFocused();
  await expect(page.getByRole("button", { name: /Show 2 recorded warnings/ })).toHaveAttribute("aria-expanded", "false");
});

test("corrective review targets secondary, primary, then secondary identities without sharing drafts", async ({ page }) => {
  await page.goto(preview);
  const first = page.locator('[data-pd-id="lab.proposal.row.DEMO-001"]');
  const second = page.locator('[data-pd-id="lab.proposal.row.DEMO-002"]');
  const workbench = page.locator('[data-pd-id="lab.proposal.workbench"]');

  await second.getByRole("button", { name: /Show 1 recorded warnings/ }).click();
  await page.locator('[data-pd-id="lab.proposal.warnings.DEMO-002"]').getByRole("button", { name: "Review Back confirmation" }).click();
  await expect(page.getByRole("heading", { name: "Edit Sportsbook Bet · DEMO-002" })).toBeVisible();
  await expect(workbench).toContainText("Ipswich Town v Norwich City · Profile B");
  await expect(page.locator('[data-operation-focus="back"]')).toBeFocused();
  await page.locator('[data-operation-focus="back"]').fill("12.34");
  await page.getByRole("button", { name: "Return to ledger" }).click();
  await expect(second.getByRole("button", { name: /Show 1 recorded warnings/ })).toBeFocused();
  await expect(second.getByRole("button", { name: /Show 1 recorded warnings/ })).toHaveAttribute("aria-expanded", "true");

  await first.getByRole("button", { name: /Show 3 recorded warnings/ }).click();
  await page.locator('[data-pd-id="lab.proposal.warnings"]').getByRole("button", { name: "Review Back confirmation" }).click();
  await expect(page.getByRole("heading", { name: "Edit Sportsbook Bet · DEMO-001" })).toBeVisible();
  await expect(workbench).toContainText("Arsenal v Chelsea · Profile A");
  await expect(page.locator('[data-operation-focus="back"]')).toBeFocused();
  await expect(page.locator('[data-operation-focus="back"]')).toHaveValue("10.00");
  await page.getByRole("button", { name: "Return to ledger" }).click();
  await expect(first.getByRole("button", { name: /Show 3 recorded warnings/ })).toBeFocused();
  await expect(first.getByRole("button", { name: /Show 3 recorded warnings/ })).toHaveAttribute("aria-expanded", "true");

  await second.getByRole("button", { name: /Show 1 recorded warnings/ }).click();
  await page.locator('[data-pd-id="lab.proposal.warnings.DEMO-002"]').getByRole("button", { name: "Review Back confirmation" }).click();
  await expect(page.getByRole("heading", { name: "Edit Sportsbook Bet · DEMO-002" })).toBeVisible();
  await expect(workbench).toContainText("Ipswich Town v Norwich City · Profile B");
  await expect(page.locator('[data-operation-focus="back"]')).toBeFocused();
  await expect(page.locator('[data-operation-focus="back"]')).toHaveValue("12.34");
  await page.getByRole("button", { name: "Return to ledger" }).click();

  await first.getByRole("button", { name: "Review protected bookmaker cell" }).dblclick();
  await page.locator('[data-pd-id="lab.proposal.protected-cell"]').getByRole("button", { name: "Open record for review" }).click();
  await expect(page.getByRole("heading", { name: "Edit Sportsbook Bet · DEMO-001" })).toBeVisible();
  await expect(workbench).toContainText("Arsenal v Chelsea · Profile A");
  await expect(page.locator('[data-operation-focus="back"]')).toBeFocused();
  await page.getByRole("button", { name: "Return to ledger" }).click();

  await page.locator('[data-pd-id="lab.proposal.profile"]').click();
  await page.getByRole("option", { name: "Profile A" }).click();
  await page.getByRole("button", { name: "Open Bet Workbench" }).click();
  await expect(page.getByRole("heading", { name: "Edit Sportsbook Bet · DEMO-001" })).toBeVisible();
  await expect(workbench).toContainText("Arsenal v Chelsea · Profile A");
  await page.getByRole("button", { name: "Return to ledger" }).click();
  await page.locator('[data-pd-id="lab.proposal.profile"]').click();
  await page.getByRole("option", { name: "Profile B" }).click();
  await page.getByRole("button", { name: "Open Bet Workbench" }).click();
  await expect(page.getByRole("heading", { name: "Edit Sportsbook Bet · DEMO-002" })).toBeVisible();
  await expect(workbench).toContainText("Ipswich Town v Norwich City · Profile B");
});

test("recorded-date sorting follows committed displayed dates and ignores unapplied drafts", async ({ page }) => {
  await page.goto(preview);
  await page.getByRole("combobox", { name: "Rows per page" }).selectOption("2");
  const rows = page.locator('[data-pd-id^="lab.proposal.row."]');
  await expect(rows.first()).toHaveAttribute("data-pd-id", "lab.proposal.row.DEMO-001");
  const first = page.locator('[data-pd-id="lab.proposal.row.DEMO-001"]');
  await first.getByRole("button", { name: "Edit Settles date and time" }).click();
  await first.getByRole("textbox", { name: "Settles date and time" }).fill("2026-12-31T18:54");
  await expect(rows.first()).toHaveAttribute("data-pd-id", "lab.proposal.row.DEMO-001");
  await first.getByRole("button", { name: "Apply date" }).click();
  await expect(rows.first()).toHaveAttribute("data-pd-id", "lab.proposal.row.DEMO-002");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(rows.last()).toHaveAttribute("data-pd-id", "lab.proposal.row.DEMO-001");
  await expect(first).toContainText("31st Dec");

  await first.getByRole("button", { name: "Edit Settles date and time" }).click();
  await first.getByRole("textbox", { name: "Settles date and time" }).fill("2026-11-01T18:54");
  await expect(rows.last()).toHaveAttribute("data-pd-id", "lab.proposal.row.DEMO-001");
  await first.getByRole("button", { name: "Apply date" }).click();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(rows.first()).toHaveAttribute("data-pd-id", "lab.proposal.row.DEMO-001");
  await expect(first).toContainText("1st Nov");
});

test("Extra Place Runner/Race uses one cell-width editor in owned and combined scope", async ({ page }) => {
  test.setTimeout(150_000);
  expect((await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } })).status()).toBe(200);
  for (const [width, height, theme] of [[2048, 1152, "dark"], [1440, 900, "light"], [390, 844, "dark"]] as const) {
    await page.setViewportSize({ width, height });
    await page.addInitScript(value => localStorage.setItem("openforge-theme", value), theme);
    for (const scope of ["owned", "combined"] as const) {
      const prefix = scope === "owned" ? "extra-place" : "combined.each-way-extra-places";
      await page.goto(scope === "owned" ? "/profiles/profile-demo-001/tracker/each-way-extra-places" : "/tracker/each-way-extra-places");
      const cell = page.locator(`[data-pd-id="${prefix}.table-scroll"] td[data-ledger-column="runner"][data-ledger-row]`).first();
      await expect(cell).toBeVisible({ timeout: 45_000 });
      const tableWidth = await cell.evaluate(node => node.closest("table")!.getBoundingClientRect().width);
      await cell.dblclick();
      const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
      await expect(editor).toBeVisible();
      const geometry = await editor.evaluate((node, selector) => { const cell = document.querySelector(selector as string)!; return { editor: node.getBoundingClientRect().width, cell: cell.getBoundingClientRect().width, table: cell.closest("table")!.getBoundingClientRect().width, overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth) }; }, `[data-pd-id="${prefix}.table-scroll"] td[data-ledger-column="runner"][data-ledger-row]`);
      expect(geometry.editor).toBeLessThanOrEqual(geometry.cell + 1);
      expect(geometry.editor).toBeLessThanOrEqual(width - 16 + 1);
      expect(Math.abs(geometry.table - tableWidth)).toBeLessThan(1);
      expect(geometry.overflow).toBe(0);
      await expect(editor.getByRole("textbox", { name: "Runner" })).toBeVisible();
      await expect(editor.getByRole("textbox", { name: "Race" })).toBeVisible();
      await expect(editor.getByRole("button", { name: "Apply Runner / Race" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(editor).toHaveCount(0);
      await expect(cell).toBeFocused();
    }
  }
});

test("Runner/Race grouped Apply persists both fields through owned and combined commands", async ({ page }) => {
  const profile = "profile-demo-001";
  const module = "each-way-extra-places";
  const id = `PD-FIX-676-GROUP-${Date.now()}`;
  const created = await page.request.post(`/api/profiles/${profile}/${module}`, { data: {
    each_way_extra_place_id: id, placed_at: "2026-08-24T12:00", runner: "Synthetic first runner",
    race: "Synthetic first race", bookmaker: "Bookmaker A", bookmaker_account: "Bookmaker A",
    mode: "Extra Place", each_way_stake: "10.00", back_odds: "6.00",
    place_term_numerator: "1", place_term_denominator: "5", bookmaker_places: "5", exchange_places: "4",
    win_exchange: "Exchange A", win_lay_odds: "2.30", place_exchange: "Exchange A", place_lay_odds: "4.50",
    status: "Prospecting", result: "Pending",
  } });
  expect(created.status(), await created.text()).toBe(201);
  const initial = await created.json() as Record<string, unknown>;
  for (const [scope, runner, race] of [
    ["owned", "Synthetic owned runner", "Synthetic owned race"],
    ["combined", "Synthetic combined runner", "Synthetic combined race"],
  ] as const) {
    const prefix = scope === "owned" ? "extra-place" : `combined.${module}`;
    await page.goto(scope === "owned" ? `/profiles/${profile}/tracker/${module}?q=${id}` : `/tracker/${module}?q=${id}`);
    const rowIdentity = scope === "owned" ? id : `${profile}::${id}`;
    const cell = page.locator(`[data-pd-id="${prefix}.table-scroll"] td[data-ledger-column="runner"][data-ledger-row="${rowIdentity}"]`);
    await expect(cell).toBeVisible({ timeout: 45_000 });
    await cell.dblclick();
    const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
    await expect(editor).toBeVisible();
    await editor.getByRole("textbox", { name: "Runner" }).fill(runner);
    await editor.getByRole("textbox", { name: "Race" }).fill(race);
    await editor.getByRole("button", { name: "Apply Runner / Race" }).click();
    await expect(editor).toHaveCount(0);
    await page.reload();
    const saved = await (await page.request.get(`/api/profiles/${profile}/${module}/${id}`)).json() as Record<string, unknown>;
    expect(saved.runner).toBe(runner);
    expect(saved.race).toBe(race);
    for (const field of ["each_way_stake", "back_odds", "status", "result", "bookmaker_account"]) expect(saved[field]).toEqual(initial[field]);
  }
});

test("ordinary scalar editor follows a resized cell beyond 400px", async ({ page }) => {
  test.setTimeout(120_000);
  expect((await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } })).status()).toBe(200);
  const id = `PD-FIX-676-${Date.now()}`;
  const created = await page.request.post("/api/profiles/profile-demo-001/sportsbook-bets", { data: {
    sportsbook_bet_id: id, event_name: "Synthetic resized editor", offer_text: "Cell width review",
    offer_name: "Fixture review", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
    fixture_type: "Football", market: "Match Odds", status: "Prospecting", result: "Pending",
    back_stake: "10.00", back_odds: "2.00", match_strategy: "Standard", lay_odds_1: "2.00",
  } });
  expect(created.status(), await created.text()).toBe(201);
  await page.setViewportSize({ width: 2048, height: 1152 });
  await page.goto(`/profiles/profile-demo-001/tracker/sportsbook-bets?q=${id}`);
  const cell = page.locator(`[data-pd-id="sportsbook.table-scroll"] td[data-ledger-row="${id}"][data-ledger-column="event_name"]`);
  await expect(cell).toBeVisible({ timeout: 45_000 });
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  const header = page.getByRole("columnheader", { name: "Event", exact: true }).first();
  const handle = header.locator(".table-column-resize-handle");
  await expect(handle).toBeVisible();
  const h = (await handle.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2 + 240, h.y + h.height / 2, { steps: 5 });
  await page.mouse.up();
  const actualCellWidth = await cell.evaluate(node => node.getBoundingClientRect().width);
  expect(actualCellWidth).toBeGreaterThan(400);
  const tableWidth = await cell.evaluate(node => node.closest("table")!.getBoundingClientRect().width);
  await cell.dblclick();
  const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
  await expect(editor).toBeVisible();
  const editorWidth = await editor.evaluate(node => node.getBoundingClientRect().width);
  expect(Math.abs(editorWidth - actualCellWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(await cell.evaluate(node => node.closest("table")!.getBoundingClientRect().width) - tableWidth)).toBeLessThanOrEqual(1);
  await page.keyboard.press("Escape");
  await expect(cell).toBeFocused();
});

test("all six owned and combined ledgers share the V2 frame and keep grid overflow inside", async ({ page }) => {
  test.setTimeout(240_000);
  expect((await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } })).status()).toBe(200);
  const modules = ["accounts", "sportsbook-bets", "free-bets", "casino-offers", "each-way-extra-places", "cash-adjustments"];
  for (const [width, height, theme] of [[2048, 1152, "dark"], [1440, 900, "light"], [390, 844, "dark"]] as const) {
    await page.setViewportSize({ width, height });
    await page.addInitScript(value => localStorage.setItem("openforge-theme", value), theme);
    for (const module of modules) for (const scope of ["owned", "combined"] as const) {
      await page.goto(scope === "owned" ? `/profiles/profile-demo-001/tracker/${module}` : `/tracker/${module}`);
      const shell = page.locator(".ux-v2-main > .page-shell");
      await expect(shell).toBeVisible();
      const geometry = await shell.evaluate(node => {
        const main = document.querySelector(".ux-v2-main")!.getBoundingClientRect();
        const shell = node.getBoundingClientRect();
        const css = getComputedStyle(node);
        const crumb = document.querySelector(".ux-v2-crumb-row");
        return { available: main.width, actual: shell.width, left: shell.left - main.left, right: main.right - shell.right,
          gutterLeft: parseFloat(css.paddingLeft), gutterRight: parseFloat(css.paddingRight), contentLeft: shell.left + parseFloat(css.paddingLeft),
          crumbLeft: crumb ? crumb.getBoundingClientRect().left + parseFloat(getComputedStyle(crumb).paddingLeft) : null,
          overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth) };
      });
      expect(Math.abs(geometry.available - geometry.actual), `${scope} ${module} ${width}`).toBeLessThan(1);
      expect(Math.abs(geometry.left - geometry.right)).toBeLessThan(1);
      expect(Math.abs(geometry.gutterLeft - geometry.gutterRight)).toBeLessThan(1);
      expect(geometry.gutterLeft).toBeGreaterThanOrEqual(16);
      if (geometry.crumbLeft !== null) expect(Math.abs(geometry.crumbLeft - geometry.contentLeft)).toBeLessThan(1);
      expect(geometry.overflow, `${scope} ${module} ${width}`).toBe(0);
    }
  }
});

test("authenticated non-ledger page families share the V2 frame without horizontal overflow", async ({ page }) => {
  test.setTimeout(180_000);
  // Profile onboarding is an intentional standalone flow outside ux-v2-main.
  const routes = ["/", "/tasks", "/opportunities", "/tracker", "/reports", "/profiles", "/profiles/profile-demo-001", "/notifications", "/settings"];
  for (const [width, height, theme] of [[2048, 1152, "dark"], [1440, 900, "light"], [390, 844, "dark"]] as const) {
    await page.setViewportSize({ width, height });
    await page.addInitScript(value => localStorage.setItem("openforge-theme", value), theme);
    for (const route of routes) {
      await page.goto(route);
      const shell = page.locator(".ux-v2-main > .page-shell").first();
      await expect(shell, `${route} ${width}`).toBeVisible();
      const measure = await shell.evaluate(node => {
        const main = document.querySelector(".ux-v2-main")!.getBoundingClientRect();
        const frame = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const crumb = document.querySelector(".ux-v2-crumb-row");
        return {
          available: main.width, frame: frame.width,
          left: frame.left - main.left, right: main.right - frame.right,
          paddingLeft: parseFloat(style.paddingLeft), paddingRight: parseFloat(style.paddingRight),
          contentLeft: frame.left + parseFloat(style.paddingLeft),
          crumbLeft: crumb ? crumb.getBoundingClientRect().left + parseFloat(getComputedStyle(crumb).paddingLeft) : null,
          overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
        };
      });
      expect(Math.abs(measure.available - measure.frame), `${route} ${width}`).toBeLessThan(1);
      expect(Math.abs(measure.left - measure.right), `${route} ${width}`).toBeLessThan(1);
      expect(Math.abs(measure.paddingLeft - measure.paddingRight), `${route} ${width}`).toBeLessThan(1);
      expect(measure.paddingLeft).toBeGreaterThanOrEqual(16);
      if (measure.crumbLeft !== null) expect(Math.abs(measure.crumbLeft - measure.contentLeft), `${route} ${width} breadcrumb`).toBeLessThan(1);
      expect(measure.overflow, `${route} ${width}`).toBe(0);
    }
  }
});

test("Sportsbook workbench keeps an inner Lab form width inside the shared page frame", async ({ page }) => {
  await page.setViewportSize({ width: 2048, height: 1152 });
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets?record=CP117-CELL-001");
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await expect(workbench).toBeVisible({ timeout: 45_000 });
  const measure = await workbench.evaluate(node => {
    const main = document.querySelector(".ux-v2-main")!.getBoundingClientRect();
    const shell = document.querySelector(".ux-v2-main > .page-shell")!.getBoundingClientRect();
    const inner = node.closest(".sportsbook-v2-workbench")!.getBoundingClientRect();
    return { main: main.width, shell: shell.width, inner: inner.width, left: inner.left - shell.left, right: shell.right - inner.right, overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth) };
  });
  expect(Math.abs(measure.main - measure.shell)).toBeLessThan(1);
  expect(measure.inner).toBeLessThanOrEqual(1500.5);
  expect(Math.abs(measure.left - measure.right)).toBeLessThan(1);
  expect(measure.overflow).toBe(0);
});
