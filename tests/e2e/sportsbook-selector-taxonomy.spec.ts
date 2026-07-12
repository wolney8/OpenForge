import { expect, test } from "@playwright/test";

test("Sportsbook selectors follow the approved offer-type and bet-type model", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add sportsbook row" }).click();

  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toBeVisible();

  const offerTypeSelect = page.getByLabel("Offer type (promotion mechanism)");
  const betTypeSelect = page.getByLabel("Bet type (bet shape / placement)");

  await expect(offerTypeSelect.locator('option[value="Bet Builder"]')).toHaveCount(0);
  await expect(offerTypeSelect.locator('option[value="Acca"]')).toHaveCount(0);

  await expect(betTypeSelect.locator('option[value="In Play + Single"]')).toHaveCount(1);
  await expect(betTypeSelect.locator('option[value="In Play + Bet Builder"]')).toHaveCount(1);
  await expect(betTypeSelect.locator('option[value="First Goalscorer"]')).toHaveCount(1);

  await offerTypeSelect.selectOption("Bet & Get");
  await expect(betTypeSelect.locator('option[value="First Goalscorer"]')).toHaveCount(0);
  await expect(betTypeSelect.locator('option[value="In Play + Single"]')).toHaveCount(1);
  await expect(betTypeSelect.locator('option[value="Accumulator / Multiple"]')).toHaveCount(1);

  await offerTypeSelect.selectOption("Double Delight / Hat-trick Heaven");
  await expect(betTypeSelect).toHaveValue("First Goalscorer");
  await expect(betTypeSelect.locator("option")).toHaveCount(2);
});

test("Sportsbook campaign tags narrow by offer-family keywords with safe fallback", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const nonce = Date.now().toString();
  const ddhhTag = `Betfred DDHH ${nonce}`;
  const reloadTag = `Weekly Reload ${nonce}`;
  const boostTag = `Saturday Boost ${nonce}`;

  for (const optionValue of [ddhhTag, reloadTag, boostTag]) {
    const response = await request.post(
      `http://127.0.0.1:8010/profiles/${profileId}/lookup-values`,
      {
        data: {
          lookup_type: "offer_name",
          option_value: optionValue,
        },
      }
    );
    expect(response.ok()).toBeTruthy();
  }

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add sportsbook row" }).click();

  const offerTypeSelect = page.getByLabel("Offer type (promotion mechanism)");
  const campaignTagSelect = page.getByLabel("Campaign tag (optional)");

  await offerTypeSelect.selectOption("Double Delight / Hat-trick Heaven");
  await expect(campaignTagSelect.locator(`option[value="${ddhhTag}"]`)).toHaveCount(1);
  await expect(campaignTagSelect.locator(`option[value="${reloadTag}"]`)).toHaveCount(0);
  await expect(campaignTagSelect.locator(`option[value="${boostTag}"]`)).toHaveCount(0);

  await offerTypeSelect.selectOption("Reload");
  await expect(campaignTagSelect.locator(`option[value="${reloadTag}"]`)).toHaveCount(1);
});

test("Free bets no longer require a campaign tag to save a prospecting row", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/free-bets");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add free-bet row" }).click();

  await page.getByLabel("Bookmaker").selectOption({ index: 1 });
  await page.getByLabel("Offer type").selectOption("Bet & Get");
  await page.getByLabel("Bet type (bet shape / placement)").selectOption("In Play + Single");
  await page.getByLabel("Event name").fill("Optional campaign tag proof");

  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.locator(".workflow-editor-panel")).not.toBeVisible();
  await expect(page.locator(".data-table")).toContainText("Optional campaign tag proof");
});

test("Free-bet selectors follow the approved offer-type and bet-type model", async ({ page, request }) => {
  const profileId = "profile-demo-001";
  const nonce = Date.now().toString();
  const ddhhTag = `Betfred DDHH ${nonce}`;
  const reloadTag = `Weekly Reload ${nonce}`;

  for (const optionValue of [ddhhTag, reloadTag]) {
    const response = await request.post(
      `http://127.0.0.1:8010/profiles/${profileId}/lookup-values`,
      {
        data: {
          lookup_type: "offer_name",
          option_value: optionValue,
        },
      }
    );
    expect(response.ok()).toBeTruthy();
  }

  await page.goto(`/profiles/${profileId}/tracker/free-bets`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add free-bet row" }).click();

  const offerTypeSelect = page.getByLabel("Offer type");
  const betTypeSelect = page.getByLabel("Bet type (bet shape / placement)");
  const campaignTagSelect = page.getByLabel("Campaign tag (optional)");

  await offerTypeSelect.selectOption("Bet & Get");
  await expect(betTypeSelect.locator('option[value="First Goalscorer"]')).toHaveCount(0);
  await expect(betTypeSelect.locator('option[value="In Play + Single"]')).toHaveCount(1);

  await offerTypeSelect.selectOption("Double Delight / Hat-trick Heaven");
  await expect(betTypeSelect).toHaveValue("First Goalscorer");
  await expect(betTypeSelect.locator("option")).toHaveCount(2);
  await expect(campaignTagSelect.locator(`option[value="${ddhhTag}"]`)).toHaveCount(1);
  await expect(campaignTagSelect.locator(`option[value="${reloadTag}"]`)).toHaveCount(0);
});
