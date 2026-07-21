import { expect, test } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:8010";

test("Casino common combo prefills an unsaved profile-aware draft", async ({ page, request }) => {
  const created = await request.post(`${apiBaseUrl}/fund-manager/common-bet-combos`, {
    data: {
      name: "Demo Casino Spins Combo",
      ledger_type: "Casino",
      bookmakers: [],
      offer_type: "Free Spins",
      offer_name: "Demo Weekly Spins",
      game: "Demo Slot",
      spin_stake: "0.10",
      free_spins_awarded: "20",
      free_spins_value: "2",
    },
  });
  expect(created.ok()).toBeTruthy();
  const preset = await created.json();
  const beforeRows = await request.get(`${apiBaseUrl}/profiles/profile-demo-001/casino-offers`);
  const beforeCount = (await beforeRows.json()).length;

  try {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Manage Common Bet Combos" }).click();
    const settingsDialog = page.getByRole("dialog", { name: "Manage common bet combos" });
    await settingsDialog.getByLabel("Search common bet combos").fill("Demo Casino Spins Combo");
    await settingsDialog.getByRole("button", { name: "Edit Demo Casino Spins Combo" }).click();
    await expect(settingsDialog.getByLabel("Combo ledger")).toHaveValue("Casino");
    await expect(settingsDialog.getByLabel("Game / Slot")).toHaveValue("Demo Slot");
    await expect(settingsDialog.getByLabel("Preferred Strategy")).toHaveCount(0);
    await settingsDialog.getByRole("button", { name: "Close common bet combos" }).click();

    await page.goto("/profiles/profile-demo-001/tracker/casino-offers");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Add casino row" }).click();

    const editor = page.getByRole("dialog", { name: "Create casino row" });
    await editor.getByLabel("Apply casino common combo").selectOption(preset.preset_id);

    await expect(editor.getByLabel("Offer type")).toHaveValue("Free Spins");
    await expect(editor.getByLabel("Campaign tag (optional)")).toHaveValue("Demo Weekly Spins");
    await expect(editor.getByLabel("Game / slot")).toHaveValue("Demo Slot");
    await expect(editor.getByLabel("Free spins awarded")).toHaveValue("20.00");
    await expect(editor.getByLabel("Free spins value")).toHaveValue("2.00");
    await expect(editor.getByLabel("Date started")).toHaveValue("");
    await expect(editor.getByLabel("Date settling")).toHaveValue("");

    const afterRows = await request.get(`${apiBaseUrl}/profiles/profile-demo-001/casino-offers`);
    expect((await afterRows.json()).length).toBe(beforeCount);
  } finally {
    await request.put(`${apiBaseUrl}/fund-manager/common-bet-combos/${preset.preset_id}`, {
      data: { ...preset, status: "Archived" },
    });
  }
});
