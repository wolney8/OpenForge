import { expect, test } from "@playwright/test";

async function mockSession(page: import("@playwright/test").Page) {
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: {
    authenticated: true,
    email: "calculator-parity@example.invalid",
    name: "Synthetic Fund Manager",
    role: "fund_manager",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    linked_profile_ids: [],
    session_policy: { auto_logout_enabled: false, timeout_minutes: 15, preference_configured: true, effective_expires_at: Math.floor(Date.now() / 1000) + 3600 },
  }}));
}

async function pairedGeometry(page: import("@playwright/test").Page, id: string) {
  return page.locator(`[data-pd-id="${id}"]`).evaluate((root) => {
    const segments = [...root.querySelectorAll<HTMLElement>(".calculator-paired-segment")];
    const rows = segments.map((segment) => ({
      eyebrow: segment.querySelector<HTMLElement>(".eyebrow")!.getBoundingClientRect().top,
      fields: [...segment.querySelectorAll<HTMLElement>(".calculator-paired-segment-fields > .field-control")].map((field) => {
        const label = field.querySelector<HTMLElement>(":scope > span")!.getBoundingClientRect();
        const input = field.querySelector<HTMLElement>("input, select")!.getBoundingClientRect();
        return { label: label.top, input: input.top, height: input.height };
      }),
    }));
    return rows;
  });
}

test("aligns calculator segments, hierarchy, schemes and selection surfaces", async ({ page }) => {
  await mockSession(page);
  await page.goto("/fund-manager/calculators");

  let geometry = await pairedGeometry(page, "calculators.matched-betting.paired-segments");
  expect(geometry[0].eyebrow).toBeCloseTo(geometry[1].eyebrow, 0);
  expect(geometry[0].fields[0]).toEqual(geometry[1].fields[0]);
  if (process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR}/standard-desktop.png`, fullPage: true });
  }
  await page.getByLabel("Strategy").selectOption("Partial Lay");
  geometry = await pairedGeometry(page, "calculators.matched-betting.paired-segments");
  expect(geometry[0].fields[1]).toEqual(geometry[1].fields[1]);
  await page.getByLabel("Back stake").fill("invalid");
  await page.getByLabel("Back odds").focus();
  geometry = await pairedGeometry(page, "calculators.matched-betting.paired-segments");
  expect(geometry[0].fields[1]).toEqual(geometry[1].fields[1]);
  await page.getByLabel("Bet type").selectOption("bonus_lock_in");
  await expect(page.getByLabel("Award trigger").locator('option[value="Back Wins"]')).toHaveCount(0);

  await page.goto("/fund-manager/calculators?family=multi-lay");
  await expect(page.locator('[data-pd-id="calculators.multi-lay.presentation"] .calculator-segment-back .eyebrow')).toHaveText("Back bet");
  await page.goto("/fund-manager/calculators?family=sequential-lay");
  await expect(page.locator('[data-pd-id="calculators.sequential-lay.presentation"] .calculator-segment-back .eyebrow')).toHaveText("Back bet");

  await page.goto("/fund-manager/calculators?family=early-payout");
  geometry = await pairedGeometry(page, "calculators.early-payout.paired-segments");
  expect(geometry[0].eyebrow).toBeCloseTo(geometry[1].eyebrow, 0);
  expect(geometry[0].fields[0]).toEqual(geometry[1].fields[0]);
  expect(geometry[0].fields[1]).toEqual(geometry[1].fields[1]);
  if (process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR}/early-payout-desktop.png`, fullPage: true });
  }

  await page.goto("/fund-manager/calculators?family=each-way");
  await page.getByLabel("E/W Stake (each way)").fill("10");
  await page.getByRole("button", { name: "Use Back and Lay colour theme" }).click();
  const eachWay = page.locator('[data-pd-id="calculators.each-way.presentation"]');
  await expect(eachWay).toHaveClass(/extra-place-theme-back-lay/);
  await expect(page.getByLabel("E/W Stake (each way)")).toHaveValue("10");
  await expect(page.getByRole("button", { name: "Extra Place", exact: true })).toHaveAttribute("aria-pressed", "true");
  if (process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR}/each-way-desktop.png`, fullPage: true });
  }

  for (const family of ["multiples", "dutching"]) {
    await page.goto(`/fund-manager/calculators?family=${family}`);
    const radius = await page.locator(`[data-pd-id="calculators.${family === "multiples" ? "accumulator" : "dutching"}.selections"]`).evaluate((table) => {
      const surface = table.parentElement!;
      const style = getComputedStyle(surface);
      return [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomLeftRadius, style.borderBottomRightRadius];
    });
    expect(new Set(radius).size).toBe(1);
    expect(parseFloat(radius[0])).toBeGreaterThan(0);
  }

  await page.setViewportSize({ width: 720, height: 900 });
  for (const family of ["matched-betting", "multi-lay", "each-way", "sequential-lay", "early-payout", "multiples", "dutching"]) {
    await page.goto(`/fund-manager/calculators?family=${family}`);
    await page.evaluate(() => { document.documentElement.style.fontSize = "18px"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  }
  const themeBefore = await page.locator("html").getAttribute("data-theme");
  await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  await expect.poll(() => page.locator("html").getAttribute("data-theme")).not.toBe(themeBefore);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  if (process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR}/dutching-narrow-dark.png`, fullPage: true });
  }
});

test("slides bounded calculator pages and exposes an anchored ellipsis menu", async ({ page }) => {
  await mockSession(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/fund-manager/calculators");
  const rail = page.locator('[data-pd-id="calculators.family-selector"]');
  const previous = rail.getByRole("button", { name: "Show previous calculator families" });
  const next = rail.getByRole("button", { name: "Show next calculator families" });
  const more = rail.getByRole("button", { name: "Show all calculators" });
  const track = rail.locator(".calculator-family-track");

  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
  await expect(more.locator(".material-symbols-outlined")).toHaveText("more_horiz");
  await next.click();
  await page.waitForTimeout(80);
  const intermediate = await track.evaluate((element) => getComputedStyle(element).transform);
  expect(intermediate).not.toBe("none");
  await expect(rail.locator('.calculator-family-page[aria-hidden="false"]')).toContainText("Sequential Lay");
  await more.click();
  const menu = page.locator("#calculator-family-menu");
  await expect(menu).toBeVisible();
  expect(await menu.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  const moreBox = await more.boundingBox();
  const menuBox = await menu.boundingBox();
  expect(menuBox!.x + menuBox!.width).toBeCloseTo(moreBox!.x + moreBox!.width, 0);
  await menu.getByRole("menuitem", { name: "Blackjack Strategy" }).click();
  await expect(next).toBeDisabled();
  await expect(previous).toBeEnabled();
  await more.click();
  await expect(menu.getByRole("menuitem", { name: "Blackjack Strategy" })).toHaveAttribute("aria-current", "page");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await menu.getByRole("menuitem", { name: "Standard" }).click();
  expect(await track.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");

  for (const width of [720, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  }
});
