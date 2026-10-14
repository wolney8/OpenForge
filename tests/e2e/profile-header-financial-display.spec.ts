import { expect, test, type Page } from "@playwright/test";

test.use({ actionTimeout: 15_000 });

async function setup(page: Page) {
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Authorised isolated/Preview access required");
  const health = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
  expect(["test", "preview"]).toContain(health.runtime_role);
  if (health.runtime_role === "preview") expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
  expect((await page.request.get("/api/auth/session")).status()).toBe(200);
  await page.clock.setFixedTime(new Date("2026-09-25T12:00:00Z"));
  const suffix = Date.now();
  const response = await page.request.post("/api/profiles/onboarding", { data: {
    accounts: [], display_name: `Synthetic CP045 Header ${suffix}`, profile_code: `C45H-${suffix}`,
    enabled_modules: ["sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments", "each-way-extra-places"],
    quick_actions: [], setup_path: "import", tracking_start_date: "2026-09-01",
  } });
  expect(response.status(), await response.text()).toBe(201);
  const id = (await response.json()).profile.profile_id;
  const path = `/api/profiles/${id}/tracker-summary-sources`;
  const source = await (await page.request.get(path)).json();
  source.tracker_settings.active_date_preset = "All Dates";
  expect((await page.request.put(`/api/profiles/${id}/tracker-settings`, { data: source.tracker_settings })).ok()).toBeTruthy();
  source.sportsbook_bets = [{ sportsbook_bet_id: "CP045-HEADER-SB", bookmaker: "Bookmaker A", event_name: "Demo Offer", offer_type: "Bet & Get", offer_name: "", status: "Settled", result: "Back Won", date_settled: "2026-09-25T12:00:00", exchange_name: "Exchange A", match_strategy: "Standard", calculated_liability_1: "20", projected_current_pnl: "100.50", final_net_pnl: "100.50", reporting_value: "100.50", lay_status: "Matched", counts_as_open: false, is_overdue: false }];
  return { id, path, source };
}

async function navigate(page: Page, route: string) {
  await page.keyboard.press("Escape");
  await page.locator('[data-pd-id="profile-command.trigger"]').scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.locator('[data-pd-id="profile-command.trigger"]').click();
  await page.locator(`[data-pd-id="profile-command.route.${route}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/tracker/${route}$`));
  await expect(page.locator(`[data-pd-id="profile-command.route.${route}"]`)).toBeHidden();
}

test("Profile header suppresses a failed warm summary and recovers its exact scoped value", async ({ page }) => {
  const { id, path, source } = await setup(page);
  let failed = false;
  try {
    await page.route("**" + path, route => failed
      ? route.fulfill({ status: 503, json: { detail: "Synthetic header summary failure" } })
      : route.fulfill({ json: source }));
    await page.goto(`/profiles/${id}/tracker/reports`);
    const header = page.locator('[data-pd-id="profile-command.trigger"]');
    const value = header.locator(".financial-value");
    await expect(value).toHaveAttribute("aria-label", /Total P&L for .+: £ 100\.50$/);
    failed = true;
    await navigate(page, "dashboard");
    await expect(page.locator(".tracker-summary-shell")).toContainText("Request failed with status 503");
    await expect(value).toHaveCount(0, { timeout: 1000 });
    await expect(header).toContainText("Profile summary unavailable");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(header).toContainText("Profile summary unavailable");
    await expect(value).toHaveCount(0);
    failed = false;
    await navigate(page, "reports");
    await expect(value).toHaveAttribute("aria-label", /Total P&L for .+: £ 100\.50$/);
    const settingsPath = `/api/profiles/${id}/tracker-settings`;
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route("**" + settingsPath, async route => {
      if (route.request().method() === "PUT") await held;
      await route.continue();
    });
    await page.getByLabel("Change tracker date range").selectOption("Last Week");
    await expect(header).toContainText("Updating summary…");
    await expect(value).toHaveCount(0);
    release();
    await expect(value).toHaveAttribute("aria-label", /Total P&L for .+: £ -$/);
    await expect(header).toHaveAttribute("title", /Tracker range: Last Week/);
    await page.unroute("**" + settingsPath);
    await page.route("**" + settingsPath, route => route.fulfill({ status: 503, json: { detail: "Synthetic range save failure" } }));
    await page.getByLabel("Change tracker date range").selectOption("All Dates");
    await expect(page.locator(".tracker-summary-shell").getByRole("alert")).toContainText("Synthetic range save failure");
    await expect(value).toHaveAttribute("aria-label", /Total P&L for .+: £ -$/);
    await expect(header).toHaveAttribute("title", /Tracker range: Last Week/);
  } finally {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    expect((await page.request.patch(`/api/profiles/${id}`, { data: { status: "Archived" } })).ok()).toBeTruthy();
  }
});

test("Profile header keeps scoped accounting values, nearest replay and accessible compact rendering", async ({ page }, info) => {
  const { id, path, source } = await setup(page);
  try {
    source.sportsbook_bets[0].reporting_value = "-1234567.89";
    source.sportsbook_bets[0].final_net_pnl = "-1234567.89";
    const negativeRow = structuredClone(source.sportsbook_bets[0]);
    await page.route("**" + path, route => route.fulfill({ json: source }));
    await page.goto(`/profiles/${id}/tracker/reports`);
    const header = page.locator('[data-pd-id="profile-command.trigger"]');
    const value = header.locator(".financial-value");
    await expect(value).toHaveAttribute("aria-label", /Total P&L for .+: £ \(1,234,567\.89\)$/);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect.poll(async () => Number(await value.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(0);
    const peer = page.getByRole("region", { name: "Tracker range and reporting", exact: true }).locator("article").filter({ has: page.getByText("Selected Range P&L", { exact: true }) }).locator(".financial-value");
    await expect.poll(async () => Number(await peer.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(0);
    for (const [width, theme, scale] of [[1440, "light", 100], [390, "dark", 100], [760, "light", 200], [760, "dark", 200]] as const) {
      const beforeTheme = await value.getAttribute("data-money-motion-cycle");
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(({ theme, scale }) => { document.documentElement.dataset.theme = theme; document.documentElement.style.fontSize = scale + "%"; }, { theme, scale });
      await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => r())));
      expect(await value.getAttribute("data-money-motion-cycle")).toBe(beforeTheme);
      const peerCycle = await peer.getAttribute("data-money-motion-cycle");
      await header.click();
      await expect.poll(async () => Number(await value.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(Number(beforeTheme));
      expect(await peer.getAttribute("data-money-motion-cycle")).toBe(peerCycle);
      await header.screenshot({ path: info.outputPath(`profile-header-during-${width}-${theme}-${scale}.png`) });
      for (let frame = 0; frame < 4; frame++) {
        await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => r())));
        await expect(value).toHaveAttribute("aria-label", /Total P&L for .+: £ \(1,234,567\.89\)$/);
        expect(await value.evaluate(n => {
          const a = n.getBoundingClientRect(), b = n.closest("button")!.getBoundingClientRect();
          const canonical = n.querySelector(".financial-value-canonical-text")!.getBoundingClientRect();
          const visual = n.querySelector(".financial-value-visual")!;
          const glyphWidth = Array.from(visual.children).reduce((sum, child) => sum + child.getBoundingClientRect().width, 0);
          return a.left >= b.left && a.right <= b.right + 1 && canonical.right <= b.right + 1 && Math.abs(canonical.width - glyphWidth) < 1.5 && visual.getAttribute("aria-hidden") === "true" && !n.querySelector("[aria-live], [tabindex]");
        }), JSON.stringify(await value.evaluate(n => {
          const canonical = n.querySelector(".financial-value-canonical-text")!, visual = n.querySelector(".financial-value-visual")!;
          return { value: n.getBoundingClientRect().toJSON(), button: n.closest("button")!.getBoundingClientRect().toJSON(), canonical: canonical.getBoundingClientRect().toJSON(), glyphWidth: Array.from(visual.children).reduce((sum, child) => sum + child.getBoundingClientRect().width, 0), visualHidden: visual.getAttribute("aria-hidden"), focusable: !!n.querySelector("[aria-live], [tabindex]") };
        }))).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      }
      await page.keyboard.press("Escape");
      await expect(header).toBeFocused();
      await header.screenshot({ path: info.outputPath(`profile-header-${width}-${theme}-${scale}.png`) });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(value).toHaveAttribute("data-money-motion", "none");
    const reducedCycle = await value.getAttribute("data-money-motion-cycle");
    await header.press("Enter"); await expect(page.locator('[data-pd-id="profile-command.search"]')).toBeFocused(); await page.keyboard.press("Escape");
    expect(await value.getAttribute("data-money-motion-cycle")).toBe(reducedCycle);
    await value.evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); getSelection()!.removeAllRanges(); getSelection()!.addRange(range); });
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.keyboard.press(process.platform === "darwin" ? "Meta+c" : "Control+c");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("£ (1,234,567.89)");
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    await page.setViewportSize({ width: 1440, height: 1000 });
    source.sportsbook_bets = [];
    await navigate(page, "dashboard");
    await expect(value).toHaveAttribute("aria-label", /Total P&L for .+: £ -$/);
    await expect(value).toHaveAttribute("data-money-motion", "none");
    source.casino_offers = [{ casino_offer_id: "CP045-UNKNOWN", bookmaker: "Bookmaker A", offer_name: "Demo Offer", status: "Settled", result: "Complete", date_started: "2026-09-25T12:00:00", date_settling: "2026-09-25T12:00:00", resolved_net_pnl: null, counts_as_open: false, is_overdue: false, week_label: "" }];
    await navigate(page, "reports");
    await expect(value).toHaveAttribute("aria-label", /Total P&L for .+: Unavailable$/);
    await expect(value).toHaveAttribute("data-money-motion", "none");
    source.casino_offers = [];
    source.sportsbook_bets = [negativeRow];
    await page.route("**/api/fund-manager/preferences/financial-motion", route => route.fulfill({ json: { enabled: false, replay_delay_ms: 1500, duration_ms: 520, stagger_ms: 80 } }));
    await page.emulateMedia({ reducedMotion: "no-preference" }); await page.reload();
    await expect(value).toHaveAttribute("aria-label", /Total P&L for .+: £ \(1,234,567\.89\)$/);
    const offCycle = await value.getAttribute("data-money-motion-cycle"); await header.click();
    expect(await value.getAttribute("data-money-motion-cycle")).toBe(offCycle); await expect(value).toHaveAttribute("data-money-motion", "none");
  } finally {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    expect((await page.request.patch(`/api/profiles/${id}`, { data: { status: "Archived" } })).ok()).toBeTruthy();
  }
});
