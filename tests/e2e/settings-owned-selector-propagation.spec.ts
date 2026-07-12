import { expect, test } from "@playwright/test";

test("Settings-owned campaign tags propagate into sportsbook, free-bet, and casino selectors", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const nonce = Date.now().toString();
  const sportsbookCampaignTag = `Weekly Reload ${nonce}`;
  const casinoCampaignTag = `Friday Spins ${nonce}`;

  const sportsbookLookupResponse = await request.post(
    `http://127.0.0.1:8010/profiles/${profileId}/lookup-values`,
    {
      data: {
        lookup_type: "offer_name",
        option_value: sportsbookCampaignTag,
      },
    }
  );
  expect(sportsbookLookupResponse.ok()).toBeTruthy();

  const casinoLookupResponse = await request.post(
    `http://127.0.0.1:8010/profiles/${profileId}/lookup-values`,
    {
      data: {
        lookup_type: "casino_offer_name",
        option_value: casinoCampaignTag,
      },
    }
  );
  expect(casinoLookupResponse.ok()).toBeTruthy();

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add sportsbook row" }).click();
  const sportsbookEditor = page.locator(".workflow-editor-panel");
  await expect(
    sportsbookEditor
      .getByLabel("Campaign tag (optional)")
      .locator(`option[value="${sportsbookCampaignTag}"]`)
  ).toHaveCount(1);

  await page.goto(`/profiles/${profileId}/tracker/free-bets`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add free-bet row" }).click();
  const freeBetEditor = page.locator(".workflow-editor-panel");
  await expect(
    freeBetEditor
      .getByLabel("Campaign tag (optional)")
      .locator(`option[value="${sportsbookCampaignTag}"]`)
  ).toHaveCount(1);

  await page.goto(`/profiles/${profileId}/tracker/casino-offers`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add casino row" }).click();
  const casinoEditor = page.locator(".workflow-editor-panel");
  await expect(
    casinoEditor
      .getByLabel("Campaign tag (optional)")
      .locator(`option[value="${casinoCampaignTag}"]`)
  ).toHaveCount(1);
});
