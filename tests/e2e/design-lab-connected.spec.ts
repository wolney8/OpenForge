import { chromium, expect, test } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async route => {
    if (route.request().url().endsWith("/api/auth/session")) {
      await route.fulfill({ json: { authenticated: true, email: "demo@example.invalid", expires_at: 4102444800, name: "Synthetic Fund Manager", role: "fund_manager", session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true } } });
      return;
    }
    if (route.request().url().endsWith("/api/auth/activity")) { await route.fulfill({ json: { ok: true } }); return; }
    throw new Error(`Unexpected API request from synthetic Design Lab: ${route.request().url()}`);
  });
  await page.goto("/design-lab?baseline=cp113");
  await expect(page.locator('[data-pd-id="design-lab-connected.root"]')).toBeVisible();
});

test("connected shell, grouped search and Profile context", async ({ page }) => {
  await page.locator('[data-pd-id="lab.search"]').fill("Demo Offer");
  await expect(page.locator('[data-pd-id="lab.search-results"]')).toContainText("Free Bets");
  await expect(page.locator('[data-pd-id="lab.search-results"]')).toContainText("Casino Offers");
  await page.locator('[data-pd-id="lab.search"]').press("Escape");
  await expect(page.locator('[data-pd-id="lab.search-results"]')).toHaveCount(0);
  await page.locator('[data-pd-id="lab.profile"]').click();
  await page.getByRole("option", { name: "Profile B" }).click();
  await expect(page.locator('[data-pd-id="lab.metrics"]')).toContainText("£ 60.00");
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).toContainText("Profile B example");
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).not.toContainText("Demo FC v Sample United");
  await page.locator('[data-pd-id="lab.range"]').click();
  await page.getByRole("option", { name: "This Year" }).click();
  await page.locator('[data-pd-id="lab.nav.reports"]').click();
  await expect(page.locator('[data-pd-id="lab.range"]')).toContainText("This Year");
  await expect(page.locator('[data-pd-id="lab.reports"]')).toBeVisible();
});

test("same synthetic bet draft moves between modal and page, then placement, settlement and report", async ({ page }) => {
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await page.locator('[data-pd-id="lab.add.modal"]').click();
  await expect(page.locator('[data-pd-id="lab.entry.modal"]')).toBeVisible();
  await page.locator('[data-pd-id="lab.bet.bookmaker"]').click();
  await expect(page.getByRole("listbox", { name: "Bookmaker options" })).toBeVisible();
  await page.getByRole("option", { name: "Bookmaker A" }).click();
  await page.getByRole("button", { name: "Open matching" }).click();
  await expect(page.getByText("Event Name may be entered after matching.")).toBeVisible();
  await page.getByLabel("Event Name").fill("Demo Albion v Sample City");
  await page.getByLabel("Back stake").fill("11.00");
  await expect(page.getByText(/Calculation unavailable for edited inputs/)).toBeVisible();
  await page.getByLabel("Back stake").fill("10.00");
  await page.getByRole("button", { name: "Switch to workspace" }).click();
  await expect(page.locator('[data-pd-id="lab.entry.page"]')).toBeVisible();
  await expect(page.getByLabel("Event Name")).toHaveValue("Demo Albion v Sample City");
  await page.getByRole("button", { name: /Review/ }).last().click();
  await expect(page.getByText("£ 30.62")).toBeVisible();
  await page.getByRole("button", { name: "Save Prospecting" }).click();
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).toContainText("Prospecting");
  await page.locator('[data-pd-id="lab.profile"]').click();
  await page.getByRole("option", { name: "Profile B" }).click();
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).not.toContainText("Demo Albion v Sample City");
  await page.locator('[data-pd-id="lab.profile"]').click();
  await page.getByRole("option", { name: "Profile A" }).click();
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).toContainText("Demo Albion v Sample City");
  await page.locator('[data-pd-id="lab.range"]').click();
  await page.getByRole("option", { name: "This Year" }).click();
  await page.getByRole("button", { name: "View Demo Albion v Sample City" }).click();
  await page.getByRole("button", { name: "Review for placement" }).click();
  await page.getByRole("button", { name: /Review/ }).last().click();
  await page.getByRole("button", { name: "Confirm simulated placement" }).click();
  await page.getByRole("button", { name: "View Demo Albion v Sample City" }).click();
  await page.getByRole("button", { name: "Settle · back wins" }).click();
  await expect(page.locator('[data-pd-id="lab.reports"]')).toContainText("Demo Albion v Sample City");
  await page.locator('[data-pd-id="lab.profile"]').click();
  await page.getByRole("option", { name: "Profile B" }).click();
  await expect(page.locator('[data-pd-id="lab.reports"]')).not.toContainText("Demo Albion v Sample City");
  await page.locator('[data-pd-id="lab.profile"]').click();
  await page.getByRole("option", { name: "Profile A" }).click();
  await page.getByRole("button", { name: /Demo Albion v Sample City/ }).last().click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("Settled: Back wins");
  await page.getByRole("button", { name: "Correct synthetic details" }).click();
  await page.getByLabel("Event Name").fill("Demo Albion v Sample City · corrected");
  await page.getByRole("button", { name: /Review/ }).last().click();
  await page.getByRole("button", { name: "Save correction" }).click();
  await page.getByRole("button", { name: "View Demo Albion v Sample City · corrected" }).click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("Correction: event/details reviewed");
});

test("ledger previews retain full labelled detail and linked Free Bet", async ({ page }) => {
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await page.getByRole("button", { name: "View Demo FC v Sample United" }).click();
  await page.getByRole("button", { name: "Open linked Free Bet" }).click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("Linked to LAB-SB-001");
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("Expiry");
  await page.locator('[data-pd-id="lab.nav.casino"]').click();
  await expect(page.locator('[data-pd-id="lab.ledger.casino"]')).toContainText("Wagering");
  await page.locator('[data-pd-id="lab.nav.extraPlace"]').click();
  await expect(page.locator('[data-pd-id="lab.ledger.extraPlace"]')).toContainText("Qualifying loss");
  await page.locator('[data-pd-id="lab.nav.cash"]').click();
  await expect(page.locator('[data-pd-id="lab.ledger.cash"]')).toContainText("Cash snapshot");
});

test("every visible report point opens its Profile-scoped source within the selected range", async ({ page }) => {
  await page.locator('[data-pd-id="lab.profile"]').click();
  await page.getByRole("option", { name: "Profile A" }).click();
  await page.locator('[data-pd-id="lab.nav.reports"]').click();
  await expect(page.locator('[data-pd-id="lab.reports"]')).not.toContainText("Sample Rangers v Demo County");
  await page.locator('[data-pd-id="lab.range"]').click();
  await page.getByRole("option", { name: "This Year" }).click();
  await expect(page.locator('[data-pd-id="lab.reports"]')).toContainText("Sample Rangers v Demo County");
  await page.getByRole("button", { name: "Open 20 Sep source record, £ 24.70" }).click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("LAB-SB-SEP-A");
  await expect(page.locator('[data-pd-id="lab.profile"]')).toContainText("Profile A");
});

test("representative lifecycle and Add/Edit previews are interactive without saving", async ({ page }) => {
  await page.locator('[data-pd-id="lab.nav.casino"]').click();
  await page.getByRole("button", { name: /View Demo Casino Offer/ }).first().click();
  await page.getByRole("button", { name: "Wagering" }).click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("progress is not simulated");
  await page.getByRole("button", { name: "Preview edit layout" }).click();
  await expect(page.getByText("Representative preview · Save is unavailable in this lab.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save · preview only" })).toBeDisabled();
  await page.locator('[data-pd-id="lab.nav.extraPlace"]').click();
  await page.getByRole("button", { name: "Preview Add" }).click();
  await expect(page.getByRole("heading", { name: "Add Extra Place" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save · preview only" })).toBeDisabled();
  await page.locator('[data-pd-id="lab.nav.cash"]').click();
  await page.getByRole("button", { name: "Preview Add" }).click();
  await expect(page.getByRole("heading", { name: "Add Cash Adjustments" })).toBeVisible();
});

test("dirty Account edit guards navigation and retains unknown versus zero", async ({ page }) => {
  await page.locator('[data-pd-id="lab.nav.accounts"]').click();
  await page.getByRole("button", { name: "View Bookmaker C" }).click();
  await page.getByRole("button", { name: "Review balance" }).click();
  await page.getByLabel("Current Balance").fill("0.00");
  await page.getByRole("button", { name: "Close Account review" }).click();
  await expect(page.getByRole("heading", { name: "Unsaved changes" })).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Current Balance")).toHaveValue("0.00");
  await page.getByRole("button", { name: "Save simulation" }).click();
  await expect(page.locator('[data-pd-id="lab.ledger.accounts"]')).toContainText("£0.00");
});

test("narrow navigation dismisses by Escape and restores trigger focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  await expect(page.getByRole("button", { name: "Dismiss navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Dismiss navigation" })).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("responsive themes show connected shell and bounded ledger/action surfaces", async ({ page }) => {
  const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
  if (evidence) await mkdir(evidence, { recursive: true });
  for (const width of [1440, 900, 768, 430, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate(value => document.documentElement.setAttribute("data-theme", value), theme);
      await page.locator('[data-pd-id="lab.nav.sportsbook"]').first().evaluate((element, w) => { if (w > 900) (element as HTMLButtonElement).click(); }, width);
      if (width <= 900) {
        await page.getByRole("button", { name: "Open navigation" }).click();
        await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
      }
      await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).toBeVisible();
      const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth, widths: ["lab.main", "lab.ledger.sportsbook"].map(id => { const element = document.querySelector<HTMLElement>(`[data-pd-id="${id}"]`)!; return { id, left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right, client: element.clientWidth, scroll: element.scrollWidth }; }), table: (() => { const element = document.querySelector<HTMLElement>("div[class*='tableScroll']")!; return { left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right, client: element.clientWidth, scroll: element.scrollWidth, overflow: getComputedStyle(element).overflowX }; })(), offenders: [...document.querySelectorAll<HTMLElement>("body *")].filter(element => element.getBoundingClientRect().right > innerWidth + 2).slice(0, 12).map(element => ({ tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right, width: element.getBoundingClientRect().width, pd: element.dataset.pdId })) }));
      expect(overflow.scroll, `${width}/${theme}: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.viewport + 1);
      if (evidence) await page.screenshot({ path: join(evidence, `connected-sportsbook-${width}-${theme}.png`), fullPage: true });
    }
  }
});

test("modal focus, validation and failed-save state remain bounded", async ({ page }) => {
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await page.locator('[data-pd-id="lab.add.modal"]').click();
  await expect(page.locator("dialog.modal-boundary")).toHaveJSProperty("open", true);
  await page.getByRole("button", { name: "Confirm simulated placement" }).click();
  await expect(page.getByText("Enter Event Name before placement.")).toBeVisible();
  await page.getByLabel("Event Name").fill("Demo Match");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Unsaved changes" })).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Event Name")).toHaveValue("Demo Match");
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(page.locator("dialog.modal-boundary")).toHaveCount(0);
  await page.getByText("Simulation controls").click();
  await page.getByLabel("Fail the next simulated save").check();
  await page.locator('[data-pd-id="lab.add.modal"]').click();
  await page.getByLabel("Event Name").fill("Demo Match");
  await page.getByRole("button", { name: "Save Prospecting" }).click();
  await expect(page.getByText("Simulated save failed. The draft is retained.")).toBeVisible();
  await expect(page.getByLabel("Event Name")).toHaveValue("Demo Match");
});

test("representative screenshot set shows dashboard, entry variants, Reports and narrow navigation", async ({ page }) => {
  const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
  if (!evidence) return;
  await mkdir(evidence, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await page.screenshot({ path: join(evidence, "connected-home-1440-light.png"), fullPage: true });
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await page.locator('[data-pd-id="lab.add.modal"]').click();
  await page.screenshot({ path: join(evidence, "entry-modal-1440-light.png"), fullPage: true });
  await page.getByRole("button", { name: "Switch to workspace" }).click();
  await page.screenshot({ path: join(evidence, "entry-page-1440-light.png"), fullPage: true });
  await page.locator('[data-pd-id="lab.nav.reports"]').click();
  await page.screenshot({ path: join(evidence, "reports-1440-light.png"), fullPage: true });
  await page.locator('[data-pd-id="lab.range"]').click();
  await page.getByRole("option", { name: "This Year" }).click();
  await page.screenshot({ path: join(evidence, "reports-year-1440-light.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.screenshot({ path: join(evidence, "navigation-390-light.png"), fullPage: true });
});

test("actual browser 200% zoom contains the connected shell and typed search", async () => {
  const labBaseURL = process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010";
  const scratch = await mkdtemp(join(tmpdir(), "pd-cp113-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Temporary lab zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    await context.route("**/api/**", async route => {
      if (route.request().url().endsWith("/api/auth/session")) { await route.fulfill({ json: { authenticated: true, email: "demo@example.invalid", expires_at: 4102444800, name: "Synthetic Fund Manager", role: "fund_manager", session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true } } }); return; }
      if (route.request().url().endsWith("/api/auth/activity")) { await route.fulfill({ json: { ok: true } }); return; }
      throw new Error(`Unexpected API in zoom test: ${route.request().url()}`);
    });
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    const page = await context.newPage();
    await page.goto(`${labBaseURL}/design-lab`);
    await expect(page.locator('[data-pd-id="design-lab-connected.root"]')).toBeVisible();
    await worker.evaluate(async (baseURL) => {
      const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs;
      const target = await tabs.query({ url: `${baseURL}/*` });
      await tabs.setZoom(target[0].id, 2);
    }, labBaseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    expect(await page.evaluate(() => devicePixelRatio)).toBe(2);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).zoom)).toBe("1");
    const zoomOverflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth, header: [...document.querySelector<HTMLElement>("[data-pd-id=\"lab.header\"]")!.children].map(element => ({ text: element.textContent?.slice(0,15), left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right, width: element.getBoundingClientRect().width, grid: getComputedStyle(element).gridColumn })), offenders: [...document.querySelectorAll<HTMLElement>("body *")].filter(element => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map(element => ({ tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right, parent: element.parentElement?.outerHTML.slice(0, 250) })) }));
    expect(zoomOverflow.scroll, JSON.stringify(zoomOverflow)).toBeLessThanOrEqual(zoomOverflow.viewport + 1);
    await page.locator('[data-pd-id="lab.search"]').fill("Demo");
    await expect(page.locator('[data-pd-id="lab.search-results"]')).toBeVisible();
    const box = await page.locator('[data-pd-id="lab.search-results"]').boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(720);
    const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
    if (evidence) await page.screenshot({ path: join(evidence, "connected-actual-browser-zoom-200.png"), fullPage: true });
    await page.locator('[data-pd-id="lab.search"]').press("Escape");
    await page.getByRole("button", { name: "Open Sportsbook" }).click();
    await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (evidence) await page.screenshot({ path: join(evidence, "cp114b-ledger-actual-browser-zoom-200.png"), fullPage: true });
  } finally { await context.close(); await rm(scratch, { recursive: true, force: true }); }
});
