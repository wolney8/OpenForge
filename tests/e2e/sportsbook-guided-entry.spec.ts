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
  await expect(guide).toContainText("Offer Name");
  await expect(guide.locator("strong")).not.toHaveText(/^$/);
  await expect(guide.locator("strong")).not.toHaveText(/^Next required$/i);

  const offerField = editor.locator("label", { hasText: /^Offer$/ });
  await expect(offerField).toHaveClass(/is-guided-next/);

  const offerInput = editor.getByLabel("Offer", { exact: true });
  await expect(offerInput).toHaveAttribute("aria-describedby", "sportsbook-guided-entry-message");
  await offerInput.fill("Guided entry demo offer");
  await expect(offerInput).toBeFocused();

  await expect(guide).toContainText("Bookmaker");
  const bookmakerField = editor.locator('[data-guided-field="bookmaker"]');
  const bookmakerSelect = bookmakerField.locator("select");
  await expect(bookmakerField).toHaveClass(/is-guided-next/);
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

test("sportsbook guided entry hides lay fields for no-lay rows", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });

  await page.getByRole("button", { name: "Add sportsbook row" }).click();

  const editor = page.getByRole("dialog", { name: "Create sportsbook row" });
  await expect(editor).toBeVisible();

  await editor.getByLabel("Offer", { exact: true }).fill("Guided no-lay demo offer");
  await editor.locator('[data-guided-field="bookmaker"] select').selectOption({ index: 1 });
  await editor.getByLabel("Bet type (bet shape / placement)").selectOption({ label: "Single" });
  await editor.getByLabel("Offer type").selectOption({ label: "Mug Bet" });
  await editor.locator("label", { hasText: /^Fixture type/i }).locator("select").selectOption({ label: "Football" });
  await editor.getByLabel("Event name").fill("Guided no-lay demo event");

  await editor.getByRole("button", { name: /Matching/ }).click();
  await editor.getByLabel("Back stake").fill("10");
  await editor.getByLabel("Back odds").fill("2.00");
  await editor.getByLabel("Sportsbook lay workflow mode").selectOption({ label: "No Lay" });

  await expect(editor.getByLabel("Exchange")).toHaveCount(0);
  await expect(editor.getByLabel("Lay odds 1")).toHaveCount(0);
  await expect(editor.getByLabel("Lay actual")).toHaveCount(0);
  await expect(editor.locator('[data-pd-id="sportsbook.guided-entry"]')).toHaveCount(0);
});

test("sportsbook guided entry supports keyboard activation without motion", async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });
  await page.getByRole("button", { name: "Add sportsbook row" }).click();

  const editor = page.getByRole("dialog", { name: "Create sportsbook row" });
  const guide = editor.locator('[data-pd-id="sportsbook.guided-entry"]');
  const offer = editor.getByLabel("Offer", { exact: true });
  await expect(guide).toBeVisible();
  await guide.getByRole("button", { name: /Next required/i }).focus();
  await page.keyboard.press("Enter");
  await expect(offer).toBeFocused();
  await expect(guide).toHaveClass(/guided-entry-banner/);
  await expect
    .poll(() =>
      guide.evaluate((element) => getComputedStyle(element, "::after").animationName)
    )
    .toBe("none");
});
