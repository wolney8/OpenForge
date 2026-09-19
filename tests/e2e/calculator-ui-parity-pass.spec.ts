import { expect, test } from "@playwright/test";

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

async function mockSession(page: import("@playwright/test").Page) {
  const session = {
    authenticated: true,
    email: "calculator-parity@example.invalid",
    name: "Synthetic Fund Manager",
    role: "fund_manager",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    linked_profile_ids: [],
    session_policy: { auto_logout_enabled: false, timeout_minutes: 15, preference_configured: true, effective_expires_at: Math.floor(Date.now() / 1000) + 3600 },
  };
  const sessionToken = process.env.OPENFORGE_E2E_SESSION_TOKEN;
  if (sessionToken) {
    await page.context().addCookies([{ name: "pd_session", value: sessionToken, url: process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010" }]);
  }
  const isolatedApiBaseUrl = process.env.OPENFORGE_E2E_API_BASE_URL?.replace(/\/$/, "");
  if (isolatedApiBaseUrl) {
    await page.route("**/api/**", async (route) => {
      if (new URL(route.request().url()).pathname === "/api/auth/session") {
        await route.fulfill({ json: session });
        return;
      }
      const targetUrl = route.request().url().replace(/https?:\/\/[^/]+\/api/, isolatedApiBaseUrl);
      const response = await route.fetch({ url: targetUrl });
      await route.fulfill({ response });
    });
  }
  if (!isolatedApiBaseUrl) {
    await page.context().route("**/auth/session*", (route) => route.fulfill({ json: session }));
  }
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

async function multiLayVisualContract(page: import("@playwright/test").Page) {
  return page.locator('[data-pd-id="calculators.multi-lay.presentation"]').evaluate((root) => {
    const back = root.querySelector<HTMLElement>('[data-pd-id="calculators.multi-lay.back"]')!;
    const lay = root.querySelector<HTMLElement>('[data-pd-id="calculators.multi-lay.lay-outcomes"]')!;
    const heading = lay.querySelector<HTMLElement>('.calculator-section-heading')!;
    const title = heading.querySelector<HTMLElement>('h3')!.getBoundingClientRect();
    const help = heading.querySelector<HTMLElement>('.context-help-action')!.getBoundingClientRect();
    const backBox = back.getBoundingClientRect();
    const layBox = lay.getBoundingClientRect();
    const backStyle = getComputedStyle(back);
    const layStyle = getComputedStyle(lay);
    return {
      edges: {
        back: [Math.round(backBox.left), Math.round(backBox.right)],
        lay: [Math.round(layBox.left), Math.round(layBox.right)],
      },
      heading: {
        display: getComputedStyle(heading).display,
        wrap: getComputedStyle(heading).flexWrap,
        titleCentre: Math.round(title.top + title.height / 2),
        helpCentre: Math.round(help.top + help.height / 2),
      },
      accents: {
        backBorder: backStyle.borderColor,
        backWidth: backStyle.borderLeftWidth,
        layBorder: layStyle.borderColor,
        layWidth: layStyle.borderLeftWidth,
      },
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

test("keeps calculator help inline and Multi-Lay sections on one semantic content grid", async ({ page }) => {
  await mockSession(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const cases = [
    { name: "desktop-dark", width: 1440, rootSize: "16px", theme: "dark" },
    { name: "half-light", width: 720, rootSize: "16px", theme: "light" },
    { name: "narrow-dark", width: 390, rootSize: "16px", theme: "dark" },
    { name: "text-200-light", width: 1440, rootSize: "32px", theme: "light" },
  ];

  for (const item of cases) {
    await page.setViewportSize({ width: item.width, height: 1000 });
    await page.goto("/fund-manager/calculators?family=multi-lay");
    if (await page.locator("html").getAttribute("data-theme") !== item.theme) {
      await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", item.theme);
    }
    await page.evaluate((rootSize) => { document.documentElement.style.fontSize = rootSize; }, item.rootSize);
    const contract = await multiLayVisualContract(page);
    expect(contract.edges.back, `${item.name} Back/Lay edges`).toEqual(contract.edges.lay);
    expect(contract.heading.display).toBe("flex");
    expect(contract.heading.wrap).toBe("nowrap");
    expect(contract.heading.titleCentre, `${item.name} heading/help alignment`).toBeCloseTo(contract.heading.helpCentre, 0);
    expect(contract.accents.backWidth).toBe("1px");
    expect(contract.accents.layWidth).toBe("1px");
    expect(contract.accents.backBorder).not.toBe(contract.accents.layBorder);
    expect(contract.overflow, `${item.name} horizontal overflow`).toBeLessThanOrEqual(1);
    if (process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR) {
      await page.screenshot({ path: `${process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR}/multi-lay-contract-${item.name}.png`, fullPage: true });
    }
  }
});

test("aligns calculator segments, hierarchy, schemes and selection surfaces", async ({ page }) => {
  await mockSession(page);
  // Geometry evidence must capture settled figures rather than an odometer transition frame.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/fund-manager/calculators");

  let geometry = await pairedGeometry(page, "calculators.matched-betting.paired-segments");
  expect(geometry[0].eyebrow).toBeCloseTo(geometry[1].eyebrow, 0);
  expect(geometry[0].fields[0]).toEqual(geometry[1].fields[0]);
  expect(geometry[0].fields[1].input - geometry[0].fields[0].input).toBeLessThan(96);
  expect((await pairedPanelFit(page, "calculators.matched-betting.paired-segments")).every((space) => space < 52)).toBe(true);
  if (process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR}/standard-desktop.png`, fullPage: true });
  }
  await page.getByLabel("Back stake").fill("10");
  await page.getByLabel("Back odds").fill("4");
  await page.getByLabel("Lay odds").fill("4.2");
  await page.getByLabel("Exchange commission (%)", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Advanced" }).click();
  const topControlRows = await page.locator('.calculator-band-primary .ledger-calculator-mode-bar').first().evaluate((root) => ({
    offerTop: root.querySelector<HTMLElement>('#calculator-calculator-offer')!.getBoundingClientRect().top,
    betTypeTop: root.querySelector<HTMLElement>('#calculator-bet-type')!.closest<HTMLElement>('.field-control')!.getBoundingClientRect().top,
    modeTop: root.querySelector<HTMLElement>('[data-pd-id="calculators.matched-betting.mode"]')!.closest<HTMLElement>('.field-control')!.getBoundingClientRect().top,
    labelsFit: [...root.querySelectorAll<HTMLElement>(":scope > .field-control > span")].every((label) => label.scrollWidth <= label.clientWidth + 1),
  }));
  expect(topControlRows.modeTop).toBeGreaterThan(topControlRows.offerTop);
  expect(topControlRows.betTypeTop).toBeCloseTo(topControlRows.modeTop, 0);
  expect(topControlRows.labelsFit).toBe(true);
  await expect(page.getByLabel("Offer")).toHaveValue("qualifying");
  await expect(page.getByLabel("Calculator", { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-pd-id="calculators.matched-betting.underlay"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="calculators.matched-betting.overlay"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="calculators.matched-betting.custom"]')).toBeVisible();
  await expect(page.getByRole("slider", { name: "Custom lay stake slider" })).toBeVisible();
  await expect(page.locator('[data-pd-id="calculators.matched-betting.custom"] h3')).toHaveText("Custom");
  await expect(page.getByText("Underlay favours the bookmaker-win side.", { exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "About Underlay" })).toBeVisible();
  await page.getByRole("button", { name: "About Underlay" }).click();
  await expect(page.getByRole("tooltip")).toContainText("Underlay favours the bookmaker-win side.");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "About Underlay" })).toHaveAttribute("aria-expanded", "false");
  for (const id of ["underlay", "standard", "overlay", "custom"]) {
    await expect(page.locator(`[data-pd-id="calculators.matched-betting.${id}"] h3`)).toHaveText(`${id[0].toUpperCase()}${id.slice(1)}`);
  }
  await expect(page.locator('[data-pd-id="calculators.matched-betting.underlay"] [data-label="Total"]')).toHaveCount(0);
  await expect(page.locator('[data-pd-id^="calculators.matched-betting."] h3', { hasText: /reference/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /(?:Apply|Use) (?:Underlay|Standard|Overlay) plan/i })).toHaveCount(0);
  await expect(page.locator('[data-pd-id="calculators.matched-betting.custom-input-copy"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="calculators.matched-betting.custom-group"] [data-pd-id="calculator.custom-slider"]')).toBeVisible();
  await expect(page.getByLabel("Actual selected strategy")).toHaveCount(0);
  await expect(page.getByText("Decimal rate, for example 0.02", { exact: true })).toHaveCount(0);
  const advancedOrder = await page.locator('[data-pd-id="calculators.matched-betting.results"]').evaluate((root) => {
    const cards = ["underlay", "standard", "overlay"].map((id) => root.querySelector(`[data-pd-id="calculators.matched-betting.${id}"]`)!);
    const custom = root.querySelector('[data-pd-id="calculators.matched-betting.custom"]')!;
    const slider = root.querySelector('[data-pd-id="calculator.custom-slider"]')!;
    const outcomes = root.querySelector('[data-pd-id="calculators.outcomes"]')!;
    return {
      comparisonOrder: cards.every((card, index) => index === cards.length - 1 || Boolean(card.compareDocumentPosition(cards[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING)),
      comparisonBeforeCustom: Boolean(cards.at(-1)!.compareDocumentPosition(custom) & Node.DOCUMENT_POSITION_FOLLOWING),
      customBeforeSlider: Boolean(custom.compareDocumentPosition(slider) & Node.DOCUMENT_POSITION_FOLLOWING),
      sliderBeforeOutcomes: Boolean(slider.compareDocumentPosition(outcomes) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });
  expect(advancedOrder).toEqual({ comparisonOrder: true, comparisonBeforeCustom: true, customBeforeSlider: true, sliderBeforeOutcomes: true });
  const alignedReferences = await page.locator('[data-pd-id="calculators.matched-betting.results"]').evaluate((root) => {
    const ids = ["calculators.matched-betting.custom-group", "calculators.outcomes"];
    const outer = ids.map((id) => root.querySelector<HTMLElement>(`[data-pd-id="${id}"]`)!.getBoundingClientRect());
    const cards = [...root.querySelectorAll<HTMLElement>('.calculator-reference-card-grid > .calculator-reference-section')].map((item) => item.getBoundingClientRect());
    const rowGeometry = [...root.querySelectorAll<HTMLElement>('.calculator-reference-section')].map((section) => [...section.querySelectorAll<HTMLElement>('.calculator-reference-card-row')].map((row) => {
      const label = row.querySelector<HTMLElement>('dt')!.getBoundingClientRect();
      const value = row.querySelector<HTMLElement>('dd')!.getBoundingClientRect();
      return { labelRight: Math.round(label.right), valueLeft: Math.round(value.left) };
    }));
    const deadSpace = cards.map((card, index) => {
      const content = root.querySelectorAll<HTMLElement>('.calculator-reference-card-grid > .calculator-reference-section')[index].lastElementChild!.getBoundingClientRect();
      return Math.round(card.bottom - content.bottom);
    });
    return { outer: outer.map((box) => [Math.round(box.x), Math.round(box.width)]), cardWidths: cards.map((box) => Math.round(box.width)), cardHeights: cards.map((box) => Math.round(box.height)), rowGeometry, deadSpace };
  });
  expect(alignedReferences.outer[0]).toEqual(alignedReferences.outer[1]);
  expect(new Set(alignedReferences.cardWidths).size).toBe(1);
  expect(new Set(alignedReferences.cardHeights).size).toBe(1);
  for (const rows of alignedReferences.rowGeometry) {
    expect(new Set(rows.map((row) => row.labelRight)).size).toBe(1);
    expect(new Set(rows.map((row) => row.valueLeft)).size).toBe(1);
  }
  expect(alignedReferences.deadSpace.every((space) => space <= 1)).toBe(true);
  if (process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR}/standard-advanced-desktop.png`, fullPage: true });
  }
  geometry = await pairedGeometry(page, "calculators.matched-betting.paired-segments");
  expect(geometry[0].fields[0]).toEqual(geometry[1].fields[0]);
  await page.getByLabel("Back stake").fill("invalid");
  await page.getByLabel("Back odds").focus();
  geometry = await pairedGeometry(page, "calculators.matched-betting.paired-segments");
  expect(geometry[0].fields[0]).toEqual(geometry[1].fields[0]);
  await page.locator('[data-pd-id="calculators.matched-betting.calculator-offer"]').selectOption("bonus_lock_in");
  await expect(page.getByLabel("Bonus Applied If Bet")).toHaveValue("Lay Wins");
  await expect(page.getByLabel("Bonus Applied If Bet").locator('option[value="Back Wins"]')).toHaveCount(0);

  await page.goto("/fund-manager/calculators?family=multi-lay");
  const multiLay = page.locator('[data-pd-id="calculators.multi-lay.presentation"]');
  await expect(multiLay.locator('[data-pd-id="calculators.multi-lay.back"] .eyebrow')).toHaveText("Back bet");
  await expect(multiLay.locator('[data-pd-id="calculators.multi-lay.back"]')).toContainText("Back stake");
  await expect(multiLay.locator('[data-pd-id="calculators.multi-lay.back"]')).toContainText("Back odds");
  await expect(multiLay.locator('[data-pd-id="calculators.multi-lay.back"]')).not.toContainText("Bet Type");
  await expect(multiLay.locator('[data-pd-id="calculators.multi-lay.global-controls"]')).toContainText("Bet Type");
  await multiLay.getByLabel("Back stake", { exact: true }).fill("10");
  await multiLay.getByLabel("Back odds", { exact: true }).fill("4");
  await multiLay.getByLabel("Outcome 1 lay odds", { exact: true }).fill("4");
  await multiLay.getByLabel("Outcome 2 lay odds", { exact: true }).fill("5");
  await multiLay.locator('[data-pd-id="calculators.multi-lay.advanced"] summary').click();
  await expect(multiLay.locator('[data-pd-id="calculators.multi-lay.advanced"]')).toBeVisible();
  await expect(multiLay.locator(".calculator-reference-rows")).toHaveCount(0);
  await expect(multiLay.getByRole("button", { name: "Underlay", exact: true })).toBeVisible();
  await expect(multiLay.getByRole("button", { name: "Standard", exact: true })).toBeVisible();
  await expect(multiLay.getByRole("button", { name: "Overlay", exact: true })).toBeVisible();
  await expect(multiLay.locator('.calculator-reference-section [data-label="Total"]')).toHaveCount(0);
  await multiLay.getByRole("button", { name: "Custom", exact: true }).click();
  await expect(multiLay.locator('[data-pd-id="calculators.multi-lay.custom"]')).toBeVisible();
  if (process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.CALCULATOR_UI_PARITY_SCREENSHOT_DIR}/multi-lay-advanced-desktop.png`, fullPage: true });
  }
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
    await page.getByLabel("Back stake").fill("10");
    await page.getByLabel("Back odds").fill("4");
    await page.getByLabel("Lay odds").fill("4.2");
    await page.getByLabel("Exchange commission (%)", { exact: true }).fill("2");
    await page.getByRole("button", { name: "Advanced" }).click();
    await page.locator("#calculator-custom-reference-lay").focus();
    await expect(page.locator("#calculator-custom-reference-lay")).toBeFocused();
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

  await page.goto("/calculator?family=matched-betting&betType=free_bet&freeBetMode=SNR&backStake=10.00&backOdds=4.00&layOdds=4.20&exchangeCommission=0.02&commissionUnits=ratio&presentationMode=Advanced&strategy=Standard&customLayDraft=9.00");
  await expect(page.getByLabel("Exchange commission (%)", { exact: true })).toHaveValue("2");
  await expect(page.getByLabel("Actual selected strategy")).toHaveCount(0);
  await expect(page.getByText("Decimal rate, for example 0.02", { exact: true })).toHaveCount(0);
  const popoutOrder = await page.locator('[data-pd-id="calculators.matched-betting.results"]').evaluate((root) => [
    root.querySelector('[data-pd-id="calculators.matched-betting.custom"]'),
    root.querySelector('[data-pd-id="calculator.custom-slider"]'),
    root.querySelector('[data-pd-id="calculators.outcomes"]'),
  ].map((element) => [...root.querySelectorAll("*")].indexOf(element!)));
  expect(popoutOrder[0]).toBeLessThan(popoutOrder[1]);
  expect(popoutOrder[1]).toBeLessThan(popoutOrder[2]);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/fund-manager/calculators");
  await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
  const enlarged = await page.locator('[data-pd-id="calculators.workspace"]').evaluate((workspace) => ({ client: workspace.clientWidth, scroll: workspace.scrollWidth, right: workspace.getBoundingClientRect().right, viewport: innerWidth }));
  expect(enlarged.scroll).toBeLessThanOrEqual(enlarged.client + 1);
  expect(enlarged.right).toBeLessThanOrEqual(enlarged.viewport + 1);
});
