import { expect, test } from "@playwright/test";

const profileId = "profile-demo-001";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/session**", (route) => route.fulfill({
    json: {
      authenticated: true,
      auth_provider: "google",
      email: "founder@example.invalid",
      expires_at: Math.floor(Date.now() / 1000) + 3_600,
      linked_profile_ids: [profileId],
      name: "Synthetic Founder",
      role: "fund_manager",
      session_policy: {
        auto_logout_enabled: false,
        preference_configured: true,
        timeout_minutes: 30,
      },
    },
  }));
  await page.route("**/api/auth/activity**", (route) => route.fulfill({ status: 204 }));
  await page.route("**/api/fund-manager/notifications**", (route) =>
    route.fulfill({ json: [] })
  );
  await page.route("**/api/fund-manager/import-executions**", (route) =>
    route.fulfill({ json: [] })
  );
  await page.route(`**/api/profiles/${profileId}/accounts`, (route) =>
    route.fulfill({ json: [] })
  );
  await page.route("**/api/bookmaker-catalogue", (route) => route.fulfill({ json: [] }));
  await page.route(`**/api/profiles/${profileId}/exchange-commissions`, (route) =>
    route.fulfill({ json: [] })
  );
  await page.route(
    `**/api/fund-manager/common-bet-combos/profile-overrides/${profileId}?include_hidden=true`,
    (route) => route.fulfill({ json: [] }),
  );
  await page.route("**/api/account-catalogue/source", (route) => route.fulfill({
    json: {
      catalogue_name: "Synthetic queue catalogue",
      default_operating_context: { channels: ["web"], jurisdiction: "GB", subdivision: "" },
      records: [{
        account_type: "Bookmaker",
        background_colour: "#0057B8",
        brand_name: "Betfred",
        catalogue_id: "BOOKMAKER-BETFRED",
        foreground_colour: "#FFFFFF",
        operating_channels: ["web"],
        operating_jurisdictions: ["GB"],
        operating_subdivisions: [],
        short_display_name: "BF",
        status: "Active",
      }],
      schema_version: "1.0",
      updated_at: "2026-09-01",
    },
  }));
  await page.route(
    `**/api/fund-manager/common-bet-combos/profile-opportunities/${profileId}`,
    (route) => route.fulfill({
      json: [{
        already_created: false,
        bookmaker: "Betfred",
        defaults: { opportunityExpiry: "2026-09-08" },
        kind: "Signup",
        label: "A deliberately long welcome opportunity name that must wrap without overlapping adjacent type or state chips",
        ledger_type: "Sportsbook",
        opportunity_key: "signup:synthetic-long",
        period_key: "one-off",
        recurrence: "One Off",
        risk_warnings: ["Potential related restriction with a restricted synthetic account."],
        source: "signup_account",
        target_record_id: "",
      }],
    }),
  );
});

for (const width of [1280, 480]) {
  test(`Opportunity Queue contains long content at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/profiles/${profileId}/tracker/accounts`);

    const queue = page.locator('[data-pd-id="profile-opportunities.queue"]');
    await expect(queue).toBeVisible();
    const providerChip = queue.locator(".bookmaker-identity-badge");
    await expect(providerChip).toHaveText("Betfred");
    await expect(page.getByText("BF", { exact: true })).toHaveCount(0);

    const geometry = await page.evaluate(() => {
      const opportunity = document.querySelector<HTMLElement>(
        '[data-pd-id="profile-opportunities.queue"] tbody td:nth-child(2)'
      );
      const type = document.querySelector<HTMLElement>(
        '[data-pd-id="profile-opportunities.queue"] tbody td:nth-child(3)'
      );
      const chip = document.querySelector<HTMLElement>(
        '[data-pd-id="profile-opportunities.queue"] .bookmaker-identity-badge'
      );
      if (!opportunity || !type || !chip) throw new Error("Queue geometry was unavailable");
      const opportunityBox = opportunity.getBoundingClientRect();
      const typeBox = type.getBoundingClientRect();
      return {
        chipHeight: chip.getBoundingClientRect().height,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        separated: opportunityBox.right <= typeBox.left + 1,
      };
    });
    expect(geometry.separated).toBe(true);
    expect(geometry.chipHeight).toBeGreaterThanOrEqual(30);
    expect(geometry.pageOverflow).toBe(false);
  });
}
