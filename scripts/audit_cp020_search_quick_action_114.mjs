import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "@playwright/test";

const baseUrl = process.env.OPENFORGE_CP020_BASE_URL ?? "http://localhost:3010";
const profileId = process.env.OPENFORGE_CP020_PROFILE_ID;
const tokenPath = process.env.OPENFORGE_CP020_TOKEN ?? "/tmp/openforge-cp020/session-token";

assert(profileId, "OPENFORGE_CP020_PROFILE_ID is required");
assert(fs.existsSync(tokenPath), `Session token is missing: ${tokenPath}`);

const token = fs.readFileSync(tokenPath, "utf8").trim();
const actionLabel = `CP020 Restricted Free Spins ${Date.now()}`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  reducedMotion: "reduce",
  viewport: { width: 1280, height: 900 },
});
await context.addCookies([{ name: "pd_session", value: token, domain: "localhost", path: "/" }]);
const page = await context.newPage();
page.setDefaultTimeout(10_000);

try {
  await page.goto(`${baseUrl}/profiles/${profileId}/tracker/settings#preferences`);
  await page.getByRole("tab", { name: "Preferences" }).click();
  console.log("settings-ready");
  const casinoSettings = page.locator('[data-pd-id="profile-quick-actions.Casino"]');
  await casinoSettings.getByRole("button", { name: "Add Action" }).click();
  const dialog = page.getByRole("dialog", { name: "Add Profile Quick Action" });
  await dialog.getByLabel("Action Label").fill(actionLabel);
  for (const label of ["Offer Name", "Bookmaker", "Offer Type", "Number Of Spins", "Spin Stake", "Converted Win"]) {
    await dialog.getByRole("checkbox", { name: label, exact: true }).check();
  }
  console.log("fields-selected");
  await dialog.getByRole("textbox", { name: "Offer Name", exact: true }).fill("CP020 restricted free spins");
  await dialog.getByRole("textbox", { name: "Bookmaker", exact: true }).fill("10Bet");
  await dialog.getByRole("textbox", { name: "Offer Type", exact: true }).fill("Free Spins");
  await dialog.getByRole("textbox", { name: "Number Of Spins", exact: true }).fill("10");
  await dialog.getByRole("textbox", { name: "Spin Stake", exact: true }).fill("0.10");
  await dialog.getByRole("textbox", { name: "Converted Win", exact: true }).fill("3.00");
  await dialog.getByRole("button", { name: "Save" }).click();
  console.log("action-save-clicked");

  const actionRow = casinoSettings.locator(".quick-action-row", { hasText: actionLabel });
  await actionRow.waitFor();
  console.log("action-saved");
  const eligibilityText = (await actionRow.textContent()) ?? "";
  assert.match(eligibilityText, /Stake access is Severely Limited/);
  assert.match(eligibilityText, /Promo access is Restricted/);
  assert.match(eligibilityText, /manual confirmation/);

  await page.goto(`${baseUrl}/profiles/${profileId}/tracker/casino-offers`);
  const quickAction = page.getByRole("button", { name: new RegExp(`^${actionLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) });
  await quickAction.waitFor();
  assert.match((await quickAction.textContent()) ?? "", /Check access/);
  assert.match((await quickAction.getAttribute("aria-label")) ?? "", /Severely Limited/);
  await quickAction.click();
  console.log("action-opened");
  const editor = page.locator(".workflow-editor-panel");
  await editor.waitFor();
  assert.equal(await editor.getByLabel("Offer name").inputValue(), "CP020 restricted free spins");
  assert.equal(await editor.getByLabel("Bookmaker").inputValue(), "10Bet");
  assert.equal(await editor.getByLabel("Offer type").inputValue(), "Free Spins");
  await editor.getByLabel("Date started").fill("2026-09-18T12:00");
  await editor.locator('[data-pd-id="ledger-editor.tab.reward"]').click();
  assert.equal(await editor.getByRole("textbox", { name: /Free spins awarded/i }).inputValue(), "10");
  assert.equal(await editor.getByRole("textbox", { name: /Spin stake/i }).inputValue(), "0.10");
  assert.equal(await editor.getByRole("textbox", { name: /Converted win amount/i }).inputValue(), "3.00");
  await editor.getByRole("button", { name: "Save" }).click();
  console.log("casino-save-clicked");
  await page.getByText("CP020 restricted free spins", { exact: true }).first().waitFor();

  await page.goto(`${baseUrl}/profiles/${profileId}/tracker/settings#preferences`);
  await page.getByRole("tab", { name: "Preferences" }).click();
  const persistedRow = page.locator('[data-pd-id="profile-quick-actions.Casino"] .quick-action-row', { hasText: actionLabel });
  await persistedRow.waitFor();
  await persistedRow.getByRole("button", { name: `Delete ${actionLabel}` }).click();
  await persistedRow.waitFor({ state: "detached" });

  const search = page.locator('[data-pd-id="global-search.input"]');
  await search.fill("Synthetic CP020 Combined");
  const profileResult = page.locator(`[data-pd-id="global-search.result.profile-${profileId}"]`);
  await profileResult.waitFor();
  await page.locator('[data-pd-id="global-search.result.profile-profile-264417bd90fd"]').waitFor({ state: "detached" });
  await page.locator('[data-pd-id="global-search.result.profile-profile-145cdc1947ec"]').waitFor({ state: "detached" });
  await search.press("Enter");
  await page.waitForURL(new RegExp(`/profiles/${profileId}/tracker/dashboard`));
  await page.goBack();

  await page.route("**/search?query=*", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("query");
    if (query === "older query") {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.fulfill({ json: [{ result_id: "profile-old", group: "Profiles", title: "Older result", subtitle: "OLD · Active", href: `/profiles/${profileId}/tracker/dashboard`, icon: "person" }] }).catch(() => undefined);
      return;
    }
    await route.fulfill({ json: [{ result_id: "profile-new", group: "Profiles", title: "Newest result", subtitle: "NEW · Active", href: `/profiles/${profileId}/tracker/dashboard`, icon: "person" }] });
  });
  await search.fill("older query");
  await page.waitForTimeout(250);
  await search.fill("newer query");
  await page.getByText("Newest result", { exact: true }).waitFor();
  await page.waitForTimeout(800);
  assert.equal(await page.getByText("Older result", { exact: true }).count(), 0);
  await page.unroute("**/search?query=*");

  await page.setViewportSize({ width: 390, height: 760 });
  await search.fill("no-cp020-result-999");
  await page.getByText("No matching profiles, providers or pages.").waitFor();
  const searchBounds = await search.boundingBox();
  assert(searchBounds && searchBounds.x >= 0 && searchBounds.x + searchBounds.width <= 390);

  console.log(JSON.stringify({
    actionLabel,
    eligibility: eligibilityText.replace(/\s+/g, " ").trim(),
    profileId,
    result: "PASS",
  }));
} finally {
  await browser.close();
}
