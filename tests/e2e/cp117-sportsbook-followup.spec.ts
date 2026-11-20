import { expect, test } from "@playwright/test";
import { formatFinancialValue } from "../../apps/web/lib/financial-display";

const profile = "profile-demo-001";
const owned = `/profiles/${profile}/tracker/sportsbook-bets`;
const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  expect((await (await page.request.get("/api/auth/session")).json()).email).toBe("demo@example.invalid");
  const selectedRange = await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } });
  expect(selectedRange.ok()).toBeTruthy();
});

test("Offer Name is beside Bookmaker and Offer Type precedes Bet Type", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(owned);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  await page.locator('[data-pd-id="sportsbook.toolbar.add-row"]').click();
  const offer = page.locator('[data-pd-id="ledger-editor.panel.setup"]');
  const name = offer.getByLabel("Offer Name", { exact: true });
  await expect(name).toBeVisible();
  const positions = await offer.evaluate(node => {
    const labels = [...node.querySelectorAll("label")];
    const byText = (value: string) => labels.find(label => label.querySelector(":scope > span")?.textContent?.trim() === value)!;
    const bookmaker = byText("Bookmaker").getBoundingClientRect();
    const name = byText("Offer Name").getBoundingClientRect();
    const order = labels.map(label => label.querySelector(":scope > span")?.textContent?.trim()).filter(Boolean);
    const offerType = byText("Offer Type").getBoundingClientRect();
    const betType = byText("Bet Type").getBoundingClientRect();
    return { bookmakerY: bookmaker.y, nameY: name.y, bookmakerRight: bookmaker.right, nameLeft: name.left,
      offerTypeY: offerType.y, betTypeY: betType.y, offerTypeRight: offerType.right, betTypeLeft: betType.left, order };
  });
  expect(Math.abs(positions.bookmakerY - positions.nameY)).toBeLessThanOrEqual(1);
  expect(positions.nameLeft).toBeGreaterThanOrEqual(positions.bookmakerRight);
  expect(Math.abs(positions.offerTypeY - positions.betTypeY)).toBeLessThanOrEqual(1);
  expect(positions.betTypeLeft).toBeGreaterThanOrEqual(positions.offerTypeRight);
  expect(positions.order.indexOf("Offer Type")).toBeLessThan(positions.order.indexOf("Bet Type"));
  await name.fill("Synthetic Offer Name");
  await expect(name).toHaveValue("Synthetic Offer Name");
  await expect(offer.getByLabel("Campaign tag (optional)")).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 900 });
  const narrow = await offer.evaluate(node => {
    const labels = [...node.querySelectorAll("label")];
    const byText = (value: string) => labels.find(label => label.querySelector(":scope > span")?.textContent?.trim() === value)!.getBoundingClientRect();
    const bookmaker = byText("Bookmaker");
    const name = byText("Offer Name");
    return { bookmakerBottom: bookmaker.bottom, nameTop: name.top, nameLeft: name.left, bookmakerRight: bookmaker.right };
  });
  expect(narrow.nameTop >= narrow.bookmakerBottom || narrow.nameLeft >= narrow.bookmakerRight).toBeTruthy();
});

for (const entry of ["profile", "combined", "reports", "tasks"] as const) {
  test(`Sportsbook breadcrumb returns to the ledger from ${entry} entry`, async ({ page }) => {
    test.setTimeout(90_000);
    if (entry === "combined") {
      await page.goto(`/tracker/sportsbook-bets?profile=${profile}&q=Synthetic%20cell%20review&sort=event_name&size=16`);
      const row = page.locator('[data-pd-id="combined.sportsbook-bets.table-scroll"] tbody tr').first();
      await expect(row).toBeVisible();
      await row.locator("a").first().click();
    } else if (entry === "profile") {
      const id = `CP117-CRUMB-${Date.now()}`;
      const eventName = `Synthetic profile breadcrumb ${id}`;
      const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
        sportsbook_bet_id: id, event_name: eventName, offer_text: "Synthetic breadcrumb source",
        offer_name: "Synthetic breadcrumb offer", bookmaker: "Bookmaker A", offer_type: "Bet & Get",
        bet_type: "Single", fixture_type: "Football", market: "Match Odds", status: "Prospecting",
        result: "Pending", back_stake: "10", back_odds: "2.10", match_strategy: "Standard",
        date_settled: "2026-11-03T18:00",
      } });
      expect(created.status(), await created.text()).toBe(201);
      await page.goto(owned);
      await page.getByRole("searchbox", { name: "Search sportsbook rows" }).fill(eventName);
      await expect(page.locator('td[data-ledger-column="event_name"]', { hasText: eventName })).toHaveCount(1);
    } else {
      await page.goto(`/${entry === "reports" ? "reports" : "tasks"}?scope=${profile}`);
      await page.getByRole("link", { name: "Sportsbook Bets", exact: true }).first().click();
      await expect(page).toHaveURL(/\/tracker\/sportsbook-bets/);
      await page.locator('[data-pd-id="combined.sportsbook-bets.table-scroll"] tbody tr').first().locator("a").first().click();
    }
    await expect(page).toHaveURL(new RegExp(owned));
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
    if (entry === "profile") {
      await page.locator('td[data-ledger-column="event_name"]').first().click();
      await page.locator('[data-pd-id="sportsbook.toolbar.open-selected"]').click();
    }
    await expect(workbench).toBeVisible();
    const crumb = page.locator('[data-pd-id="ux-v2.breadcrumbs"] a', { hasText: "Sportsbook Bets" });
    await expect(crumb).toHaveAttribute("href", entry === "combined" ? /\/tracker\/sportsbook-bets\?.*profile=.*q=Synthetic.*sort=event_name.*size=16/ : entry === "profile" ? owned : /\/tracker\/sportsbook-bets/);
    if (entry === "reports" || entry === "tasks") {
      await workbench.locator('[data-pd-id="bet-workbench.stage.offer"]').click();
      const draft = workbench.getByLabel("Original Offer text");
      await draft.fill(`Unsaved ${entry} return`);
      await crumb.click();
      const guard = page.getByRole("dialog", { name: "Unsaved tracker changes" });
      await expect(guard).toBeVisible();
      await guard.getByRole("button", { name: "Keep editing", exact: true }).click();
      await expect(draft).toHaveValue(`Unsaved ${entry} return`);
      await crumb.click();
      await guard.getByRole("button", { name: "Discard changes", exact: true }).click();
    } else {
      await crumb.click();
    }
    await expect(workbench).toHaveCount(0);
    if (entry === "combined") await expect(page).toHaveURL(/\/tracker\/sportsbook-bets\?.*profile=.*q=Synthetic.*size=16/);
    else if (entry === "reports" || entry === "tasks") await expect(page).toHaveURL(/\/tracker\/sportsbook-bets/);
    else await expect(page).toHaveURL(owned);
  });
}

test("Sportsbook breadcrumb respects the unsaved draft guard", async ({ page }) => {
  await page.goto(owned);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  await page.locator('[data-pd-id="sportsbook.toolbar.add-row"]').click();
  const offer = page.locator('[data-pd-id="ledger-editor.panel.setup"]');
  await offer.getByLabel("Original Offer text").fill("Unsaved synthetic offer");
  const crumb = page.locator('[data-pd-id="ux-v2.breadcrumbs"] a', { hasText: "Sportsbook Bets" });
  await crumb.click();
  const guard = page.getByRole("dialog", { name: "Unsaved tracker changes" });
  await expect(guard).toBeVisible();
  await guard.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]')).toBeVisible();
  await expect(offer.getByLabel("Original Offer text")).toHaveValue("Unsaved synthetic offer");
  await crumb.click();
  await guard.getByRole("button", { name: "Discard changes" }).click();
  await expect(page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]')).toHaveCount(0);
});

test("combined Sportsbook breadcrumb keeps filters through the unsaved guard", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(`/tracker/sportsbook-bets?profile=${profile}&q=Synthetic%20cell%20review&sort=event_name`);
  const row = page.locator('[data-pd-id="combined.sportsbook-bets.table-scroll"] tbody tr').first();
  await expect(row).toBeVisible();
  await row.locator("a").first().click();
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await expect(workbench).toBeVisible();
  await workbench.locator('[data-pd-id="bet-workbench.stage.offer"]').click();
  const offerText = workbench.getByLabel("Original Offer text");
  await offerText.fill("Unsaved combined draft");
  const crumb = page.locator('[data-pd-id="ux-v2.breadcrumbs"] a', { hasText: "Sportsbook Bets" });
  await crumb.click();
  const guard = page.getByRole("dialog", { name: "Unsaved tracker changes" });
  await expect(guard).toBeVisible();
  await guard.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(guard).toHaveCount(0);
  await expect(crumb).not.toHaveAttribute("aria-disabled", "true");
  await expect(offerText).toHaveValue("Unsaved combined draft");
  await crumb.click();
  await guard.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page).toHaveURL(/\/tracker\/sportsbook-bets\?.*profile=profile-demo-001.*q=Synthetic/);
  await expect(workbench).toHaveCount(0);
});

for (const source of ["report-explorer", "task"] as const) {
  test(`clean ${source} direct-record breadcrumb clears the deep link and remains responsive`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(`${owned}?record=SB-SEED-001&source=${source}`);
    const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
    await expect(workbench).toBeVisible();
    await page.locator('[data-pd-id="ux-v2.breadcrumbs"] a', { hasText: "Sportsbook Bets" }).click();
    await expect(workbench).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${owned}$`));
    await page.locator('[data-pd-id="sportsbook.toolbar.add-row"]').click();
    await expect(workbench).toBeVisible();
    await page.locator('[data-pd-id="ux-v2.breadcrumbs"] a', { hasText: "Sportsbook Bets" }).click();
    await expect(workbench).toHaveCount(0);
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`${owned}$`));
    await expect(workbench).toHaveCount(0);
    await expect(page.locator('[data-pd-id="sportsbook.toolbar.add-row"]')).toBeEnabled();
  });
}

test("actual Today source link opens a direct record and breadcrumb returns to a responsive ledger", async ({ page }) => {
  test.setTimeout(90_000);
  const id = `CP117-TASK-LINK-${Date.now()}`;
  const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
    sportsbook_bet_id: id, event_name: "Synthetic task-link return", offer_text: "Synthetic task source",
    offer_name: "Demo Offer", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
    fixture_type: "Football", market: "Match Odds", status: "Placed", result: "Pending",
    back_stake: "10.00", back_odds: "2.10", match_strategy: "Standard", lay_odds_1: "2.20",
    lay_actual: "9.54", lay_matched_stake_1: "9.54", lay_commission_1: "0.02",
    exchange_name: "Matchbook", date_settled: "2026-11-03T18:00", user_notes: "Synthetic only",
  } });
  expect(created.status(), await created.text()).toBe(201);
  const now = new Date().toISOString();
  await page.route("**/fund-manager/notifications", route => route.fulfill({ status: 200, json: [{
    audience: "fund_manager", security_tag: "fund_manager_only", kind: "task", task_state: "new",
    notification_id: id, notification_type: "settlement_review", title: "Review synthetic task-link bet",
    ledger_label: "Sportsbook Bets", bookmaker_label: "Bookmaker A", message: "Synthetic source requires review.",
    profile_id: profile, profile_name: "Subscriber Alpha", record_id: id, due_at: now,
    settles_at: "", created_at: now, href: `${owned}?record=${encodeURIComponent(id)}&source=task`,
    completion_href: "", tone: "warning",
  }] }));
  await page.goto("/tasks");
  await page.locator(`[data-pd-id="tasks.v2.row.${id}"]`).click();
  await page.locator('[data-pd-id="tasks.v2.inspector"]').getByRole("link", { name: "Open Bet" }).click();
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await expect(workbench).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${owned.replaceAll("/", "\\/")}\\?record=${id}`));
  await page.locator('[data-pd-id="ux-v2.breadcrumbs"] a', { hasText: "Sportsbook Bets" }).click();
  await expect(workbench).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`${owned}$`));
  await page.locator('[data-pd-id="sportsbook.toolbar.add-row"]').click();
  await expect(workbench).toBeVisible();
  await page.locator('[data-pd-id="ux-v2.breadcrumbs"] a', { hasText: "Sportsbook Bets" }).click();
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`${owned}$`));
  await expect(workbench).toHaveCount(0);
});

for (const width of [1440, 390] as const) {
  test(`approved protected Sportsbook footer uses two distinct states at ${width}px dark`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("openforge-theme", "dark"));
    await page.goto(`${owned}?record=SB-SEED-001`);
    const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
    await expect(workbench).toBeVisible();
    await workbench.locator('[data-pd-id="bet-workbench.stage.finish"]').click();
    await expect(workbench.locator('[data-pd-id="bet-workbench.protected-notice"]'))
      .toHaveText("Recorded financial fields are read-only. Review a correction to change them.");
    const footer = workbench.locator('[data-pd-id="sportsbook.editor.actions"]');
    await expect(footer.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(1);
    await expect(footer.getByRole("button", { name: "Review Correction" })).toHaveCount(1);
    await expect(footer.getByRole("button", { name: "Save Audited Correction" })).toHaveCount(0);
    await expect(workbench.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]')).toHaveCount(0);
    await page.screenshot({ path: `data/private/evidence/cp117-sportsbook-proposals/native-protected-before-${width}-dark.png`, fullPage: true });
    await footer.getByRole("button", { name: "Review Correction" }).click();
    await expect(footer.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(0);
    await expect(footer.getByRole("button", { name: "Cancel Correction" })).toHaveCount(1);
    await expect(footer.getByRole("button", { name: "Save Audited Correction" })).toHaveCount(1);
    if (width === 390) {
      const geometry = await footer.evaluate(node => {
        const cancel = node.querySelector<HTMLElement>('[data-pd-id="bet-workbench.cancel-correction"]')!.getBoundingClientRect();
        const save = node.querySelector<HTMLElement>('[data-pd-id="bet-workbench.save-audited-correction"]')!.getBoundingClientRect();
        return { leftGap: Math.abs(cancel.left - save.left), widthGap: Math.abs(cancel.width - save.width), verticalGap: save.top - cancel.bottom };
      });
      expect(geometry.leftGap).toBeLessThanOrEqual(1);
      expect(geometry.widthGap).toBeLessThanOrEqual(1);
      expect(geometry.verticalGap).toBeGreaterThanOrEqual(7);
    }
    await page.screenshot({ path: `data/private/evidence/cp117-sportsbook-proposals/native-protected-correction-${width}-dark.png`, fullPage: true });
    await footer.getByRole("button", { name: "Cancel Correction" }).click();
    await expect(footer.getByRole("button", { name: "Review Correction" })).toBeVisible();
    await footer.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(workbench).toHaveCount(0);
  });
}

test("source-backed scenario labels keep their own signed amounts", async ({ page }) => {
  test.setTimeout(120_000);
  const cases = [
    { name: "Standard", offerType: "Bet & Get", strategy: "Standard", odds: "2.10", layOdds: "2.20", expected: [
      ["back-wins", "Back wins", "scenario_pnl_if_back_wins"],
      ["lay-wins", "Lay wins", "scenario_pnl_if_lay_wins"],
    ] },
    { name: "No Lay", offerType: "Mug Bet", strategy: "No Lay", odds: "2.10", layOdds: "", expected: [
      ["back-wins", "Back wins", "scenario_pnl_if_back_wins"],
      ["lay-wins", "Back loses", "scenario_pnl_if_lay_wins"],
    ] },
    { name: "Cashback", offerType: "Cashback", strategy: "Underlay", odds: "4.00", layOdds: "4.20", expected: [
      ["back-wins", "Back wins", "scenario_pnl_if_back_wins"],
      ["lay-wins", "Lay wins", "scenario_pnl_if_lay_wins"],
      ["outcome-2", "Cashback trigger hits", "scenario_pnl_if_outcome_2_wins"],
    ] },
    { name: "Double Delight", offerType: "Double Delight / Hat-trick Heaven", strategy: "Underlay", odds: "8.00", layOdds: "9.00", expected: [
      ["back-wins", "Player scores first but no further goals", "scenario_pnl_if_back_wins"],
      ["lay-wins", "Player does not score first", "scenario_pnl_if_lay_wins"],
      ["outcome-2", "Player scores first and then scores again", "scenario_pnl_if_outcome_2_wins"],
      ["outcome-3", "Player scores first and gets a hat-trick", "scenario_pnl_if_outcome_3_wins"],
    ] },
  ] as const;
  for (const variant of cases) {
    const id = `CP117-COMPARISON-${variant.name.replaceAll(" ", "-")}-${Date.now()}`;
    const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
      sportsbook_bet_id: id, event_name: `Synthetic ${variant.name} outcome`, offer_text: "Synthetic source-backed comparison", offer_name: "Demo Offer",
      bookmaker: "Bookmaker A", offer_type: variant.offerType, bet_type: "Single", fixture_type: "Football", market: "Match Odds",
      status: "Placed", result: "Pending", back_stake: "10.00", back_odds: variant.odds,
      match_strategy: variant.strategy, lay_odds_1: variant.layOdds, lay_actual: variant.strategy === "No Lay" ? "" : "8.20",
      lay_matched_stake_1: variant.strategy === "No Lay" ? "" : "8.20", lay_commission_1: "0.02", exchange_name: "Matchbook",
      date_settled: "2026-11-03T18:00", user_notes: "Synthetic only",
    } });
    expect(created.status(), `${variant.name}: ${await created.text()}`).toBe(201);
    const stored = await created.json() as Record<string, string | null>;
    await page.goto(`${owned}?record=${encodeURIComponent(id)}`);
    const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
    await expect(workbench).toBeVisible();
    await workbench.locator('[data-pd-id="bet-workbench.stage.finish"]').click();
    const comparison = workbench.locator('[data-pd-id="sportsbook.editor.financial-context"]');
    let verifiedScenarios = 0;
    for (const [key, label, field] of variant.expected) {
      const amount = stored[field];
      if (amount === null || amount === undefined) continue;
      const row = comparison.locator(`[data-pd-id="sportsbook.editor.outcome.${key}"]`);
      await expect(row.locator("dt")).toHaveText(label);
      await expect(row.locator("dd")).toHaveText(formatFinancialValue(Number(amount)));
      verifiedScenarios += 1;
    }
    if (variant.name === "Double Delight") expect(verifiedScenarios).toBeGreaterThanOrEqual(3);
    if (variant.strategy === "No Lay") await expect(comparison).not.toContainText("Exchange wins");
  }
});

test("Offer Name saves through the native eligible Placed edit command", async ({ page }) => {
  const id = `CP117-OFFER-${Date.now()}`;
  const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
    sportsbook_bet_id: id, event_name: "Synthetic offer-name edit", offer_text: "Synthetic approved comparison",
    offer_name: "Original synthetic offer", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
    fixture_type: "Football", market: "Match Odds", status: "Placed", result: "Pending",
    back_stake: "10.00", back_odds: "2.10", match_strategy: "Standard", lay_odds_1: "2.20",
    lay_actual: "9.54", lay_matched_stake_1: "9.54", lay_commission_1: "0.02",
    exchange_name: "Matchbook", date_settled: "2026-11-03T18:00", user_notes: "Synthetic only",
  }});
  expect(created.status(), await created.text()).toBe(201);
  await page.goto(`${owned}?record=${encodeURIComponent(id)}`);
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await expect(workbench).toBeVisible();
  await workbench.locator('[data-pd-id="bet-workbench.stage.offer"]').click();
  const name = workbench.locator('[data-pd-id="sportsbook.editor.offer-name"] input');
  await name.fill("Synthetic offer name revision");
  await name.blur();
  const save = workbench.getByRole("button", { name: "Save Existing Bet" });
  await expect(save).toBeEnabled();
  await save.click();
  const response = await page.request.get(`/api/profiles/${profile}/sportsbook-bets/${id}`);
  expect(response.ok()).toBeTruthy();
  const saved = await response.json() as { offer_name: string; back_stake: string; status: string };
  expect(saved.offer_name).toBe("Synthetic offer name revision");
  expect(saved.back_stake).toBe("10.00");
  expect(saved.status).toBe("Placed");
  await page.reload();
  await expect(page.locator('[data-pd-id="sportsbook.editor.offer-name"] input')).toHaveValue("Synthetic offer name revision");
});

test("Placed pending standard edit shows one source-backed Outcome Comparison", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 2048, height: 900 });
  await page.addInitScript(() => localStorage.setItem("openforge-theme", "dark"));
  await page.goto("/design-lab");
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await page.locator('tr[data-lab-row-id="LAB-SB-002"] button[aria-label^="Open "]').click();
  await page.getByRole("button", { name: "Edit Bet", exact: true }).click();
  await page.locator('[data-pd-id="bet-workbench.stage.4"]').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  const approvedGeometry = await page.locator('[data-pd-id="lab.entry.page"]').evaluate(node => {
    const y = (selector: string) => node.querySelector(selector)!.getBoundingClientRect().y;
    return { context: y('[data-pd-bet-workbench-context="true"]'), rail: y('[data-pd-id="bet-workbench.stages"]'), aside: y('aside'), footer: y('[class*="entryFooter"]') };
  });
  await page.screenshot({ path: "data/private/evidence/cp117-sportsbook-parity/lab-placed-pending-finish-2048-dark.png", fullPage: true });
  const id = `CP117-PLACED-${Date.now()}`;
  const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
    sportsbook_bet_id: id, event_name: "Synthetic placed pending comparison", offer_text: "Synthetic approved comparison",
    offer_name: "Synthetic offer", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
    fixture_type: "Football", market: "Match Odds", status: "Placed", result: "Pending",
    back_stake: "10.00", back_odds: "2.10", match_strategy: "Standard", lay_odds_1: "2.20",
    lay_actual: "9.54", lay_matched_stake_1: "9.54", lay_commission_1: "0.02",
    exchange_name: "Matchbook", date_settled: "2026-11-03T18:00", user_notes: "Synthetic only",
  }});
  expect(created.status(), await created.text()).toBe(201);
  const stored = await created.json() as { sportsbook_bet_id: string; scenario_pnl_if_back_wins?: string | null; scenario_pnl_if_lay_wins?: string | null };
  await page.goto(`${owned}?record=${encodeURIComponent(stored.sportsbook_bet_id)}`);
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await expect(workbench).toBeVisible();
  await expect(page.getByRole("region", { name: "Tracked Tasks loading" })).toHaveCount(0);
  await workbench.locator('[data-pd-id="bet-workbench.stage.offer"]').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "data/private/evidence/cp117-sportsbook-parity/native-placed-pending-offer-2048-dark.png", fullPage: true });
  await workbench.locator('[data-pd-id="bet-workbench.stage.finish"]').click();
  const comparison = workbench.locator('[data-pd-id="sportsbook.editor.financial-context"]');
  await expect(comparison).toContainText("Outcome Comparison");
  if (stored.scenario_pnl_if_back_wins != null) {
    const back = comparison.locator('[data-pd-id="sportsbook.editor.outcome.back-wins"]');
    await expect(back.locator("dt")).toHaveText("Back wins");
    await expect(back.locator("dd")).toHaveText(formatFinancialValue(Number(stored.scenario_pnl_if_back_wins)));
  }
  if (stored.scenario_pnl_if_lay_wins != null) {
    const lay = comparison.locator('[data-pd-id="sportsbook.editor.outcome.lay-wins"]');
    await expect(lay.locator("dt")).toHaveText("Lay wins");
    await expect(lay.locator("dd")).toHaveText(formatFinancialValue(Number(stored.scenario_pnl_if_lay_wins)));
  }
  await expect(workbench.locator('[data-pd-id="sportsbook.settlement.outcomes"]')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  const nativeGeometry = await workbench.evaluate(node => {
    const y = (selector: string) => node.querySelector(selector)!.getBoundingClientRect().y;
    return { context: y('[data-pd-bet-workbench-context="true"]'), rail: y('[data-pd-id="bet-workbench.stages"]'), aside: y('aside'), footer: y('[data-pd-id="sportsbook.editor.actions"]') };
  });
  for (const key of ["context", "rail", "aside"] as const) expect(Math.abs(nativeGeometry[key] - approvedGeometry[key])).toBeLessThanOrEqual(1);
  // Native settlement/reward/history fields remain a visible, unapproved
  // production extension. Assert their vertical footprint rather than masking it.
  expect(nativeGeometry.footer).toBeGreaterThan(approvedGeometry.footer);
  await page.screenshot({ path: "data/private/evidence/cp117-sportsbook-parity/native-placed-pending-finish-2048-dark.png", fullPage: true });
});

test("approved Offer disclosure retains entered Market and opens for required event validation", async ({ page }) => {
  await page.goto(owned);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  await page.locator('[data-pd-id="sportsbook.toolbar.add-row"]').click();
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await expect(workbench).toBeVisible();
  const offer = workbench.locator('[data-pd-id="ledger-editor.panel.setup"]');
  const details = offer.locator('[data-pd-id="sportsbook.editor.additional-offer-details"]');
  await expect(workbench.getByRole("combobox", { name: "Bookmaker", exact: true })).toBeVisible();
  await expect(workbench.locator('[data-pd-id="sportsbook.editor.offer-name"] input')).toBeVisible();
  await expect(workbench.getByRole("textbox", { name: "Back Stake · if known" })).toBeVisible();
  await details.locator("summary").click();
  const market = details.getByLabel("Market (optional)");
  await market.fill("Synthetic review market");
  await details.locator("summary").click();
  await details.locator("summary").click();
  await expect(market).toHaveValue("Synthetic review market");
  await details.locator("summary").click();
  await offer.getByLabel("Original Offer text").fill("Synthetic offer requiring event review");
  await workbench.getByRole("button", { name: "Save Prospecting" }).click();
  await expect(details).toHaveAttribute("open", "");
  await expect(details.getByLabel("Event name")).toBeFocused();
});

test("protected reward draft cannot masquerade as an audited Sportsbook correction", async ({ page }) => {
  const id = `CP117-PROTECTED-${Date.now()}`;
  const payload = {
    sportsbook_bet_id: id, event_name: "Synthetic protected reward test", offer_text: "Synthetic source only",
    offer_name: "Synthetic protected reward", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
    fixture_type: "Football", market: "Match Odds", status: "Settled", result: "Win",
    back_stake: "10.00", back_odds: "2.00", match_strategy: "Standard", lay_odds_1: "2.10",
    lay_actual: "9.62", lay_matched_stake_1: "9.62", lay_commission_1: "0.02",
    exchange_name: "Matchbook", date_settled: "2026-11-03T18:00", user_notes: "Synthetic only",
  };
  const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: payload });
  expect(created.status(), await created.text()).toBe(201);
  await page.goto(`${owned}?record=${encodeURIComponent(id)}`);
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await expect(workbench).toBeVisible();
  await workbench.locator('[data-pd-id="bet-workbench.stage.finish"]').click();
  const linked = workbench.locator('[data-pd-id="sportsbook.workbench.linked-free-bets"]');
  await linked.locator("summary").click();
  await linked.getByRole("button", { name: "Create linked Free Bet" }).click();
  const bridge = workbench.locator('[data-pd-id="sportsbook.free-bet-bridge.inline"]');
  await expect(bridge).toBeVisible();
  await bridge.getByLabel("Notes", { exact: true }).fill("Reward-only synthetic draft");
  const footer = workbench.locator('[data-pd-id="sportsbook.editor.actions"]');
  await footer.getByRole("button", { name: "Review Correction" }).click();
  await expect(footer.getByRole("button", { name: "Save Audited Correction" })).toBeDisabled();
  await expect(footer.getByRole("button", { name: "Cancel Correction" })).toBeVisible();
  await footer.getByRole("button", { name: "Cancel Correction" }).click();
  await expect(footer.getByRole("button", { name: "Review Correction" })).toBeVisible();
  const unchanged = await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/${id}`)).json() as Record<string, unknown>;
  expect(unchanged.result).toBe("Win");
  const historyBefore = await (await page.request.get(`/api/profiles/${profile}/financial-history/sportsbook/${id}`)).json() as unknown[];
  await footer.getByRole("button", { name: "Review Correction" }).click();
  await workbench.locator('[data-pd-id="bet-workbench.stage.finish"]').click();
  await workbench.getByRole("combobox", { name: "Result", exact: true }).selectOption("Lay Won");
  const auditedSave = footer.getByRole("button", { name: "Save Audited Correction" });
  await expect(auditedSave).toBeDisabled();
  await workbench.locator('[data-pd-id="sportsbook.settlement.correction-reason"]').fill("Synthetic result correction after review");
  await expect(auditedSave).toBeEnabled();
  await auditedSave.click();
  const saved = await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/${id}`)).json() as Record<string, unknown>;
  expect(saved.result).toBe("Lay Won");
  const historyAfter = await (await page.request.get(`/api/profiles/${profile}/financial-history/sportsbook/${id}`)).json() as unknown[];
  expect(historyAfter.length).toBeGreaterThan(historyBefore.length);
});

test("missing and partial lay evidence cannot acquire an outcome amount by opening Finish", async ({ page }) => {
  test.setTimeout(90_000);
  for (const [caseName, stake] of [["missing", ""], ["partial", "5.00"]] as const) {
    const id = `CP117-EVIDENCE-${caseName}-${Date.now()}`;
    const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
      sportsbook_bet_id: id, event_name: `Synthetic ${caseName} lay`, offer_text: "Synthetic source only",
      offer_name: "Synthetic evidence review", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
      fixture_type: "Football", market: "Match Odds", status: stake ? "Placed" : "Prospecting", result: "Pending",
      back_stake: "10.00", back_odds: "2.10", match_strategy: "Standard", lay_odds_1: "2.20",
      lay_actual: stake, lay_matched_stake_1: stake, lay_commission_1: "0.02",
      exchange_name: "Matchbook", date_settled: "2026-11-03T18:00", user_notes: "Synthetic only",
    }});
    expect(created.status(), await created.text()).toBe(201);
    await page.goto(`${owned}?record=${encodeURIComponent(id)}`);
    const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
    await expect(workbench).toBeVisible();
    const aside = workbench.locator('[data-pd-id="sportsbook.editor.financial-context"]');
    const before = await aside.locator('[data-pd-id^="sportsbook.editor.outcome."]').allTextContents();
    await workbench.locator('[data-pd-id="bet-workbench.stage.finish"]').click();
    const after = await aside.locator('[data-pd-id^="sportsbook.editor.outcome."]').allTextContents();
    expect(after).toEqual(before);
    if (before.length === 0) await expect(aside).toContainText("Outcome unavailable");
  }
});

test("approved Placement separates confirmations from Matching and a new bet has no inherited reward or Delete", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(owned);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  await page.locator('[data-pd-id="sportsbook.toolbar.add-row"]').click();
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await expect(workbench).toBeVisible();
  await workbench.getByLabel("Original Offer text", { exact: true }).fill("Synthetic offer");
  await workbench.locator('[data-guided-field="bookmaker"] select').selectOption("Bookmaker A");
  await workbench.locator('[data-guided-field="offer_type"] select').selectOption({ label: "Bet & Get" });
  await workbench.locator('[data-guided-field="bet_type"] select').selectOption({ label: "Single" });
  await workbench.locator("label", { hasText: /^Fixture type/i }).locator("select").selectOption({ label: "Football" });
  await workbench.getByText("Additional offer details", { exact: true }).click();
  await workbench.getByLabel("Event name").fill("Synthetic matching fixture");
  await workbench.locator('[data-pd-id="bet-workbench.stage.matching"]').click();
  const matching = workbench.locator('[data-pd-id="ledger-editor.panel.matching"]');
  const everyday = matching.locator('[data-pd-id="sportsbook.matching.core-planner.paired-segments"]');
  await expect(everyday).toBeVisible();
  for (const label of ["Back stake", "Back odds", "Lay odds", "Commission", "Exchange", "Strategy", "Requested Lay Stake"]) {
    await expect(everyday.getByText(label, { exact: true })).toBeVisible();
  }
  const advanced = matching.getByText("Advanced calculator options", { exact: true });
  await expect(advanced).toBeVisible();
  await expect(matching.locator(".calculator-segment-back")).toHaveCount(0);
  await expect(matching.locator(".calculator-segment-lay")).toHaveCount(0);
  await expect(workbench.getByRole("group", { name: "Back placement actions" })).toHaveCount(0);
  await expect(workbench.getByRole("group", { name: "Lay placement actions" })).toHaveCount(0);
  await workbench.locator('[data-pd-id="bet-workbench.stage.placement"]').click();
  const placement = workbench.locator('[data-pd-id="ledger-editor.panel.placement"]');
  await expect(placement).toBeVisible();
  await expect(placement.getByLabel("Back placement")).toHaveValue("Not recorded");
  await expect(placement.getByLabel("Lay placement")).toHaveValue("Not recorded");
  await expect(placement.getByRole("button", { name: "Confirm external Back" })).toBeVisible();
  await workbench.locator('[data-pd-id="bet-workbench.stage.finish"]').click();
  const linked = workbench.locator('[data-pd-id="sportsbook.workbench.linked-free-bets"]');
  await linked.locator("summary").click();
  await expect(linked).toContainText("No linked reward is recorded for this unsaved bet.");
  const more = workbench.locator('[data-pd-id="sportsbook.editor.actions"]').getByText("More actions");
  await expect(more).toHaveCount(0);
  await expect(workbench.getByRole("button", { name: "Delete record" })).toHaveCount(0);
});

test("Requirements Save returns to Offer, opens details and focuses missing Event name", async ({ page }) => {
  await page.goto(owned);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  await page.locator('[data-pd-id="sportsbook.toolbar.add-row"]').click();
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await workbench.getByLabel("Original Offer text").fill("Synthetic required-event review");
  await workbench.locator('[data-pd-id="bet-workbench.stage.requirements"]').click();
  await workbench.getByRole("button", { name: "Save Prospecting" }).click();
  await expect(workbench.locator('[data-pd-id="bet-workbench.stage.offer"]')).toHaveAttribute("aria-current", "step");
  const details = workbench.locator('[data-pd-id="sportsbook.editor.additional-offer-details"]');
  await expect(details).toHaveAttribute("open", "");
  await expect(details.getByLabel("Event name")).toBeFocused();
  await expect(workbench.getByText("Fixture Type", { exact: true })).toBeVisible();
});

test("Matching distinguishes unrecorded request from planned lay and Placement exposes actual stakes", async ({ page }) => {
  const id = `CP117-PLACEMENT-VALUES-${Date.now()}`;
  const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
    sportsbook_bet_id: id, event_name: "Synthetic actual placement", offer_text: "Synthetic source only",
    offer_name: "Synthetic offer", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
    fixture_type: "Football", market: "Match Odds", status: "Placed", result: "Pending",
    back_stake: "10.00", back_odds: "2.10", match_strategy: "Standard", lay_odds_1: "2.20",
    lay_actual: "9.54", lay_matched_stake_1: "9.54", lay_commission_1: "0.02",
    exchange_name: "Matchbook", date_settled: "2026-11-03T18:00", user_notes: "Synthetic only",
  } });
  expect(created.status(), await created.text()).toBe(201);
  await page.goto(`${owned}?record=${id}`);
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await workbench.locator('[data-pd-id="bet-workbench.stage.matching"]').click();
  const matching = workbench.locator('[data-pd-id="ledger-editor.panel.matching"]');
  await expect(matching.locator('[data-pd-id="sportsbook.workbench.matching-overview"]')).toContainText("Requested Lay StakeNot recorded");
  await workbench.locator('[data-pd-id="bet-workbench.stage.placement"]').click();
  const placement = workbench.locator('[data-pd-id="ledger-editor.panel.placement"]');
  await expect(placement.getByLabel("Actual back stake")).toHaveValue("10.00");
  await expect(placement.getByLabel("Actual matched lay stake")).toHaveValue("9.54");
  await workbench.locator('[data-pd-id="bet-workbench.stage.finish"]').click();
  const linked = workbench.locator('[data-pd-id="sportsbook.workbench.linked-free-bets"]');
  await linked.locator("summary").click();
  await expect(linked).toContainText("No linked reward is recorded for this bet.");
  await expect(linked.getByRole("button", { name: "Create linked Free Bet" })).toBeVisible();
});

test("settled same-exchange Multi-Lay corrects one fill through audited UI and retains reason", async ({ page }) => {
  test.setTimeout(150_000);
  const accountsResponse = await page.request.get(`/api/profiles/${profile}/accounts`);
  expect(accountsResponse.ok()).toBeTruthy();
  const accounts = await accountsResponse.json() as Array<{ account_id: string; account: string; type: string }>;
  const exchange = accounts.find(account => account.type === "Exchange" && account.account === "Matchbook");
  expect(exchange).toBeTruthy();
  const id = `CP117-ML-CORRECT-${Date.now()}`;
  const execution = {
    version: "multi-lay-actual-v1", revision: 0, exchangeAccountId: exchange!.account_id,
    market: "Match winner", commission: "0.05",
    fills: [
      { id: "f1", outcomeId: "outcome1", stake: "6", odds: "2.5" },
      { id: "f2", outcomeId: "outcome1", stake: "4", odds: "3" },
      { id: "f3", outcomeId: "outcome2", stake: "8", odds: "4" },
    ],
    unmatched: { outcome1: "0", outcome2: "0" },
  };
  const legs = [
    { id: "outcome1", label: "A", layOdds: "2.5", commission: "0.05", calculationVersion: "multi-lay-v2", backingType: "normal", execution },
    { id: "outcome2", label: "B", layOdds: "3", commission: "0.02" },
  ];
  const base = `/api/profiles/${profile}/sportsbook-bets`;
  const input = {
    sportsbook_bet_id: id, event_name: "Synthetic audited fill correction", offer_text: "Synthetic source only",
    offer_name: "Synthetic multi-lay", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
    fixture_type: "Football", market: "Match winner", status: "Prospecting", result: "Pending",
    back_stake: "10", back_odds: "4", match_strategy: "Multilay", lay_odds_1: "2.5",
    exchange_name: "Matchbook", multi_lay_outcome_1_name: "A", multi_lay_outcomes_json: JSON.stringify(legs.map(({ execution: _execution, ...leg }) => leg)),
    date_settled: "2026-11-03T18:00", user_notes: "Synthetic only",
  };
  const created = await page.request.post(base, { data: input });
  expect(created.status(), await created.text()).toBe(201);
  const recordURL = `${base}/${id}`;
  const placed = await page.request.put(recordURL, { data: { ...input, status: "Placed", multi_lay_outcomes_json: JSON.stringify(legs) } });
  expect(placed.status(), await placed.text()).toBe(200);
  const settled = await page.request.put(recordURL, { data: { ...input, status: "Settled", result: "Outcome 2 Won", multi_lay_outcomes_json: JSON.stringify(legs) } });
  expect(settled.status(), await settled.text()).toBe(200);
  const before = await (await page.request.get(recordURL)).json() as Record<string, unknown>;
  const beforeLegs = JSON.parse(String(before.multi_lay_outcomes_json)) as Array<{ execution?: typeof execution }>;
  expect(beforeLegs[0].execution?.fills).toHaveLength(3);
  expect(beforeLegs[0].execution?.unmatched.outcome2).toBe("0");
  expect(beforeLegs[1]).toMatchObject({ id: "outcome2", label: "B" });
  const listed = await (await page.request.get(base)).json() as Array<Record<string, unknown>>;
  const listedLegs = JSON.parse(String(listed.find(row => row.sportsbook_bet_id === id)?.multi_lay_outcomes_json)) as Array<{ execution?: typeof execution }>;
  expect(listedLegs[0].execution?.fills).toHaveLength(3);
  await page.goto(`${owned}?record=${id}`);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await expect(workbench).toBeVisible();
  await workbench.locator('[data-pd-id="sportsbook.editor.actions"]').getByRole("button", { name: "Review Correction" }).click();
  await expect(workbench.locator('[data-pd-id="sportsbook.editor.actions"]').getByRole("button", { name: "Cancel Correction" })).toBeVisible();
  await workbench.locator('[data-pd-id="bet-workbench.stage.placement"]').click();
  const actual = workbench.locator('[data-pd-id="sportsbook.multi-lay.actual"]');
  await expect(actual).toBeVisible();
  expect(await actual.locator("fieldset").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-pd-id")))).toEqual([
    "sportsbook.multi-lay.actual.outcome1", "sportsbook.multi-lay.actual.outcome2",
  ]);
  await expect(actual.getByLabel("B fill 1 actual odds")).toHaveValue("4");
  await expect(actual.getByLabel("B unmatched stake")).toHaveValue("0");
  await expect(actual.getByLabel("A fill 1 actual odds")).toHaveValue("2.5");
  await actual.getByLabel("A fill 1 actual odds").fill("2.6");
  const auditedSave = workbench.locator('[data-pd-id="sportsbook.editor.actions"]').getByRole("button", { name: "Save Audited Correction" });
  await expect(auditedSave).toBeDisabled();
  await actual.getByLabel("Correction reason").fill("Corrected one recorded fill odds from exchange evidence");
  await expect(auditedSave).toBeEnabled();
  await auditedSave.click();
  await expect(workbench).toHaveCount(0);
  const saved = await (await page.request.get(recordURL)).json() as Record<string, unknown>;
  const savedLegs = JSON.parse(String(saved.multi_lay_outcomes_json)) as Array<{ execution?: typeof execution }>;
  expect(savedLegs[0].execution?.fills.map(fill => fill.odds)).toEqual(["2.6", "3", "4"]);
  expect(savedLegs[0].execution?.fills.map(fill => fill.stake)).toEqual(["6", "4", "8"]);
  expect(savedLegs[0].execution?.exchangeAccountId).toBe(exchange!.account_id);
  expect(savedLegs[1]).toMatchObject({ id: "outcome2", label: "B", layOdds: "3" });
  for (const field of ["back_stake", "back_odds", "status", "result", "bookmaker", "exchange_name"]) expect(saved[field]).toBe(before[field]);
  await page.goto(`${owned}?record=${id}`);
  await expect(workbench.locator('[data-pd-id="sportsbook.multi-lay.actual"]').getByLabel("A fill 1 actual odds")).toHaveValue("2.6");
  const historyResponse = await page.request.get(`/api/profiles/${profile}/financial-history/sportsbook/${id}`);
  expect(historyResponse.ok()).toBeTruthy();
  const history = await historyResponse.json() as Array<{ operation: string; reason?: string; correction_reason?: string; after_snapshot?: Record<string, unknown> }>;
  expect(history.some(entry => entry.operation === "corrected" && JSON.stringify(entry).includes("Corrected one recorded fill odds"))).toBe(true);
  await page.locator('[data-pd-id="ux-v2.breadcrumbs"] a', { hasText: "Sportsbook Bets" }).click();
  await expect(page.getByRole("dialog", { name: "Unsaved tracker changes" })).toHaveCount(0);
  await expect(workbench).toHaveCount(0);
});

for (const width of [2048, 390] as const) {
  test(`new Sportsbook Matching uses approved everyday field composition at ${width}px dark`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("openforge-theme", "dark"));
    await page.goto(owned);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    await page.locator('[data-pd-id="sportsbook.toolbar.add-row"]').click();
    const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
    await workbench.getByLabel("Original Offer text", { exact: true }).fill("Synthetic offer");
    await workbench.locator('[data-guided-field="bookmaker"] select').selectOption("Bookmaker A");
    await workbench.locator('[data-guided-field="offer_type"] select').selectOption({ label: "Bet & Get" });
    await workbench.locator('[data-guided-field="bet_type"] select').selectOption({ label: "Single" });
    await workbench.locator("label", { hasText: /^Fixture type/i }).locator("select").selectOption({ label: "Football" });
    await workbench.getByText("Additional offer details", { exact: true }).click();
    await workbench.getByLabel("Event name").fill("Synthetic matching fixture");
    await workbench.locator('[data-pd-id="bet-workbench.stage.matching"]').click();
    const panel = workbench.locator('[data-pd-id="ledger-editor.panel.matching"]');
    await expect(panel).toBeVisible();
    const everyday = panel.locator('[data-pd-id="sportsbook.matching.core-planner.paired-segments"]');
    await everyday.getByLabel("Back stake").fill("10.00");
    await everyday.getByLabel("Back odds").fill("2.10");
    await everyday.getByLabel("Lay odds").fill("2.20");
    await everyday.getByLabel("Planning exchange commission (%)").fill("2");
    await expect(panel.locator('[data-pd-id="sportsbook.matching.core-planner"]')).toHaveAttribute("data-plan-reviewed", "true", { timeout: 20_000 });
    const positions = await everyday.evaluate(node => {
      const names = ["Back stake", "Back odds", "Lay odds", "Commission", "Exchange", "Strategy", "Requested Lay Stake"];
      const labels = [...node.querySelectorAll("label")];
      return names.map(name => {
        const label = labels.find(item => item.querySelector(":scope > span")?.textContent?.trim() === name);
        if (!label) return { name, x: -1, y: -1 };
        const rect = label.getBoundingClientRect();
        return { name, x: rect.x, y: rect.y };
      });
    });
    expect(positions.every(item => item.x >= 0)).toBe(true);
    if (width === 2048) {
      expect(Math.abs(positions[0].y - positions[1].y)).toBeLessThanOrEqual(1);
      expect(positions[1].x).toBeGreaterThan(positions[0].x);
    } else expect(positions[1].y).toBeGreaterThan(positions[0].y);
    await expect(panel.getByText("Advanced calculator options", { exact: true })).toBeVisible();
    const advanced = panel.locator("details").filter({ hasText: "Advanced calculator options" }).first();
    await expect(advanced).not.toHaveAttribute("open", "");
    await advanced.locator("summary").click();
    await expect(advanced.getByText("Presentation Mode", { exact: true })).toBeVisible();
    await advanced.locator("summary").click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `data/private/evidence/cp117-sportsbook-parity/native-new-matching-${width}-dark.png`, fullPage: true });
  });
}

for (const width of [2048, 390] as const) {
  test(`integrated partial Sportsbook workbench keeps the approved stages at ${width}px dark`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("openforge-theme", "dark"));
    const id = `CP117-PARTIAL-VISUAL-${width}-${Date.now()}`;
    const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
      sportsbook_bet_id: id, event_name: "Synthetic partial placement review", offer_text: "Synthetic partial fill",
      offer_name: "Synthetic offer", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
      fixture_type: "Football", market: "Match Odds", status: "Placed", result: "Pending",
      back_stake: "10.00", back_odds: "2.10", match_strategy: "Partial Lay", lay_odds_1: "2.20",
      lay_actual: "9.54", lay_matched_stake_1: "5.00", lay_commission_1: "0.02",
      exchange_name: "Matchbook", date_settled: "2026-11-03T18:00", user_notes: "Synthetic only",
    } });
    expect(created.status(), await created.text()).toBe(201);
    await page.goto(`${owned}?record=${encodeURIComponent(id)}`);
    const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
    await expect(workbench).toBeVisible();
    for (const stage of ["offer", "requirements", "matching", "placement", "finish"] as const) {
      await workbench.locator(`[data-pd-id="bet-workbench.stage.${stage}"]`).click();
      await expect(workbench.locator('[data-pd-id="bet-workbench.stages"]')).toBeVisible();
      if (stage === "requirements") {
        const requirements = workbench.locator('[data-pd-id="sportsbook.workbench.requirements"]');
        await expect(requirements).toContainText("Recorded requirements");
        await expect(requirements).toContainText("External Lay placementPartially matched");
      }
      if (stage === "placement") {
        const panel = workbench.locator('[data-pd-id="ledger-editor.panel.placement"]');
        await expect(panel).toBeVisible();
        await expect(panel.locator('[data-pd-id="sportsbook.workbench.placement-controls"]')).toBeVisible();
        await expect(panel.getByRole("button", { name: "Confirm external Back" })).toBeVisible();
        await expect(panel.getByLabel("Lay placement")).toHaveValue("Partially matched");
        const detail = panel.locator('[data-pd-id="sportsbook.workbench.partial-fill"]');
        await expect(detail).toBeVisible();
        await expect(detail).not.toHaveAttribute("open", "");
        await detail.locator("summary").click();
        await expect(detail.getByLabel("Actual lay amount")).toHaveValue("9.54");
        await expect(detail.getByLabel("Partial Lay Legs")).toBeVisible();
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `data/private/evidence/cp117-sportsbook-parity/native-partial-placement-expanded-${width}-dark.png`, fullPage: true });
        await detail.locator("summary").click();
      }
      if (stage === "matching") {
        const advanced = workbench.locator('[data-pd-id="sportsbook.workbench.advanced-calculator"]');
        await expect(advanced).toBeVisible();
        await expect(advanced).not.toHaveAttribute("open", "");
        await advanced.locator("summary").click();
        await expect(advanced).toHaveAttribute("open", "");
        await expect(advanced.getByLabel("Lay actual", { exact: true })).toHaveCount(0);
        await expect(advanced).not.toContainText("Confirm lay execution from these actions");
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `data/private/evidence/cp117-sportsbook-parity/native-partial-matching-expanded-${width}-dark.png`, fullPage: true });
        await advanced.locator("summary").click();
      }
      if (stage === "finish") await expect(workbench.locator('[data-pd-id="sportsbook.workbench.linked-free-bets"]')).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `data/private/evidence/cp117-sportsbook-parity/native-partial-${stage}-${width}-dark.png`, fullPage: true });
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
  });
}

test("Back confirmation alone leaves Lay unrecorded and adds no Finish outcome", async ({ page }) => {
  const id = `CP117-BACK-ONLY-${Date.now()}`;
  const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
    sportsbook_bet_id: id, event_name: "Synthetic Back-only review", offer_text: "Synthetic source only",
    offer_name: "Synthetic offer", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
    fixture_type: "Football", market: "Match Odds", status: "Prospecting", result: "Pending",
    back_stake: "10.00", back_odds: "2.10", match_strategy: "Standard", lay_odds_1: "2.20",
    lay_actual: "", lay_matched_stake_1: "", lay_commission_1: "0.02",
    exchange_name: "Matchbook", date_settled: "2026-11-03T18:00", user_notes: "Synthetic only",
  } });
  expect(created.status(), await created.text()).toBe(201);
  await page.goto(`${owned}?record=${encodeURIComponent(id)}`);
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await expect(workbench).toBeVisible();
  const outcomes = workbench.locator('[data-pd-id="sportsbook.editor.financial-context"] [data-pd-id^="sportsbook.editor.outcome."]');
  const before = await outcomes.allTextContents();
  await workbench.locator('[data-pd-id="bet-workbench.stage.placement"]').click();
  const placement = workbench.locator('[data-pd-id="ledger-editor.panel.placement"]');
  await expect(placement.getByLabel("Lay placement")).toHaveValue("Not recorded");
  await placement.getByRole("button", { name: "Confirm external Back" }).click();
  await expect(placement.getByLabel("Back placement")).toHaveValue("Confirmed externally");
  await expect(placement.getByLabel("Lay placement")).toHaveValue("Not recorded");
  await workbench.locator('[data-pd-id="bet-workbench.stage.finish"]').click();
  const after = await outcomes.allTextContents();
  expect(after.every(row => before.includes(row))).toBe(true);
  await expect(workbench.locator('[data-pd-id="sportsbook.editor.financial-context"]')).toContainText("Outcome unavailable");
  const stored = await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/${id}`)).json() as Record<string, unknown>;
  expect(stored.status).toBe("Prospecting");
  expect(stored.lay_matched_stake_1).toBeFalsy();
});

test("Back-first placement persists separately; Lay-first is blocked by the current source model", async ({ page }) => {
  test.setTimeout(90_000);
  const id = `CP117-BACK-FIRST-${Date.now()}`;
  const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
    sportsbook_bet_id: id, event_name: "Synthetic independent placement", offer_text: "Synthetic source only",
    offer_name: "Synthetic offer", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
    fixture_type: "Football", market: "Match Odds", status: "Prospecting", result: "Pending",
    back_stake: "10.00", back_odds: "2.10", match_strategy: "Standard", lay_odds_1: "2.20",
    lay_actual: "", lay_matched_stake_1: "", lay_commission_1: "0.02",
    exchange_name: "Matchbook", date_settled: "2026-11-03T18:00", user_notes: "Synthetic only",
  } });
  expect(created.status(), await created.text()).toBe(201);
  const route = `${owned}?record=${id}`;
  await page.goto(route);
  let workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await workbench.locator('[data-pd-id="bet-workbench.stage.placement"]').click();
  let placement = workbench.locator('[data-pd-id="ledger-editor.panel.placement"]');
  await expect(placement.getByLabel("Lay placement")).toHaveValue("Not recorded");
  await expect(placement.getByLabel("Actual back stake")).toHaveValue("");
  await expect(placement.getByLabel("Actual matched lay stake")).toHaveValue("");
  await expect(placement.getByRole("button", { name: "Confirm external Lay" })).toBeDisabled();
  await placement.getByRole("button", { name: "Confirm external Back" }).click();
  await expect(placement.getByLabel("Back placement")).toHaveValue("Confirmed externally");
  await expect(placement.getByLabel("Lay placement")).toHaveValue("Not recorded");
  await expect(placement.getByLabel("Actual back stake")).toHaveValue("10.00");
  await expect(placement.getByLabel("Actual matched lay stake")).toHaveValue("");
  await workbench.locator('[data-pd-id="sportsbook.editor.actions"]').getByRole("button", { name: "Save Existing Bet" }).click();
  await expect(workbench).toHaveCount(0);
  await page.goto(route);
  workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await workbench.locator('[data-pd-id="bet-workbench.stage.placement"]').click();
  placement = workbench.locator('[data-pd-id="ledger-editor.panel.placement"]');
  await expect(placement.getByLabel("Back placement")).toHaveValue("Confirmed externally");
  await expect(placement.getByLabel("Lay placement")).toHaveValue("Not recorded");
  const stored = await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/${id}`)).json() as Record<string, unknown>;
  expect(stored.status).toBe("Placed");
  expect(stored.lay_matched_stake_1).toBeFalsy();
  await placement.getByRole("button", { name: "Confirm external Lay" }).click();
  await expect(placement.getByLabel("Lay placement")).not.toHaveValue("Not recorded");
  await workbench.locator('[data-pd-id="sportsbook.editor.actions"]').getByRole("button", { name: "Save Existing Bet" }).click();
  await expect(workbench).toHaveCount(0);
  await page.goto(route);
  workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await workbench.locator('[data-pd-id="bet-workbench.stage.placement"]').click();
  placement = workbench.locator('[data-pd-id="ledger-editor.panel.placement"]');
  await expect(placement.getByLabel("Back placement")).toHaveValue("Confirmed externally");
  await expect(placement.getByLabel("Lay placement")).not.toHaveValue("Not recorded");
  const both = await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/${id}`)).json() as Record<string, unknown>;
  expect(Number(both.lay_matched_stake_1)).toBeGreaterThan(0);
});

for (const { width, theme } of [
  { width: 2048, theme: "dark" },
  { width: 1440, theme: "light" },
  { width: 390, theme: "dark" },
] as const) {
  test(`integrated existing Sportsbook Edit keeps the approved shell, card and footer treatment at ${width}px ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: Math.max(width, 1440), height: 900 });
    await page.addInitScript(selectedTheme => localStorage.setItem("openforge-theme", selectedTheme), theme);
    await page.goto("/design-lab");
    await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
    await page.locator('tr[data-lab-row-id="LAB-SB-002"] button[aria-label^="Open "]').click();
    await page.getByRole("button", { name: "Edit Bet", exact: true }).click();
    await page.setViewportSize({ width, height: 900 });
    const lab = page.locator('[data-pd-id="lab.entry.page"]');
    await expect(lab).toBeVisible();
    const approved = await lab.evaluate(node => {
      const aside = node.querySelector<HTMLElement>("aside")!;
      const rail = node.querySelector<HTMLElement>('[data-pd-id="bet-workbench.stages"]')!;
      const footer = node.querySelector<HTMLElement>('[class*="entryFooter"]')!;
      return { railGap: getComputedStyle(rail).gap, asideBackground: getComputedStyle(aside).backgroundColor,
        asideBorder: getComputedStyle(aside).borderColor, footerGap: getComputedStyle(footer).gap,
        footerPadding: getComputedStyle(footer).padding, width: node.getBoundingClientRect().width };
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `data/private/evidence/cp117-sportsbook-parity/lab-existing-edit-${width}-${theme}.png`, fullPage: true });
    await lab.getByRole("button", { name: "Finish / Review" }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `data/private/evidence/cp117-sportsbook-parity/lab-existing-edit-finish-${width}-${theme}.png`, fullPage: true });
    const id = `VIS-${width}-${Date.now().toString(36).slice(-4)}`;
    const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
      sportsbook_bet_id: id, event_name: "Synthetic existing edit", offer_text: "Synthetic offer evidence",
      offer_name: "Synthetic offer", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
      fixture_type: "Football", market: "Match Odds", status: "Placed", result: "Pending",
      back_stake: "10.00", back_odds: "2.10", match_strategy: "Standard", lay_odds_1: "2.20",
      lay_actual: "", lay_matched_stake_1: "", lay_commission_1: "0.02",
      exchange_name: "Matchbook", date_settled: "2026-11-03T18:00", user_notes: "Synthetic only",
    } });
    expect(created.status(), await created.text()).toBe(201);
    await page.goto(`${owned}?record=${id}`);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    await expect(page.getByRole("region", { name: "Tracked Tasks loading" })).toHaveCount(0);
    const native = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
    await native.locator('[data-pd-id="bet-workbench.stage.offer"]').click();
    await page.setViewportSize({ width, height: 900 });
    const actual = await native.evaluate(node => {
      const aside = node.querySelector<HTMLElement>("aside")!;
      const rail = node.querySelector<HTMLElement>('[data-pd-id="bet-workbench.stages"]')!;
      const footer = node.querySelector<HTMLElement>('[data-pd-id="sportsbook.editor.actions"]')!;
      return { railGap: getComputedStyle(rail).gap, asideBackground: getComputedStyle(aside).backgroundColor,
        asideBorder: getComputedStyle(aside).borderColor, footerGap: getComputedStyle(footer).gap,
        footerPadding: getComputedStyle(footer).padding, width: node.getBoundingClientRect().width,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
    });
    expect(actual).toMatchObject({ railGap: approved.railGap, asideBackground: approved.asideBackground,
      asideBorder: approved.asideBorder, footerGap: approved.footerGap, footerPadding: approved.footerPadding,
      overflow: false });
    expect(Math.abs(actual.width - approved.width)).toBeLessThanOrEqual(1);
    await expect(native.getByText("Fixture Type", { exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `data/private/evidence/cp117-sportsbook-parity/native-existing-edit-offer-${width}-${theme}.png`, fullPage: true });
    await native.locator('[data-pd-id="bet-workbench.stage.finish"]').click();
    await expect(native.getByRole("heading", { name: "Outcome Comparison" })).toBeVisible();
    if (width > 390) {
      const settlesY = (await native.locator("label.field-control", { hasText: "Settles" }).locator('input[type="datetime-local"]').boundingBox())?.y;
      const resultY = (await native.locator("label.field-control", { hasText: "Result" }).locator("select").boundingBox())?.y;
      expect(settlesY).toBeDefined();
      expect(resultY).toBeDefined();
      expect(Math.abs(resultY! - settlesY!)).toBeLessThanOrEqual(1);
    }
    await expect(native.locator('[data-pd-id="sportsbook.editor.actions"]').getByRole("button", { name: "Save Existing Bet" })).toBeVisible();
    const footerOrder = await native.locator('[data-pd-id="sportsbook.editor.actions"] .workflow-editor-footer-primary').evaluate(node =>
      [...node.children].map(child => child.tagName === "DETAILS" ? child.querySelector("summary")?.textContent?.trim() : child.textContent?.trim())
    );
    expect(footerOrder).toEqual(["More actions", "Cancel", "Save Existing Bet"]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `data/private/evidence/cp117-sportsbook-parity/native-existing-edit-finish-${width}-${theme}.png`, fullPage: true });
  });
}

test("Finish loads a saved linked Free Bet before reporting reward history", async ({ page }) => {
  const id = `CP117-LINKED-${Date.now()}`;
  const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
    sportsbook_bet_id: id, event_name: "Synthetic linked reward review", offer_text: "Synthetic qualifying source",
    offer_name: "Synthetic reward offer", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
    fixture_type: "Football", market: "Match Odds", status: "Placed", result: "Pending",
    back_stake: "10.00", back_odds: "2.10", match_strategy: "Standard", lay_odds_1: "2.20",
    lay_actual: "9.54", lay_matched_stake_1: "9.54", lay_commission_1: "0.02",
    exchange_name: "Matchbook", date_settled: "2026-11-03T18:00", user_notes: "Synthetic only",
  } });
  expect(created.status(), await created.text()).toBe(201);
  const reward = await page.request.post(`/api/profiles/${profile}/sportsbook-bets/${id}/free-bet-awards`, { data: {
    operation_id: `CP117-LINKED-AWARD-${Date.now()}`, expected_award_value: "10.00", variance_reason: "",
    children: [{
    event_name: "Synthetic linked Free Bet", offer_text: "Synthetic reward only", bookmaker: "Bookmaker A",
    offer_type: "Bet & Get", bet_type: "Single", offer_name: "Synthetic linked reward", fixture_type: "Football",
    status: "Available", result: "Pending", retention_mode: "SNR", free_bet_value: "10.00",
    back_odds: "", match_strategy: "Standard", lay_odds_1: "", lay_actual: "",
    lay_matched_stake_1: "", lay_commission_1: "", exchange_name: "",
    expiry_datetime: "2099-07-24T20:00:00", date_settled: "", user_notes: "Synthetic only",
    }],
  } });
  expect(reward.status(), await reward.text()).toBe(201);
  await page.goto(`${owned}?record=${encodeURIComponent(id)}`);
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await expect(workbench).toBeVisible();
  await workbench.locator('[data-pd-id="bet-workbench.stage.finish"]').click();
  const linked = workbench.locator('[data-pd-id="sportsbook.workbench.linked-free-bets"]');
  await linked.locator("summary").click();
  await expect(linked).toContainText("1 linked Free Bet recorded for this bet.");
  await expect(linked).toContainText("Synthetic linked reward");
});

test("Finish reports a linked-reward read failure instead of a false empty history", async ({ page }) => {
  await page.route(`**/profiles/${profile}/free-bets`, route => route.fulfill({ status: 503, body: "Synthetic unavailable" }));
  await page.goto(`${owned}?record=SB-SEED-001`);
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await expect(workbench).toBeVisible();
  await workbench.locator('[data-pd-id="bet-workbench.stage.finish"]').click();
  const linked = workbench.locator('[data-pd-id="sportsbook.workbench.linked-free-bets"]');
  await linked.locator("summary").click();
  await expect(linked.getByRole("alert")).toContainText("Linked Free Bets are unavailable");
  await expect(linked).not.toContainText("No linked Free Bets are recorded");
  await expect(linked.getByRole("button", { name: "Retry" })).toBeVisible();
});
