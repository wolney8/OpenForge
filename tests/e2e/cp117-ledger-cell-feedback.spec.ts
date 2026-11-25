import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const profile = "profile-demo-001";
const evidence = "data/private/evidence/cp117-ledger-cell-feedback";

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
  await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } });
});

test("six owned and six combined ledgers use the same in-cell blocked review", async ({ page }) => {
  test.setTimeout(120_000);
  for (const [module, ownedId, column] of [
    ["accounts", "accounts", "current_balance"],
    ["sportsbook-bets", "sportsbook", "displayed_value"],
    ["free-bets", "free-bets", "status"],
    ["casino-offers", "casino-offers", "status"],
    ["each-way-extra-places", "extra-place", "qualLoss"],
    ["cash-adjustments", "cash-adjustments", "amount"],
  ] as const) {
    for (const combined of [false, true]) {
      await page.goto(combined ? `/tracker/${module}` : `/profiles/${profile}/tracker/${module}`);
      await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
      const gridId = combined ? `combined.${module}` : ownedId;
      const cell = page.locator(`[data-pd-id="${gridId}.table-scroll"] td[data-ledger-row][data-ledger-column="${column}"]`).first();
      await expect(cell).toBeVisible();
      await cell.dblclick();
      const reviewId = combined ? `${gridId}.protected-cell` : module === "sportsbook-bets" ? "sportsbook.protected-cell" : `${gridId}.table-scroll.protected-cell`;
      const review = page.locator(`[data-pd-id="${reviewId}"]`);
      await expect(review).toBeVisible();
      await expect(cell).toHaveAttribute("data-ledger-review", "true");
      await expect(review.getByRole("button", { name: "Open record for review" })).toBeVisible();
      await review.getByRole("button", { name: "Open record for review" }).press("Escape");
      await expect(review).toHaveCount(0);
      await expect(cell).toBeFocused();
    }
  }
});

test("blocked Sportsbook edit highlights its cell and anchors review instead of adding a footer", async ({ page }) => {
  await page.goto(`/profiles/${profile}/tracker/sportsbook-bets`);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  const cell = page.locator('[data-pd-id="sportsbook.table-scroll"] td[data-ledger-column="displayed_value"][data-ledger-row]').first();
  await expect(cell).toBeVisible();
  await cell.dblclick();
  const review = page.locator('[data-pd-id="sportsbook.protected-cell"]');
  await expect(review).toBeVisible();
  await expect(cell).toHaveAttribute("data-ledger-review", "true");
  const geometry = await review.evaluate((element, anchor) => {
    const a = document.querySelector(anchor as string)!.getBoundingClientRect();
    const r = element.getBoundingClientRect();
    return { near: Math.abs(r.top - a.bottom) < 20 || Math.abs(r.bottom - a.top) < 20, inViewport: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight };
  }, `[data-pd-id="sportsbook.table-scroll"] td[data-ledger-column="displayed_value"][data-ledger-row]`);
  expect(geometry.near).toBe(true);
  expect(geometry.inViewport).toBe(true);
  await review.getByRole("button", { name: "Open record for review" }).press("Escape");
  await expect(review).toHaveCount(0);
  await expect(cell).not.toHaveAttribute("data-ledger-review", "true");
  await expect(cell).toBeFocused();
  await cell.press("F2");
  await expect(review).toBeVisible();
  await page.getByRole("heading", { name: "Sportsbook Bets", exact: true }).first().click();
  await expect(review).toHaveCount(0);
  await expect(cell).not.toHaveAttribute("data-ledger-review", "true");
});

test("eligible combined selector remains cell sized and options stay readable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => localStorage.setItem("openforge-theme", "light"));
  const id = "CP117-CELL-001";
  await page.goto(`/tracker/sportsbook-bets?q=${id}`);
  const cell = page.locator(`[data-pd-id="combined.sportsbook-bets.table-scroll"] td[data-ledger-row="${profile}::${id}"][data-ledger-column="match_strategy"]`);
  await cell.dblclick();
  const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
  await expect(editor).toBeVisible();
  const widths = await editor.evaluate((element, selector) => ({ editor: element.getBoundingClientRect().width, cell: document.querySelector(selector as string)!.getBoundingClientRect().width }), `[data-pd-id="combined.sportsbook-bets.table-scroll"] td[data-ledger-row="${profile}::${id}"][data-ledger-column="match_strategy"]`);
  expect(widths.editor).toBeLessThanOrEqual(widths.cell + 16);
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: join(evidence, "pd-selector-1440-light.png") });
  await editor.getByRole("combobox", { name: "Strategy" }).press("Escape");
  await expect(editor).toHaveCount(0);
  const protectedCell = page.locator(`[data-pd-id="combined.sportsbook-bets.table-scroll"] td[data-ledger-row="${profile}::${id}"][data-ledger-column="displayed_value"]`);
  await protectedCell.dblclick();
  const review = page.locator('[data-pd-id="combined.sportsbook-bets.protected-cell"]');
  await expect(review).toBeVisible();
  await review.getByRole("button", { name: "Open record for review" }).click();
  await expect(page).toHaveURL(new RegExp(`/profiles/${profile}/tracker/sportsbook-bets\\?record=${id}`));
  await expect(page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]')).toBeVisible();
});

test("proposal and real cell feedback remain contained at matched review widths", async ({ page }) => {
  await mkdir(evidence, { recursive: true });
  for (const [width, height, theme] of [[2048, 1152, "dark"], [1440, 900, "light"], [390, 844, "dark"]] as const) {
    await page.setViewportSize({ width, height });
    await page.addInitScript(value => localStorage.setItem("openforge-theme", value), theme);
    await page.goto("/design-lab/sportsbook-proposals?amendment=operations");
    const proposalCell = page.getByRole("button", { name: "Review protected bookmaker cell" });
    await proposalCell.dblclick();
    const proposal = page.locator('[data-pd-id="lab.proposal.protected-cell"]');
    await expect(proposal).toContainText("Bookmaker is tied to recorded placement");
    await expect(proposalCell.locator("xpath=..")).toHaveAttribute("data-ledger-review", "true");
    const labTone = await proposal.evaluate(element => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, border: style.borderColor, radius: style.borderRadius, text: style.color };
    });
    await page.screenshot({ path: join(evidence, `lab-blocked-${width}-${theme}.png`) });
    await proposal.getByRole("button", { name: "Open record for review" }).press("Escape");
    await page.goto(`/profiles/${profile}/tracker/sportsbook-bets`);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    const realCell = page.locator('[data-pd-id="sportsbook.table-scroll"] td[data-ledger-column="displayed_value"][data-ledger-row]').first();
    await realCell.dblclick();
    const real = page.locator('[data-pd-id="sportsbook.protected-cell"]');
    await expect(real).toBeVisible();
    const realTone = await real.evaluate(element => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, border: style.borderColor, radius: style.borderRadius, text: style.color };
    });
    expect(realTone).toEqual(labTone);
    const bounds = await real.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
    await page.screenshot({ path: join(evidence, `pd-blocked-${width}-${theme}.png`) });
  }
});

test("account option list extends beyond a closed cell editor without click-away Save", async ({ page }) => {
  await mkdir(evidence, { recursive: true });
  for (const combined of [false, true]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(combined ? "/tracker/accounts" : `/profiles/${profile}/tracker/accounts`);
    const selector = combined ? `td[data-ledger-row="${profile}::ACC-BOOK-A"][data-ledger-column="channel"]` : 'td[data-ledger-row="ACC-BOOK-A"][data-ledger-column="channel"]';
    const cell = page.locator(selector);
    await cell.dblclick();
    const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
    await expect(editor).toBeVisible();
    await editor.getByRole("button", { name: "Show all access channels options" }).click();
    const list = editor.getByRole("listbox", { name: "Access channels options" });
    await expect(list).toBeVisible();
    // Presentation stress only: the authoritative Access Channels list is unchanged.
    await list.getByRole("option", { name: "Online" }).locator("strong").evaluate(node => { node.textContent = "Online access through a long synthetic provider label that must wrap without widening the cell"; });
    const dimensions = await page.evaluate(() => {
      const cell = document.querySelector('[data-ledger-column="channel"][data-ledger-row]')!.getBoundingClientRect();
      const editor = document.querySelector('[data-pd-id="ledger.floating-editor"]')!.getBoundingClientRect();
      const list = document.querySelector('[role="listbox"][aria-label="Access channels options"]')!.getBoundingClientRect();
      const firstOption = document.querySelector('[role="listbox"][aria-label="Access channels options"] [role="option"]')!;
      return { cellWidth: cell.width, editorWidth: editor.width, listWidth: list.width, listLeft: list.left, listRight: list.right, optionHeight: firstOption.getBoundingClientRect().height, optionOverflow: firstOption.scrollWidth - firstOption.clientWidth, documentOverflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(dimensions.editorWidth).toBeLessThanOrEqual(dimensions.cellWidth + 16);
    expect(dimensions.listWidth).toBeGreaterThan(dimensions.editorWidth);
    expect(dimensions.listLeft).toBeGreaterThanOrEqual(0);
    expect(dimensions.listRight).toBeLessThanOrEqual(390);
    expect(dimensions.optionHeight).toBeGreaterThan(44);
    expect(dimensions.optionOverflow).toBeLessThanOrEqual(1);
    expect(dimensions.documentOverflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: join(evidence, `${combined ? "combined" : "owned"}-accounts-options-390-dark.png`) });
    await editor.getByRole("combobox", { name: "Access channels", exact: true }).press("Escape");
    await expect(list).toHaveCount(0);
    await expect(editor).toBeVisible();
    await editor.getByRole("button", { name: "Show all access channels options" }).click();
    await list.getByRole("option", { name: "Mobile" }).click();
    await expect(editor).toBeVisible();
    await expect(list).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(editor).toHaveCount(0);
  }
});

test("Lab amendment and PD use the same compact Strategy selector geometry", async ({ page }) => {
  await mkdir(evidence, { recursive: true });
  for (const [width, height, theme] of [[2048, 1152, "dark"], [1440, 900, "light"], [390, 844, "dark"]] as const) {
    await page.setViewportSize({ width, height });
    await page.addInitScript(value => localStorage.setItem("openforge-theme", value), theme);
    await page.goto("/design-lab/sportsbook-proposals?amendment=operations");
    await page.getByRole("button", { name: "Edit synthetic Strategy" }).dblclick();
    const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
    await expect(editor.getByRole("combobox", { name: "Strategy" })).toHaveValue("Standard");
    const geometry = await editor.evaluate(element => {
      const cell = document.querySelector('[data-pd-id="lab.proposal.ledger"] button[aria-label="Edit synthetic Strategy"]')!.closest("td")!.getBoundingClientRect();
      const button = document.querySelector<HTMLElement>('[data-pd-id="lab.proposal.ledger"] button[aria-label="Edit synthetic Strategy"]')!;
      return { cellWidth: cell.width, editorWidth: element.getBoundingClientRect().width, sourceVisibility: getComputedStyle(button).visibility, pageOverflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(geometry.editorWidth).toBeLessThanOrEqual(geometry.cellWidth + 16);
    expect(geometry.sourceVisibility).toBe("hidden");
    expect(geometry.pageOverflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: join(evidence, `lab-selector-${width}-${theme}.png`) });
    await editor.getByRole("combobox", { name: "Strategy" }).selectOption("Underlay");
    await editor.getByRole("combobox", { name: "Strategy" }).press("Enter");
    await expect(editor).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit synthetic Strategy" })).toHaveText("Underlay");
  }
});

test("touch selection in the extended list keeps the compact editor open until Apply", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    const health = await (await page.request.get("http://127.0.0.1:3127/api/healthz")).json();
    expect(health.database_classification).toBe("isolated");
    await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
    await page.goto("http://127.0.0.1:9127/");
    await page.goto(`http://127.0.0.1:3127/profiles/${profile}/tracker/accounts`);
    const cell = page.locator('td[data-ledger-row="ACC-BOOK-A"][data-ledger-column="channel"]');
    await cell.dblclick();
    const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
    await expect(editor).toBeVisible();
    await editor.getByRole("button", { name: "Show all access channels options" }).tap();
    await editor.getByRole("option", { name: "Mobile" }).tap();
    await expect(editor).toBeVisible();
    await expect(editor.getByRole("button", { name: "Apply access channels" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(editor).toHaveCount(0);
  } finally {
    await context.close();
  }
});
