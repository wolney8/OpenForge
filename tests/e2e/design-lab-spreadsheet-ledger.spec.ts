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
  await page.getByRole("button", { name: "Open Sportsbook" }).click();
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).toBeVisible();
});

test("combined rows retain ownership and breadcrumb/record return preserves view", async ({ page }) => {
  const ledger = page.locator('[data-pd-id="lab.ledger.sportsbook"]');
  await expect(ledger).toContainText("7 of 7 rows");
  await expect(ledger.locator("thead")).toContainText("Profile");
  await expect(ledger.locator("tbody")).toContainText("Profile A");
  await expect(ledger.locator("tbody")).toContainText("Profile B");
  await page.getByRole("button", { name: "Sort Profile" }).click();
  await expect(ledger.locator('th[aria-sort="ascending"]')).toContainText("Profile");
  await page.locator('[data-pd-id="lab.ledger.profile-filter"]').click();
  await page.getByRole("option", { name: "Profile B" }).click();
  await expect(ledger).toContainText("3 of 7 rows");
  await ledger.locator('[aria-label*="table, scroll horizontally"]').evaluate(node => { node.scrollLeft = 300; });
  await page.getByRole("button", { name: "Open Profile B example" }).click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("Owner: Profile B");
  await expect(page.locator('[data-pd-id="lab.profile"]')).toContainText("All Profiles");
  await page.getByRole("button", { name: "Back to Sportsbook Bets" }).click();
  await expect(ledger).toContainText("3 of 7 rows");
  expect(await ledger.locator('[aria-label*="table, scroll horizontally"]').evaluate(node => node.scrollLeft)).toBeGreaterThan(100);
  await expect(page.locator('[data-pd-id="lab.ledger.profile-filter"]')).toContainText("Profile B");
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("button", { name: "Position" }).click();
  await expect(page.getByRole("heading", { name: "Position", level: 1 })).toBeVisible();
});

test("pointer resize/reorder, header sort cycle and reset columns", async ({ page }) => {
  const ledger = page.locator('[data-pd-id="lab.ledger.sportsbook"]');
  const eventHeader = ledger.locator('th[data-lab-column="2"]');
  const initial = await eventHeader.boundingBox();
  expect(initial).not.toBeNull();
  const resize = eventHeader.getByRole("button", { name: "Resize Event" });
  const box = await resize.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down(); await page.mouse.move(box!.x + 48, box!.y + box!.height / 2, { steps: 6 }); await page.mouse.up();
  expect((await eventHeader.boundingBox())!.width).toBeGreaterThan(initial!.width + 20);
  const grip = eventHeader.getByRole("button", { name: "Move Event" });
  const gripBox = await grip.boundingBox();
  const bookmaker = await ledger.locator('th[data-lab-column="1"]').boundingBox();
  await page.mouse.move(gripBox!.x + 8, gripBox!.y + 8); await page.mouse.down();
  await page.mouse.move(bookmaker!.x + bookmaker!.width / 2, bookmaker!.y + bookmaker!.height / 2, { steps: 8 }); await page.mouse.up();
  const order = await ledger.locator("thead th").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-lab-column")));
  expect(order.indexOf("2")).toBeLessThan(order.indexOf("1"));
  await page.getByRole("button", { name: "Sort Value" }).click();
  await expect(ledger.locator('th[data-lab-column="8"]')).toHaveAttribute("aria-sort", "ascending");
  await expect(ledger.locator("tbody tr").first()).toContainText("Profile B example");
  await page.getByRole("button", { name: /Sort Value/ }).click();
  await expect(ledger.locator('th[data-lab-column="8"]')).toHaveAttribute("aria-sort", "descending");
  await expect(ledger.locator("tbody tr").first()).toContainText("Sample Rangers");
  await page.getByRole("button", { name: /Sort Value/ }).click();
  await expect(ledger.locator('th[data-lab-column="8"]')).not.toHaveAttribute("aria-sort", /ascending|descending/);
  await page.getByRole("button", { name: "Sort Settles" }).click();
  await expect(ledger.locator("tbody tr").first()).toContainText("Profile B September example");
  await page.getByRole("button", { name: "Sort Status" }).click();
  await expect(ledger.locator("tbody tr").first()).toContainText("Example City");
  await page.getByRole("button", { name: "Reset Columns" }).click();
  const reset = await ledger.locator("thead th").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-lab-column")));
  expect(reset.indexOf("1")).toBeLessThan(reset.indexOf("2"));
  expect(Math.abs((await eventHeader.boundingBox())!.width - initial!.width)).toBeLessThan(4);
});

test("Prospecting inline edit validates and cannot place without workbench", async ({ page }) => {
  const ledger = page.locator('[data-pd-id="lab.ledger.sportsbook"]');
  await page.locator('[data-pd-id="lab.add.modal"]').click();
  await page.locator('[data-pd-id="lab.bet.owner"]').click();
  await page.getByRole("option", { name: "Profile A" }).click();
  await page.locator('[data-pd-id="lab.bet.offer-text"]').fill("Synthetic offer text");
  await page.locator('[data-pd-id="lab.bet.bookmaker"]').click();
  await page.getByRole("option", { name: "Bookmaker A" }).click();
  await page.getByRole("button", { name: "Save Prospecting" }).click();
  await expect(ledger).toContainText("Offer captured · event pending");
  const row = ledger.locator("tbody tr").filter({hasText:"Event pending"});
  await row.locator('td').nth(3).focus();
  await page.keyboard.press("F2");
  await page.getByRole("textbox", {name:"event"}).fill("Discard me");
  await page.keyboard.press("Escape");
  await expect(row).toContainText("Event pending");
  await row.locator('td').nth(3).dblclick();
  await page.getByRole("textbox", { name: "event" }).fill("Synthetic fixture");
  await page.getByRole("button", { name: "Save cell" }).click();
  const editedRow = ledger.locator("tbody tr").filter({hasText:"Synthetic fixture"});
  await expect(editedRow).toBeVisible();
  await editedRow.locator('td').nth(8).dblclick();
  await page.getByRole("textbox", { name: "Back Stake" }).fill("not money");
  await page.getByRole("button", { name: "Save cell" }).click();
  await expect(ledger.getByText(/backStake must/)).toBeVisible();
  await page.keyboard.press("Escape");
  await editedRow.locator('td').nth(10).dblclick();
  await page.locator('[data-pd-id="lab.cell.status"]').click();
  await page.getByRole("option", { name: /Placed · confirm externally/ }).click();
  await expect(page.getByText("Placement requires the full external confirmation and required fields.")).toBeVisible();
  await page.getByRole("button", { name: /Placement/ }).click();
  await expect(page.getByRole("button", { name: /Confirm external Back/ })).toBeVisible();
  await expect(page.locator('[data-pd-id="lab.profile"]')).toContainText("All Profiles");
});

test("date and eligible Account editors keep the synthetic owner, saved view restores", async ({ page }) => {
  const ledger = page.locator('[data-pd-id="lab.ledger.sportsbook"]');
  await page.locator('[data-pd-id="lab.add.modal"]').click();
  await page.locator('[data-pd-id="lab.bet.owner"]').click();
  await page.getByRole("option", {name:"Profile A"}).click();
  await page.locator('[data-pd-id="lab.bet.offer-text"]').fill("Synthetic offer");
  await page.locator('[data-pd-id="lab.bet.bookmaker"]').click();
  await page.getByRole("option", {name:"Bookmaker A"}).click();
  await page.getByRole("button", {name:"Save Prospecting"}).click();
  const row = ledger.locator("tbody tr").filter({hasText:"Event pending"});
  await row.locator("td").nth(1).dblclick();
  await page.getByLabel("Event date/time").fill("2026-11-05T14:30");
  await page.getByRole("button", {name:"Save cell"}).click();
  await expect(ledger).toContainText("2026-11-05");
  await row.locator("td").nth(2).dblclick();
  await page.locator('[data-pd-id="lab.cell.bookmaker"] input').fill("C");
  await page.getByRole("option", {name:"Bookmaker C"}).click();
  await page.getByRole("button", {name:"Save cell"}).click();
  await expect(ledger).toContainText("Bookmaker C");
  await expect(page.locator('[data-pd-id="lab.profile"]')).toContainText("All Profiles");
  await page.locator('[data-pd-id="lab.ledger.profile-filter"]').click();
  await page.getByRole("option", {name:"Profile A"}).click();
  await page.getByRole("button", {name:"Sort Event"}).click();
  await page.getByRole("button", {name:"Save lab view"}).click();
  await expect(ledger).toContainText("Saved lab view active");
  await page.getByRole("button", {name:"Clear Filters"}).click();
  await expect(ledger).toContainText("Custom view");
  await page.getByRole("button", {name:"Load saved view"}).click();
  await expect(ledger).toContainText("Saved lab view active");
  await expect(page.locator('[data-pd-id="lab.ledger.profile-filter"]')).toContainText("Profile A");
  await expect(ledger.locator('th[data-lab-column="2"]')).toHaveAttribute("aria-sort","ascending");
});

test("ledger reflows in light/dark and preserves narrow source access", async ({ page }) => {
  const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
  if (evidence) await mkdir(evidence, {recursive:true});
  const cookieNotice = page.getByRole("button", {name:"Understood"});
  if (await cookieNotice.isVisible()) await cookieNotice.click();
  for (const width of [1440, 900, 768, 430, 390]) {
    await page.setViewportSize({width,height:900});
    for (const theme of ["light","dark"]) {
      await page.evaluate(value => document.documentElement.setAttribute("data-theme",value),theme);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      if (width <= 430) await expect(page.getByRole("button", {name:"View all fields"}).first()).toBeVisible();
      else await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"] thead')).toBeVisible();
      if (evidence) await page.screenshot({path:join(evidence,`cp114b-sportsbook-${width}-${theme}.png`),fullPage:true});
    }
  }
});
