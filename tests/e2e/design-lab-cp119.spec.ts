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
    throw new Error(`Unexpected lab API request: ${route.request().url()}`);
  });
  await page.goto("/design-lab");
  await expect(page.locator('[data-pd-id="design-lab-connected.root"]')).toBeVisible();
});

test("all six ledgers retain complete columns and All Profiles ownership", async ({ page }) => {
  const cases = [
    ["accounts", "Account ID", "Current balance", "Actions", 12],
    ["sportsbook", "Settles", "Lay Bet", "Actions", 11],
    ["freeBets", "Expiry", "Strategy", "Actions", 12],
    ["casino", "Offer type", "Result", "Actions", 10],
    ["extraPlace", "Runner / Race", "Place Lay Liab", "Actions", 18],
    ["cash", "Direction", "Signed amount", "Actions", 13],
  ] as const;
  for (const [key, first, second, last, count] of cases) {
    await page.locator(`[data-pd-id="lab.nav.${key}"]`).click();
    const ledger = page.locator(`[data-pd-id="lab.ledger.${key}"]`);
    const headings = ledger.locator("thead th");
    await expect(headings).toHaveCount(count + 1);
    await expect(headings.first()).toContainText("Profile");
    for (const label of [first,second,last]) await expect(ledger.locator("thead")).toContainText(label);
    await expect(headings.last()).toContainText("Actions");
    if (key === "extraPlace") await expect(ledger.locator("thead")).not.toContainText("Status");
  }
});

test("Free Bet expiry filter, view and context survive Reports navigation", async ({ page }) => {
  await page.locator('[data-pd-id="lab.nav.freeBets"]').click();
  const ledger = page.locator('[data-pd-id="lab.ledger.freeBets"]');
  await page.getByRole("button", {name:"Filters", exact:true}).click();
  await page.getByLabel("Expiry From").fill("2026-11-02");
  await page.getByLabel("Expiry To", {exact:true}).fill("2026-11-02");
  await expect(ledger).toContainText("1 of 2 rows");
  await page.getByRole("button", {name:"Sort Expiry"}).click();
  await page.getByRole("button", {name:"Save Lab View"}).click();
  await page.locator('[data-pd-id="lab.nav.reports"]').click();
  await page.locator('[data-pd-id="lab.nav.freeBets"]').click();
  await expect(ledger).toContainText("1 of 2 rows");
  await expect(ledger.locator('th[aria-sort="ascending"]')).toContainText("Expiry");
  await page.getByRole("button", {name:"Clear Filters"}).click();
  await expect(ledger).toContainText("2 of 2 rows");
  await page.getByRole("button", {name:"Load Saved View"}).click();
  await expect(ledger).toContainText("1 of 2 rows");
});

test("Account balance shortcut distinguishes unknown, invalid and confirmed zero", async ({ page }) => {
  await page.locator('[data-pd-id="lab.nav.accounts"]').click();
  const ledger = page.locator('[data-pd-id="lab.ledger.accounts"]');
  await ledger.getByRole("button", {name:"Observe balance for Bookmaker C, Profile A"}).click();
  await expect(page.getByText("Last observed balance")).toBeVisible();
  await expect(page.getByText("Unknown", {exact:true}).last()).toBeVisible();
  await page.getByLabel("Observed Current Balance").fill("1,2");
  await page.getByRole("button", {name:/Confirm balance observation/}).click();
  await expect(page.getByRole("alert").filter({hasText:"Enter finite money"})).toBeVisible();
  await page.getByLabel("Observed Current Balance").fill("0.00");
  await page.getByRole("button", {name:/Confirm balance observation/}).click();
  await expect(ledger).toContainText("£0.00");
  await ledger.getByRole("button", {name:"Observe balance for Bookmaker C, Profile A"}).click();
  await expect(page.getByRole("dialog",{name:"Review Bookmaker C"}).getByText("1 Nov 2026 · synthetic confirmed observation")).toBeVisible();
  await expect(page.getByText(/Observation history:/)).toBeVisible();
});

test("specialist descriptive preview edits are bounded; financial cells stay protected", async ({ page }) => {
  await page.locator('[data-pd-id="lab.nav.extraPlace"]').click();
  const extra = page.locator('[data-pd-id="lab.ledger.extraPlace"]');
  await extra.locator("tbody tr td").filter({hasText:"Demo Runner / Sample Race"}).first().dblclick();
  await page.getByRole("textbox", {name:"Runner / Race"}).fill("Demo Runner / Revised Race");
  await page.keyboard.press("Enter");
  await expect(extra).toContainText("Demo Runner / Revised Race");
  await extra.getByRole("button",{name:"Open Demo Runner / Revised Race"}).click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("Demo Runner / Revised Race");
  await page.getByRole("button",{name:"Back to Extra Place"}).click();
  await extra.locator('tbody tr td').filter({hasText:"Unavailable"}).first().dblclick();
  await expect(extra.getByRole("status")).toContainText("calculated");
  await page.locator('[data-pd-id="lab.nav.cash"]').click();
  const cash = page.locator('[data-pd-id="lab.ledger.cash"]');
  await cash.locator("tbody tr td").filter({hasText:"£20.00"}).last().dblclick();
  await expect(cash.getByRole("status")).toContainText("calculated");
});

test("narrow table retains every field and offers labelled detail without page overflow", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.getByRole("button", {name:"Open navigation"}).click();
  await page.locator('[data-pd-id="lab.nav.extraPlace"]').click();
  const ledger = page.locator('[data-pd-id="lab.ledger.extraPlace"]');
  await expect(ledger.locator("thead")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.getByRole("button", {name:"Show Labelled Details"}).click();
  await expect(ledger.getByText("Win Lay Stake", {exact:true}).last()).toBeVisible();
  await expect(ledger.getByText("Place Lay Stake", {exact:true}).last()).toBeVisible();
  await page.getByRole("button", {name:"Show Full Table"}).click();
  await expect(ledger.locator("thead")).toBeVisible();
});

test("ledger layouts remain contained in both themes across review widths", async ({ page }) => {
  test.setTimeout(120000);
  const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
  if (evidence) await mkdir(evidence,{recursive:true});
  const openDestination = async (id: string) => {
    const target = page.locator(`[data-pd-id="lab.nav.${id}"]`);
    if (!await target.isVisible()) {
      const open = page.getByRole("button",{name:"Open navigation"});
      if (await open.isVisible()) await open.click();
    }
    if (!await target.isVisible()) {
      const expand = page.getByRole("button",{name:"Expand Tracker"});
      if (await expand.isVisible()) await expand.click();
    }
    await target.click();
  };
  for (const width of [1440,900,768,430,390]) {
    await page.setViewportSize({width,height:900});
    for (const theme of ["light","dark"]) {
      await page.evaluate(value => document.documentElement.setAttribute("data-theme",value),theme);
      await openDestination("extraPlace");
      const ledger = page.locator('[data-pd-id="lab.ledger.extraPlace"]');
      await expect(ledger.locator("thead")).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      if (width === 390) {
        const action = await ledger.locator("thead th").last().boundingBox();
        const profile = await ledger.locator('thead th[data-lab-column="-1"]').boundingBox();
        const date = await ledger.locator('thead th[data-lab-column="0"]').boundingBox();
        expect(action?.width).toBeLessThanOrEqual(80);
        expect(profile?.width).toBeLessThanOrEqual(100);
        expect(date!.x + date!.width).toBeLessThanOrEqual(action!.x + 2);
      }
      if (evidence) await page.screenshot({path:join(evidence,`cp119-extra-place-${width}-${theme}.png`),fullPage:width<=430,style:"nextjs-portal { display: none !important; }"});
      await openDestination("sportsbook");
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      if (evidence && (width === 1440 || width === 390)) await page.screenshot({path:join(evidence,`cp119-sportsbook-${width}-${theme}.png`),fullPage:width<=430,style:"nextjs-portal { display: none !important; }"});
    }
  }
});
