import { expect, test } from "@playwright/test";

test("Casino outcome modal follows the same status and result lifecycle rules as the editor", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";

  const createResponse = await request.post(`http://127.0.0.1:8010/profiles/${profileId}/casino-offers`, {
    data: {
      offer_group_id: "",
      date_started: "2026-07-20T18:00:00",
      date_settling: "2026-07-22T18:00:00",
      expiry_datetime: "2026-07-25T18:00:00",
      bookmaker: "Bookmaker A",
      offer_type: "Free Spins",
      offer_name: "Casino Lifecycle Campaign",
      game: "Lifecycle Slots",
      cash_stake: "",
      credit_amount: "",
      bonus_amount: "",
      wager_multiplier: "",
      wager_target: "",
      required_spins: "",
      spin_stake: "0.20",
      free_spins_awarded: "20",
      free_spins_value: "4.00",
      status: "Started",
      result: "Pending",
      calc_net_pnl: "0.00",
      final_net_pnl: "",
      user_notes: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  await page.goto(`/profiles/${profileId}/tracker/casino-offers`);
  await page.waitForLoadState("networkidle");

  const row = page.locator(".data-table tbody tr", { hasText: "Lifecycle Slots" }).first();
  await row.locator(".table-action-button").nth(1).click();

  const modal = page.locator('.modal-panel[aria-label="Update casino outcome"]');
  await expect(modal).toBeVisible();

  const statusSelect = modal.locator('label.field-control:has(span:text-is("Status")) select');
  const outcomeSelect = modal.locator('label.field-control:has(span:text-is("Outcome")) select');

  await outcomeSelect.selectOption("Win");
  await expect(statusSelect).toHaveValue("Settled");

  await statusSelect.selectOption("Started");
  await expect(outcomeSelect).toHaveValue("Pending");

  await outcomeSelect.selectOption("Void");
  await expect(statusSelect).toHaveValue("Settled");

  await modal.getByRole("button", { name: "Save" }).click();
  await expect(modal).toHaveCount(0);

  const savedRowResponse = await request.get(
    `http://127.0.0.1:8010/profiles/${profileId}/casino-offers/${createdRow.casino_offer_id}`
  );
  expect(savedRowResponse.ok()).toBeTruthy();
  const savedRow = await savedRowResponse.json();
  expect(savedRow.status).toBe("Settled");
  expect(savedRow.result).toBe("Void");
});
