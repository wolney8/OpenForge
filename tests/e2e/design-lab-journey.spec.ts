import { chromium, expect, test } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

function textContrast(foreground: string, background: string): number {
  const luminance = (color: string) => {
    const channels = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

async function buttonContrast(locator: import("@playwright/test").Locator): Promise<number> {
  const colors = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { foreground: style.color, background: style.backgroundColor };
  });
  return textContrast(colors.foreground, colors.background);
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    if (route.request().url().endsWith("/api/auth/session")) {
      await route.fulfill({ json: {
        authenticated: true,
        email: "demo@example.invalid",
        expires_at: 4102444800,
        name: "Synthetic Fund Manager",
        role: "fund_manager",
        session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true },
      } });
      return;
    }
    if (route.request().url().endsWith("/api/auth/activity")) {
      await route.fulfill({ json: { ok: true } });
      return;
    }
    throw new Error(`Design Lab made an unexpected API request: ${route.request().url()}`);
  });
  await page.goto("/design-lab");
  await expect(page.locator('[data-pd-id="design-lab.root"]')).toBeVisible();
  const cookieNotice = page.getByRole("button", { name: "Understood" });
  if (await cookieNotice.isVisible()) await cookieNotice.click();
});

test("position to Account review and return preserves context and financial meaning", async ({ page }) => {
  await expect(page.getByText("£ 185.00")).toBeVisible();
  await expect(page.getByText("Incomplete · 1 Account balance missing")).toBeVisible();
  await expect(page.getByText("£ 25.00")).toBeVisible();
  await page.locator('[data-pd-id="design-lab.profile"]').click();
  await page.getByRole("option", { name: "Profile A" }).click();
  await page.locator('[data-pd-id="design-lab.range"]').click();
  await page.getByRole("option", { name: "This Year" }).click();
  await page.locator('[data-pd-id="design-lab.review-account"]').click();
  await expect(page.getByText("LAB-ACCOUNT-C")).toBeVisible();
  const balance = page.locator('[data-pd-id="design-lab.balance"]');
  await balance.fill("invalid");
  await page.locator('[data-pd-id="design-lab.save"]').click();
  await expect(page.getByText(/Enter finite money/)).toBeVisible();
  await balance.fill("0.00");
  await page.locator('[data-pd-id="design-lab.close"]').click();
  await expect(page.getByRole("heading", { name: "Unsaved balance review" })).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(balance).toHaveValue("0.00");
  await page.locator('[data-pd-id="design-lab.close"]').click();
  await page.getByRole("button", { name: "Save and return" }).click();
  await expect(page.getByRole("heading", { name: "Your position" })).toBeVisible();
  await expect(page.locator('[data-pd-id="design-lab.profile"]')).toContainText("Profile A");
  await expect(page.locator('[data-pd-id="design-lab.range"]')).toContainText("This Year");
  await expect(page.getByText("£ 125.00")).toBeVisible();
  await expect(page.getByText("All included balances known")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Incomplete · 1 Account balance missing")).toBeVisible();
});

test("failed save retains input and empty, loading and failure scenarios are distinct", async ({ page }) => {
  await page.locator('[data-pd-id="design-lab.review-account"]').click();
  await page.getByText("Lab scenarios and comparison").click();
  await page.getByLabel("Fail the next simulated save").check();
  await page.locator('[data-pd-id="design-lab.balance"]').fill("12.00");
  await page.locator('[data-pd-id="design-lab.save"]').click();
  await expect(page.getByText(/Simulated save failed/)).toBeVisible();
  await expect(page.locator('[data-pd-id="design-lab.balance"]')).toHaveValue("12.00");
  await page.locator('[data-pd-id="design-lab.save"]').click();
  await expect(page.getByText(/Simulation saved in this page/)).toBeVisible();
  await page.locator('[data-pd-id="design-lab.return"]').click();
  await page.locator('[data-pd-id="design-lab.profile"]').click();
  await page.getByRole("option", { name: "Profile B" }).click();
  await expect(page.getByText("No Account balance review needed")).toBeVisible();
  if (!await page.locator('[data-pd-id="design-lab.scenario"]').isVisible()) await page.getByText("Lab scenarios and comparison").click();
  await page.locator('[data-pd-id="design-lab.scenario"]').click();
  await page.getByRole("option", { name: "Loading" }).click();
  await expect(page.locator('[data-pd-id="design-lab.loading"]')).toBeVisible();
  await page.locator('[data-pd-id="design-lab.scenario"]').click();
  await page.getByRole("option", { name: "Load failure" }).click();
  await expect(page.getByRole("heading", { name: "Position unavailable" })).toBeVisible();
  await page.getByRole("button", { name: "Retry simulation" }).click();
  await expect(page.getByText("No Account balance review needed")).toBeVisible();
});

test("dirty range change keeps the old range and restores the invoking control", async ({ page }) => {
  await page.locator('[data-pd-id="design-lab.review-account"]').click();
  await page.locator('[data-pd-id="design-lab.balance"]').fill("21.00");
  const range = page.locator('[data-pd-id="design-lab.range"]');
  await range.click();
  await page.getByRole("option", { name: "This Year" }).click();
  await expect(page.getByRole("heading", { name: "Unsaved balance review" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(range).toBeFocused();
  await expect(range).toContainText("Last Month");
  await expect(page.locator('[data-pd-id="design-lab.balance"]')).toHaveValue("21.00");
});

test("dirty dialog Escape restores focus and 200% zoom keeps the journey contained", async ({ page }) => {
  await page.setViewportSize({ width: 780, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => { document.documentElement.style.zoom = "200%"; });
  await page.locator('[data-pd-id="design-lab.review-account"]').click();
  const balance = page.locator('[data-pd-id="design-lab.balance"]');
  await balance.fill("25.00");
  const close = page.locator('[data-pd-id="design-lab.close"]');
  await close.click();
  await expect(page.getByRole("heading", { name: "Unsaved balance review" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Unsaved balance review" })).toHaveCount(0);
  await expect(close).toBeFocused();
  await expect(balance).toHaveValue("25.00");
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => document.body.scrollWidth - document.body.clientWidth)).toBeLessThanOrEqual(1);
});

test("lab selection panels anchor, dismiss and restore focus without moving content", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 850 });
    const profile = page.locator('[data-pd-id="design-lab.profile"]');
    const mainBefore = await page.locator('[data-pd-id="design-lab.main"]').boundingBox();
    await profile.click();
    const panel = page.getByRole("listbox", { name: "Profile context options" });
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(await page.locator('[data-pd-id="design-lab.main"]').boundingBox()).toEqual(mainBefore);
    const evidenceDir = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
    if (evidenceDir) await page.screenshot({ style: "nextjs-portal { display: none !important; }", path: `${evidenceDir}/profile-open-${width}.png`, fullPage: true });
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(profile).toBeFocused();
    await profile.press("ArrowDown");
    await profile.press("Home");
    await profile.press("ArrowDown");
    await profile.press("Enter");
    await expect(profile).toContainText("Profile A");

    const range = page.locator('[data-pd-id="design-lab.range"]');
    await range.click();
    await expect(page.getByRole("listbox", { name: "Selected Range (simulation) options" })).toBeVisible();
    if (evidenceDir) await page.screenshot({ style: "nextjs-portal { display: none !important; }", path: `${evidenceDir}/range-open-${width}.png`, fullPage: true });
    await range.press("Tab");
    await expect(page.getByRole("listbox", { name: "Selected Range (simulation) options" })).toHaveCount(0);
    await range.click();
    await page.locator('[data-pd-id="design-lab.main"]').click({ position: { x: 2, y: 2 } });
    await expect(page.getByRole("listbox", { name: "Selected Range (simulation) options" })).toHaveCount(0);
  }

  await page.locator('[data-pd-id="design-lab.review-account"]').click();
  const input = page.locator('[data-pd-id="design-lab.balance"]');
  await expect(page.getByRole("heading", { name: "Account review" })).toBeFocused();
  await input.click();
  await expect(input).toBeFocused();
  const rings = await input.evaluate((node) => ({ inner: getComputedStyle(node).outlineStyle, outer: getComputedStyle(node.parentElement!).outlineStyle, parent: node.parentElement?.className, focus: document.activeElement === node, within: node.parentElement?.matches(":focus-within") }));
  expect(rings.inner).toBe("none");
  expect(rings.outer, JSON.stringify(rings)).toBe("solid");
  const evidenceDir = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
  if (evidenceDir) await page.screenshot({ style: "nextjs-portal { display: none !important; }", path: `${evidenceDir}/money-focused-390.png`, fullPage: true });
});

test("actual Chromium 200% browser zoom retains the journey and anchored menu", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "pd-cp112-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Temporary Design Lab zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), {
    channel: "chromium", headless: true, viewport: { width: 1440, height: 900 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    await context.route("**/api/**", async (route) => {
      if (route.request().url().endsWith("/api/auth/session")) {
        await route.fulfill({ json: { authenticated: true, email: "demo@example.invalid", expires_at: 4102444800, name: "Synthetic Fund Manager", role: "fund_manager", session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true } } });
      } else if (route.request().url().endsWith("/api/auth/activity")) await route.fulfill({ json: { ok: true } });
      else throw new Error(`Unexpected API request in zoom test: ${route.request().url()}`);
    });
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    const page = await context.newPage();
    await page.goto("http://localhost:3911/design-lab");
    await expect(page.locator('[data-pd-id="design-lab.root"]')).toBeVisible();
    const cookieNotice = page.getByRole("button", { name: "Understood" });
    if (await cookieNotice.isVisible()) await cookieNotice.click();
    await worker.evaluate(async () => {
      const tabsApi = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs;
      const tabs = await tabsApi.query({ url: "http://localhost:3911/*" });
      await tabsApi.setZoom(tabs[0].id, 2);
    });
    await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(720);
    expect(await page.evaluate(() => window.devicePixelRatio)).toBe(2);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).zoom)).toBe("1");
    const evidenceDir = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
    if (evidenceDir) await page.screenshot({ style: "nextjs-portal { display: none !important; }", path: `${evidenceDir}/actual-browser-zoom-200-pre-menu.png`, fullPage: true });
    const zoomGeometry = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      offenders: [...document.querySelectorAll("body *")].map((element) => ({ tag: element.tagName, className: typeof element.className === "string" ? element.className : "", right: element.getBoundingClientRect().right, parent: element.parentElement?.className })).filter((item) => item.right > window.innerWidth + 1).slice(0, 6),
    }));
    expect(zoomGeometry.overflow, JSON.stringify(zoomGeometry.offenders)).toBeLessThanOrEqual(1);
    const profile = page.locator('[data-pd-id="design-lab.profile"]');
    await profile.click();
    const panel = page.getByRole("listbox", { name: "Profile context options" });
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(720);
    if (evidenceDir) {
      await page.screenshot({ style: "nextjs-portal { display: none !important; }", path: `${evidenceDir}/actual-browser-zoom-200.png`, fullPage: true, scale: "device" });
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      const cdp = await context.newCDPSession(page);
      const capture = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      await writeFile(`${evidenceDir}/actual-browser-zoom-200-cdp.png`, Buffer.from(capture.data, "base64"));
      const cssViewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
      const scaled = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: cssViewport.width, height: cssViewport.height, scale: 2 } });
      await writeFile(`${evidenceDir}/actual-browser-zoom-200-scaled.png`, Buffer.from(scaled.data, "base64"));
    }
    await page.keyboard.press("Escape");
    await expect(profile).toBeFocused();
  } finally {
    await context.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

for (const width of [1440, 900, 768, 430, 390]) {
  test(`contained journey at ${width}px in light and dark`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    for (const theme of ["light", "dark"] as const) {
      const currentTheme = await page.evaluate(() => document.documentElement.dataset.theme);
      if (currentTheme !== theme) await page.getByRole("button", { name: `Switch to ${theme} mode` }).click();
      await expect(page.locator('[data-pd-id="design-lab.topbar"]')).toBeVisible();
      const metaColors = await page.locator('[data-pd-id="design-lab.metrics"] article small').first().evaluate((element) => ({ foreground: getComputedStyle(element).color, background: getComputedStyle(element.closest("section")!).backgroundColor }));
      expect(textContrast(metaColors.foreground, metaColors.background)).toBeGreaterThanOrEqual(4.5);
      const taskTarget = await page.locator('[data-pd-id="design-lab.tasks-action"]').boundingBox();
      expect(taskTarget!.width).toBeGreaterThanOrEqual(44);
      expect(taskTarget!.height).toBeGreaterThanOrEqual(44);
      if (width <= 900) {
        await page.getByRole("button", { name: "Open navigation" }).click();
        await expect(page.getByRole("navigation", { name: "Global destinations" })).toBeVisible();
        await page.getByRole("button", { name: "Close navigation" }).click();
      }
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      const evidenceDir = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
      if (evidenceDir) {
        await mkdir(evidenceDir, { recursive: true });
        await page.screenshot({ style: "nextjs-portal { display: none !important; }", path: `${evidenceDir}/home-${width}-${theme}.png`, fullPage: true });
      }
      await page.locator('[data-pd-id="design-lab.review-account"]').click();
      await expect(page.locator('[data-pd-id="design-lab.balance"]')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      if (evidenceDir && (width === 1440 || width === 390)) await page.screenshot({ style: "nextjs-portal { display: none !important; }", path: `${evidenceDir}/account-${width}-${theme}.png`, fullPage: true });
      expect(await buttonContrast(page.locator('[data-pd-id="design-lab.save"]'))).toBeGreaterThanOrEqual(4.5);
      await page.locator('[data-pd-id="design-lab.balance"]').fill("1.00");
      await page.locator('[data-pd-id="design-lab.return"]').click();
      const discard = page.getByRole("button", { name: "Discard changes" });
      expect(await buttonContrast(discard)).toBeGreaterThanOrEqual(4.5);
      await discard.click();
    }
    expect(pageErrors).toEqual([]);
  });
}
