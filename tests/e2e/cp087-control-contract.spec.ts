import { expect, test } from "@playwright/test";

const profileId = "profile-demo-001";

test("keeps an ordinary Account select closed until explicit activation", async ({ page }) => {
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: {
    authenticated: true,
    email: "alpha-owner@example.invalid",
    linked_profile_ids: [profileId],
    name: "Alpha Owner",
    role: "fund_manager",
  } }));

  await page.goto(`/profiles/${profileId}/tracker/accounts`);
  await page.getByRole("button", { name: "Filter accounts" }).click();
  const parent = page.getByRole("dialog", { name: /Filter accounts/ });
  const accountType = parent.getByLabel("Account type");

  await expect(parent).toBeVisible();
  await expect(accountType).toBeVisible();
  await expect(parent.getByRole("listbox")).toHaveCount(0);
  await accountType.selectOption("Bookie");
  await expect(parent).toBeVisible();
  await expect(accountType).toHaveValue("Bookie");
});
