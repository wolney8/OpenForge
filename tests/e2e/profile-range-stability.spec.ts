import { expect, test, type Page } from "@playwright/test";

test.use({ actionTimeout: 15_000 });

const baseURL = process.env.OPENFORGE_E2E_BASE_URL ?? "http://localhost:3010";

type SyntheticProfile = { profile_id: string; display_name: string };

async function createProfile(page: Page, name: string, code: string): Promise<SyntheticProfile> {
  const response = await page.request.post("/api/profiles/onboarding", {
    data: {
      accounts: [],
      display_name: name,
      profile_code: code,
      profile_relationship: "Personal",
      management_fee_percent: "0",
      investment_fee_percent: "0",
      enabled_modules: ["sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments", "each-way-extra-places"],
      quick_actions: [],
      setup_path: "import",
      tracking_start_date: "2026-01-01",
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()).profile as SyntheticProfile;
}

async function openProfileMenu(page: Page) {
  const trigger = page.locator('[data-pd-id="profile-command.trigger"]');
  await trigger.click();
  await expect(page.locator('[data-pd-id="profile-command.popover"]')).toHaveClass(/is-open/);
}

async function switchProfile(page: Page, profileId: string) {
  await openProfileMenu(page);
  await page.locator(`[data-pd-id="profile-command.profile.${profileId}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/profiles/${profileId}/tracker/`));
}

async function navigateSection(page: Page, route: "dashboard" | "sportsbook-bets") {
  await openProfileMenu(page);
  await page.locator(`[data-pd-id="profile-command.route.${route}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/tracker/${route}$`));
}

async function expectTerminalSummary(
  page: Page,
  profileName: string,
  range: "Last Month" | "This Year",
  expected: "zero" | "valid",
) {
  const header = page.locator('[data-pd-id="profile-command.trigger"]');
  await expect(header).toContainText(profileName);
  await expect(header).not.toHaveAttribute("aria-busy", "true", { timeout: 10_000 });
  await expect(header).not.toContainText("Updating summary…");
  await expect(header).toHaveAttribute("title", new RegExp(`Tracker range: ${range}`));
  if (expected === "zero") {
    await expect(header.locator(".financial-value")).toHaveAttribute("aria-label", /£ 0\.00$/);
  } else {
    await expect(header.locator(".financial-value")).toHaveAttribute("aria-label", /£ 12\.34$/);
  }
  await expect(page.locator(".summary-menu-loading-icon")).toHaveCount(0);
}

test("universal range and Profile summary settle across 20+ delayed transitions", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(process.env.OPENFORGE_PROFILE_RANGE_STABILITY_GATE !== "true", "Authenticated isolated stability runtime required");
  const sessionToken = process.env.OPENFORGE_STABILITY_SESSION_TOKEN;
  const replacementSessionToken = process.env.OPENFORGE_STABILITY_SECOND_SESSION_TOKEN;
  test.skip(!sessionToken || !replacementSessionToken, "Two isolated authenticated sessions are required");

  await page.context().addCookies([{
    httpOnly: true,
    name: "pd_session",
    sameSite: "Lax",
    url: baseURL,
    value: sessionToken,
  }]);
  await page.clock.setFixedTime(new Date("2026-10-14T12:00:00Z"));
  const suffix = Date.now();
  const profileA = await createProfile(page, `Synthetic Stability A ${suffix}`, `STAB-A-${suffix}`);
  const profileB = await createProfile(page, `Synthetic Stability B ${suffix}`, `STAB-B-${suffix}`);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let delayProfileA = 0;
  let delayProfileB = 0;
  let failProfileB = false;
  let malformedProfileB = false;

  await page.route("**/api/profiles/*/tracker-summary-sources", async (route) => {
    const isProfileA = route.request().url().includes(profileA.profile_id);
    if (failProfileB && !isProfileA) {
      await route.fulfill({ json: { detail: "Synthetic summary failure" }, status: 503 });
      return;
    }
    const response = await route.fetch();
    const payload = await response.json();
    const delay = isProfileA ? delayProfileA : delayProfileB;
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    payload.sportsbook_bets = isProfileA ? [{
      bookmaker: "Bookmaker A",
      counts_as_open: false,
      date_settled: "2026-09-18T12:00:00+01:00",
      event_name: "Synthetic stability fixture",
      exchange_name: "Exchange A",
      final_net_pnl: "12.34",
      lay_status: "Matched",
      match_strategy: "Standard",
      offer_name: "Synthetic stability offer",
      offer_type: "Bet & Get",
      projected_current_pnl: "12.34",
      reporting_value: "12.34",
      result: "Back Won",
      sportsbook_bet_id: "STABILITY-SB-001",
      status: "Settled",
    }] : [];
    payload.casino_offers = !isProfileA && malformedProfileB ? [{
      bookmaker: "Bookmaker B",
      casino_offer_id: "STABILITY-MALFORMED-001",
      counts_as_open: false,
      date_settling: "2026-09-19T12:00:00+01:00",
      offer_name: "Synthetic malformed value",
      resolved_net_pnl: null,
      result: "Complete",
      status: "Settled",
    }] : [];
    await route.fulfill({ json: payload, status: response.status() });
  });

  let transitions = 0;
  const assert = async (profile: SyntheticProfile, range: "Last Month" | "This Year", expected: "zero" | "valid") => {
    transitions += 1;
    await expectTerminalSummary(page, profile.display_name, range, expected);
    expect(errors, `runtime errors after transition ${transitions}`).toEqual([]);
  };

  try {
    await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
      selected_range_preset: "Last Month",
      selected_range_custom_start: null,
      selected_range_custom_end: null,
    } });
    await page.goto(`/profiles/${profileA.profile_id}/tracker/dashboard`);
    await assert(profileA, "Last Month", "valid"); // 1

    delayProfileA = 450;
    await page.emulateMedia({ reducedMotion: "reduce" });
    const settledHeaderBox = await page.locator('[data-pd-id="profile-command.trigger"]').boundingBox();
    await page.getByLabel("Change tracker date range").selectOption("This Year");
    await expect(page.locator('[data-pd-id="profile-command.trigger"]')).toHaveAttribute("aria-busy", "true");
    await expect(page.locator(".summary-menu-loading-indicator")).toBeVisible();
    const updatingHeaderBox = await page.locator('[data-pd-id="profile-command.trigger"]').boundingBox();
    expect(updatingHeaderBox?.height).toBe(settledHeaderBox?.height);
    await expect(page.locator(".summary-menu-loading-indicator span")).toHaveCSS("animation-name", "none");
    await assert(profileA, "This Year", "valid"); // 2
    await page.emulateMedia({ reducedMotion: "no-preference" });

    await switchProfile(page, profileB.profile_id);
    await assert(profileB, "This Year", "zero"); // 3
    await navigateSection(page, "sportsbook-bets");
    await assert(profileB, "This Year", "zero"); // 4
    await navigateSection(page, "dashboard");
    await assert(profileB, "This Year", "zero"); // 5
    const performanceCard = page.locator('[data-pd-id="dashboard.selected-range-performance"]');
    await expect(performanceCard).toContainText("No betting activity in this range");
    await expect(performanceCard.locator("figure")).toHaveCount(0);

    delayProfileB = 400;
    await page.getByLabel("Change tracker date range").selectOption("Last Month");
    await expect(page.locator(".summary-menu-loading-indicator")).toBeVisible();
    await assert(profileB, "Last Month", "zero"); // 6
    await switchProfile(page, profileA.profile_id);
    await assert(profileA, "Last Month", "valid"); // 7
    await page.reload();
    await assert(profileA, "Last Month", "valid"); // 8

    delayProfileA = 900;
    await page.getByLabel("Change tracker date range").selectOption("This Year");
    await expect(page.locator(".summary-menu-loading-indicator")).toBeVisible();
    await switchProfile(page, profileB.profile_id);
    delayProfileB = 40;
    await assert(profileB, "This Year", "zero"); // 9: stale A response cannot win
    await new Promise((resolve) => setTimeout(resolve, 950));
    await assert(profileB, "This Year", "zero"); // 10

    await switchProfile(page, profileA.profile_id);
    await assert(profileA, "This Year", "valid"); // 11
    await navigateSection(page, "sportsbook-bets");
    await assert(profileA, "This Year", "valid"); // 12
    await navigateSection(page, "dashboard");
    await assert(profileA, "This Year", "valid"); // 13
    await page.getByLabel("Change tracker date range").selectOption("Last Month");
    await assert(profileA, "Last Month", "valid"); // 14
    await switchProfile(page, profileB.profile_id);
    await assert(profileB, "Last Month", "zero"); // 15
    await page.reload();
    await assert(profileB, "Last Month", "zero"); // 16

    failProfileB = true;
    await page.getByLabel("Change tracker date range").selectOption("This Year");
    const header = page.locator('[data-pd-id="profile-command.trigger"]');
    await expect(header).not.toHaveAttribute("aria-busy", "true", { timeout: 10_000 });
    await expect(header).toContainText("Profile summary failed to load");
    expect(errors).toEqual([]);
    transitions += 1; // 17: explicit terminal failure
    failProfileB = false;
    await page.reload();
    await assert(profileB, "This Year", "zero"); // 18
    malformedProfileB = true;
    await page.reload();
    await expect(page.locator('[data-pd-id="profile-command.trigger"]')).toContainText("Profile P&L unavailable");
    await expect(performanceCard).toContainText("Unavailable");
    await expect(performanceCard.locator("figure")).toHaveCount(0);
    transitions += 1; // 19: malformed activity is compact and terminal
    malformedProfileB = false;
    await page.reload();
    await assert(profileB, "This Year", "zero"); // 20
    await switchProfile(page, profileA.profile_id);
    await assert(profileA, "This Year", "valid"); // 21
    await navigateSection(page, "sportsbook-bets");
    await assert(profileA, "This Year", "valid"); // 22
    await navigateSection(page, "dashboard");
    await assert(profileA, "This Year", "valid"); // 23

    expect((await page.request.post("/api/auth/logout")).ok()).toBeTruthy();
    await page.context().clearCookies();
    await page.goto("/login");
    await page.context().addCookies([{
      httpOnly: true,
      name: "pd_session",
      sameSite: "Lax",
      url: baseURL,
      value: replacementSessionToken,
    }]);
    await page.goto(`/profiles/${profileB.profile_id}/tracker/dashboard`);
    await assert(profileB, "This Year", "zero"); // 24: re-auth preserves universal range
    await switchProfile(page, profileA.profile_id);
    await assert(profileA, "This Year", "valid"); // 25
    await page.reload();
    await assert(profileA, "This Year", "valid"); // 26
    expect(transitions).toBeGreaterThanOrEqual(20);
  } finally {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.request.patch(`/api/profiles/${profileA.profile_id}`, { data: { status: "Archived" } });
    await page.request.patch(`/api/profiles/${profileB.profile_id}`, { data: { status: "Archived" } });
  }
});
