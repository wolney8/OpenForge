import { expect, test } from "@playwright/test";

const api = "http://127.0.0.1:8013";
test("native Add Row explicitly opts into Normal v2, previews/copies/saves/reopens every leg", async ({ page, request }) => {
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: {
    authenticated: true, role: "fund_manager", email: "native@example.invalid", name: "Synthetic Owner",
    linked_profile_ids: [], expires_at: Math.floor(Date.now()/1000)+3600,
    session_policy: { auto_logout_enabled: false, timeout_minutes: 15, preference_configured: true },
  } }));
  const profile = await request.post(`${api}/profiles/onboarding`, { data: {
    setup_path: "import", display_name: "Synthetic Native Planner", profile_code: `NAT-${Date.now()}`,
    tracking_start_date: "2026-09-12", enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments"],
  } });
  expect(profile.status(), await profile.text()).toBe(201);
  const profileId = (await profile.json()).profile.profile_id;
  for (const [account, type] of [["Bet365", "Bookie"], ["Smarkets", "Exchange"]]) {
    const response = await request.post(`${api}/profiles/${profileId}/accounts`, { data: {
      account, type, status: "Active", lifecycle_status: "Active", restrictions: [], channel: "Online",
      ...(type === "Exchange" ? { commission_rate: "0.02" } : {}),
    } });
    expect(response.status()).toBe(201);
  }
  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.getByRole("button", { name: "Add sportsbook row", exact: true }).click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Offer", { exact: true }).fill("Synthetic native offer");
  await editor.getByRole("combobox", { name: /^Bookmaker/ }).selectOption("Bet365");
  await editor.getByRole("combobox", { name: /^Bet type/ }).selectOption("Single");
  await editor.getByRole("combobox", { name: /^Offer type/ }).selectOption("Bet & Get");
  await editor.getByRole("combobox", { name: /^Fixture type/ }).selectOption("Football");
  await editor.getByLabel("Event name", { exact: true }).fill("Synthetic native Normal v2");
  await editor.getByRole("tab", { name: /Matching/ }).click();
  await expect(editor.locator('[data-pd-id="calculators.multi-lay.presentation"]')).toHaveCount(0);
  await editor.getByLabel("Sportsbook lay workflow mode").selectOption("Multilay");
  const optIn = editor.getByRole("button", { name: "Use v2 per-leg commission planning" });
  for (const width of [1440, 760]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      const box = await optIn.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      await optIn.focus();
      expect(await optIn.evaluate((node) => document.activeElement === node)).toBe(true);
    }
  }
  await optIn.focus();
  await page.keyboard.press("Enter");
  const planner = editor.locator('[data-pd-id="calculators.multi-lay.presentation"]');
  await expect(planner).toBeVisible();
  await expect(planner.locator('[data-pd-id="calculators.multi-outcome-1-commission"]')).toHaveValue("0.02");
  await planner.locator('[data-pd-id="calculators.multi-back-stake"]').fill("10");
  await planner.locator('[data-pd-id="calculators.multi-back-odds"]').fill("4");
  for (const [index, label, odds, commission] of [[1, "Home", "2.50", "0.05"], [2, "Away", "3", "0.02"]] as const) {
    await planner.locator(`[data-pd-id="calculators.multi-outcome-${index}-label"]`).fill(label);
    await planner.locator(`[data-pd-id="calculators.multi-outcome-${index}-odds"]`).fill(odds);
    await planner.locator(`[data-pd-id="calculators.multi-outcome-${index}-commission"]`).fill(commission);
  }
  await expect(planner.locator('[data-pd-id="calculators.multi-lay.outcome-1.copyable"]')).toContainText("16.33");
  await expect(planner.locator('[data-pd-id="calculators.multi-lay.outcome-2.copyable"]')).toContainText("13.42");
  await planner.getByRole("button", { name: "Add lay", exact: true }).click();
  await planner.locator('[data-pd-id="calculators.multi-outcome-3-label"]').fill("Draw");
  await planner.locator('[data-pd-id="calculators.multi-outcome-3-odds"]').fill("5");
  await planner.locator('[data-pd-id="calculators.multi-outcome-3-commission"]').fill("0");
  await expect(planner.locator('[data-pd-id="calculators.multi-lay.outcome-3.copyable"]')).toContainText("8.00");
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
    writeText: async (value: string) => { (window as unknown as { copied: string }).copied = value; },
  } }));
  await planner.locator('[data-pd-id="calculators.multi-lay.outcome-2.copyable"] button').click();
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe("13.42");
  for (const width of [1440, 760, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      await page.evaluate((scaled) => { document.documentElement.style.fontSize = scaled ? "125%" : ""; }, width === 760);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      for (const input of await planner.locator("td input").all()) {
        await input.focus();
        expect(await input.evaluate((node) => {
          const control = node.getBoundingClientRect(); const cell = node.closest("td")!.getBoundingClientRect();
          return document.activeElement === node && control.left >= cell.left-1 && control.right <= cell.right+1;
        })).toBe(true);
      }
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  const saving = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith(`/profiles/${profileId}/sportsbook-bets`));
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  const saved = await saving;
  expect(saved.status(), await saved.text()).toBe(201);
  const row = await saved.json();
  expect(JSON.parse(row.multi_lay_outcomes_json).map((leg: { commission: string }) => leg.commission)).toEqual(["0.05", "0.02", "0"]);
  expect(row.multi_lay_reference.branches.map((leg: { lay_stake: string }) => leg.lay_stake)).toEqual(["16.33", "13.42", "8.00"]);
  expect(row.multi_lay_reference.scenarios.map((scenario: { total: string }) => scenario.total)).toEqual(["26.66", "26.65", "26.67", "26.66"]);
  expect(row.lay_actual).toBe("");
  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets?record=${row.sportsbook_bet_id}`);
  await editor.getByRole("tab", { name: /Matching/ }).click();
  await expect(planner.locator('[data-pd-id="calculators.multi-outcome-2-commission"]')).toHaveValue("0.02");
  await expect(planner.locator('[data-pd-id="calculators.multi-outcome-3-commission"]')).toHaveValue("0");
  await expect(planner.locator('[data-pd-id="calculators.multi-outcome-3-label"]')).toHaveValue("Draw");
  await expect(optIn).toHaveCount(0);
});
test("shared dense cells contain Sequential Lay and Dutching fields", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: {
    authenticated: true, role: "fund_manager", email: "dense@example.invalid", name: "Synthetic Owner",
    linked_profile_ids: [], expires_at: Math.floor(Date.now()/1000)+3600,
    session_policy: { auto_logout_enabled: false, timeout_minutes: 15, preference_configured: true },
  } }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const family of ["sequential-lay", "dutching"]) {
    await page.goto(`/fund-manager/calculators?family=${family}`);
    for (const width of [760, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const fields = page.locator(".dense-calculator-grid td input");
      await expect(fields.first()).toBeVisible();
      for (const input of await fields.all()) {
        await input.focus();
        expect(await input.evaluate((node) => {
          const field = node.getBoundingClientRect(); const cell = node.closest("td")!.getBoundingClientRect();
          return field.left >= cell.left-1 && field.right <= cell.right+1;
        })).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1)).toBe(true);
    }
  }
});
test("Normal v2 planning preserves mixed commissions through native save/reopen", async ({ page, request }) => {
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  const createdProfile = await request.post(`${api}/profiles/onboarding`, { data: {
    setup_path: "import", display_name: "Synthetic Parity Profile", profile_code: `PAR-${Date.now()}`,
    tracking_start_date: "2026-09-12", enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments"],
  } });
  expect(createdProfile.status()).toBe(201);
  const profileId = (await createdProfile.json()).profile.profile_id;
  const entries = [
    { id: "outcome1", label: "Home", layOdds: "2.50", commission: "0.05", calculationVersion: "multi-lay-v2", backingType: "normal" },
    { id: "outcome2", label: "Away", layOdds: "3.00", commission: "0.02" },
  ];
  const created = await request.post(`${api}/profiles/${profileId}/sportsbook-bets`, { data: {
    event_name: "Synthetic Normal commission parity", offer_text: "Synthetic plan", bookmaker: "Bookmaker A",
    offer_type: "Bet & Get", bet_type: "Single", fixture_type: "Football", match_strategy: "Multilay",
    status: "Prospecting", result: "Pending", back_stake: "10.00", back_odds: "4.00", lay_odds_1: "2.50",
    exchange_name: "Smarkets", multi_lay_outcome_1_name: "Home", multi_lay_outcomes_json: JSON.stringify(entries),
  } });
  expect(created.status()).toBe(201);
  const row = await created.json();
  const reference = row.multi_lay_reference;
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: {
    authenticated: true, role: "fund_manager", email: "parity@example.invalid", name: "Synthetic Owner",
    linked_profile_ids: [], expires_at: Math.floor(Date.now()/1000)+3600,
    session_policy: { auto_logout_enabled: false, timeout_minutes: 15, preference_configured: true },
  } }));
  const standaloneInputs = { backingType: "normal", presentationMode: "simple", strategy: "standard",
    backStake: "10.00", backOdds: "4.00", profitBoostPercent: "0", refundAmount: "", retentionPercent: "70",
    customMultiplier: "1", customMinimum: "", customMaximum: "", exchange: "Smarkets",
    outcomes: entries.map((leg) => ({ label: leg.label, layOdds: leg.layOdds, commission: leg.commission, commissionManual: true })),
  };
  await page.goto(`/fund-manager/calculators?${new URLSearchParams({ family: "multi-lay", multiLay: JSON.stringify(standaloneInputs) })}`);
  await expect(page.locator('[data-pd-id="calculators.multi-lay.outcome-1.copyable"]')).toContainText("16.33");
  await expect(page.locator('[data-pd-id="calculators.multi-lay.outcome-2.copyable"]')).toContainText("13.42");
  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets?record=${row.sportsbook_bet_id}`);
  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toBeVisible();
  await editor.getByRole("tab", { name: /Matching/ }).click();
  const planner = editor.locator('[data-pd-id="calculators.multi-lay.presentation"]');
  await expect(planner).toBeVisible();
  await expect(planner.locator('[data-pd-id="calculators.multi-outcome-1-commission"]')).toHaveValue("0.05");
  await expect(planner.locator('[data-pd-id="calculators.multi-outcome-2-commission"]')).toHaveValue("0.02");
  await expect(planner.locator('[data-pd-id="calculators.multi-lay.outcome-1.copyable"]')).toContainText("16.33");
  await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => { (window as unknown as { copied: string }).copied = value; } } }); });
  await planner.locator('[data-pd-id="calculators.multi-lay.outcome-1.copyable"] button').click();
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe("16.33");
  await planner.locator('[data-pd-id="calculators.multi-outcome-2-commission"]').fill("0.03");
  await planner.locator('[data-pd-id="calculators.multi-outcome-2-commission"]').fill("0.02");
  await expect(planner.locator('[data-pd-id="calculators.multi-lay.outcome-1.copyable"]')).toContainText("16.33");
  for (const width of [1440, 760, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      expect(await planner.evaluate((node) => node.getBoundingClientRect().width)).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      for (const input of await planner.locator("td input").all()) {
        await input.focus();
        const geometry = await input.evaluate((node) => {
          const field = node.getBoundingClientRect(); const cell = node.closest("td")!.getBoundingClientRect();
          return { id: node.dataset.pdId, focused: document.activeElement === node, left: field.left-cell.left, right: cell.right-field.right, cellWidth: cell.width, fieldWidth: field.width, labelWidth: node.parentElement!.getBoundingClientRect().width, tracks: getComputedStyle(node.closest("td")!).gridTemplateColumns };
        });
        expect(geometry.focused && geometry.left >= -1 && geometry.right >= -1, JSON.stringify({ width, theme, geometry })).toBe(true);
      }
      if (process.env.OPENFORGE_CAPTURE_PARITY === "true" && width === 760 && theme === "dark") await page.screenshot({ path: "/tmp/openforge-multilay-parity-dark-760.png" });
    }
  }
  const saving = page.waitForResponse((response) => response.request().method() === "PUT" && response.url().endsWith(`/sportsbook-bets/${row.sportsbook_bet_id}`));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  const savedResponse = await saving;
  expect(savedResponse.status(), await savedResponse.text()).toBe(200);
  const reopened = await request.get(`${api}/profiles/${profileId}/sportsbook-bets/${row.sportsbook_bet_id}`);
  expect((await reopened.json()).multi_lay_reference).toEqual(reference);
  await page.reload();
  await editor.getByRole("tab", { name: /Matching/ }).click();
  await expect(planner.locator('[data-pd-id="calculators.multi-outcome-2-commission"]')).toHaveValue("0.02");
});
