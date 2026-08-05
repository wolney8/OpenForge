import { expect, test } from "@playwright/test";

test("sportsbook guided entry uses text cues and advances without stealing focus", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });

  await page.getByRole("button", { name: "Add sportsbook row" }).click();

  const editor = page.getByRole("dialog", { name: "Create sportsbook row" });
  await expect(editor).toBeVisible();

  const guide = editor.locator('[data-pd-id="sportsbook.guided-entry"]');
  await expect(guide).toBeVisible();
  await expect(guide).toContainText("Next required");
  await expect(guide).toContainText("offer");

  const offerField = editor.locator("label", { hasText: /^Offer$/ });
  await expect(offerField).toHaveClass(/is-guided-next/);

  const offerInput = editor.getByLabel("Offer", { exact: true });
  await expect(offerInput).toHaveAttribute("aria-describedby", "sportsbook-guided-entry-message");
  await offerInput.fill("Guided entry demo offer");
  await expect(offerInput).toBeFocused();

  await expect(guide).toContainText("bookmaker");
  const bookmakerSelect = editor.getByLabel("Bookmaker");
  await expect(bookmakerSelect.locator("..")).toHaveClass(/is-guided-next/);
  await expect(bookmakerSelect).toHaveAttribute("aria-describedby", "sportsbook-guided-entry-message");

  await editor.getByRole("button", { name: "Dismiss sportsbook guided entry" }).click();
  await expect(guide).toHaveCount(0);

  await editor.getByRole("button", { name: "Close sportsbook editor" }).first().click();
  await page
    .getByRole("dialog", { name: "Unsaved tracker changes" })
    .getByRole("button", { name: "Discard Changes" })
    .click();
  await expect(editor).toBeHidden();
  await page.getByRole("button", { name: "Add sportsbook row" }).click();
  const reopenedEditor = page.getByRole("dialog", { name: "Create sportsbook row" });
  await expect(reopenedEditor).toBeVisible();
  await expect(reopenedEditor.locator('[data-pd-id="sportsbook.guided-entry"]')).toBeVisible();
});
