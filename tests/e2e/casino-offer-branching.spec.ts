import { expect, test } from "@playwright/test";

test("Casino Offers branches campaign fields by offer type and mirrors settles from start", async ({
  page,
}) => {
  await page.goto("/profiles/profile-demo-001/tracker/casino-offers");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add casino row" }).click();

  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toBeVisible();

  const dateStarted = editor.getByLabel("Date started");
  const dateSettling = editor.getByLabel("Date settling");
  await dateStarted.fill("2026-07-15T13:30");
  await expect(dateSettling).toHaveValue("2026-07-15T13:30");

  const offerType = editor.getByLabel("Offer type");

  await offerType.selectOption("Cashback");
  await expect(editor.getByText("Cashback economics", { exact: true })).toBeVisible();
  await expect(editor.getByLabel("Cashback amount")).toBeVisible();
  await expect(editor.getByLabel("Free spins awarded")).toHaveCount(0);
  await expect(editor.locator('input[value="Record the qualifying stake first, then the cashback amount."]')).toBeVisible();

  await offerType.selectOption("Free Spins");
  await expect(editor.getByText("Free-spin campaign", { exact: true })).toBeVisible();
  await expect(editor.getByText("Spin and conversion", { exact: true })).toBeVisible();
  await expect(editor.getByLabel("Free spins awarded")).toBeVisible();
  await expect(editor.getByLabel("Free spins value")).toBeVisible();
  await expect(editor.getByLabel("Cashback amount")).toHaveCount(0);
  await expect(editor.locator('input[value="Not used on Free Spins rows."]')).toBeVisible();
});
