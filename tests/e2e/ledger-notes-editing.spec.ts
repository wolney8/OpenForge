import { expect, test, type APIRequestContext } from "@playwright/test";

const hostedOnly = () => test.skip(
  process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true",
  "Explicit hosted Preview gate only",
);

test.beforeEach(async ({ page }) => {
  const baseURL = process.env.OPENFORGE_E2E_BASE_URL;
  if (!baseURL) return;
  const session = process.env.OPENFORGE_E2E_SESSION_TOKEN;
  const protection = process.env.OPENFORGE_E2E_VERCEL_COOKIE;
  await page.context().addCookies([
    ...(session ? [{ name: "pd_session", value: session, url: baseURL }] : []),
    ...(protection ? [{ name: "_vercel_jwt", value: protection, url: baseURL }] : []),
  ]);
});

async function createProfile(request: APIRequestContext) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const response = await request.post("/api/profiles/onboarding", { data: {
    accounts: [],
    display_name: `Synthetic CP033 ledger notes ${suffix}`,
    enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments"],
    profile_code: `C33-${suffix}`.slice(0, 32),
    quick_actions: [],
    setup_path: "import",
    tracking_start_date: "2026-09-23",
  }});
  expect(response.status(), await response.text()).toBe(201);
  const profileId = ((await response.json()) as { profile: { profile_id: string } }).profile.profile_id;
  expect((await request.patch(`/api/profiles/${profileId}`, { data: { status: "Active" } })).ok()).toBeTruthy();
  return profileId;
}

async function addAccount(
  request: APIRequestContext,
  profileId: string,
  account: string,
  type: "Bookie" | "Exchange",
) {
  const response = await request.post(`/api/profiles/${profileId}/accounts`, { data: {
    account,
    type,
    status: "Active",
    lifecycle_status: "Active",
    channel: "Online",
    stake_access: "Normal",
    promo_access: "Full",
    restrictions: [],
    ...(type === "Exchange" ? { commission_rate: "0.02" } : {}),
  }});
  expect(response.status()).toBe(201);
  return response.json() as Promise<{ account_id: string }>;
}

test("existing Sportsbook Notes save retains an archived Account and award draft", async ({ page }) => {
  hostedOnly();
  test.setTimeout(180_000);
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  const profileId = await createProfile(page.request);
  const bookie = await addAccount(page.request, profileId, "Bet365", "Bookie");
  await addAccount(page.request, profileId, "Smarkets", "Exchange");
  const payload = {
    event_name: "Synthetic CP033 Account retention",
    offer_text: "Bet and get",
    bookmaker: "Bet365",
    offer_type: "Bet & Get",
    bet_type: "Single",
    offer_name: "",
    fixture_type: "Football",
    market: "Match Odds",
    status: "Placed",
    result: "Pending",
    back_stake: "10.00",
    back_odds: "2.10",
    match_strategy: "Standard",
    lay_odds_1: "2.20",
    lay_actual: "9.54",
    lay_matched_stake_1: "9.54",
    lay_commission_1: "0.02",
    exchange_name: "Smarkets",
    date_settled: "",
    user_notes: "",
    manual_override_value: "",
    manual_override_reason: "",
  };
  const createdResponse = await page.request.post(`/api/profiles/${profileId}/sportsbook-bets`, { data: payload });
  expect(createdResponse.status()).toBe(201);
  const created = await createdResponse.json() as typeof payload & { sportsbook_bet_id: string; reporting_value: string };
  expect((await page.request.delete(`/api/profiles/${profileId}/accounts/${bookie.account_id}`)).status()).toBe(200);

  try {
    await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", {
      name: `Copy ${created.sportsbook_bet_id} to free bets`,
    }).click({ timeout: 30_000 });
    const editor = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await expect(editor).toBeVisible({ timeout: 90_000 });
    await editor.getByRole("tab", { name: /Settlement/ }).click({ timeout: 15_000 });
    const settlement = editor.locator('[data-pd-id="ledger-editor.panel.settlement"]');
    await settlement.getByText("Advanced controls", { exact: true }).click({ timeout: 15_000 });
    await settlement.getByLabel("Notes").fill("Synthetic ordinary note", { timeout: 15_000 });
    await editor.getByRole("tab", { name: "Free Bet" }).click({ timeout: 15_000 });
    const awardDraft = editor.locator('[data-pd-id="ledger-editor.panel.free_bet"]');
    await awardDraft.getByLabel("Notes").fill("Synthetic future award note", { timeout: 15_000 });
    const saveResponse = page.waitForResponse((response) =>
      response.request().method() === "PUT" &&
      response.url().endsWith(`/api/profiles/${profileId}/sportsbook-bets/${created.sportsbook_bet_id}`)
    );
    await editor.locator('[data-pd-id="sportsbook.editor.actions"]').getByRole("button", { name: "Save", exact: true }).click({ timeout: 15_000 });
    expect((await saveResponse).status()).toBe(200);

    const persisted = await (await page.request.get(
      `/api/profiles/${profileId}/sportsbook-bets/${created.sportsbook_bet_id}`
    )).json() as typeof created;
    expect(persisted.user_notes).toBe("Synthetic ordinary note");
    for (const field of ["profile_id", "bookmaker", "status", "result", "back_stake", "back_odds", "lay_actual", "lay_matched_stake_1", "lay_commission_1", "exchange_name", "reporting_value"] as const) {
      expect(persisted[field]).toBe(created[field]);
    }
    const freeBets = await (await page.request.get(`/api/profiles/${profileId}/free-bets`)).json() as unknown[];
    expect(freeBets).toEqual([]);

    await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
    await page.getByRole("button", {
      name: `Copy ${created.sportsbook_bet_id} to free bets`,
    }).click({ timeout: 30_000 });
    const reopened = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await reopened.getByRole("tab", { name: "Free Bet" }).click({ timeout: 15_000 });
    await expect(reopened.locator('[data-pd-id="ledger-editor.panel.free_bet"]').getByLabel("Notes"))
      .toHaveValue("Synthetic future award note");

    const settledResponse = await page.request.put(
      `/api/profiles/${profileId}/sportsbook-bets/${created.sportsbook_bet_id}`,
      { data: { ...payload, status: "Settled", result: "Back Won", date_settled: "2026-09-23 12:00", user_notes: "Settled with note" } },
    );
    expect(settledResponse.status(), await settledResponse.text()).toBe(200);
    const settled = await settledResponse.json() as typeof created;

    await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
    await page.getByRole("button", {
      name: `Copy ${created.sportsbook_bet_id} to free bets`,
    }).click({ timeout: 30_000 });
    const settledEditor = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await settledEditor.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]:visible').click();
    await settledEditor.getByRole("tab", { name: /Settlement/ }).click();
    const settledPanel = settledEditor.locator('[data-pd-id="ledger-editor.panel.settlement"]');
    await settledPanel.getByText("Advanced controls", { exact: true }).click();
    await settledPanel.getByLabel("Notes").fill("Synthetic settled note edit");
    const settledSaveResponse = page.waitForResponse((response) =>
      response.request().method() === "PUT" &&
      response.url().endsWith(`/api/profiles/${profileId}/sportsbook-bets/${created.sportsbook_bet_id}`)
    );
    await settledEditor.getByRole("button", { name: "Save Edits", exact: true }).click();
    expect((await settledSaveResponse).status()).toBe(200);

    const afterSettledNote = await (await page.request.get(
      `/api/profiles/${profileId}/sportsbook-bets/${created.sportsbook_bet_id}`
    )).json() as typeof created;
    expect(afterSettledNote.user_notes).toBe("Synthetic settled note edit");
    for (const field of ["profile_id", "bookmaker", "status", "result", "back_stake", "back_odds", "lay_actual", "lay_matched_stake_1", "lay_commission_1", "exchange_name", "date_settled", "reporting_value"] as const) {
      expect(afterSettledNote[field]).toBe(settled[field]);
    }
    expect(await (await page.request.get(`/api/profiles/${profileId}/free-bets`)).json()).toEqual([]);
    expect(browserErrors).toEqual([]);
  } finally {
    await page.request.patch(`/api/profiles/${profileId}`, { data: { status: "Archived" }, timeout: 15_000 })
      .catch(() => undefined);
  }
});

test("settled Final Value and Advanced controls stay usable throughout a Notes draft", async ({ page }, testInfo) => {
  hostedOnly();
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
  const profileId = await createProfile(page.request);
  await addAccount(page.request, profileId, "Bet365", "Bookie");
  await addAccount(page.request, profileId, "Smarkets", "Exchange");
  const payload = {
    event_name: "Synthetic CP036 settled editor",
    offer_text: "Bet and get",
    bookmaker: "Bet365",
    offer_type: "Bet & Get",
    bet_type: "Single",
    offer_name: "",
    fixture_type: "Football",
    market: "Match Odds",
    status: "Settled",
    result: "Back Won",
    back_stake: "10.00",
    back_odds: "2.10",
    match_strategy: "Standard",
    lay_odds_1: "2.20",
    lay_actual: "9.54",
    lay_matched_stake_1: "9.54",
    lay_commission_1: "0.02",
    exchange_name: "Smarkets",
    date_settled: "2026-09-24 12:00",
    user_notes: "Saved note",
    manual_override_value: "",
    manual_override_reason: "",
  };
  const createResponse = await page.request.post(`/api/profiles/${profileId}/sportsbook-bets`, {
    data: payload,
  });
  expect(createResponse.status(), await createResponse.text()).toBe(201);
  const created = await createResponse.json() as typeof payload & {
    sportsbook_bet_id: string;
    reporting_value: string;
  };
  let previewRequests = 0;
  let updateRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/sportsbook-bets/preview")) {
      previewRequests += 1;
    }
    if (request.method() === "PUT" && request.url().endsWith(`/sportsbook-bets/${created.sportsbook_bet_id}`)) {
      updateRequests += 1;
    }
  });

  try {
    await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: `Copy ${created.sportsbook_bet_id} to free bets` }).click({ timeout: 30_000 });
    const editor = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await editor.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]:visible').click();
    await editor.getByRole("tab", { name: /Settlement/ }).click();
    const settlement = editor.locator('[data-pd-id="ledger-editor.panel.settlement"]');
    const finalValue = settlement.locator('[data-pd-id="sportsbook.settlement.outcomes"]');
    await expect(finalValue).toBeVisible({ timeout: 30_000 });
    const confirmedFinancialValue = finalValue.locator(".financial-value").first();
    const confirmedLabel = await confirmedFinancialValue.getAttribute("aria-label");
    expect(confirmedLabel).toBeTruthy();
    const editorBody = editor.locator(".workflow-editor-body");
    const pageScrollBefore = await page.evaluate(() => window.scrollY);
    const trigger = settlement.locator("button.editor-section-summary, summary", {
      hasText: "Advanced controls",
    }).first();
    await trigger.click();
    await expect(trigger).toBeFocused();
    const notes = settlement.getByLabel("Notes");
    const firstAdvancedControl = settlement.getByLabel("Manual override value");
    await expect(firstAdvancedControl).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBe(pageScrollBefore);

    const previewsBeforeTyping = previewRequests;
    for (const character of " draft") {
      await notes.pressSequentially(character, { delay: 20 });
      await expect(finalValue).toBeVisible();
      await expect(confirmedFinancialValue).toHaveAttribute("aria-label", confirmedLabel!);
      await expect(notes).toBeFocused();
    }
    await page.waitForTimeout(400);
    await expect(finalValue).toBeVisible();
    await expect(confirmedFinancialValue).toHaveAttribute("aria-label", confirmedLabel!);
    expect(previewRequests).toBe(previewsBeforeTyping);
    expect(updateRequests).toBe(0);
    await page.screenshot({ path: testInfo.outputPath("settled-editor-desktop-light.png") });

    const manualScrollTop = await editorBody.evaluate((element) => {
      element.scrollTop = Math.min(element.scrollHeight - element.clientHeight, element.scrollTop + 24);
      return element.scrollTop;
    });
    await notes.type(" retained");
    await page.waitForTimeout(300);
    expect(await editorBody.evaluate((element) => element.scrollTop)).toBe(manualScrollTop);

    await editor.getByRole("button", { name: "Close sportsbook editor" }).click();
    await page.locator('[data-pd-id="unsaved-changes.dialog"]').getByRole("button", { name: "Discard Changes" }).click();
    const persisted = await (await page.request.get(
      `/api/profiles/${profileId}/sportsbook-bets/${created.sportsbook_bet_id}`
    )).json() as typeof created;
    expect(persisted.user_notes).toBe("Saved note");
    expect(persisted.reporting_value).toBe(created.reporting_value);
    expect(updateRequests).toBe(0);

    await page.setViewportSize({ width: 760, height: 900 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.getByRole("button", { name: `Copy ${created.sportsbook_bet_id} to free bets` }).click({ timeout: 30_000 });
    const compactEditor = page.getByRole("dialog", { name: "Edit sportsbook row" });
    const compactEdit = compactEditor.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]:visible');
    await compactEdit.focus();
    await compactEdit.press("Enter");
    await compactEditor.getByRole("tab", { name: /Settlement/ }).click();
    const compactSettlement = compactEditor.locator('[data-pd-id="ledger-editor.panel.settlement"]');
    const compactTrigger = compactSettlement.getByRole("button", { name: "Advanced controls" });
    await compactTrigger.focus();
    await compactTrigger.press("Enter");
    await expect(compactTrigger).toBeFocused();
    await expect(compactSettlement.getByLabel("Manual override value")).toBeInViewport();
    await expect.poll(async () => compactEditor.evaluate((dialog) => {
      const control = dialog.querySelector<HTMLInputElement>("input[aria-label='Manual override value']") ??
        Array.from(dialog.querySelectorAll<HTMLInputElement>("input")).find((input) =>
          input.closest("label")?.textContent?.includes("Manual override value"));
      const footer = dialog.querySelector<HTMLElement>(".workflow-editor-footer");
      if (!control || !footer) return Number.NEGATIVE_INFINITY;
      return footer.getBoundingClientRect().top - control.getBoundingClientRect().bottom;
    })).toBeGreaterThanOrEqual(-1);
    const compactGeometry = await compactEditor.locator(".workflow-editor-body").evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(compactGeometry.scrollWidth).toBeLessThanOrEqual(compactGeometry.clientWidth + 1);
    await page.screenshot({ path: testInfo.outputPath("settled-editor-compact-dark-reduced-motion.png") });
    await compactEditor.getByRole("button", { name: "Close sportsbook editor" }).click();

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await page.getByRole("button", { name: `Copy ${created.sportsbook_bet_id} to free bets` }).click({ timeout: 30_000 });
    const enlargedEditor = page.getByRole("dialog", { name: "Edit sportsbook row" });
    const enlargedEdit = enlargedEditor.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]:visible');
    await enlargedEdit.focus();
    await enlargedEdit.press("Enter");
    await enlargedEditor.getByRole("tab", { name: /Settlement/ }).click();
    const enlargedSettlement = enlargedEditor.locator('[data-pd-id="ledger-editor.panel.settlement"]');
    const enlargedTrigger = enlargedSettlement.getByRole("button", { name: "Advanced controls" });
    await enlargedTrigger.focus();
    await enlargedTrigger.press("Enter");
    await expect(enlargedSettlement.getByLabel("Manual override value")).toBeInViewport();
    const enlargedGeometry = await enlargedEditor.locator(".workflow-editor-body").evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(enlargedGeometry.scrollWidth).toBeLessThanOrEqual(enlargedGeometry.clientWidth + 1);
    await page.screenshot({ path: testInfo.outputPath("settled-editor-enlarged-text.png") });
    await enlargedEditor.getByRole("button", { name: "Close sportsbook editor" }).click();
  } finally {
    await page.request.patch(`/api/profiles/${profileId}`, { data: { status: "Archived" } }).catch(() => undefined);
  }
});
