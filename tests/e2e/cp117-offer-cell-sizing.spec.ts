import { expect, test } from "@playwright/test";

test("grouped Offer editor and closed choices fit their selected cell in both Sportsbook scopes", async ({ page }) => {
  test.setTimeout(150_000);
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
  const id = `PD-FIX-670-${Date.now()}`;
  const created = await page.request.post("/api/profiles/profile-demo-001/sportsbook-bets", { data: {
    sportsbook_bet_id: id, event_name: "Synthetic cell sizing fixture", offer_text: "Grouped editor check",
    offer_name: "Fixture review", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
    fixture_type: "Football", market: "Match Odds", status: "Prospecting", result: "Pending",
    back_stake: "10.00", back_odds: "2.00", match_strategy: "Standard", lay_odds_1: "2.00",
  } });
  expect(created.status(), await created.text()).toBe(201);
  await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } });
  for (const [width, height, theme] of [[2048, 1152, "dark"], [1440, 900, "light"], [390, 844, "dark"]] as const) for (const scope of ["owned", "combined"] as const) {
    await page.setViewportSize({ width, height });
    await page.addInitScript(value => localStorage.setItem("openforge-theme", value), theme);
    const prefix = scope === "owned" ? "sportsbook" : "combined.sportsbook-bets";
    await page.goto(scope === "owned" ? `/profiles/profile-demo-001/tracker/sportsbook-bets?q=${id}` : `/tracker/sportsbook-bets?q=${id}`);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    const cell = page.locator(`[data-pd-id="${prefix}.table-scroll"] td[data-ledger-column="offer_details"][data-ledger-row]`).first();
    await expect(cell).toBeVisible();
    const originalTableWidth = await cell.evaluate(element => element.closest("table")!.getBoundingClientRect().width);
    await cell.dblclick();
    const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
    await expect(editor).toBeVisible();
    const measurements = await editor.evaluate((element, selector) => {
      const cell = document.querySelector(selector as string)!;
      const box = element.getBoundingClientRect();
      return { cell: cell.getBoundingClientRect().width, editor: box.width, table: cell.closest("table")!.getBoundingClientRect().width, choices: [...element.querySelectorAll<HTMLButtonElement>('[role="combobox"]')].map(choice => choice.getBoundingClientRect().width) };
    }, `[data-pd-id="${prefix}.table-scroll"] td[data-ledger-column="offer_details"][data-ledger-row]`);
    expect(measurements.editor, `${scope} ${width}px editor`).toBeLessThanOrEqual(measurements.cell + 1);
    expect(measurements.choices).toHaveLength(3);
    for (const choice of measurements.choices) expect(choice, `${scope} ${width}px choice`).toBeLessThanOrEqual(measurements.cell + 1);
    expect(Math.abs(measurements.table - originalTableWidth)).toBeLessThanOrEqual(1);
    if (width === 390 && scope === "owned") {
      await editor.getByRole("combobox", { name: /Offer Type/ }).click();
      const list = page.getByRole("listbox", { name: "Offer Type options" });
      const longChoice = list.getByRole("option", { name: "Double Delight / Hat-trick Heaven" });
      await expect(longChoice).toBeVisible();
      expect(await longChoice.evaluate(element => {
        const label = element.querySelector("span")!;
        const rect = element.getBoundingClientRect();
        return label.scrollWidth <= label.clientWidth + 1 && rect.left >= 0 && rect.right <= innerWidth;
      })).toBe(true);
      await page.keyboard.press("Escape");
      await expect(list).toHaveCount(0);
      await expect(editor).toBeVisible();
    }
    await page.keyboard.press("Escape");
  }
});

test("separate Lab proposal uses the same cell-bound grouped control and keeps its draft", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/design-lab/sportsbook-proposals?amendment=operations");
    const cellButton = page.getByRole("button", { name: "Edit synthetic Offer details" });
    await cellButton.dblclick();
    const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
    await expect(editor).toBeVisible();
    const sizes = await editor.evaluate((element, button) => ({ editor: element.getBoundingClientRect().width, cell: document.querySelector(button as string)!.closest("td")!.getBoundingClientRect().width, choices: [...element.querySelectorAll('[role="combobox"]')].map(choice => choice.getBoundingClientRect().width) }), '[data-pd-id="lab.proposal.offer-details-cell"]');
    expect(sizes.editor).toBeLessThanOrEqual(sizes.cell + 1);
    expect(sizes.choices).toHaveLength(3);
    for (const choice of sizes.choices) expect(choice).toBeLessThanOrEqual(sizes.cell + 1);
    await editor.getByRole("combobox", { name: /Offer Type/ }).click();
    const list = page.getByRole("listbox", { name: "Offer Type options" });
    await expect(list.getByRole("option", { name: "Sign up / Welcome" })).toBeVisible();
    await list.getByRole("option", { name: "Cashback" }).click();
    await expect(editor.getByRole("combobox", { name: /Bet Type/ })).toContainText("Accumulator");
    await editor.getByRole("combobox", { name: /Fixture Type/ }).click();
    await page.getByRole("listbox", { name: "Fixture Type options" }).getByRole("option", { name: "Tennis" }).click();
    await editor.getByRole("button", { name: "Apply offer details" }).click();
    await expect(editor).toHaveCount(0);
    await expect(cellButton).toContainText("Cashback · Accumulator · Tennis");
    await cellButton.dblclick();
    await expect(editor.getByRole("combobox", { name: /Fixture Type/ })).toContainText("Tennis");
    await page.keyboard.press("Escape");
    await expect(editor).toHaveCount(0);
  }
});
