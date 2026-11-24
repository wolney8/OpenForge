import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const evidence = "data/private/evidence/cp117-ledger-review-corrections";
const profile = "profile-demo-001";

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
  await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } });
  await page.route(/\/profiles\/profile-demo-001\/tracker-settings$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...await response.json(), active_date_preset: "All Dates" } });
  });
});

test("proposal exposes all warnings and cumulative partial-lay actions without changing a record", async ({ page }) => {
  await page.goto("/design-lab/sportsbook-proposals?amendment=operations");
  const proposal = page.locator('[data-pd-id="lab.proposal.operations"]');
  await expect(proposal).toBeVisible();
  await proposal.getByRole("button", { name: "Show 3 recorded warnings" }).click();
  const warnings = page.locator('[data-pd-id="lab.proposal.warnings"]');
  await expect(warnings.locator("li")).toHaveCount(3);
  const details = proposal.locator('[data-pd-id="sportsbook.workbench.partial-fill"]');
  await expect(details).not.toHaveAttribute("open", "");
  await details.locator("summary").click();
  await expect(details.getByText("Follow-up reminder")).toBeVisible();
  await expect(details.getByRole("button", { name: "Review Lay reversal" })).toBeVisible();
  await expect(details.getByRole("button", { name: "Review Back reversal" })).toBeDisabled();
  await details.getByRole("button", { name: "Review Lay reversal" }).click();
  await expect(details.getByRole("button", { name: "Remove Lay", exact: true })).toBeVisible();
  await details.getByRole("button", { name: "Cancel reversal" }).click();
  await expect(details.locator('[data-pd-leg-row="true"]')).toHaveCount(1);
  await warnings.getByRole("button", { name: "Update matched amount" }).click();
  const quick = page.locator('[data-pd-id="lab.proposal.quick-action"]');
  await expect(quick).toBeVisible();
  await quick.getByLabel("Matched so far").fill("4.00");
  await quick.getByRole("button", { name: "Confirm actual match" }).click();
  await expect(quick).toBeVisible();
  await expect(proposal.locator('[data-pd-leg-row="true"]')).toHaveCount(1);
  for (const [amount, matched, remaining, status, legs] of [
    ["5.10", "£5.10", "£2.90", "Partially matched", 2],
    ["6.00", "£6.00", "£2.00", "Partially matched", 3],
    ["6.00", "£6.00", "£2.00", "Partially matched", 3],
    ["8.00", "£8.00", "£0.00", "Fully matched", 4],
  ] as const) {
    if (!(await quick.isVisible())) await proposal.getByRole("button", { name: "Update matched amount" }).last().click();
    await quick.getByLabel("Matched so far").fill(amount);
    await quick.getByRole("button", { name: "Confirm actual match" }).click();
    await expect(proposal.locator('[class*="quickFigures"]')).toContainText(matched);
    await expect(proposal.locator('[class*="quickFigures"]')).toContainText(remaining);
    await expect(proposal).toContainText(status);
    await expect(proposal.locator('[data-pd-leg-row="true"]')).toHaveCount(legs);
  }
  await expect(proposal.getByRole("button", { name: "Show 2 recorded warnings" })).toBeVisible();
  await expect(warnings.locator("li")).toHaveCount(2);
  await proposal.getByRole("button", { name: "Show missing-request example" }).click();
  await expect(proposal.locator('[class*="quickFigures"]')).toContainText("Not recorded");
  await expect(proposal.getByRole("button", { name: "Update matched amount", exact: true })).toBeDisabled();
});

for (const [width, theme] of [[2048, "dark"], [1440, "light"], [390, "dark"]] as const) {
  test(`ledger frame, compact date and scrollable Actions at ${width}px ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(value => localStorage.setItem("openforge-theme", value), theme);
    const partialId = `PD-FIX-659-${width}-${Date.now()}`;
    const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
      sportsbook_bet_id: partialId, event_name: `Synthetic partial placement ${partialId}`, offer_text: "Synthetic source only",
      offer_name: "Synthetic offer", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
      fixture_type: "Football", market: "Match Odds", status: "Placed", result: "Pending",
      back_stake: "10.00", back_odds: "2.00", match_strategy: "Standard", lay_odds_1: "2.00",
      requested_lay_stake: "8.00", lay_actual: "8.00", lay_matched_stake_1: "5.00",
      lay_commission_1: "0", exchange_name: "Matchbook", back_placement_confirmed: true,
      multi_lay_outcomes_json: JSON.stringify([{ id: "leg-1", label: "Lay leg 1", layOdds: "2.00", exchangeName: "Matchbook", matchedStake: "5.00", isFinal: false }]),
      date_settled: "2026-11-20T18:54", user_notes: "Synthetic only",
    } });
    expect(created.status(), await created.text()).toBe(201);
    await page.goto(`/profiles/${profile}/tracker/sportsbook-bets`);
    const scroll = page.locator('[data-pd-id="sportsbook.table-scroll"]');
    await expect(scroll.locator("tbody tr").first()).toBeVisible();
    await page.getByRole("searchbox", { name: "Search sportsbook rows" }).fill(partialId);
    await expect(scroll.locator('td[data-ledger-column="lay_status"]', { hasText: "Partial lay" })).toBeVisible();
    await page.getByRole("searchbox", { name: "Search sportsbook rows" }).fill("Synthetic seeded match");
    await expect(scroll.locator("tbody tr")).toHaveCount(1);
    const date = scroll.locator('td[data-ledger-column="date_settled"] .ledger-compact-date').first();
    await expect(date).toContainText(/\w{3} \d{1,2}(?:st|nd|rd|th) \w{3}/);
    await date.focus();
    await expect(date).toHaveAttribute("aria-label", /\w+ \d{1,2}(?:st|nd|rd|th) \w+ 2026/);
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    expect(await tooltip.evaluate(element => { const rect = element.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight; })).toBe(true);
    await date.evaluate(node => (node as HTMLElement).blur());
    await expect(tooltip).toHaveCount(0);
    await date.dispatchEvent('touchstart');
    await expect(tooltip).toBeVisible();
    await date.evaluate(node => (node as HTMLElement).blur());
    const geometry = await page.evaluate(() => {
      const main = document.querySelector('.ux-v2-main')!.getBoundingClientRect();
      const shell = document.querySelector('.ux-v2-main > .page-shell')!.getBoundingClientRect();
      const heading = document.querySelector('.sportsbook-page-shell h1')!.getBoundingClientRect();
      const screen = document.querySelector('[data-pd-id="sportsbook.design-screen"]')!.getBoundingClientRect();
      const toolbar = document.querySelector('[aria-label="Sportsbook ledger controls"]')!.getBoundingClientRect();
      return { shellWidth: shell.width, left: shell.left - main.left, right: main.right - shell.right, headingScreen: Math.abs(heading.left - screen.left), toolbarInset: toolbar.left - screen.left, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(Math.abs(geometry.left - geometry.right)).toBeLessThanOrEqual(1);
    expect(geometry.headingScreen).toBeLessThanOrEqual(2);
    expect(geometry.toolbarInset).toBeGreaterThanOrEqual(width <= 700 ? 14 : 20);
    expect(geometry.toolbarInset).toBeLessThanOrEqual(width <= 700 ? 18 : 24);
    expect(geometry.overflow).toBeLessThanOrEqual(1);
    if (width === 2048) { expect(geometry.shellWidth).toBe(1560); expect(geometry.left).toBeGreaterThan(80); }
    const action = scroll.locator('tbody tr:first-child td:last-child');
    await expect(action).toHaveCSS("position", "static");
    if (width > 900) await page.setViewportSize({ width: 900, height: 1000 });
    const movement = await scroll.evaluate(node => { const root = node as HTMLElement; const cell = root.querySelector('tbody tr:first-child td:last-child')!; const before = cell.getBoundingClientRect().left; root.scrollLeft += 120; return before - cell.getBoundingClientRect().left; });
    expect(movement).toBeGreaterThan(50);
    if (width > 900) await page.setViewportSize({ width, height: 1000 });
    await scroll.evaluate(node => { (node as HTMLElement).scrollLeft = 0; });
    await page.evaluate(() => window.scrollTo(0, 0));
    await mkdir(evidence, { recursive: true });
    await page.screenshot({ path: join(evidence, `pd-sportsbook-${width}-${theme}.png`), fullPage: true });
    await page.goto('/design-lab/sportsbook-proposals?amendment=operations');
    await expect(page.locator('[data-pd-id="lab.proposal.operations"]')).toBeVisible();
    await page.locator('[data-pd-id="lab.proposal.operations"]').getByRole('button', { name: 'Show 3 recorded warnings' }).click();
    await page.locator('[data-pd-id="lab.proposal.operations"] [data-pd-id="sportsbook.workbench.partial-fill"] summary').click();
    await expect(page.locator('[data-pd-id="sportsbook.workbench.leg-controls-1"]')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: join(evidence, `lab-operations-${width}-${theme}.png`), fullPage: true });
  });
}

test("unsaved Sportsbook navigation uses the Lab dialog and retains a rejected draft", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto(`/profiles/${profile}/tracker/sportsbook-bets`);
  await page.locator('[data-pd-id="sportsbook.toolbar.add-row"]').click();
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  const offer = workbench.getByLabel("Original Offer text");
  await offer.fill("Synthetic unsaved review offer");
  await page.locator('[data-pd-id="ux-v2.breadcrumbs"] a', { hasText: "Sportsbook Bets" }).click();
  const dialog = page.locator('[data-pd-id="unsaved-changes.dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Keep editing", exact: true })).toBeFocused();
  for (const name of ["Keep editing", "Save and close", "Discard changes"]) await expect(dialog.getByRole("button", { name, exact: true })).toBeVisible();
  const geometry = await dialog.evaluate(node => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return { width: rect.width, left: rect.left, right: document.documentElement.clientWidth - rect.right, overflow: document.documentElement.scrollWidth - innerWidth, background: style.backgroundColor };
  });
  // Fixed backdrops use the layout viewport; the 15px native page scrollbar is outside it.
  expect(Math.abs(geometry.left - geometry.right)).toBeLessThanOrEqual(16);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.background).not.toBe("rgba(0, 0, 0, 0)");
  const titleRect = await dialog.getByRole("heading", { name: "You have unsaved changes." }).boundingBox();
  const closeRect = await dialog.locator('[data-pd-id="unsaved-changes.keep-editing-icon"]').boundingBox();
  expect(titleRect).not.toBeNull();
  expect(closeRect).not.toBeNull();
  expect(Math.abs(titleRect!.y - closeRect!.y)).toBeLessThanOrEqual(12);
  expect(closeRect!.x).toBeGreaterThan(titleRect!.x + titleRect!.width);
  await mkdir(evidence, { recursive: true });
  await dialog.screenshot({ path: join(evidence, "unsaved-dialog-900.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(offer).toHaveValue("Synthetic unsaved review offer");
  await page.locator('[data-pd-id="ux-v2.breadcrumbs"] a', { hasText: "Sportsbook Bets" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(offer).toHaveValue("Synthetic unsaved review offer");
  await page.locator('[data-pd-id="ux-v2.breadcrumbs"] a', { hasText: "Sportsbook Bets" }).click();
  await dialog.getByRole("button", { name: "Save and close" }).click();
  await expect(dialog).toBeVisible();
  await expect(workbench).toBeVisible();
  await expect(offer).toHaveValue("Synthetic unsaved review offer");
  await dialog.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(workbench).toHaveCount(0);
});
