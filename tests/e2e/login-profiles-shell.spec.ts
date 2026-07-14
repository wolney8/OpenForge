import { expect, test } from "@playwright/test";

test.describe("Login to profiles shell", () => {
  test("moves from login to profiles to the selected profile tracker", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Fund Manager login" })).toBeVisible();
    const profilesLink = page.getByRole("link", { name: "Go to profiles" });
    await profilesLink.focus();
    await expect(profilesLink).toBeFocused();
    await profilesLink.click();

    await expect(page).toHaveURL(/\/profiles$/);
    await expect(
      page.getByRole("heading", { name: "Profiles are isolated tracker containers." })
    ).toBeVisible();

    const trackerLink = page.getByRole("link", { name: "Open tracker" }).first();
    const trackerHref = await trackerLink.getAttribute("href");
    expect(trackerHref).toMatch(/^\/profiles\/[^/]+\/tracker$/);

    const profileId = trackerHref!.split("/")[2]!;
    await trackerLink.click();

    await expect(page).toHaveURL(
      new RegExp(`/profiles/${profileId}/tracker/sportsbook-bets$`)
    );
    await expect(page.getByRole("heading", { name: "Sportsbook Bets", exact: true })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/profiles$/);
    await expect(page.getByRole("link", { name: "Open tracker" }).first()).toBeVisible();
  });
});
