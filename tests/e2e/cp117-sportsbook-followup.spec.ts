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
      await page.goto(owned);
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
  const save = workbench.getByRole("button", { name: "Save Changes" });
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
