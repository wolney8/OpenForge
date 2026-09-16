// CP-004: scoped browser accessibility/UX evidence on the integrated local build.
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const webBase = process.env.OPENFORGE_CP004_WEB_BASE ?? "http://localhost:3010";
const runtime = process.env.OPENFORGE_CP004_RUNTIME ?? "/tmp/openforge-cp003-normal";
const profileId = process.env.OPENFORGE_CP004_PROFILE;
assert(profileId, "OPENFORGE_CP004_PROFILE is required");
const token = fs.readFileSync(`${runtime}/session-token`, "utf8").trim();
const browser = await chromium.launch({ headless: true });
const routes = ["each-way-extra-places", "cash-adjustments", "casino-offers"];
const evidence = [];

async function newContext(width, theme, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion });
  await context.addCookies([{ name: "pd_session", value: token, domain: "localhost", path: "/" }]);
  await context.addInitScript((value) => localStorage.setItem("openforge-theme", value), theme);
  return context;
}

async function inspectPage(page, route, label) {
  await page.goto(`${webBase}/profiles/${profileId}/tracker/${route}`);
  await page.locator("main").waitFor();
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const unnamed = [...document.querySelectorAll("button, input, select, textarea, a[href]")]
      .filter((element) => {
        const node = element;
        const style = getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const name = node.getAttribute("aria-label") || node.getAttribute("title") || node.textContent?.trim() || node.getAttribute("placeholder") || "";
        return !name;
      }).length;
    const smallTargets = [...document.querySelectorAll("button, input, select, textarea, a[href]")]
      .flatMap((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0 || (rect.width >= 24 && rect.height >= 24)) return [];
        return [{ tag: element.tagName, name: element.getAttribute("aria-label") || element.textContent?.trim() || "", width: rect.width, height: rect.height, id: element.getAttribute("data-pd-id") || "" }];
      });
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      unnamed,
      smallTargets,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
  });
  assert(result.scrollWidth <= result.clientWidth + 1, `${label} has page overflow`);
  assert.equal(result.unnamed, 0, `${label} has unnamed interactive controls`);
  assert.equal(result.smallTargets.length, 0, `${label} has controls below the 24px target minimum: ${JSON.stringify(result.smallTargets)}`);
  return result;
}

try {
  for (const [width, theme, motion] of [[1440, "light", "no-preference"], [760, "dark", "reduce"], [390, "light", "reduce"]]) {
    const context = await newContext(width, theme, motion);
    const page = await context.newPage();
    for (const route of routes) {
      const result = await inspectPage(page, route, `${route}-${width}-${theme}`);
      evidence.push({ route, width, theme, ...result });
    }
    await context.close();
  }

  const textContext = await newContext(720, "dark", "reduce");
  const textPage = await textContext.newPage();
  await textPage.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      document.documentElement.style.fontSize = "200%";
    });
  });
  for (const route of routes) {
    const result = await inspectPage(textPage, route, `${route}-200%-text`);
    evidence.push({ route, width: 720, theme: "dark", text: "200%", ...result });
  }
  await textContext.close();

  const keyboardContext = await newContext(760, "dark", "reduce");
  const page = await keyboardContext.newPage();
  await page.goto(`${webBase}/profiles/${profileId}/tracker/cash-adjustments`);
  const add = page.getByRole("button", { name: "Add cash adjustment" });
  await add.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Create cash adjustment" });
  await dialog.waitFor();
  assert(await dialog.evaluate((node) => node.contains(document.activeElement)), "Focus did not enter the cash dialog");
  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press(index % 3 === 0 ? "Shift+Tab" : "Tab");
    assert(await dialog.evaluate((node) => node.contains(document.activeElement)), "Focus escaped the active dialog");
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(add).toBeFocused();

  await add.press("Enter");
  const invalidDialog = page.getByRole("dialog", { name: "Create cash adjustment" });
  await invalidDialog.getByRole("combobox", { name: /^Direction/ }).selectOption("In");
  await invalidDialog.getByRole("combobox", { name: /^Adjustment type/ }).selectOption("Deposit");
  await invalidDialog.getByLabel("Adjustment date", { exact: true }).fill("2026-09-16T12:00");
  await invalidDialog.getByLabel("Amount", { exact: true }).fill("1.234");
  await invalidDialog.getByRole("button", { name: "Save", exact: true }).click();
  const alert = invalidDialog.getByRole("alert");
  await expect(alert).toContainText(/amount|decimal|money/i);
  await expect(invalidDialog.getByLabel("Amount", { exact: true })).toHaveValue("1.234");
  await page.keyboard.press("Escape");
  const nested = page.getByRole("dialog", { name: /unsaved|discard|close/i });
  if (await nested.count()) {
    assert(await nested.evaluate((node) => node.contains(document.activeElement)), "Focus did not enter unsaved-change confirmation");
    await page.keyboard.press("Escape");
    await expect(nested).toBeHidden();
    await expect(invalidDialog).toBeVisible();
    await invalidDialog.getByLabel("Amount", { exact: true }).fill("1.23");
  }
  evidence.push({ route: "cash-adjustments", keyboard: "focus-entry/containment/Escape/return PASS", errorIdentification: "visible associated alert; text retained", reducedMotion: true });
  await keyboardContext.close();

  for (const flow of [
    { route: "each-way-extra-places", add: "Add Extra Place row", dialog: "Create Extra Place row" },
    { route: "casino-offers", add: "Add casino row", dialog: "Create casino row" },
  ]) {
    const context = await newContext(760, "dark", "reduce");
    const flowPage = await context.newPage();
    await flowPage.goto(`${webBase}/profiles/${profileId}/tracker/${flow.route}`);
    const trigger = flowPage.getByRole("button", { name: flow.add });
    await trigger.focus();
    await trigger.press("Enter");
    const flowDialog = flowPage.getByRole("dialog", { name: flow.dialog });
    await flowDialog.waitFor();
    assert(await flowDialog.evaluate((node) => node.contains(document.activeElement)), `${flow.route}: focus did not enter the dialog`);
    for (let index = 0; index < 12; index += 1) {
      await flowPage.keyboard.press(index % 4 === 0 ? "Shift+Tab" : "Tab");
      assert(await flowDialog.evaluate((node) => node.contains(document.activeElement)), `${flow.route}: focus escaped the dialog`);
    }
    await flowPage.keyboard.press("Escape");
    await expect(flowDialog).toBeHidden();
    await expect(trigger).toBeFocused();
    evidence.push({ route: flow.route, keyboard: "focus-entry/containment/Escape/return PASS", reducedMotion: true });
    await context.close();
  }

  const output = {
    date: new Date().toISOString(),
    result: "PASS_SCOPED",
    evidence,
    screenReader: "UNVERIFIED: no supported local reader was exercised",
    limitation: "Automated names, target geometry and browser focus do not substitute for a screen-reader pass or full WCAG certification.",
  };
  fs.writeFileSync(`${runtime}/cp004-accessibility-evidence.json`, JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output));
} finally {
  await browser.close();
}
