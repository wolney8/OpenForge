import { expect, test } from "@playwright/test";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";

test("approved Sportsbook rail, surface and page width survive the real adapter", async ({ page }, info) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("pd-required-storage-notice", "acknowledged");
    localStorage.setItem("openforge-theme", "dark");
  });
  await page.goto(authURL);
  await page.goto("/design-lab");
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await page.locator('tr[data-lab-row-id="LAB-SB-001"] button[aria-label^="Open "]').click();
  await page.getByRole("button", { name: "Edit Bet", exact: true }).click();
  const lab = page.locator('[data-pd-id="lab.entry.page"]');
  await expect(lab).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  const approved = await lab.evaluate(node => {
    const rail = node.querySelector<HTMLElement>('[data-pd-id="bet-workbench.stages"]')!;
    const context = node.querySelector<HTMLElement>('[data-pd-bet-workbench-context="true"]')!;
    const summary = node.querySelector<HTMLElement>('aside')!;
    return {
      railNumbers: [...rail.querySelectorAll('button > span:first-child')].map(item => item.textContent?.trim()),
      railHeight: rail.getBoundingClientRect().height,
      railY: rail.getBoundingClientRect().y,
      contextY: context.getBoundingClientRect().y,
      surface: getComputedStyle(summary).backgroundColor,
      width: node.getBoundingClientRect().width,
    };
  });
  await page.screenshot({ path: info.outputPath("approved-lab-sportsbook-reference.png"), fullPage: true });

  const range = await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } });
  expect(range.status()).toBe(200);
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets?record=SB-SEED-001");
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  const native = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await expect(native).toBeVisible();
  await native.locator('[data-pd-id="bet-workbench.stage.offer"]').click();
  await page.screenshot({ path: info.outputPath("native-sportsbook-after.png"), fullPage: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  const actual = await native.evaluate(node => {
    const rail = node.querySelector<HTMLElement>('[data-pd-id="bet-workbench.stages"]')!;
    const context = node.querySelector<HTMLElement>('[data-pd-bet-workbench-context="true"]')!;
    const summary = node.querySelector<HTMLElement>('aside')!;
    return {
      railNumbers: [...rail.querySelectorAll('button > span:first-child')].map(item => item.textContent?.trim()),
      railHeight: rail.getBoundingClientRect().height,
      railY: rail.getBoundingClientRect().y,
      contextY: context.getBoundingClientRect().y,
      surface: getComputedStyle(summary).backgroundColor,
      width: node.getBoundingClientRect().width,
    };
  });
  expect(actual.railNumbers).toEqual(approved.railNumbers);
  expect(Math.abs(actual.railHeight - approved.railHeight)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual.contextY - approved.contextY)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual.railY - approved.railY)).toBeLessThanOrEqual(1);
  expect(actual.surface).toBe(approved.surface);
  expect(Math.abs(actual.width - approved.width)).toBeLessThanOrEqual(1);
  await expect(native.getByRole("heading", { name: "Outcome Comparison" })).toBeVisible();
  await expect(native.getByRole("button", { name: "Close sportsbook editor" })).toHaveCount(0);
  await expect(page.locator('[data-pd-id="tracker.return-to-combined"]')).toHaveCount(0);
});

for (const { width, theme } of [
  { width: 2048, theme: "dark" },
  { width: 1440, theme: "light" },
  { width: 900, theme: "dark" },
  { width: 390, theme: "dark" },
  { width: 900, theme: "light" },
  { width: 390, theme: "light" },
] as const) {
  test(`Sportsbook Add shell and five-stage geometry match Lab at ${width}px ${theme}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: Math.max(width, 1440), height: 900 });
    await page.addInitScript((selectedTheme) => {
      localStorage.setItem("pd-required-storage-notice", "acknowledged");
      localStorage.setItem("openforge-theme", selectedTheme);
    }, theme);
    await page.goto(authURL);
    const snapshot = async (kind: "lab" | "native") => page.evaluate((scope) => {
      const selector = scope === "lab" ? '[data-pd-id="lab.entry.page"]' : '[data-pd-id="sportsbook.editor.workbench-surface"]';
      const root = document.querySelector<HTMLElement>(selector)!;
      const measure = (element: Element | null) => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          background: style.backgroundColor, color: style.color, padding: style.padding,
          gap: style.gap, font: style.fontSize, line: style.lineHeight,
          border: style.borderColor, radius: style.borderRadius };
      };
      return {
        sidebar: measure(document.querySelector(scope === "lab" ? '[class*="sidebar"]' : ".ux-v2-sidebar")),
        header: measure(document.querySelector(scope === "lab" ? '[class*="header"]' : ".ux-v2-top-bar")),
        crumb: measure(document.querySelector(scope === "lab" ? '[class*="breadcrumb"]' : ".ux-v2-crumb-row")),
        head: measure(document.querySelector(scope === "lab" ? '[class*="pageHead"]' : '[data-pd-id="sportsbook.workbench.page-head"]')),
        context: measure(root.querySelector('[data-pd-bet-workbench-context="true"]')),
        rail: measure(root.querySelector('[data-pd-id="bet-workbench.stages"]')),
        field: measure(root.querySelector(scope === "lab" ? '[class*="entryFields"]' : 'form[data-pd-bet-workbench-fields]')),
        aside: measure(root.querySelector("aside")),
        footer: measure(root.querySelector(scope === "lab" ? '[class*="entryFooter"]' : '[data-pd-id="sportsbook.editor.actions"]')),
        stageNames: [...root.querySelectorAll('[data-pd-id^="bet-workbench.stage."]')].map(node => node.textContent?.trim()),
        stageNumbers: [...root.querySelectorAll('[data-pd-id="bet-workbench.stages"] button > span:first-child')].map(node => node.textContent?.trim()),
        root: measure(root),
      };
    }, kind);
    await page.goto("/design-lab");
    await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
    await page.locator('[data-pd-id="lab.profile"]').click();
    await page.getByRole("option", { name: "Profile A", exact: true }).click();
    await page.locator('[data-pd-id="lab.add.page"]').click();
    await page.setViewportSize({ width, height: 900 });
    const approved = await snapshot("lab");
    await page.screenshot({ path: info.outputPath(`lab-add-${width}-${theme}.png`), fullPage: true });

    await page.setViewportSize({ width: Math.max(width, 1440), height: 900 });
    await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    await page.locator('[data-pd-id="sportsbook.toolbar.add-row"]').click();
    await expect(page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]')).toBeVisible();
    await page.locator('[data-pd-id="bet-workbench.stage.offer"]').click();
    await expect(page.locator('[data-pd-id="v2.active-task.loading"]')).toHaveCount(0, { timeout: 15_000 });
    const banner = page.getByRole("button", { name: "Hide Tracked Tasks Banner" });
    if (await banner.isVisible()) await banner.click();
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
    const actual = await snapshot("native");
    await page.screenshot({ path: info.outputPath(`native-add-${width}-${theme}.png`), fullPage: true });
    expect(actual.stageNames).toEqual(approved.stageNames);
    expect(actual.stageNumbers).toEqual(["1", "2", "3", "4", "5"]);
    const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
    for (const key of ["sidebar", "header", "crumb", "head", "context", "rail", "field", "aside", "footer", "root"] as const) {
      const lab = approved[key]!;
      const native = actual[key]!;
      close(native.x, lab.x);
      close(native.width, lab.width);
      // At 390px the Lab-only simulation badge and Exit Lab command add
      // vertical space that cannot appear in the real application. Anchor
      // the production workbench to its own context and assert every stage
      // and card position relative to that approved composition.
      if (width !== 390 && ["head", "context", "rail", "field", "aside"].includes(key)) close(native.y, lab.y);
      // Lab's simulation badge adds a second breadcrumb line at 390px.
      if (["sidebar", "header", "crumb"].includes(key) && !(key === "crumb" && width === 390)) close(native.height, lab.height);
      if (key === "rail" || key === "aside" || key === "field" || key === "footer") {
        // Outcome copy comes from different calculation authorities; its card
        // can gain a text line without changing approved surface geometry.
        if (key === "rail") close(native.height, lab.height);
        expect(native.background).toBe(lab.background);
        expect(native.border).toBe(lab.border);
        expect(native.radius).toBe(lab.radius);
        expect(native.padding).toBe(lab.padding);
      }
      if (key === "head" || key === "context") {
        expect(native.font).toBe(lab.font);
        expect(native.line).toBe(lab.line);
      }
      if (key === "sidebar" || key === "header" || key === "crumb") {
        expect(native.padding).toBe(lab.padding);
        expect(native.gap).toBe(lab.gap);
      }
    }
    if (width === 390) {
      close(actual.rail!.y - actual.context!.y, approved.rail!.y - approved.context!.y);
      close(actual.field!.y - actual.rail!.y, approved.field!.y - approved.rail!.y);
      // The Lab-only badge and Exit Lab row change the absolute mobile Y
      // position. The approved Offer disclosure adds production content, so
      // compare the actual card-to-aside gap rather than its page offset.
      close(actual.aside!.y - (actual.field!.y + actual.field!.height), approved.aside!.y - (approved.field!.y + approved.field!.height));
    }
    await expect(page.getByRole("button", { name: "Close sportsbook editor" })).toHaveCount(0);
    await expect(page.locator('[data-pd-id="tracker.return-to-combined"]')).toHaveCount(0);
  });
}
