import { expect, test } from "@playwright/test";

test("Sportsbook special-offer bookmaker panel shows explicit bookmaker states", async ({
  page,
  request,
}) => {
  const combosResponse = await request.get("http://127.0.0.1:8010/fund-manager/common-bet-combos");
  expect(combosResponse.ok()).toBeTruthy();
  const combo = ((await combosResponse.json()) as Record<string, unknown>[]).find(
    (row) => row.preset_id === "COMBO-DDHH-FGS"
  );
  expect(combo).toBeTruthy();
  const updateResponse = await request.put(
    "http://127.0.0.1:8010/fund-manager/common-bet-combos/COMBO-DDHH-FGS",
    { data: { ...combo, bookmakers: ["Betfred", "Midnite"] } }
  );
  expect(updateResponse.ok()).toBeTruthy();
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add sportsbook row" }).click();

  await page.getByLabel("Offer type (promotion mechanism)").selectOption(
    "Double Delight / Hat-trick Heaven"
  );

  const panel = page.locator(".special-offer-suggestion-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Known bookmaker coverage");
  await expect(panel).toContainText("Matched from universal Common Combo knowledge");
  await expect(panel).toContainText("DDHH");

  const availableButtons = panel.getByRole("button");
  const availableCount = await availableButtons.count();

  if (availableCount > 0) {
    const firstButton = availableButtons.first();
    const bookmakerName = ((await firstButton.textContent()) ?? "").trim();
    expect(bookmakerName.length).toBeGreaterThan(0);
    await firstButton.click();
    await expect(page.getByLabel("Bookmaker")).toHaveValue(bookmakerName);
  } else {
    await expect(panel).toContainText("Add one of these bookmakers in Settings");
  }

  await expect(panel).toContainText(/Betfred|Midnite/);
});
