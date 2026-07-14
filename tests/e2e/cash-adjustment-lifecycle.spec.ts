import { expect, test } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:8010";
const profileId = "profile-demo-001";

test("cash adjustment enforces direction rules, saves a signed value, and returns to the ledger", async ({
  page,
  request,
}) => {
  const description = `Synthetic withdrawal ${Date.now()}`;
  let createdAdjustmentId = "";

  try {
    await page.goto(`/profiles/${profileId}/tracker/cash-adjustments`);
    await page.getByRole("button", { name: "Add cash adjustment" }).click();

    const dialog = page.getByRole("dialog", { name: "Create cash adjustment" });
    const direction = page.getByRole("combobox", { name: "Direction", exact: true });
    const adjustmentType = page.getByRole("combobox", { name: "Adjustment type", exact: true });

    await expect(direction).toHaveValue("Out");
    await expect(adjustmentType).toHaveValue("Withdrawal");
    await direction.selectOption("In");
    await expect(adjustmentType.locator('option[value="Withdrawal"]')).toHaveCount(0);
    await expect(adjustmentType.locator('option[value="Deduction"]')).toHaveCount(0);

    await direction.selectOption("Out");
    await expect(adjustmentType.locator('option[value="Deposit"]')).toHaveCount(0);
    await expect(adjustmentType.locator('option[value="TopUp"]')).toHaveCount(0);
    await adjustmentType.selectOption("Withdrawal");
    await page.getByLabel("Adjustment date", { exact: true }).fill("2026-07-14T12:00");
    await page.getByLabel("Amount", { exact: true }).fill("10.00");
    await page.getByLabel("Description", { exact: true }).fill(description);
    await expect(page.getByLabel("Signed value preview", { exact: true })).toHaveValue("-£10.00");

    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("table")).toContainText(description);
    await expect(page.locator(".status-toast-success")).toContainText(
      "Created cash adjustment"
    );

    const rowsResponse = await request.get(`${apiBaseUrl}/profiles/${profileId}/cash-adjustments`);
    expect(rowsResponse.ok()).toBeTruthy();
    const rows = (await rowsResponse.json()) as Array<{
      cash_adjustment_id: string;
      description: string;
      signed_amount: string;
    }>;
    const createdRow = rows.find((row) => row.description === description);
    expect(createdRow).toBeDefined();
    expect(createdRow?.signed_amount).toBe("-10.00");
    createdAdjustmentId = createdRow!.cash_adjustment_id;
  } finally {
    if (createdAdjustmentId) {
      const deleteResponse = await request.delete(
        `${apiBaseUrl}/profiles/${profileId}/cash-adjustments/${createdAdjustmentId}`
      );
      expect(deleteResponse.ok()).toBeTruthy();
    }
  }
});
