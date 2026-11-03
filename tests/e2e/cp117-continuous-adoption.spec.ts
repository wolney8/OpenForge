import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

test.use({ video: "on", trace: "retain-on-failure", screenshot: "only-on-failure" });
const profile = "/profiles/profile-notification-acceptance/tracker/";

async function ready(page: Page, module: string) {
  await page.goto(`${profile}${module}`);
  await expect(page.locator('[data-pd-id="ux-v2.sidebar"]')).toBeVisible();
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0);
  const range = page.getByRole("combobox", { name: "Change tracker date range" });
  if (await range.count()) await range.selectOption({ label: "All Dates" });
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0);
}

test.beforeEach(async ({ page }, info) => {
  const tokenFile = process.env.OPENFORGE_CP117_ISOLATED_SESSION_FILE;
  test.skip(!tokenFile, "Requires the isolated populated CP-117 application preview");
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-v2-disposable");
  await page.context().addCookies([{ name: "pd_session", value: readFileSync(tokenFile!, "utf8").trim(), url: String(info.project.use.baseURL) }]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
});

for (const ledger of [
  { module: "sportsbook-bets", id: "sportsbook", text: "Preview Event" },
  { module: "free-bets", id: "free-bets", text: "Preview SNR" },
  { module: "casino-offers", id: "casino-offers", text: "Free Spins Preview" },
  { module: "each-way-extra-places", id: "extra-place", text: "Preview Runner" },
  { module: "cash-adjustments", id: "cash-adjustments", text: "Synthetic cash movement" },
  { module: "accounts", id: "accounts", text: "Bookmaker A" },
]) {
  test(`real ${ledger.module} retains populated table, pinned Actions and existing editor`, async ({ page }, info) => {
    await ready(page, ledger.module);
    const viewport = page.locator(`[data-pd-id="${ledger.id}.table-scroll"]`);
    const row = viewport.locator("tbody tr").filter({ hasText: ledger.text }).first();
    await expect(row).toBeVisible();
    const add = page.locator('[data-pd-id="ledger.toolbar.add-row"]');
    if (await add.count()) expect(await add.evaluate(element => getComputedStyle(element).boxShadow)).toBe("none");
    await expect(page.locator(`[data-pd-id="${ledger.id}.view-context"]`)).toContainText(/\d+ of \d+ Rows?/);
    await viewport.evaluate(element => { element.scrollLeft = element.scrollWidth; });
    const bounds = await row.evaluate(element => {
      const cell = element.querySelector("td:last-child")!.getBoundingClientRect();
      const head = element.closest("table")!.querySelector("thead th:last-child")!.getBoundingClientRect();
      return { cell: cell.right, head: head.right };
    });
    expect(Math.abs(bounds.cell - bounds.head)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`${ledger.module}-scrolled.png`) });
    const edit = row.getByRole("button", { name: /^Edit / }).first();
    if (await edit.count()) await edit.click();
    else {
      await viewport.evaluate(element => { element.scrollLeft = 0; });
      await row.locator("td").nth(1).click();
    }
    const editor = page.getByRole("dialog").filter({ has: page.locator("input, textarea") }).last();
    await expect(editor).toBeVisible();
    const steps = editor.locator(".ledger-editor-tab-button");
    if (await steps.count()) {
      expect(await steps.first().evaluate(element => getComputedStyle(element).boxShadow)).toBe("none");
      const guided = editor.locator(".ledger-editor-tab-button.is-guided-target");
      if (await guided.count()) expect(await guided.first().evaluate(element => getComputedStyle(element).animationName)).toBe("none");
    }
    const geometry = await editor.boundingBox();
    expect(geometry!.x).toBeGreaterThanOrEqual(0);
    expect(geometry!.y).toBeGreaterThanOrEqual(0);
    expect(geometry!.x + geometry!.width).toBeLessThanOrEqual(1441);
    await page.screenshot({ path: info.outputPath(`${ledger.module}-edit.png`) });
    await page.keyboard.press("Escape");
    await expect(editor).toHaveCount(0);
    await expect(row).toBeVisible();
  });
}

test("sidebar collapse releases table width and real middle-button panning preserves row actions", async ({ page }, info) => {
  await ready(page, "sportsbook-bets");
  const scroll = page.locator('[data-pd-id="sportsbook.table-scroll"]');
  const before = (await scroll.boundingBox())!.width;
  await page.getByRole("button", { name: "Toggle Navigation", exact: true }).click();
  expect((await scroll.boundingBox())!.width - before).toBeGreaterThan(100);
  await expect(page.getByRole("link", { name: "Sportsbook Bets", exact: true })).toBeVisible();
  await scroll.scrollIntoViewIfNeeded();
  const cell = scroll.locator("tbody tr td").nth(2);
  const point = await cell.boundingBox();
  await page.mouse.move(point!.x + point!.width / 2, point!.y + 20);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(point!.x + point!.width / 2 - 110, point!.y + 20, { steps: 8 });
  await page.mouse.up({ button: "middle" });
  await expect.poll(() => scroll.evaluate(element => element.scrollLeft)).toBeGreaterThan(80);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await scroll.evaluate(element => { element.scrollLeft = 0; });
  const background = await scroll.locator("tbody tr td").nth(2).boundingBox();
  await page.mouse.move(background!.x + background!.width / 2, background!.y + background!.height - 3);
  await page.mouse.down();
  await page.mouse.move(background!.x + background!.width / 2 - 90, background!.y + background!.height - 3, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => scroll.evaluate(element => element.scrollLeft)).toBeGreaterThan(60);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await scroll.focus();
  const prior = await scroll.evaluate(element => element.scrollLeft);
  await page.keyboard.press("ArrowRight");
  expect(await scroll.evaluate(element => element.scrollLeft)).toBeGreaterThan(prior);
  await page.screenshot({ path: info.outputPath("collapsed-ledger-middle-pan.png") });
});

test("mobile full ledgers and shared settings/report surfaces retain navigation in both themes", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ["light", "dark"]) {
    await ready(page, "accounts");
    await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), theme);
    await expect(page.locator('[data-pd-id="accounts.table-scroll"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`accounts-mobile-${theme}.png`) });
    await page.getByRole("button", { name: "Toggle Navigation", exact: true }).click();
    await page.locator('[data-pd-id="ux-v2.nav.reports"]').click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole("heading", { name: /^Period P&L/ }).first()).toBeVisible();
    await expect(page.locator('[data-pd-id="combined-reporting.loading"]')).toHaveCount(0);
    await expect(page.locator('[data-pd-id="ux-v2.sidebar"]')).not.toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`reports-mobile-${theme}.png`) });
  }
});

test("Free Bet and Casino real descriptive saves retain financial inputs and failed drafts", async ({ page }, info) => {
  await ready(page, "free-bets");
  const endpoint = "/api/profiles/profile-notification-acceptance/free-bets/PREVIEW-FB-SNR";
  const before = await (await page.request.get(endpoint)).json();
  const row = page.locator('[data-pd-id="free-bets.table-scroll"] tbody tr').filter({ hasText: "Preview SNR" }).first();
  await row.getByRole("button", { name: "Edit PREVIEW-FB-SNR", exact: true }).click();
  let editor = page.getByRole("dialog", { name: "Edit free-bet row", exact: true });
  await expect(editor.getByRole("textbox", { name: "Event name", exact: true })).toHaveValue(before.event_name);
  const next = before.event_name.endsWith("Reviewed") ? "Preview SNR Free Bet" : "Preview SNR Free Bet Reviewed";
  await editor.getByRole("textbox", { name: "Event name", exact: true }).fill(next);
  await page.route(`**${endpoint}`, async route => {
    if (route.request().method() === "PUT") {
      await route.fulfill({ status: 503, json: { detail: "Disposable save failure. Retry your change." } });
      await page.unroute(`**${endpoint}`);
    } else await route.continue();
  });
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toBeVisible();
  await expect(editor.getByRole("textbox", { name: "Event name", exact: true })).toHaveValue(next);
  await expect(editor).toContainText("Disposable save failure");
  await page.screenshot({ path: info.outputPath("free-bet-retained-failed-draft.png") });
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toHaveCount(0);
  const after = await (await page.request.get(endpoint)).json();
  expect(after.event_name).toBe(next);
  for (const key of ["profile_id", "status", "result", "retention_mode", "free_bet_value", "back_odds", "lay_odds_1", "lay_actual", "lay_matched_stake_1"]) expect(after[key]).toBe(before[key]);

  await ready(page, "casino-offers");
  const casinoRow = page.locator('[data-pd-id="casino-offers.table-scroll"] tbody tr').filter({ hasText: "Free Spins Preview" }).first();
  const edit = casinoRow.getByRole("button", { name: /^Edit / });
  const id = (await edit.getAttribute("aria-label"))!.slice(5);
  const casinoEndpoint = `/api/profiles/profile-notification-acceptance/casino-offers/${id}`;
  const casinoBefore = await (await page.request.get(casinoEndpoint)).json();
  await edit.click();
  editor = page.getByRole("dialog", { name: "Edit casino row", exact: true });
  const offerName = editor.getByRole("textbox", { name: "Offer name", exact: true });
  await expect(offerName).toHaveValue(casinoBefore.offer_name);
  const casinoNext = casinoBefore.offer_name.endsWith("Reviewed") ? "Free Spins Preview" : "Free Spins Preview Reviewed";
  await offerName.fill(casinoNext);
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toHaveCount(0);
  const casinoAfter = await (await page.request.get(casinoEndpoint)).json();
  expect(casinoAfter.offer_name).toBe(casinoNext);
  for (const key of ["profile_id", "status", "result", "offer_type", "cash_stake", "own_cash_committed", "cash_returned", "final_net_pnl"]) expect(casinoAfter[key]).toBe(casinoBefore[key]);
});

test("real Reports, Profile settings, notification history and tools keep one coherent shell", async ({ page }, info) => {
  await ready(page, "accounts");
  for (const module of ["reports", "profit-tracker", "settings"]) {
    await page.goto(`${profile}${module}`);
    await expect(page.locator('[data-pd-id="ux-v2.breadcrumbs"]')).toBeVisible();
    await expect(page.locator('[data-pd-id="ux-v2.sidebar"]')).toBeVisible();
    if (module === "settings") await expect(page.locator('[data-pd-id="ux-v2.nav.settings"]')).toBeVisible();
    else await expect(page.locator('[data-pd-id="ux-v2.nav.reports"]')).toHaveAttribute("aria-current", "location");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`profile-${module}.png`) });
  }
  await page.goto("/notifications");
  await expect(page.getByRole("heading", { name: /Notifications/i }).first()).toBeVisible();
  await page.screenshot({ path: info.outputPath("real-notification-history.png") });
  for (const tool of ["calculators", "oddsmatcher", "administration"]) {
    await page.locator('[data-pd-id="ux-v2.launcher.trigger"]').click();
    await page.locator(`[data-pd-id="ux-v2.launcher.${tool}"]`).click();
    await expect(page.locator('[data-pd-id="ux-v2.sidebar"]')).toBeVisible();
    await expect(page.locator('[data-pd-id="ux-v2.launcher.panel"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`real-tool-${tool}.png`) });
  }
  await page.locator('[data-pd-id="ux-v2.nav.today"]').click();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
});

test("real source reads and ledger scope keep Profile ownership isolated", async ({ page }) => {
  const own = await page.request.get("/api/profiles/profile-notification-acceptance/free-bets/PREVIEW-FB-SNR");
  expect(own.status()).toBe(200);
  expect((await own.json()).profile_id).toBe("profile-notification-acceptance");
  const foreign = await page.request.get("/api/profiles/profile-preview-b/free-bets/PREVIEW-FB-SNR");
  expect(foreign.status()).toBe(404);
  await page.goto("/profiles/profile-preview-b/tracker/free-bets");
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0);
  await expect(page.locator('[data-pd-id="free-bets.table-scroll"]')).not.toContainText("Preview SNR");
  await expect(page.locator('[data-pd-id="app-shell.top-bar"]')).toContainText("Preview Profile B");
});

test("isolated real financial inputs reject malformed money without changing the source", async ({ page }) => {
  for (const [route, field] of [["sportsbook-bets/sportsbook-notification-acceptance", "back_stake"], ["free-bets/PREVIEW-FB-SNR", "free_bet_value"]]) {
    const endpoint = `/api/profiles/profile-notification-acceptance/${route}`;
    const before = await (await page.request.get(endpoint)).json();
    const rejected = await page.request.put(endpoint, { data: { ...before, [field]: "8,5" } });
    expect(rejected.status()).toBe(422);
    const after = await (await page.request.get(endpoint)).json();
    expect(after).toEqual(before);
  }
});
