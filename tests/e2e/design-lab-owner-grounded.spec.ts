import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async route => {
    if (route.request().url().endsWith("/api/auth/session")) {
      await route.fulfill({ json: { authenticated: true, email: "demo@example.invalid", expires_at: 4102444800, name: "Synthetic Fund Manager", role: "fund_manager", session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true } } });
      return;
    }
    if (route.request().url().endsWith("/api/auth/activity")) { await route.fulfill({ json: { ok: true } }); return; }
    throw new Error(`Unexpected API request from synthetic lab: ${route.request().url()}`);
  });
  await page.goto("/design-lab");
  await expect(page.locator('[data-pd-id="design-lab-connected.root"]')).toBeVisible();
});

test("distinct workspace, Profile, notification and identity paths", async ({ page }) => {
  await page.getByRole("button", { name: "Switch workspace" }).click();
  await expect(page.locator('[data-pd-id="lab.header-menu"]')).toContainText("Fund Manager");
  await page.getByRole("button", { name: /Tracker \/ Betting Tools/ }).click();
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).toBeVisible();
  await page.getByRole("button", { name: "Notifications" }).click();
  await page.getByRole("button", { name: /Account balance unknown/ }).click();
  await expect(page.getByRole("heading", { name: "Today", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.locator('[data-pd-id="lab.header-menu"]')).toContainText("Sign Out · lab unavailable");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Account menu" })).toBeFocused();
});

test("offer-first capture, Matching before Event Name, partial lay and Profile isolation", async ({ page }) => {
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await page.locator('[data-pd-id="lab.profile"]').click();
  await page.getByRole("option", { name: "Profile A" }).click();
  await page.locator('[data-pd-id="lab.add.modal"]').click();
  await page.locator('[data-pd-id="lab.bet.offer-text"]').fill("Demo offer: stake £10 externally; qualifying terms to review.");
  await page.locator('[data-pd-id="lab.bet.bookmaker"]').click();
  await page.getByRole("option", { name: "Bookmaker A" }).click();
  await page.getByRole("button", { name: "Save Prospecting" }).click();
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).toContainText("Offer captured · event pending");
  await page.getByRole("button", { name: "Open Offer captured · event pending" }).click();
  await page.getByRole("button", { name: "Review for placement" }).click();
  await page.getByRole("button", { name: /Matching/ }).click();
  await page.locator('[data-pd-id="lab.bet.load-fixture"]').click();
  await expect(page.getByRole("button", { name: "Open matching" })).toBeVisible();
  await page.getByRole("button", { name: "Open matching" }).click();
  await expect(page.getByText("Match and calculate before entering Event Name.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /Placement/ }).click();
  await page.getByRole("button", { name: "Confirm external Back" }).click();
  await page.getByLabel("Actual matched Lay Stake").fill("5.00");
  await page.getByRole("button", { name: "Confirm external Lay" }).click();
  await expect(page.getByText(/Partial hedge: 5.00 matched of 9.57/)).toBeVisible();
  await page.getByRole("button", { name: /Finish \/ Review/ }).click();
  await page.getByLabel("Event Name").fill("Demo Albion v Sample City · Home");
  await page.getByRole("button", { name: "Finish Placed record" }).click();
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).toContainText("Partially laid");
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).toContainText("Current · unavailable");
  await page.locator('[data-pd-id="lab.profile"]').click();
  await page.getByRole("option", { name: "Profile B" }).click();
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).not.toContainText("Demo Albion v Sample City");
});

test("Account observation, ledger order controls and simulated saved view", async ({ page }) => {
  await page.locator('[data-pd-id="lab.nav.accounts"]').click();
  await page.locator('[data-pd-id="lab.profile"]').click();
  await page.getByRole("option", { name: "Profile A" }).click();
  const ledger = page.locator('[data-pd-id="lab.ledger.accounts"]');
  await expect(ledger.locator("thead")).toContainText("Account ID");
  await ledger.getByText("Bookmaker C").first().click();
  await expect(page.getByText("Last observed balance")).toBeVisible();
  await page.getByLabel("Observed Current Balance").fill("0.00");
  await page.getByRole("button", { name: /Confirm balance observation/ }).click();
  await expect(ledger).toContainText("£0.00");
  await page.getByRole("button", { name: "Columns", exact: true }).click();
  await page.getByRole("button", { name: "Move Account ID right" }).click();
  await expect(ledger.locator("thead th").first()).toContainText("Account");
  await page.getByRole("button", { name: "Save lab view" }).click();
  await expect(ledger).toContainText("Saved lab view active");
});

test("full fixture placement, settlement and reasoned correction stay source-linked", async ({ page }) => {
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await page.locator('[data-pd-id="lab.profile"]').click();
  await page.getByRole("option", { name: "Profile A" }).click();
  await page.locator('[data-pd-id="lab.add.page"]').click();
  await page.locator('[data-pd-id="lab.bet.offer-text"]').fill("Synthetic qualifying terms for owner workflow review.");
  await page.getByRole("button", { name: /Matching/ }).click();
  await page.locator('[data-pd-id="lab.bet.load-fixture"]').click();
  await page.getByRole("button", { name: /Placement/ }).click();
  await page.getByRole("button", { name: "Confirm external Back" }).click();
  await page.getByLabel("Actual matched Lay Stake").fill("9.57");
  await page.getByRole("button", { name: "Confirm external Lay" }).click();
  await page.getByRole("button", { name: /Finish \/ Review/ }).click();
  await page.getByLabel("Event Name").fill("Demo Albion v Sample City");
  await page.getByRole("button", { name: "Finish Placed record" }).click();
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).toContainText("Current £ (0.62)");
  await page.locator('[data-pd-id="lab.range"]').click();
  await page.getByRole("option", { name: "This Year" }).click();
  await page.getByRole("button", { name: "Open Demo Albion v Sample City" }).click();
  await page.getByRole("button", { name: "Correct placed execution" }).click();
  await page.getByRole("button", { name: /Finish \/ Review/ }).click();
  await page.getByLabel("Correction reason").fill("Verified synthetic placement detail");
  await page.getByRole("button", { name: "Save audited correction" }).click();
  await page.getByRole("button", { name: "Open Demo Albion v Sample City" }).click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("Placed correction: Verified synthetic placement detail");
  await page.getByRole("button", { name: "Settle · back wins" }).click();
  await expect(page.locator('[data-pd-id="lab.reports"]')).toContainText("Demo Albion v Sample City");
  await page.getByRole("button", { name: /Demo Albion v Sample City/ }).last().click();
  await page.getByRole("button", { name: "Correct synthetic details" }).click();
  await page.getByRole("button", { name: "Save audited correction" }).click();
  await expect(page.getByText("Enter a correction reason for this settled record.")).toBeVisible();
  await page.getByRole("button", { name: /Finish \/ Review/ }).click();
  await page.getByLabel("Correction reason").fill("Correct source event text after review");
  await page.getByRole("button", { name: "Save audited correction" }).click();
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).toBeVisible();
});

test("sportsbook filter, resize and inline Prospecting edit use one lab state", async ({ page }) => {
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await page.locator('[data-pd-id="lab.profile"]').click();
  await page.getByRole("option", { name: "Profile A" }).click();
  await page.locator('[data-pd-id="lab.add.modal"]').click();
  await page.locator('[data-pd-id="lab.bet.offer-text"]').fill("Synthetic offer terms");
  await page.locator('[data-pd-id="lab.bet.bookmaker"]').click();
  await page.getByRole("option", { name: "Bookmaker A" }).click();
  await page.getByRole("button", { name: "Save Prospecting" }).click();
  const ledger = page.locator('[data-pd-id="lab.ledger.sportsbook"]');
  await page.getByRole("button", { name: "Filters" }).click();
  await page.locator('[data-pd-id="lab.ledger.filter.bookmaker"]').click();
  await page.getByRole("option", { name: "Bookmaker A" }).click();
  await expect(ledger).not.toContainText("Profile B example");
  await page.getByRole("button", { name: "Columns", exact: true }).click();
  await page.getByRole("button", { name: "Widen Event" }).click();
  await page.getByRole("button", { name: "Save lab view" }).click();
  await ledger.locator("tbody tr").filter({ hasText: "Event pending" }).getByText("Event pending").dblclick();
  await page.getByRole("textbox", { name: "event" }).fill("Synthetic event after capture");
  await page.getByRole("button", { name: "Save cell" }).click();
  await expect(ledger).toContainText("Synthetic event after capture");
});

test("responsive lab shell and ledger are contained in both themes", async ({ page }) => {
  const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
  if (evidence) await mkdir(evidence, { recursive: true });
  for (const width of [1440, 900, 768, 430, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate(value => document.documentElement.setAttribute("data-theme", value), theme);
      const geometry = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth, offenders: [...document.querySelectorAll("body *")].filter(node => node.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(node).position !== "fixed").slice(0, 8).map(node => `${node.tagName}.${node.className}(${node.textContent?.trim().slice(0, 25)})[${node.parentElement?.className}]: ${Math.round(node.getBoundingClientRect().right)}`) }));
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), { message: `${width}/${theme}: ${geometry.offenders.join("; ")}` }).toBeLessThanOrEqual(1);
      if (evidence) await page.screenshot({ path: join(evidence, `cp114-position-${width}-${theme}.png`), fullPage: true });
    }
  }
});

test("narrow ledgers retain source access and required details without page overflow", async ({ page }) => {
  const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
  const cookieNotice = page.getByRole("button", { name: "Understood" });
  if (await cookieNotice.isVisible()) await cookieNotice.click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator('[data-pd-id="lab.nav.accounts"]').click();
  await expect(page.locator('[data-pd-id="lab.ledger.accounts"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "View all fields" }).first()).toBeVisible();
  if (evidence) await page.screenshot({ path: join(evidence, "cp114-accounts-390.png"), fullPage: true });
  await page.getByRole("button", { name: "View all fields" }).first().click();
  await expect(page.getByText("Account ID", { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: "Back to Accounts" }).click();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).toBeVisible();
  if (evidence) await page.screenshot({ path: join(evidence, "cp114-sportsbook-390.png"), fullPage: true });
  const geometry = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.viewport + 1);
});

test("private visual set covers shell, popovers, ledgers and both entry layouts", async ({ page }) => {
  const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
  if (!evidence) return;
  const cookieNotice = page.getByRole("button", { name: "Understood" });
  if (await cookieNotice.isVisible()) await cookieNotice.click();
  await mkdir(evidence, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: join(evidence, "cp114-position-1440-review.png"), fullPage: true });
  await page.getByRole("button", { name: "Notifications" }).click();
  await page.screenshot({ path: join(evidence, "cp114-notifications-1440.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await page.locator('[data-pd-id="lab.nav.accounts"]').click();
  await page.screenshot({ path: join(evidence, "cp114-accounts-1440.png"), fullPage: true });
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  const tableGeometry = await page.locator('[data-pd-id="lab.ledger.sportsbook"] table').evaluate(table => {
    const lastHeader = table.querySelector("thead th:last-child") as HTMLElement;
    const pill = table.querySelector("tbody td:nth-child(10) span") as HTMLElement;
    const viewport = table.closest("[class*='tableScroll']") as HTMLElement;
    return { actionsRight: lastHeader.getBoundingClientRect().right, viewportRight: viewport.getBoundingClientRect().right, pillWidth: pill.scrollWidth, pillClient: pill.clientWidth };
  });
  expect(tableGeometry.actionsRight).toBeLessThanOrEqual(tableGeometry.viewportRight + 1);
  expect(tableGeometry.pillWidth).toBeLessThanOrEqual(tableGeometry.pillClient + 1);
  await page.screenshot({ path: join(evidence, "cp114-sportsbook-1440.png"), fullPage: true });
  await page.locator('[data-pd-id="lab.add.modal"]').click();
  await page.screenshot({ path: join(evidence, "cp114-quick-capture-1440.png"), fullPage: true });
  await page.getByRole("button", { name: "Open full workbench" }).click();
  await page.getByRole("button", { name: /Matching/ }).click();
  await page.locator('[data-pd-id="lab.bet.load-fixture"]').click();
  await page.screenshot({ path: join(evidence, "cp114-workbench-matching-1440.png"), fullPage: true });
  await page.setViewportSize({ width: 430, height: 900 });
  await page.screenshot({ path: join(evidence, "cp114-workbench-matching-430.png"), fullPage: true });
});
