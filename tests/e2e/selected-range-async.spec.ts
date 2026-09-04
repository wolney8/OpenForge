import { expect, test } from "@playwright/test";

const profileId = "profile-demo-001";
const presetByShortcut = {
  "1D": "Today",
  "1W": "Week (Mon-Sun)",
  "1M": "This Month",
  "1Y": "This Year",
  ALL: "All Time",
} as const;

test("Selected Range Performance owns its async state and restores the committed range on failure", async ({
  page,
}) => {
  test.setTimeout(120_000);

  let releaseSuccess: (() => void) | undefined;
  let releaseFailure: (() => void) | undefined;
  const successGate = new Promise<void>((resolve) => {
    releaseSuccess = resolve;
  });
  const failureGate = new Promise<void>((resolve) => {
    releaseFailure = resolve;
  });
  const mutationBodies: Array<Record<string, unknown>> = [];
  let committedSettings: Record<string, unknown> | undefined;

  await page.addInitScript(() => {
    window.localStorage.setItem("openforge-theme", "light");
  });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.route("**/auth/session**", (route) =>
    route.fulfill({
      body: JSON.stringify({
        authenticated: true,
        auth_provider: "local",
        email: "founder@example.invalid",
        linked_profile_ids: [profileId],
        name: "Synthetic Founder",
        role: "fund_manager",
      }),
      contentType: "application/json",
      status: 200,
    })
  );
  await page.route("**/auth/activity", (route) => route.fulfill({ status: 204 }));
  await page.route("**/auth/security-preference", (route) =>
    route.fulfill({
      body: JSON.stringify({ configured: false }),
      contentType: "application/json",
      status: 200,
    })
  );
  await page.route("**/fund-manager/import-executions", (route) =>
    route.fulfill({ body: "[]", contentType: "application/json", status: 200 })
  );
  await page.route("**/fund-manager/notifications**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const body = pathname.endsWith("/state")
      ? { dismissed_ids: [], read_keys: [] }
      : pathname.endsWith("/preferences")
        ? { preferences: {} }
        : [];
    return route.fulfill({
      body: JSON.stringify(body),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.route(`**/profiles/${profileId}/tracker-settings`, async (route) => {
    if (route.request().method() !== "PUT") {
      if (committedSettings) {
        await route.fulfill({
          body: JSON.stringify(committedSettings),
          contentType: "application/json",
          status: 200,
        });
        return;
      }
      await route.fallback();
      return;
    }

    const body = route.request().postDataJSON() as Record<string, unknown>;
    mutationBodies.push(body);
    if (mutationBodies.length === 1) {
      await successGate;
      committedSettings = { ...body, profile_id: profileId };
      await route.fulfill({
        body: JSON.stringify(committedSettings),
        contentType: "application/json",
        status: 200,
      });
      return;
    }

    await failureGate;
    await route.fulfill({
      body: "Synthetic range save failed",
      contentType: "text/plain",
      status: 500,
    });
  });

  await page.goto(`/profiles/${profileId}/tracker/dashboard`);
  await expect(page.getByText("Loading tracker summaries")).toBeHidden({ timeout: 60_000 });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  const performanceCard = page.locator(
    '[data-pd-id="dashboard.selected-range-performance"]'
  );
  const loadingState = page.locator('[data-pd-id="dashboard.selected-range-loading"]');
  const financialContent = performanceCard.locator(".dashboard-performance-content");
  const periodButtons = performanceCard.locator(".dashboard-period-pill");
  const initialActiveShortcut = (
    (await performanceCard.locator(".dashboard-period-pill.is-active").textContent()) ?? ""
  ).trim() as keyof typeof presetByShortcut;
  const successfulShortcut = initialActiveShortcut === "1M" ? "1Y" : "1M";
  const successfulButton = page.getByRole("button", {
    name: `Dashboard range shortcut ${successfulShortcut}`,
  });
  const lightReadyBounds = await performanceCard.boundingBox();
  expect(lightReadyBounds).not.toBeNull();

  await successfulButton.focus();
  await page.keyboard.press("Enter");

  await expect(successfulButton).toHaveClass(/is-active/);
  await expect(performanceCard).toHaveAttribute("aria-busy", "true");
  expect(
    await periodButtons.evaluateAll((buttons) =>
      buttons.every((button) => (button as HTMLButtonElement).disabled)
    )
  ).toBeTruthy();
  await expect(loadingState).toBeVisible();
  await expect(loadingState.locator(".material-linear-progress")).toBeVisible();
  expect(
    await loadingState.locator(".material-linear-progress span").evaluate(
      (indicator) => window.getComputedStyle(indicator).animationDuration
    )
  ).toBe("2.4s");
  await expect(financialContent).toBeHidden();
  await expect(page.locator(".dashboard-health-grid")).toBeVisible();
  await expect(page.locator('.portfolio-dashboard-view [aria-busy="true"]')).toHaveCount(1);
  await expect(page.locator(".tracker-summary-shell > .ledger-loading-overlay")).toHaveCount(0);
  const lightBusyBounds = await performanceCard.boundingBox();
  expect(lightBusyBounds?.width).toBeCloseTo(lightReadyBounds!.width, 0);
  expect(lightBusyBounds?.height).toBeCloseTo(lightReadyBounds!.height, 0);

  const conflictingButton = periodButtons.filter({ hasNotText: successfulShortcut }).first();
  await conflictingButton.evaluate((button: HTMLButtonElement) => {
    button.removeAttribute("disabled");
    button.click();
    button.click();
  });
  await page.waitForTimeout(100);
  expect(mutationBodies).toHaveLength(1);

  releaseSuccess?.();
  await expect(performanceCard).toHaveAttribute("aria-busy", "false");
  await expect(loadingState).toHaveCount(0);
  await expect(financialContent).toBeVisible();
  await expect(successfulButton).toHaveClass(/is-active/);
  expect(
    await periodButtons.evaluateAll((buttons) =>
      buttons.every((button) => !(button as HTMLButtonElement).disabled)
    )
  ).toBeTruthy();
  expect(mutationBodies[0]?.active_date_preset).toBe(presetByShortcut[successfulShortcut]);

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.setViewportSize({ height: 844, width: 390 });
  const failureShortcut = successfulShortcut === "1W" ? "1D" : "1W";
  const failureButton = page.getByRole("button", {
    name: `Dashboard range shortcut ${failureShortcut}`,
  });
  const narrowReadyBounds = await performanceCard.boundingBox();
  expect(narrowReadyBounds).not.toBeNull();

  await failureButton.click();
  await expect(failureButton).toHaveClass(/is-active/);
  await expect(performanceCard).toHaveAttribute("aria-busy", "true");
  await expect(loadingState).toBeVisible();
  const narrowBusyBounds = await performanceCard.boundingBox();
  expect(narrowBusyBounds?.width).toBeCloseTo(narrowReadyBounds!.width, 0);
  expect(narrowBusyBounds?.height).toBeCloseTo(narrowReadyBounds!.height, 0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
    )
  ).toBeTruthy();

  releaseFailure?.();
  await expect(page.locator('[data-pd-id="dashboard.selected-range-error"]')).toHaveText(
    "Synthetic range save failed"
  );
  await expect(performanceCard).toHaveAttribute("aria-busy", "false");
  await expect(successfulButton).toHaveClass(/is-active/);
  await expect(failureButton).not.toHaveClass(/is-active/);
  await expect(financialContent).toBeVisible();
  expect(mutationBodies).toHaveLength(2);
  expect(mutationBodies[1]?.active_date_preset).toBe(presetByShortcut[failureShortcut]);
});
