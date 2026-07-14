import { expect, test } from "@playwright/test";

test("Sportsbook table view state persists across module navigation and counts as an active control", async ({
  page,
}) => {
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await page.waitForLoadState("networkidle");

  const filterButton = page.getByRole("button", {
    name: "Open sportsbook filter and column controls",
  });

  await filterButton.click();
  const dialog = page.getByRole("dialog", { name: "Sportsbook filter controls" });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Sportsbook review mode").selectOption("underlays");
  await dialog.getByRole("button", { name: "Done" }).click();

  await expect(page.locator(".table-filter-badge")).toHaveText("1");

  await page.goto("/profiles/profile-demo-001/tracker/free-bets");
  await page.waitForLoadState("networkidle");
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await page.waitForLoadState("networkidle");

  await filterButton.click();
  await expect(dialog.getByLabel("Sportsbook review mode")).toHaveValue("underlays");
});
