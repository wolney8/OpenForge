import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test.use({ video: "on", trace: "retain-on-failure", screenshot: "only-on-failure" });

test("flagged real ledger keeps header and row Actions aligned while scrolling", async ({ page }, info) => {
  const tokenPath = process.env.OPENFORGE_CP117_ISOLATED_SESSION_FILE;
  test.skip(!tokenPath, "Requires the disposable CP-117 authenticated API fixture");
  await page.context().addCookies([{ name: "pd_session", value: readFileSync(tokenPath!, "utf8").trim(), url: String(info.project.use.baseURL) }]);
  await page.setViewportSize({ width: 1440, height: 900 });
  const settingsLoaded = page.waitForResponse((response) => response.url().includes("/profiles/profile-notification-acceptance/tracker-settings") && response.request().method() === "GET" && response.ok());
  await page.goto("/profiles/profile-notification-acceptance/tracker/sportsbook-bets");
  await settingsLoaded;
  await page.getByRole("combobox", { name: "Change tracker date range" }).selectOption({ label: "All Dates" });
  await expect(page.getByRole("combobox", { name: "Change tracker date range" })).toHaveValue("All Dates");
  const dismissToast = page.getByRole("button", { name: "Dismiss notification" });
  if (await dismissToast.isVisible()) await dismissToast.click();
  const scroll = page.locator('[data-pd-id="sportsbook.table-scroll"]');
  const row = scroll.locator("table > tbody > tr > td:last-child:not([colspan])").first();
  await expect(row).toBeVisible();
  const initial = await scroll.evaluate((element) => {
    const head = element.querySelector("table > thead > tr > th:last-child")!.getBoundingClientRect();
    const cell = element.querySelector("table > tbody > tr > td:last-child:not([colspan])")!.getBoundingClientRect();
    return { max: element.scrollWidth - element.clientWidth, headRight: head.right, cellRight: cell.right, headWidth: head.width, cellWidth: cell.width };
  });
  expect(initial.max).toBeGreaterThan(50);
  await scroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(50);
  const scrolled = await scroll.evaluate((element) => {
    const viewport = element.getBoundingClientRect();
    const head = element.querySelector("table > thead > tr > th:last-child")!.getBoundingClientRect();
    const cell = element.querySelector("table > tbody > tr > td:last-child:not([colspan])")!.getBoundingClientRect();
    return { viewportRight: viewport.right, headRight: head.right, cellRight: cell.right, headWidth: head.width, cellWidth: cell.width };
  });
  expect(Math.abs(scrolled.headRight - scrolled.viewportRight)).toBeLessThanOrEqual(2);
  expect(Math.abs(scrolled.cellRight - scrolled.viewportRight)).toBeLessThanOrEqual(2);
  expect(Math.abs(scrolled.headRight - scrolled.cellRight)).toBeLessThanOrEqual(1);
  expect(Math.abs(scrolled.headWidth - initial.headWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(scrolled.cellWidth - initial.cellWidth)).toBeLessThanOrEqual(1);
  expect(await row.evaluate((element) => getComputedStyle(element).position)).toBe("sticky");
  await expect(row.locator("button, a").first()).toBeVisible();
  await scroll.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("sportsbook-actions-scrolled.png") });
  await row.locator("button, a").first().focus();
  await expect(row.locator("button, a").first()).toBeFocused();
});

test("flagged real Accounts ledger pins row actions at intermediate width", async ({ page }, info) => {
  const tokenPath = process.env.OPENFORGE_CP117_ISOLATED_SESSION_FILE;
  test.skip(!tokenPath, "Requires the disposable CP-117 authenticated API fixture");
  await page.context().addCookies([{ name: "pd_session", value: readFileSync(tokenPath!, "utf8").trim(), url: String(info.project.use.baseURL) }]);
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/profiles/profile-notification-acceptance/tracker/accounts");
  const scroll = page.locator('[data-pd-id="accounts.table-scroll"]');
  const row = scroll.locator("table > tbody > tr > td:last-child:not([colspan])").first();
  await expect(row).toBeVisible();
  await scroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  const receipt = await scroll.evaluate((element) => {
    const viewport = element.getBoundingClientRect();
    const header = element.querySelector("thead th:last-child")!.getBoundingClientRect();
    const cell = element.querySelector("tbody td:last-child:not([colspan])")!.getBoundingClientRect();
    return { max: element.scrollWidth - element.clientWidth, viewportRight: viewport.right, headerRight: header.right, cellRight: cell.right };
  });
  expect(receipt.max).toBeGreaterThan(50);
  expect(Math.abs(receipt.headerRight - receipt.viewportRight)).toBeLessThanOrEqual(2);
  expect(Math.abs(receipt.cellRight - receipt.viewportRight)).toBeLessThanOrEqual(2);
  await scroll.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("accounts-actions-scrolled.png") });
  await expect(row.locator("button, a").first()).toBeVisible();
});
