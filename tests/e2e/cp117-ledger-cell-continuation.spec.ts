import { expect, test } from "@playwright/test";

const profile = "profile-demo-001";

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
});

test("Lab proposal keeps a routine partial Lay edit anchored beside its ledger cell", async ({ page }) => {
  await page.goto("/design-lab/sportsbook-proposals?amendment=operations");
  const ledger = page.locator('[data-pd-id="lab.proposal.ledger"]');
  const lay = ledger.getByRole("button", { name: "Edit partial lay matched so far" });
  await lay.dblclick();
  const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
  await expect(editor).toBeVisible();
  await expect(editor).toContainText("Requested");
  await expect(editor).toContainText("Matched");
  await expect(editor).toContainText("Remaining");
  await expect(editor.getByLabel("Matched so far")).toHaveValue("5.00");
  await expect(page.locator('[data-pd-id="lab.proposal.operations"]')).toHaveCount(0);
  await editor.getByLabel("Matched so far").fill("5.10");
  await editor.getByRole("button", { name: "Confirm" }).click();
  await expect(ledger).toContainText("£5.10 matched");
  await lay.focus();
  await lay.press("F2");
  await expect(editor.getByLabel("Matched so far")).toHaveValue("5.10");
  await editor.getByRole("button", { name: "Cancel" }).click();
  await lay.evaluate(element => element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" })));
  await expect(editor.getByLabel("Matched so far")).toHaveValue("5.10");
});

test("Finish Status and Result draft survives returning to the ledger", async ({ page }) => {
  await page.goto("/design-lab/sportsbook-proposals?amendment=operations");
  const ledger = page.locator('[data-pd-id="lab.proposal.ledger"]');
  await ledger.getByRole("button", { name: "Placed" }).click();
  await ledger.getByRole("button", { name: "Review settlement in Finish" }).click();
  const finish = page.locator('[data-pd-id="lab.proposal.operations"]');
  await finish.getByRole("combobox", { name: "Status" }).selectOption("Settled");
  await finish.getByRole("combobox", { name: "Result" }).selectOption("Back Won");
  await finish.getByRole("button", { name: "Return to ledger" }).click();
  await ledger.getByRole("button", { name: "Placed" }).click();
  await expect(ledger.getByRole("region", { name: "Status actions" })).toContainText("Back Won");
  await ledger.getByRole("button", { name: "Review settlement in Finish" }).click();
  await expect(finish.getByRole("combobox", { name: "Status" })).toHaveValue("Settled");
  await expect(finish.getByRole("combobox", { name: "Result" })).toHaveValue("Back Won");
});

test("combined Sportsbook Offer details and Strategy use the native compact editor and persist", async ({ page }) => {
  const id = `PD-FIX-666-${Date.now()}`;
  const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
    sportsbook_bet_id: id, event_name: "Arsenal v Chelsea", offer_text: "Synthetic combined typed edit",
    offer_name: "Fixture review", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
    fixture_type: "Football", market: "Match Odds", status: "Prospecting", result: "Pending",
    back_stake: "10.00", back_odds: "2.00", match_strategy: "Standard", lay_odds_1: "2.00",
  } });
  expect(created.status(), await created.text()).toBe(201);
  const initial = await created.json() as Record<string, unknown>;
  await page.goto(`/tracker/sportsbook-bets?q=${id}`);
  const cell = (column: string) => page.locator(`[data-pd-id="combined.sportsbook-bets.table-scroll"] td[data-ledger-row="${profile}::${id}"][data-ledger-column="${column}"]`);
  await cell("offer_details").dblclick();
  const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
  await expect(editor.getByRole("combobox", { name: /Offer Type/ })).toContainText("Bet & Get");
  await editor.getByRole("combobox", { name: /Offer Type/ }).click();
  await page.getByRole("listbox", { name: "Offer Type options" }).getByRole("option", { name: "Select offer type" }).click();
  await editor.getByRole("button", { name: "Apply offer details" }).click();
  await expect(editor).toContainText("Choose an available Offer Type");
  await expect(editor.getByRole("combobox", { name: /Offer Type/ })).toContainText("Select offer type");
  await editor.getByRole("combobox", { name: /Offer Type/ }).click();
  await page.getByRole("listbox", { name: "Offer Type options" }).getByRole("option", { name: "Bet & Get" }).click();
  await editor.getByRole("combobox", { name: /Fixture Type/ }).click();
  await page.getByRole("listbox", { name: "Fixture Type options" }).getByRole("option", { name: "Tennis" }).click();
  await editor.getByRole("button", { name: "Apply offer details" }).click();
  await expect(editor).toHaveCount(0);
  await cell("match_strategy").dblclick();
  await editor.getByRole("combobox", { name: "Strategy" }).selectOption("Underlay");
  await editor.getByRole("combobox", { name: "Strategy" }).press("Enter");
  await expect(editor).toHaveCount(0);
  await page.reload();
  const saved = await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/${id}`)).json() as Record<string, unknown>;
  expect(saved.fixture_type).toBe("Tennis");
  expect(saved.match_strategy).toBe("Underlay");
  for (const key of ["status", "result", "back_stake", "back_odds", "lay_odds_1", "back_placement_confirmed", "requested_lay_stake", "lay_matched_stake_1"]) expect(saved[key]).toEqual(initial[key]);
});

test("eligible persisted partial Lay opens the compact cumulative editor in the owned ledger", async ({ page }) => {
  const id = `PD-FIX-664-${Date.now()}`;
  const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
    sportsbook_bet_id: id, event_name: "Arsenal v Chelsea", offer_text: "Synthetic partial fill",
    offer_name: "Fixture review", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
    fixture_type: "Football", market: "Match Odds", status: "Placed", result: "Pending",
    back_stake: "10.00", back_odds: "2.00", match_strategy: "Standard", lay_odds_1: "2.00",
    requested_lay_stake: "8.00", lay_actual: "8.00", lay_matched_stake_1: "5.00", exchange_name: "Matchbook",
    multi_lay_outcomes_json: JSON.stringify([{ id: "layleg1", label: "Lay leg 1", layOdds: "2.00", exchangeName: "Matchbook", matchedStake: "5.00", isFinal: false }]),
  } });
  expect(created.status(), await created.text()).toBe(201);
  await page.goto(`/profiles/${profile}/tracker/sportsbook-bets?q=${id}`);
  const cell = page.locator(`[data-pd-id="sportsbook.table-scroll"] td[data-ledger-row="${id}"][data-ledger-column="lay_status"]`);
  await cell.dblclick();
  const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
  await expect(editor.getByLabel("Matched so far")).toHaveValue("5.00");
  await expect(editor).toContainText(/Requested£\s*8\.00/);
  await expect(editor).toContainText(/Remaining£\s*3\.00/);
  await editor.getByLabel("Matched so far").fill("9.00");
  await editor.getByRole("button", { name: "Confirm" }).click();
  await expect(editor).toContainText("cannot exceed the recorded Requested Lay Stake");
  await expect(editor.getByLabel("Matched so far")).toHaveValue("9.00");
  const read = async () => await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/${id}`)).json() as Record<string, unknown>;
  for (const [next, expectedLegs] of [["5.10", 2], ["6.00", 3], ["6.00", 3], ["8.00", 4]] as const) {
    await editor.getByLabel("Matched so far").fill(next);
    await editor.getByRole("button", { name: "Confirm" }).click();
    await expect(editor).toHaveCount(0);
    const saved = await read();
    expect(saved.lay_matched_stake_1).toBe(next);
    expect(saved.requested_lay_stake).toBe("8.00");
    expect(saved.back_stake).toBe("10.00");
    expect((JSON.parse(String(saved.multi_lay_outcomes_json)) as unknown[]).length).toBe(expectedLegs);
    await page.reload();
    if (next !== "8.00") {
      await cell.dblclick();
      await expect(editor.getByLabel("Matched so far")).toHaveValue(next);
    }
  }
  const final = await read();
  expect(final.lay_status).toMatch(/match|laid/i);
});

test("a stale Lay draft conflicts and a lost Save response recovers without another fill", async ({ page }) => {
  const id = `PD-FIX-667-${Date.now()}`;
  const endpoint = (recordId: string) => `/api/profiles/${profile}/sportsbook-bets/${recordId}`;
  const legs = (amounts: string[]) => JSON.stringify(amounts.map((matchedStake, index) => ({
    id: `layleg${index + 1}`, label: `Lay leg ${index + 1}`, layOdds: "2.00",
    exchangeName: "Matchbook", matchedStake, isFinal: index === amounts.length - 1 && amounts.reduce((sum, amount) => sum + Number(amount), 0) === 8,
  })));
  const create = async (recordId: string) => {
    const response = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
      sportsbook_bet_id: recordId, event_name: "Synthetic partial Lay revision", bookmaker: "Bookmaker A",
      offer_type: "Bet & Get", status: "Placed", result: "Pending", back_stake: "10.00", back_odds: "2.00",
      match_strategy: "Standard", lay_odds_1: "2.00", lay_actual: "8.00", lay_matched_stake_1: "5.00",
      requested_lay_stake: "8.00", exchange_name: "Matchbook", multi_lay_outcomes_json: legs(["5.00"]),
    } });
    expect(response.status(), await response.text()).toBe(201);
  };
  const read = async (recordId: string) => await (await page.request.get(endpoint(recordId))).json() as Record<string, unknown>;
  const cell = (recordId: string) => page.locator(`[data-pd-id="sportsbook.table-scroll"] td[data-ledger-row="${recordId}"][data-ledger-column="lay_status"]`);
  const editor = page.locator('[data-pd-id="ledger.floating-editor"]');

  await create(id);
  await page.goto(`/profiles/${profile}/tracker/sportsbook-bets?q=${id}`);
  await cell(id).dblclick();
  await editor.getByLabel("Matched so far").fill("6.00");
  const original = await read(id);
  const winner = await page.request.put(endpoint(id), { headers: { "X-Expected-Record-Revision": String(original.updated_at) }, data: {
    ...original, lay_matched_stake_1: "8.00", multi_lay_outcomes_json: legs(["5.00", "3.00"]),
  } });
  expect(winner.status(), await winner.text()).toBe(200);
  await editor.getByRole("button", { name: "Confirm" }).click();
  await expect(editor).toContainText("changed elsewhere");
  await expect(editor.getByLabel("Matched so far")).toHaveValue("6.00");
  expect((await read(id)).lay_matched_stake_1).toBe("8.00");

  const retryId = `${id}-retry`;
  await create(retryId);
  await page.goto(`/profiles/${profile}/tracker/sportsbook-bets?q=${retryId}`);
  await cell(retryId).dblclick();
  await editor.getByLabel("Matched so far").fill("6.00");
  let intercepted = false;
  await page.route(`**${endpoint(retryId)}`, async route => {
    if (!intercepted && route.request().method() === "PUT") {
      intercepted = true;
      const acknowledged = await route.fetch();
      expect(acknowledged.status()).toBe(200);
      await route.abort("failed");
    } else await route.continue();
  });
  await editor.getByRole("button", { name: "Confirm" }).click();
  await expect(editor).toContainText(/not saved|retained|fetch/i);
  await expect(editor.getByLabel("Matched so far")).toHaveValue("6.00");
  await page.unroute(`**${endpoint(retryId)}`);
  await editor.getByRole("button", { name: "Confirm" }).click();
  await expect(editor).toHaveCount(0);
  const recovered = await read(retryId);
  expect(recovered.lay_matched_stake_1).toBe("6.00");
  expect((JSON.parse(String(recovered.multi_lay_outcomes_json)) as unknown[]).length).toBe(2);
});

test("combined and Workbench Sportsbook saves reject a newer row revision", async ({ page }) => {
  const id = `PD-FIX-667-W-${Date.now()}`;
  const endpoint = `/api/profiles/${profile}/sportsbook-bets/${id}`;
  const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
    sportsbook_bet_id: id, event_name: "Arsenal v Chelsea", offer_name: "Synthetic offer",
    bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single", fixture_type: "Football",
    status: "Prospecting", result: "Pending", back_stake: "10.00", back_odds: "2.00",
    match_strategy: "Standard", lay_odds_1: "2.00",
  } });
  expect(created.status(), await created.text()).toBe(201);
  const read = async () => await (await page.request.get(endpoint)).json() as Record<string, unknown>;
  const concurrentChange = async (changes: Record<string, unknown>) => {
    const current = await read();
    const response = await page.request.put(endpoint, {
      headers: { "X-Expected-Record-Revision": String(current.updated_at) },
      data: { ...current, ...changes },
    });
    expect(response.status(), await response.text()).toBe(200);
  };

  await page.goto(`/tracker/sportsbook-bets?q=${id}`);
  const combined = page.locator(`[data-pd-id="combined.sportsbook-bets.table-scroll"] td[data-ledger-row="${profile}::${id}"][data-ledger-column="offer_details"]`);
  await combined.dblclick();
  const cellEditor = page.locator('[data-pd-id="ledger.floating-editor"]');
  await cellEditor.getByRole("combobox", { name: /Fixture Type/ }).click();
  await page.getByRole("listbox", { name: "Fixture Type options" }).getByRole("option", { name: "Tennis" }).click();
  await concurrentChange({ fixture_type: "Horse Racing" });
  await cellEditor.getByRole("button", { name: "Apply offer details" }).click();
  await expect(cellEditor).toContainText("changed elsewhere");
  await expect(cellEditor.getByRole("combobox", { name: /Fixture Type/ })).toContainText("Tennis");
  expect((await read()).fixture_type).toBe("Horse Racing");

  await page.goto(`/profiles/${profile}/tracker/sportsbook-bets?record=${id}`);
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await expect(workbench).toBeVisible();
  await workbench.locator('[data-pd-id="bet-workbench.stage.offer"]').click();
  const offerName = workbench.locator('[data-pd-id="sportsbook.editor.offer-name"] input');
  await offerName.fill("My unsaved offer name");
  await concurrentChange({ event_name: "Synthetic concurrent Workbench update" });
  await workbench.getByRole("button", { name: "Save Existing Bet" }).click();
  await expect(workbench).toContainText("changed elsewhere");
  await expect(offerName).toHaveValue("My unsaved offer name");
  const final = await read();
  expect(final.event_name).toBe("Synthetic concurrent Workbench update");
  expect(final.offer_name).toBe("Synthetic offer");
});

test("combined Lay edit keeps the owning Profile and missing evidence has a focused handoff", async ({ page }) => {
  const id = `PD-FIX-664-C-${Date.now()}`;
  const base = { sportsbook_bet_id: id, event_name: "Arsenal v Chelsea", offer_text: "Synthetic partial fill", offer_name: "Fixture review", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single", fixture_type: "Football", market: "Match Odds", status: "Placed", result: "Pending", back_stake: "10.00", back_odds: "2.00", match_strategy: "Standard", lay_odds_1: "2.00", lay_actual: "8.00", lay_matched_stake_1: "5.00", exchange_name: "Matchbook", multi_lay_outcomes_json: JSON.stringify([{ id: "layleg1", label: "Lay leg 1", layOdds: "2.00", exchangeName: "Matchbook", matchedStake: "5.00", isFinal: false }]) };
  expect((await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: { ...base, requested_lay_stake: "8.00" } })).status()).toBe(201);
  await page.goto(`/tracker/sportsbook-bets?q=${id}`);
  const cell = page.locator(`[data-pd-id="combined.sportsbook-bets.table-scroll"] td[data-ledger-row="${profile}::${id}"][data-ledger-column="lay_status"]`);
  await cell.dblclick();
  const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
  await expect(editor.getByLabel("Matched so far")).toHaveValue("5.00");
  await editor.getByLabel("Matched so far").fill("5.10");
  await editor.getByRole("button", { name: "Confirm" }).click();
  await expect(editor).toHaveCount(0);
  expect((await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/${id}`)).json()).lay_matched_stake_1).toBe("5.10");
  await cell.dblclick();
  await editor.getByLabel("Matched so far").fill("5.20");
  await editor.getByLabel("Matched so far").press("Alt+Enter");
  await expect(page).toHaveURL(new RegExp(`/profiles/${profile}/tracker/sportsbook-bets`));
  await expect(page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]')).toBeVisible();
  await expect(page.getByLabel("Matched Lay amount to confirm").last()).toHaveValue("5.20");
  expect((await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/${id}`)).json()).lay_matched_stake_1).toBe("5.10");

  const missingId = `${id}-missing`;
  expect((await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: { ...base, sportsbook_bet_id: missingId, requested_lay_stake: null } })).status()).toBe(201);
  await page.goto(`/tracker/sportsbook-bets?q=${missingId}`);
  const missingCell = page.locator(`[data-pd-id="combined.sportsbook-bets.table-scroll"] td[data-ledger-row="${profile}::${missingId}"][data-ledger-column="lay_status"]`);
  await missingCell.dblclick();
  await expect(editor).toHaveCount(0);
  await expect(page.locator('[data-pd-id="combined.sportsbook-bets.protected-cell"]')).toContainText("Requested Lay Stake is not recorded");
  await page.locator('[data-pd-id="combined.sportsbook-bets.protected-cell"]').getByRole("button", { name: "Open record for review" }).click();
  await expect(page).toHaveURL(new RegExp(`/profiles/${profile}/tracker/sportsbook-bets`));
  await expect(page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]')).toBeVisible();
});

test("matched Lab proposal and owned ledger popup remain contained at review viewports", async ({ page }) => {
  test.setTimeout(90000);
  const id = `PD-FIX-664-V-${Date.now()}`;
  expect((await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: { sportsbook_bet_id: id, event_name: "Arsenal v Chelsea", offer_text: "Synthetic visual fixture", offer_name: "Fixture review", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single", fixture_type: "Football", market: "Match Odds", status: "Placed", result: "Pending", back_stake: "10.00", back_odds: "2.00", match_strategy: "Standard", lay_odds_1: "2.00", requested_lay_stake: "8.00", lay_actual: "8.00", lay_matched_stake_1: "5.00", exchange_name: "Matchbook", multi_lay_outcomes_json: JSON.stringify([{ id: "layleg1", label: "Lay leg 1", layOdds: "2.00", exchangeName: "Matchbook", matchedStake: "5.00", isFinal: false }]) } })).status()).toBe(201);
  for (const [width, height, theme] of [[2048, 1120, "dark"], [1440, 900, "light"], [390, 844, "dark"]] as const) {
    await page.setViewportSize({ width, height });
    await page.evaluate(value => localStorage.setItem("openforge-theme", value), theme);
    await page.goto("/design-lab/sportsbook-proposals?amendment=operations");
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
    const labLedger = page.locator('[data-pd-id="lab.proposal.ledger"]');
    await expect(labLedger.getByRole("button", { name: "Edit Settles date and time" })).toBeVisible();
    await expect(labLedger.getByRole("button", { name: /Show 3 recorded warnings/ })).toBeVisible();
    const labCell = labLedger.getByRole("button", { name: "Edit partial lay matched so far" });
    await labCell.dblclick();
    let box = await page.locator('[data-pd-id="ledger.floating-editor"]').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
    await page.screenshot({ path: `/tmp/cp117-664-lab-${width}-${theme}.png` });

    await page.goto(`/profiles/${profile}/tracker/sportsbook-bets?q=${id}`);
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
    await page.locator(`[data-pd-id="sportsbook.table-scroll"] td[data-ledger-row="${id}"][data-ledger-column="lay_status"]`).dblclick();
    const pdEditor = page.locator('[data-pd-id="ledger.floating-editor"]');
    await expect(pdEditor.getByLabel("Matched so far")).toHaveValue("5.00");
    box = await pdEditor.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
    const style = await pdEditor.evaluate(element => getComputedStyle(element).backgroundColor);
    expect(style).not.toBe("rgba(0, 0, 0, 0)");
    await page.screenshot({ path: `/tmp/cp117-664-pd-${width}-${theme}.png` });
  }
});
