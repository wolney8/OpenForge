import { expect, test } from "@playwright/test";

test("Not Yet Awarded free bets keep the calculator locked until moved to Available", async ({
  page,
}) => {
  await page.goto("/profiles/profile-demo-001/tracker/free-bets");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add free-bet row" }).click();

  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toBeVisible();

  await page.getByLabel("Offer type").selectOption("Bet & Get");
  await page.getByLabel("Campaign tag (optional)").selectOption({ index: 1 });
  await page.getByLabel("Event name").fill("Award gating event");
  await page.getByLabel("Bookmaker").selectOption({ index: 1 });
  await page.getByLabel("Status").selectOption("Not Yet Awarded");

  const calculatorSection = editor.locator('.content-subpanel:has(.eyebrow:text-is("Calculator panel"))').first();
  await expect(calculatorSection.getByText("Await free-bet issue")).toBeVisible();
  await expect(calculatorSection.locator("fieldset").first()).toHaveAttribute("disabled", "");

  await page.getByLabel("Status").selectOption("Available");

  await expect(calculatorSection.getByText("Await free-bet issue")).toHaveCount(0);
  await expect(calculatorSection.locator("fieldset").first()).not.toHaveAttribute("disabled", "");
});
