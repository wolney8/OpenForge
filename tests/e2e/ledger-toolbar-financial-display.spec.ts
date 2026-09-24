import { expect, test } from "@playwright/test";

test.use({ actionTimeout: 15_000 });

for (const [module, label] of [["sportsbook-bets", "Sportsbook"], ["free-bets", "Free Bets"], ["casino-offers", "Casino Offers"]]) {
  test(`${module}: compact toolbar and truthful P&L card`, async ({ page }, info) => {
    test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Authorised isolated/Preview acceptance only");
    test.setTimeout(240_000);
    const health = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
    expect(["test", "preview"]).toContain(health.runtime_role);
    if (health.runtime_role === "preview") expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
    expect((await page.request.get("/api/auth/session")).status()).toBe(200);
    const stamp = Date.now();
    const created = await page.request.post("/api/profiles/onboarding", { data: {
      accounts: [], display_name: `Synthetic CP039 ${module} ${stamp}`, profile_code: `C39-${stamp}`,
      enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments", "casino-offers"], quick_actions: [], setup_path: "import", tracking_start_date: "2026-09-01",
    }});
    expect(created.status(), await created.text()).toBe(201);
    const id = (await created.json()).profile.profile_id;
    const path = `/api/profiles/${id}/${module}`;
    const route = `/profiles/${id}/tracker/${module}`;
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let writes = 0;
    page.on("request", (request) => { if (request.url().includes(path) && request.method() !== "GET") writes++; });
    const card = page.locator(".stat-card").filter({ has: page.getByText(label + " P&L", { exact: true }) });
    const money = card.locator(".financial-value");
    const toolbar = page.getByRole("toolbar", { name: /ledger controls/i });
    try {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      await page.route("**" + path, async (request) => { await gate; await request.continue(); });
      await page.goto(route);
      await expect(card).toBeVisible();
      // A pending read is not evidence for a zero financial result.
      await expect.soft(card).toContainText("Loading P&L");
      await expect.soft(money).toHaveCount(0);
      const loaded = page.waitForResponse((response) => response.url().endsWith(path) && response.status() === 200);
      release(); await loaded; await page.unroute("**" + path);
      await expect(money).toHaveAttribute("aria-label", "£ -");
      await expect(money).toHaveAttribute("data-money-motion", "none");
      await expect.soft(card).toHaveAttribute("data-motion-replay-group", "true");
      for (const [width, theme, enlarged] of [[1440, "light", false], [760, "dark", false], [390, "light", false], [760, "dark", true]] as const) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(({ theme, enlarged }) => {
          document.documentElement.dataset.theme = theme;
          document.documentElement.style.fontSize = enlarged ? "200%" : "";
        }, { theme, enlarged });
        await toolbar.scrollIntoViewIfNeeded();
        const search = toolbar.locator("input[type=search]");
        const field = toolbar.locator(".table-search-field");
        const fieldBox = await field.boundingBox(); const inputBox = await search.boundingBox();
        expect.soft(fieldBox!.height, "No vertical 30rem search basis").toBeLessThanOrEqual(inputBox!.height + 12);
        const inputFont = await search.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
        expect.soft(inputBox!.height, "Search remains a compact single-line control").toBeLessThanOrEqual(inputFont * 4);
        const controls = await toolbar.locator("input,button").evaluateAll((elements) => elements.map((element) => {
          const r = element.getBoundingClientRect(); return { x: r.x, right: r.right, y: r.y, bottom: r.bottom, width: r.width };
        }));
        for (const control of controls) { expect(control.x).toBeGreaterThanOrEqual(0); expect(control.right).toBeLessThanOrEqual(width + 1); }
        for (let index = 1; index < controls.length; index++) {
          const a = controls[index - 1], b = controls[index];
          expect(a.right <= b.x + 1 || b.right <= a.x + 1 || a.bottom <= b.y + 1 || b.bottom <= a.y + 1).toBe(true);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await search.focus(); await search.press("Tab");
        await expect(toolbar.locator("button").first()).toBeFocused();
        await page.screenshot({ path: info.outputPath(`${module}-${width}-${theme}-${enlarged}.png`) });
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
      await toolbar.getByRole("button", { name: /Open .*filter and column controls/ }).focus();
      await page.keyboard.press("Enter");
      const filterDialog = page.getByRole("dialog", { name: /filter controls/i });
      await expect(filterDialog).toBeVisible();
      const selectBounds = await filterDialog.locator("select").first().boundingBox();
      const dialogBounds = await filterDialog.boundingBox();
      expect(selectBounds!.x).toBeGreaterThanOrEqual(dialogBounds!.x);
      expect(selectBounds!.x + selectBounds!.width).toBeLessThanOrEqual(dialogBounds!.x + dialogBounds!.width);
      await filterDialog.getByRole("button", { name: /^Close .*filter controls/ }).click();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await card.getByText(label + " P&L", { exact: true }).click();
      await expect(money).toHaveAttribute("data-money-motion", "none");
      expect(await (await page.request.get(path)).json()).toEqual([]);
      expect(writes).toBe(0);
      // Explicit failure injection on an empty, isolated synthetic Profile: no false zero.
      await page.route("**" + path, (request) => request.fulfill({ status: 503, json: { detail: "Synthetic read unavailable" } }));
      await page.reload();
      await expect(card).toContainText("P&L unavailable");
      await expect(money).toHaveCount(0);
      await page.unroute("**" + path);
      await page.reload();
      await expect(money).toHaveAttribute("aria-label", "£ -");

      for (const [account, type] of [["Bet365", "Bookie"], ["Smarkets", "Exchange"]]) {
        expect((await page.request.post(`/api/profiles/${id}/accounts`, { data: {
          account, type, status: "Active", lifecycle_status: "Active", channel: "Online", stake_access: "Normal",
          promo_access: "Full", restrictions: [], ...(type === "Exchange" ? { commission_rate: "0.02" } : {}),
        }})).status()).toBe(201);
      }
      const common = { bookmaker: "Bet365", status: "Settled", date_settled: "2026-09-24T12:00",
        result: "Back Won", event_name: "Synthetic CP039 populated result", offer_type: "Bet & Get", bet_type: "Single",
        fixture_type: "Football", match_strategy: "Standard", back_odds: "3.00", lay_odds_1: "3.10",
        lay_commission_1: "0.02", exchange_name: "Smarkets", manual_override_reason: "Independent synthetic display oracle" };
      const payload = module === "sportsbook-bets" ? { ...common, back_stake: "10.00", manual_override_value: "1234567.89" }
        : module === "free-bets" ? { ...common, retention_mode: "SNR", free_bet_value: "5.00", manual_override_value: "-14.01" }
        : { bookmaker: "Bet365", offer_type: "Free Spins", offer_name: "Synthetic CP039 populated result", game: "Synthetic Slots",
          date_started: "2026-09-24T12:00", date_settling: "2026-09-24T12:00", status: "Settled", result: "Lose",
          own_cash_committed: "10.00", cash_returned: "7.00", settlement_other_costs: "0.00", final_net_pnl: "-3.00" };
      const inserted = await page.request.post(path, { data: payload });
      expect(inserted.status(), await inserted.text()).toBe(201);
      const expected = module === "sportsbook-bets" ? "£ 1,234,567.89" : module === "free-bets" ? "£ (14.01)" : "£ (3.00)";
      const saved = await (await page.request.get(path)).json();
      const record = saved[0];
      const recordId = record.sportsbook_bet_id || record.free_bet_id || record.casino_offer_id;
      const ledger = module === "sportsbook-bets" ? "sportsbook" : module === "free-bets" ? "free_bet" : "casino";
      const historyPath = `/api/profiles/${id}/financial-history/${ledger}/${recordId}`;
      const historyResponse = await page.request.get(historyPath);
      expect(historyResponse.ok(), await historyResponse.text()).toBeTruthy();
      const history = await historyResponse.json();
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.reload();
      await page.getByLabel("Change tracker date range").selectOption("All Dates", { timeout: 10_000 });
      await expect(money).toHaveAttribute("aria-label", expected);
      await expect(money).toHaveAttribute("data-money-motion", "none", { timeout: 8000 });
      let cycle = Number(await money.getAttribute("data-money-motion-cycle"));
      // Search/theme rerenders retain the same authoritative result and do not restart it.
      await toolbar.locator("input").fill("no matching synthetic record");
      await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
      expect(Number(await money.getAttribute("data-money-motion-cycle"))).toBe(cycle);
      await toolbar.locator("input").fill("");
      const title = card.getByText(label + " P&L", { exact: true });
      await title.click();
      expect(Number(await money.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(cycle);
      cycle = Number(await money.getAttribute("data-money-motion-cycle"));
      await title.click();
      expect(Number(await money.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(cycle);
      await expect(money).toHaveAttribute("aria-label", expected);
      // Actual rendered motion frames: punctuation and destination stay in the card.
      for (const width of [1440, 760, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await title.click();
        for (let frame = 0; frame < 4; frame++) {
          await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
          const bounds = await card.boundingBox(); const value = await money.boundingBox();
          expect(value!.x).toBeGreaterThanOrEqual(bounds!.x);
          expect(value!.x + value!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
          await expect(money).toHaveAttribute("aria-label", expected);
        }
        await card.scrollIntoViewIfNeeded();
        await card.evaluate((element) => { const header = document.querySelector(".top-app-bar")?.getBoundingClientRect();
          window.scrollBy({ top: element.getBoundingClientRect().top - (header?.bottom ?? 0) - 16, behavior: "instant" }); });
        await page.screenshot({ path: info.outputPath(`${module}-populated-motion-${width}.png`) });
      }
      await page.setViewportSize({ width: 760, height: 1000 });
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; document.documentElement.dataset.theme = "dark"; });
      await card.scrollIntoViewIfNeeded();
      await card.evaluate((element) => { const header = document.querySelector(".top-app-bar")?.getBoundingClientRect();
        window.scrollBy({ top: element.getBoundingClientRect().top - (header?.bottom ?? 0) - 16, behavior: "instant" }); });
      const cardBounds = await card.boundingBox(); const valueBounds = await money.boundingBox();
      expect(valueBounds!.x + valueBounds!.width).toBeLessThanOrEqual(cardBounds!.x + cardBounds!.width + 1);
      await page.screenshot({ path: info.outputPath(`${module}-populated-enlarged.png`) });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(money).toHaveAttribute("data-money-motion", "none");
      cycle = Number(await money.getAttribute("data-money-motion-cycle"));
      await title.click(); expect(Number(await money.getAttribute("data-money-motion-cycle"))).toBe(cycle);
      // Native text selection copies the exact canonical value once, not digit strips.
      await money.evaluate((element) => { const selection = window.getSelection()!; const range = document.createRange();
        range.selectNodeContents(element); selection.removeAllRanges(); selection.addRange(range); });
      await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.keyboard.press(process.platform === "darwin" ? "Meta+c" : "Control+c");
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
      expect(await (await page.request.get(path)).json()).toEqual(saved);
      expect(await (await page.request.get(historyPath)).json()).toEqual(history);
      expect(writes).toBe(0);
      if (module === "casino-offers") {
        await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
        await page.setViewportSize({ width: 1440, height: 1000 });
        const row = page.locator(".data-table tbody tr").filter({ hasText: "Synthetic CP039 populated result" });
        await row.getByRole("button", { name: /^Edit / }).click();
        const dialog = page.locator('[data-pd-id$=".editor.dialog"]');
        await expect(dialog).toBeVisible();
        await dialog.locator('[data-pd-id="casino-offers.editor.setup.edit-settled-row"]').click();
        await dialog.getByRole("tab", { name: /Advanced/ }).click();
        const notes = dialog.getByRole("textbox", { name: "Notes", exact: true });
        await notes.fill("Synthetic unrelated Notes edit");
        expect(writes).toBe(0);
        const node = await money.elementHandle(); const priorCycle = await money.getAttribute("data-money-motion-cycle");
        let releaseRefresh!: () => void;
        const refreshGate = new Promise<void>((resolve) => { releaseRefresh = resolve; });
        await page.route("**" + path, async (request) => { await refreshGate; await request.continue(); });
        const refresh = page.waitForRequest((request) => request.url().endsWith(path) && request.method() === "GET", { timeout: 15_000 });
        const savedResponse = page.waitForResponse((response) => response.url().endsWith(path + "/" + recordId) && response.request().method() === "PUT", { timeout: 15_000 });
        await dialog.getByRole("button", { name: /^Save( Edits)?$/ }).click();
        const saveResult = await savedResponse;
        expect(saveResult.ok(), await saveResult.text()).toBeTruthy();
        await refresh;
        try {
          await expect(money).toHaveAttribute("aria-label", expected);
          expect(await node!.evaluate((element) => element.isConnected)).toBe(true);
          expect(await money.getAttribute("data-money-motion-cycle")).toBe(priorCycle);
        } finally { releaseRefresh(); }
        await expect(dialog).toBeHidden(); await page.unroute("**" + path);
        expect(await node!.evaluate((element) => element.isConnected)).toBe(true);
        expect(await money.getAttribute("data-money-motion-cycle")).toBe(priorCycle);
        const after = await (await page.request.get(path)).json();
        expect(after[0].user_notes).toBe("Synthetic unrelated Notes edit");
        for (const key of ["profile_id", "bookmaker_account_id", "own_cash_committed", "cash_returned", "final_net_pnl", "resolved_net_pnl", "result", "date_started", "date_settling"]) {
          // Existing native datetime serialisation uses a space; compare the same business minute.
          if (key.startsWith("date_")) expect(String(after[0][key]).replace("T", " "), key).toBe(String(saved[0][key]).replace("T", " "));
          else expect(after[0][key], key).toEqual(saved[0][key]);
        }
        const preferencesPath = "/api/fund-manager/preferences/financial-motion";
        const previousPreference = await (await page.request.get(preferencesPath)).json();
        try {
          expect((await page.request.put(preferencesPath, { data: { ...previousPreference, enabled: false } })).ok()).toBeTruthy();
          await page.emulateMedia({ reducedMotion: "no-preference" }); await page.reload();
          await expect(money).toHaveAttribute("aria-label", expected);
          await expect(money).toHaveAttribute("data-money-motion-cycle", "0");
          await title.click(); await expect(money).toHaveAttribute("data-money-motion-cycle", "0");
        } finally { expect((await page.request.put(preferencesPath, { data: previousPreference })).ok()).toBeTruthy(); }
      }
      expect(errors).toEqual([]);
    } finally {
      await page.unrouteAll({ behavior: "ignoreErrors" });
      expect((await page.request.patch(`/api/profiles/${id}`, { data: { status: "Archived" } })).ok()).toBeTruthy();
    }
  });
}
