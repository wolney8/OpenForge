import { expect, test, type Locator, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const ownedLedger = "/profiles/profile-demo-001/tracker/sportsbook-bets";

async function outerEdgePixels(page: Page, inspector: Locator) {
  const image = await inspector.screenshot();
  return page.evaluate(async (encoded) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${encoded}`)).blob());
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const colorAt = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data].slice(0, 3);
    return [16, Math.floor(bitmap.height / 2), bitmap.height - 16].map(y => ({ edge: colorAt(1, y), inner: colorAt(12, y) }));
  }, image.toString("base64"));
}

async function selectedBackgroundMatchesToken(row: Locator) {
  return row.evaluate(node => {
    const probe = document.createElement("div");
    const urgent = node.className.includes("urgent");
    probe.style.background = urgent
      ? "color-mix(in srgb, var(--task-urgent-bg) 91%, var(--primary) 9%)"
      : "color-mix(in srgb, var(--surface-strong) 88%, var(--primary) 12%)";
    node.append(probe);
    const expected = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return { actual: getComputedStyle(node).backgroundColor, expected };
  });
}

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
});

for (const theme of ["light", "dark"] as const) {
  test(`selected Today row and inspector share one accent in ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tasks");
    await page.evaluate(value => {
      localStorage.setItem("openforge-theme", value);
      document.documentElement.dataset.theme = value;
    }, theme);
    const rows = page.locator('[data-pd-id^="tasks.v2.row."]');
    await expect(rows.first()).toBeVisible();
    await rows.first().click();
    await expect(rows.first()).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toBeVisible();
    const selected = await page.evaluate(() => {
      const row = document.querySelector<HTMLElement>('[data-pd-id^="tasks.v2.row."][aria-expanded="true"]')!;
      const inspector = document.querySelector<HTMLElement>('[data-pd-id="tasks.v2.inspector"]')!;
      const arrow = row.lastElementChild as HTMLElement;
      return { rowAccent: getComputedStyle(row).borderLeftWidth, inspectorBorder: getComputedStyle(inspector).borderLeftWidth,
        arrowColor: getComputedStyle(arrow).color, background: getComputedStyle(row).backgroundColor };
    });
    expect(selected.rowAccent).toBe("3px");
    expect(selected.inspectorBorder).toBe("3px");
    expect(selected.arrowColor).not.toBe("rgb(160, 165, 175)");
    expect(selected.background).not.toBe("rgba(0, 0, 0, 0)");
    if (await rows.count() > 1) {
      const quietArrow = await rows.nth(1).evaluate(node => getComputedStyle(node.lastElementChild!).color);
      expect(selected.arrowColor).not.toBe(quietArrow);
    }
    await page.screenshot({ path: info.outputPath(`today-task-selected-${theme}.png`) });

    if (await rows.count() > 1) {
      await rows.nth(1).click();
      await expect(rows.first()).toHaveAttribute("aria-expanded", "false");
      await expect(rows.nth(1)).toHaveAttribute("aria-expanded", "true");
    }
    await page.getByRole("button", { name: "Close Task Details" }).click();
    await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toHaveCount(0);
    await expect(page.locator('[data-pd-id^="tasks.v2.row."][aria-expanded="true"]')).toHaveCount(0);
    await rows.first().focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    expect(await rows.first().evaluate(node => getComputedStyle(node).outlineStyle)).toBe("solid");

    await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
    const opportunity = page.locator('[data-pd-id^="opportunities.item."]').first();
    await opportunity.click();
    await expect(opportunity).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toBeVisible();
    await page.screenshot({ path: info.outputPath(`today-opportunity-selected-${theme}.png`) });
    await page.getByRole("button", { name: "Close Opportunity Details" }).click();
    await expect(opportunity).toHaveAttribute("aria-expanded", "false");
  });
}

test("Lab pressed selection and real expanded selection use the same shared row treatment", async ({ page }) => {
  await page.goto("/design-lab");
  const navigation = page.getByRole("button", { name: "Open navigation" });
  if (await navigation.isVisible()) await navigation.click();
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  const row = page.locator('[data-pd-id^="lab.task."]').first();
  await row.click();
  await expect(row).toHaveAttribute("aria-pressed", "true");
  expect(await row.evaluate(node => getComputedStyle(node).borderLeftWidth)).toBe("3px");
  await expect(page.locator('[data-pd-id="lab.today.detail"]')).toBeVisible();
  await page.getByRole("button", { name: "Board", exact: true }).click();
  const boardRow = page.locator('[data-pd-id^="lab.task."]').first();
  await boardRow.click();
  await expect(boardRow).toHaveAttribute("aria-pressed", "true");
  const board = page.locator('[data-pd-id="lab.today.board"]');
  const bounds = await board.boundingBox();
  expect(bounds).toBeTruthy();
  await board.click({ position: { x: 5, y: bounds!.height - 5 } });
  await expect(boardRow).toHaveAttribute("aria-pressed", "true");
  const colors = await selectedBackgroundMatchesToken(boardRow);
  expect(colors.actual).toBe(colors.expected);
  await page.keyboard.press("Escape");
  await expect(boardRow).toHaveAttribute("aria-pressed", "false");
});

for (const theme of ["light", "dark"] as const) {
  test(`selected Today row survives click-away and outer drawer accent is continuous in ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tasks");
    await page.evaluate(value => { localStorage.setItem("openforge-theme", value); document.documentElement.dataset.theme = value; }, theme);
    const rows = page.locator('[data-pd-id^="tasks.v2.row."]');
    await expect(rows.nth(1)).toBeVisible();
    await rows.first().click();
    const inspector = page.locator('[data-pd-id="tasks.v2.inspector"]');
    await expect(inspector).toBeVisible();
    await page.locator('[data-pd-id="tasks.page-header"]').click({ position: { x: 8, y: 8 } });
    await expect(rows.first()).toHaveAttribute("aria-expanded", "true");
    await expect(inspector).toBeVisible();
    await page.locator('[data-pd-id="tasks.v2.filter-toggle"]').focus();
    await expect(rows.first()).toHaveAttribute("aria-expanded", "true");
    const colors = await selectedBackgroundMatchesToken(rows.first());
    expect(colors.actual).toBe(colors.expected);
    expect(await inspector.evaluate(node => getComputedStyle(node).borderLeftWidth)).toBe("3px");
    const edge = await outerEdgePixels(page, inspector);
    for (const sample of edge) {
      expect(sample.edge).toEqual(edge[1].edge);
      expect(sample.edge).not.toEqual(sample.inner);
    }
    await inspector.evaluate(node => { node.scrollTop = node.scrollHeight; });
    const scrolledEdge = await outerEdgePixels(page, inspector);
    expect(scrolledEdge.map(sample => sample.edge)).toEqual(edge.map(sample => sample.edge));
    await page.screenshot({ path: info.outputPath(`persistent-selection-${theme}.png`) });
    await rows.nth(1).click();
    await expect(rows.first()).toHaveAttribute("aria-expanded", "false");
    await expect(rows.nth(1)).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("button", { name: "Close Task Details" }).click();
    await expect(rows.nth(1)).toHaveAttribute("aria-expanded", "false");
    await rows.first().click();
    await page.keyboard.press("Escape");
    await expect(inspector).toHaveCount(0);
    await expect(rows.first()).toHaveAttribute("aria-expanded", "false");
  });
}

test("tracked Today rows reuse selection without changing tracking membership", async ({ page }) => {
  await page.goto("/tasks");
  const source = page.locator('[data-pd-id^="tasks.v2.row."]').first();
  const identity = await source.getAttribute("data-pd-id");
  const track = page.locator(`[data-pd-id="${identity?.replace("tasks.v2.row.", "tasks.v2.track.")}"]`);
  await expect(track).toBeVisible();
  if (await track.getAttribute("aria-pressed") === "false") await track.click();
  await page.getByRole("button", { name: /Tracked Tasks \(/ }).click();
  const row = page.locator(`[data-pd-id="${identity}"]`);
  await expect(row).toBeVisible();
  await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "true");
  await page.locator('[data-pd-id="tasks.page-header"]').click({ position: { x: 8, y: 8 } });
  const colors = await selectedBackgroundMatchesToken(row);
  expect(colors.actual).toBe(colors.expected);
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toBeVisible();
  expect(await row.evaluate(node => getComputedStyle(node).borderLeftWidth)).toBe("3px");
  await page.getByRole("button", { name: "Close Task Details" }).click();
  await expect(row).toHaveAttribute("aria-expanded", "false");
  await page.locator(`[data-pd-id="${identity?.replace("tasks.v2.row.", "tasks.v2.track.")}"]`).click();
});

test("opportunity selection survives click-away in Split View and the mobile drawer", async ({ page }) => {
  for (const width of [900, 390]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto("/tasks");
    await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
    const row = page.locator('[data-pd-id^="opportunities.item."]').first();
    await row.click();
    const inspector = page.locator('[data-pd-id="tasks.v2.inspector"]');
    await expect(inspector).toBeVisible();
    if (width === 390) await page.locator("dialog.modal-boundary").click({ position: { x: 2, y: 2 } });
    else await page.locator('[data-pd-id="tasks.page-header"]').click({ position: { x: 8, y: 8 } });
    await expect(inspector).toBeVisible();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    const colors = await selectedBackgroundMatchesToken(row);
    expect(colors.actual).toBe(colors.expected);
    expect(await inspector.evaluate(node => getComputedStyle(node).borderLeftWidth)).toBe("3px");
    if (width === 390) await page.keyboard.press("Escape");
    else await page.getByRole("button", { name: "Close Opportunity Details" }).click();
    await expect(inspector).toHaveCount(0);
    await expect(row).toHaveAttribute("aria-expanded", "false");
  }
});

test("a filtered-out Today row does not regain stale selection when the filter clears", async ({ page }) => {
  await page.goto("/tasks");
  const row = page.locator('[data-pd-id^="tasks.v2.row."]').first();
  await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "true");
  await page.locator('[data-pd-id="tasks.v2.filter-toggle"]').click();
  const search = page.getByRole("searchbox", { name: "Search Daily Tasks" });
  await search.fill("no-synthetic-task-matches-this-query");
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toHaveCount(0);
  await search.fill("");
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toHaveCount(0);
});

test("selected task context remains clear in Split View and the mobile drawer", async ({ page }) => {
  for (const width of [900, 390]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto("/tasks");
    const row = page.locator('[data-pd-id^="tasks.v2.row."]').first();
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    const inspector = page.locator('[data-pd-id="tasks.v2.inspector"]');
    await expect(inspector).toBeVisible();
    if (width === 390) await expect(inspector).toHaveAttribute("role", "dialog");
    expect(await inspector.evaluate(node => getComputedStyle(node).borderLeftWidth)).toBe("3px");
    expect(await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth))).toBe(0);
    await page.getByRole("button", { name: "Close Task Details" }).click();
    await expect(page.locator('[data-pd-id^="tasks.v2.row."][aria-expanded="true"]')).toHaveCount(0);
  }
});

test("shared V2 page frame aligns Position and ledger content without outer width caps", async ({ page }, info) => {
  await page.setViewportSize({ width: 2000, height: 1000 });
  expect((await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } })).status()).toBe(200);
  const measurements: Record<string, unknown> = {};
  for (const [name, route] of [["position", "/"], ["ledger", "/tracker/sportsbook-bets"]] as const) {
    await page.goto(route);
    const shell = page.locator(".ux-v2-main > .page-shell");
    await expect(shell).toBeVisible();
    if (name === "position") await expect(page.locator('[data-pd-id="position.metrics"]')).not.toContainText(/Loading|Updating/, { timeout: 45_000 });
    else await expect(page.locator('[data-pd-id="combined.sportsbook-bets.table-scroll"] tbody tr').first()).toBeVisible({ timeout: 45_000 });
    const after = await shell.evaluate(node => {
      const main = document.querySelector<HTMLElement>(".ux-v2-main")!.getBoundingClientRect();
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const crumb = document.querySelector<HTMLElement>(".ux-v2-crumb-row");
      return { available: main.width, actual: rect.width, left: rect.left - main.left,
        right: main.right - rect.right, gutterLeft: parseFloat(style.paddingLeft), gutterRight: parseFloat(style.paddingRight),
        contentLeft: rect.left + parseFloat(style.paddingLeft), crumbLeft: crumb ? crumb.getBoundingClientRect().left + parseFloat(getComputedStyle(crumb).paddingLeft) : null,
        overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth) };
    });
    measurements[name] = after;
    expect(Math.abs(after.available - after.actual)).toBeLessThan(1);
    expect(Math.abs(after.left)).toBeLessThan(1);
    expect(Math.abs(after.right)).toBeLessThan(1);
    expect(after.gutterLeft).toBeGreaterThanOrEqual(16);
    expect(Math.abs(after.gutterLeft - after.gutterRight)).toBeLessThan(1);
    if (after.crumbLeft !== null) expect(Math.abs(after.crumbLeft - after.contentLeft)).toBeLessThan(1);
    expect(after.overflow).toBe(0);
    await page.screenshot({ path: info.outputPath(`shared-frame-${name}.png`) });
  }
  await writeFile(info.outputPath("desktop-gutters.json"), JSON.stringify(measurements, null, 2));
  for (const width of [1600, 1280, 900, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/tasks", ownedLedger]) {
      await page.goto(route);
      await expect(page.locator(".ux-v2-main > .page-shell")).toBeVisible();
      expect(await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth))).toBe(0);
    }
  }
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/tasks");
  await page.evaluate(() => { document.documentElement.style.zoom = "200%"; });
  expect(await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth))).toBe(0);
  await page.screenshot({ path: info.outputPath("chromium-200-percent-reflow.png") });
  await page.evaluate(() => { document.documentElement.style.zoom = ""; });
  const chromium = await page.context().newCDPSession(page);
  await chromium.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
  expect(await page.evaluate(() => visualViewport.scale)).toBe(2);
  await chromium.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
  expect((await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "Week (Mon-Sun)", selected_range_custom_start: null, selected_range_custom_end: null,
  } })).status()).toBe(200);
});
