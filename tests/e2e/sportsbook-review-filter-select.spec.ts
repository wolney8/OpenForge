import { expect, test } from "@playwright/test";

test("Sportsbook review filter is modal-driven and hidden columns do not break search", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem(
      "openforge-ledger-table-mode:profile-demo-001:sportsbook-bets"
    );
    window.localStorage.removeItem(
      "openforge-ledger-table-filters:profile-demo-001:sportsbook-bets"
    );
  });
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Open sportsbook filter and column controls" }).click();

  const filterDialog = page.getByRole("dialog", { name: "Sportsbook filter controls" });
  await expect(filterDialog).toBeVisible();

  const filterSelect = filterDialog.getByLabel("Sportsbook review mode");
  await expect(filterSelect).toHaveValue("recent");

  await filterSelect.selectOption("underlays");
  await expect(filterSelect).toHaveValue("underlays");

  await filterDialog.getByRole("button", { name: "Hide Strategy" }).click();
  await expect(filterDialog.getByLabel("Strategy")).toBeDisabled();

  await filterDialog.getByRole("button", { name: "Hide Campaign Tag" }).click();
  await filterDialog.getByRole("button", { name: "Done" }).click();

  await expect(
    page.getByRole("button", { name: "Open sportsbook filter and column controls" })
  ).toContainText("3");
  await expect(page.getByLabel("3 active table controls")).toBeVisible();

  await expect(page.getByRole("button", { name: "Recent" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Settling soon" })).toHaveCount(0);

  await expect(page.locator(".data-table thead")).not.toContainText("Campaign Tag");

  const search = page.getByPlaceholder("Search sportsbook rows");
  await search.fill("Double Delight / Hat-trick Heaven");
  await expect(page.locator(".data-table tbody tr")).toHaveCount(1);
});
