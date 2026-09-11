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

async function pairedPanelFit(page: import("@playwright/test").Page, id: string) {
  return page.locator(`[data-pd-id="${id}"]`).evaluate((root) => [...root.querySelectorAll<HTMLElement>(".calculator-paired-segment")].map((segment) => {
    const content = [...segment.querySelectorAll<HTMLElement>("input, select, .field-support-text, .field-validation-text")];
    const bottom = Math.max(...content.map((item) => item.getBoundingClientRect().bottom));
    return segment.getBoundingClientRect().bottom - bottom;
  }));
}

test("aligns calculator segments, hierarchy, schemes and selection surfaces", async ({ page }) => {
  await mockSession(page);
  await page.goto("/fund-manager/calculators");

  let geometry = await pairedGeometry(page, "calculators.matched-betting.paired-segments");
  expect(geometry[0].eyebrow).toBeCloseTo(geometry[1].eyebrow, 0);
  expect(geometry[0].fields[0]).toEqual(geometry[1].fields[0]);
  expect(geometry[0].fields[1].input - geometry[0].fields[0].input).toBeLessThan(96);
  expect((await pairedPanelFit(page, "calculators.matched-betting.paired-segments")).every((space) => space < 52)).toBe(true);
  if (process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR}/standard-desktop.png`, fullPage: true });
  }
  await page.getByRole("button", { name: "Advanced" }).click();
  await page.getByLabel("Actual selected strategy").selectOption("Partial Lay");
  geometry = await pairedGeometry(page, "calculators.matched-betting.paired-segments");
  expect(geometry[0].fields[1]).toEqual(geometry[1].fields[1]);
  await page.getByLabel("Back stake").fill("invalid");
  await page.getByLabel("Back odds").focus();
  geometry = await pairedGeometry(page, "calculators.matched-betting.paired-segments");
  expect(geometry[0].fields[1]).toEqual(geometry[1].fields[1]);
  await page.locator('[data-pd-id="calculators.matched-betting.calculator-offer"]').selectOption("bonus_lock_in");
  await expect(page.getByLabel("Bonus Applied If Bet").locator('option[value="Back Wins"]')).toHaveCount(1);

  await page.goto("/fund-manager/calculators?family=multi-lay");
  await expect(page.locator('[data-pd-id="calculators.multi-lay.presentation"] .calculator-segment-back .eyebrow')).toHaveText("Back bet");
  await page.goto("/fund-manager/calculators?family=sequential-lay");
  await expect(page.locator('[data-pd-id="calculators.sequential-lay.presentation"] .calculator-segment-back .eyebrow')).toHaveText("Back bet");

  await page.goto("/fund-manager/calculators?family=early-payout");
  geometry = await pairedGeometry(page, "calculators.early-payout.paired-segments");
  expect(geometry[0].eyebrow).toBeCloseTo(geometry[1].eyebrow, 0);
  expect(geometry[0].fields[0]).toEqual(geometry[1].fields[0]);
  expect(geometry[0].fields[1]).toEqual(geometry[1].fields[1]);
  expect((await pairedPanelFit(page, "calculators.early-payout.paired-segments")).every((space) => space < 52)).toBe(true);
  if (process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR}/early-payout-desktop.png`, fullPage: true });
  }

  await page.goto("/fund-manager/calculators?family=each-way");
  await page.getByLabel("E/W Stake (each way)").fill("10");
  await page.getByRole("button", { name: "Use Extra Place colour theme" }).click();
  await page.getByRole("button", { name: "Use Back and Lay colour theme" }).click();
  const eachWay = page.locator('[data-pd-id="calculators.each-way.presentation"]');
  await expect(eachWay).toHaveClass(/extra-place-theme-back-lay/);
  await expect(page.getByLabel("E/W Stake (each way)")).toHaveValue("10");
  await expect(page.getByRole("button", { name: "Extra Place", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(eachWay).toHaveClass(/extra-place-theme-back-lay/);
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
  const previous = rail.getByRole("button", { name: "Select previous calculator" });
  const next = rail.getByRole("button", { name: "Select next calculator" });
  const more = rail.getByRole("button", { name: "Show all calculators" });
  const track = rail.locator(".calculator-family-track");

  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
  await expect(more.locator(".material-symbols-outlined")).toHaveText("more_horiz");
  const viewport = rail.locator(".calculator-family-viewport");
  const standard = rail.getByRole("button", { name: "Standard", exact: true });
  await standard.focus();
  const containment = await Promise.all([viewport.boundingBox(), standard.boundingBox()]);
  expect(containment[1]!.y - containment[0]!.y).toBeGreaterThanOrEqual(6);
  expect(containment[0]!.y + containment[0]!.height - (containment[1]!.y + containment[1]!.height)).toBeGreaterThanOrEqual(6);
  expect(containment[1]!.x - containment[0]!.x).toBeGreaterThanOrEqual(6);
  expect(containment[0]!.x + containment[0]!.width - (containment[1]!.x + containment[1]!.width)).toBeGreaterThanOrEqual(6);
  const stableHeight = containment[0]!.height;
  if (process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR}/carousel-focused-desktop.png`, fullPage: true });
  }
  await previous.evaluate((button) => button.click());
  await expect(page.getByRole("heading", { name: "Standard", exact: true })).toBeVisible();
  await next.click();
  await expect(page.getByRole("heading", { name: "Multi-Lay" })).toBeVisible();
  await expect(previous).toBeEnabled();
  expect((await viewport.boundingBox())!.height).toBe(stableHeight);
  await next.click();
  await expect(page.getByRole("heading", { name: "Extra Place / Each Way" })).toBeVisible();
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
  await next.evaluate((button) => button.click());
  await expect(page.getByRole("heading", { name: "Blackjack Strategy" })).toBeVisible();
  await expect(previous).toBeEnabled();
  await previous.click();
  await expect(page.getByRole("heading", { name: "Odds / Probability" })).toBeVisible();
  await next.click();
  await expect(page.getByRole("heading", { name: "Blackjack Strategy" })).toBeVisible();
  await expect(next).toBeDisabled();
  await more.click();
  await expect(menu.getByRole("menuitem", { name: "Blackjack Strategy" })).toHaveAttribute("aria-current", "page");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await menu.getByRole("menuitem", { name: "Standard" }).click();
  expect(await track.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  await expect(previous).toBeDisabled();

  for (const width of [720, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `Standard overflow at ${width}px`).toBe(true);
  }
});

test("keeps the exact Standard controls contained across themes and calculator widths", async ({ page }) => {
  await mockSession(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1280, 720, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/fund-manager/calculators");
    await page.evaluate(() => { document.documentElement.style.fontSize = "18px"; });
    await expect(page.getByLabel("Bet Type")).toHaveValue("Normal");
    await expect(page.getByRole("button", { name: "Simple" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Advanced" }).click();
    await page.getByLabel("Actual selected strategy").focus();
    await expect(page.getByLabel("Actual selected strategy")).toBeFocused();
    const overflow = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll<HTMLElement>("body *")]
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return box.width > 0 && (box.right > document.documentElement.clientWidth + 1 || box.left < -1);
        })
        .slice(0, 12)
        .map((element) => `${element.tagName}.${element.className}:${Math.round(element.getBoundingClientRect().right)}`),
    }));
    expect(overflow.scroll, `Standard overflow at ${width}px: ${overflow.offenders.join(", ")}`).toBeLessThanOrEqual(overflow.client + 1);
    const workspace = await page.locator('[data-pd-id="calculators.workspace"]').boundingBox();
    for (const control of await page.locator('[data-pd-id="calculators.workspace"] .calculator-shell input, [data-pd-id="calculators.workspace"] .calculator-shell select, [data-pd-id="calculators.workspace"] .calculator-shell button').all()) {
      const box = await control.boundingBox();
      if (!box) continue;
      expect(box.x).toBeGreaterThanOrEqual((workspace?.x ?? 0) - 1);
      expect(box.x + box.width).toBeLessThanOrEqual((workspace?.x ?? 0) + (workspace?.width ?? width) + 1);
    }
    if (process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR) {
      await page.screenshot({ path: `${process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR}/standard-advanced-${width}.png`, fullPage: true });
    }
  }
  const themeBefore = await page.locator("html").getAttribute("data-theme");
  await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  await expect.poll(() => page.locator("html").getAttribute("data-theme")).not.toBe(themeBefore);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
