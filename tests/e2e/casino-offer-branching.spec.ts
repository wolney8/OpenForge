import { expect, test, type Locator, type Page } from "@playwright/test";

test.setTimeout(120_000);

async function activateLedgerTab(editor: Locator, tabId: string): Promise<void> {
  const tab = editor.locator(`[data-pd-id="ledger-editor.tab.${tabId}"]`);
  await expect(tab).toBeVisible();
  await tab.click({ force: true });
}

async function openCasinoEditor(page: Page): Promise<Locator> {
  await page.goto("/profiles/profile-demo-001/tracker/casino-offers");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add casino row" }).click();

  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toBeVisible();
  await editor.getByLabel("Date started").fill("2026-07-15T09:00");
  await editor.getByLabel("Bookmaker").selectOption("Bookmaker A");
  return editor;
}

test("Casino Offers branches editor steps by offer type and derives settles from start", async ({
  page,
}) => {
  await page.goto("/profiles/profile-demo-001/tracker/casino-offers");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add casino row" }).click();

  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toBeVisible();

  const dateStarted = editor.getByLabel("Date started");
  await expect(editor.getByLabel("Date settling")).toHaveCount(0);
  await editor.getByRole("button", { name: "Set casino start date to now" }).click();
  await expect(dateStarted).not.toHaveValue("");
  await dateStarted.fill("2026-07-15T13:30");

  await editor.getByLabel("Bookmaker").selectOption("Bookmaker A");
  await editor.getByLabel("Offer name").fill("Manual casino campaign");
  await expect(editor.getByLabel("Offer name")).toHaveValue("Manual casino campaign");
  const offerType = editor.getByLabel("Offer type");
  await expect(offerType.locator("option", { hasText: "Wager & Get Free Spins" })).toHaveCount(1);
  await expect(offerType.locator("option", { hasText: "Deposit Bonus Wagering" })).toHaveCount(1);
  await expect(editor.locator('[data-pd-id="casino-offers.editor.offer-type-help"]')).toContainText(
    "Choose the casino workflow"
  );

  await offerType.selectOption("Cashback / Loss Back");
  await expect(editor.locator('[data-pd-id="casino-offers.editor.offer-type-help"]')).toContainText(
    "cashback or loss-back amount"
  );
  await expect(editor.getByRole("tab", { name: "Wagering: not started" })).toBeVisible();
  await activateLedgerTab(editor, "campaign");
  await expect(editor.getByText("Cashback economics", { exact: true })).toBeVisible();
  await expect(editor.getByLabel("Cashback amount")).toBeVisible();
  await expect(editor.getByLabel("Free spins awarded")).toHaveCount(0);
  await expect(editor.locator('input[value="Record the qualifying stake first, then the cashback amount."]')).toHaveCount(0);

  await activateLedgerTab(editor, "setup");
  await offerType.selectOption("Free Spins");
  await expect(editor.locator('[data-pd-id="casino-offers.editor.offer-type-help"]')).toContainText(
    "cash converted from those spins"
  );
  await expect(editor.locator('[data-pd-id="ledger-editor.tab.campaign"]')).toHaveCount(0);
  await expect(editor.getByRole("tab", { name: "Reward: not started" })).toBeVisible();
  await activateLedgerTab(editor, "reward");
  await expect(editor.getByText("Spin Conversion", { exact: true })).toBeVisible();
  await expect(editor.getByRole("textbox", { name: /Free spins awarded/i })).toBeVisible();
  await expect(editor.getByRole("textbox", { name: /Converted win amount/i })).toBeVisible();
  await expect(editor.getByLabel("Cashback amount")).toHaveCount(0);
  await expect(editor.locator('input[value="Not used on Free Spins rows."]')).toHaveCount(0);
});

test("Casino Offers supports free-spins reward and settlement value flow", async ({ page }) => {
  const editor = await openCasinoEditor(page);
  await editor.getByLabel("Offer name").fill("Daily 20 free spins");
  await editor.getByLabel("Offer type").selectOption("Free Spins");

  await expect(editor.locator('[data-pd-id="ledger-editor.tab.campaign"]')).toHaveCount(0);
  await expect(editor.getByRole("tab", { name: "Reward: not started" })).toBeVisible();
  await activateLedgerTab(editor, "reward");

  const spinStakeInput = editor.getByRole("textbox", { name: /Spin stake/i });
  const convertedWinInput = editor.getByRole("textbox", { name: /Converted win amount/i });
  await expect(editor.locator('[data-pd-id="casino-offers.editor.spin-stake-chips"]')).toBeVisible();
  await editor.getByRole("button", { name: "£ 0.20" }).click();
  await expect(spinStakeInput).toHaveValue("0.20");
  await editor.getByRole("button", { name: "£ 0.00" }).click();
  await expect(convertedWinInput).toHaveValue("0.00");

  await spinStakeInput.fill(".1");
  await spinStakeInput.blur();
  await expect(spinStakeInput).toHaveValue("0.10");
  await editor.getByRole("textbox", { name: /Free spins awarded/i }).fill("20");
  await convertedWinInput.fill("2.4");
  await convertedWinInput.blur();
  await expect(convertedWinInput).toHaveValue("2.40");
  await editor.getByRole("textbox", { name: /Reward wagering multiplier/i }).fill("10");
  await expect(editor.getByRole("textbox", { name: /Reward wager target/i })).toHaveValue("24.00");
  await expect(editor.locator('[data-pd-id="casino-offers.editor.reward-spins-helper.target"] strong')).toHaveText(
    /£\s*24\.00/
  );
  await expect(
    editor.locator('[data-pd-id="casino-offers.editor.reward-spins-helper.spins-needed"] strong')
  ).toHaveText("240");
  await expect(editor.getByRole("tab", { name: "Reward: complete" })).toBeVisible();

  await activateLedgerTab(editor, "settlement");
  await expect(editor.locator('[data-pd-id="casino-offers.editor.settlement-outcomes"]')).toContainText(/£\s*2\.40/);
});

test("Casino Offers marks deposit bonus reward complete when converted value is filled", async ({ page }) => {
  const editor = await openCasinoEditor(page);
  await editor.getByLabel("Offer name").fill("Deposit bonus reward check");
  await editor.getByLabel("Offer type").selectOption("Deposit And Bonus Wagering");

  await activateLedgerTab(editor, "campaign");
  await editor.locator('[data-guided-field="cash_stake"] input').fill("10");
  await editor.locator('[data-guided-field="bonus_amount"] input').fill("10");
  await editor.locator('[data-guided-field="wager_multiplier"] input').fill("20");
  await editor.locator('[data-guided-field="wager_target"] input').fill("200");
  await editor.locator('[data-guided-field="spin_stake"] input').fill("0.10");
  await editor.locator('[data-guided-field="spin_stake"] input').blur();

  await expect(editor.getByRole("tab", { name: "Wagering: complete" })).toBeVisible();
  await expect(editor.getByRole("tab", { name: "Reward: not started" })).toBeVisible();

  await activateLedgerTab(editor, "reward");
  await editor.locator('[data-guided-field="free_spins_value"] input').fill("7");
  await editor.locator('[data-guided-field="free_spins_value"] input').blur();

  await expect(editor.getByRole("tab", { name: "Reward: complete" })).toBeVisible();
});

test("Casino Offers guided access routes draft rows beyond offer setup", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/casino-offers");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add casino row" }).click();

  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toBeVisible();

  await editor.getByLabel("Offer name").fill("Guided wager reward");
  await editor.getByLabel("Date started").fill("2026-07-15T09:00");
  await editor.getByLabel("Bookmaker").selectOption("Bookmaker A");
  await editor.getByLabel("Offer type").selectOption("Wager To Earn Reward");

  const guidedEntry = editor.locator('[data-pd-id="casino-offers.guided-entry"]');
  await expect(guidedEntry).toBeVisible();
  await expect(guidedEntry).toContainText("Go to");
  await expect(guidedEntry).toContainText("Wagering");
  await expect(guidedEntry).toContainText("Add The Cash Stake.");
  await expect(editor.locator("#casino-guided-entry-message")).toBeVisible();

  await editor.locator('[data-pd-id="casino-offers.guided-entry"] .guided-entry-action').click();
  await expect(editor.locator('[data-pd-id="ledger-editor.panel.campaign"]')).toBeVisible();
  const cashStakeInput = editor.locator('[data-guided-field="cash_stake"] input');
  await expect(cashStakeInput).toBeFocused();
  await expect(cashStakeInput).toHaveAttribute("aria-describedby", "casino-guided-entry-message");

  await activateLedgerTab(editor, "setup");
  await editor.getByLabel("Offer type").selectOption("Free Spins");
  await expect(guidedEntry).toContainText("Reward");
  await expect(guidedEntry).toContainText("Add The Spin Stake.");

  await editor.locator('[data-pd-id="casino-offers.guided-entry"] .guided-entry-action').click();
  await expect(editor.locator('[data-pd-id="ledger-editor.panel.reward"]')).toBeVisible();
  await expect(editor.locator('[data-guided-field="spin_stake"] input')).toBeFocused();

  await editor.locator('[data-guided-field="spin_stake"] input').fill("0.10");
  await editor.locator('[data-guided-field="spin_stake"] input').blur();
  await editor.getByRole("textbox", { name: /Free spins awarded/i }).fill("10");
  await editor.getByRole("textbox", { name: /Converted win amount/i }).fill("0.00");
  await editor.getByRole("textbox", { name: /Converted win amount/i }).blur();
  await expect(editor.getByRole("tab", { name: "Reward: complete" })).toBeVisible();
  await expect(guidedEntry).toBeHidden();
  await expect(editor.locator('[data-pd-id="casino-offers.guided-entry.restore"]')).toBeHidden();

  await activateLedgerTab(editor, "settlement");
  await editor.getByLabel("Status").selectOption("Settled");
  await activateLedgerTab(editor, "setup");
  await expect(guidedEntry).toContainText("Go to");
  await expect(guidedEntry).toContainText("Settlement");
  await expect(guidedEntry).toContainText("Choose The Outcome.");

  await editor.locator('[data-pd-id="casino-offers.guided-entry"] .guided-entry-action').click();
  await expect(editor.locator('[data-pd-id="ledger-editor.panel.settlement"]')).toBeVisible();
  await expect(editor.locator('[data-guided-field="result"] select')).toBeFocused();

  await editor.getByRole("button", { name: "Dismiss casino guided entry" }).click();
  await expect(editor.locator('[data-pd-id="casino-offers.guided-entry"]')).toBeHidden();
  await expect(editor.locator('[data-pd-id="casino-offers.guided-entry.restore"]')).toBeVisible();
  await editor.locator('[data-pd-id="casino-offers.guided-entry.restore"]').click();
  await expect(editor.locator('[data-pd-id="casino-offers.guided-entry"]')).toBeVisible();
});
