import { expect, test } from "@playwright/test";

test("Casino Free Spins Quick Add saves an explicit zero-own-cash result", async ({ page, request }) => {
  const profileId = "profile-demo-001";
  const beforeResponse = await request.get(`http://127.0.0.1:8010/profiles/${profileId}/casino-offers`);
  expect(beforeResponse.ok()).toBeTruthy();
  const beforeRows = await beforeResponse.json();

  await page.goto(`/profiles/${profileId}/tracker/casino-offers`);
  await page.getByRole("button", { name: "Quick add Free Spins" }).click();

  const dialog = page.getByRole("dialog", { name: "Free Spins" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Quick add Free Spins bookmaker")).not.toHaveValue("");
  await dialog.getByLabel("Quick add Free Spins number of spins").fill("5");
  await dialog.getByLabel("Quick add Free Spins spin stake").fill("0.10");
  await dialog.getByRole("button", { name: "£ 0.00" }).click();
  await dialog.getByRole("button", { name: "Save Free Spins" }).click();
  await expect(dialog).toBeHidden();

  const afterResponse = await request.get(`http://127.0.0.1:8010/profiles/${profileId}/casino-offers`);
  expect(afterResponse.ok()).toBeTruthy();
  const afterRows = await afterResponse.json();
  expect(afterRows).toHaveLength(beforeRows.length + 1);
  const created = afterRows.find((row: { casino_offer_id: string }) =>
    !beforeRows.some((previous: { casino_offer_id: string }) =>
      previous.casino_offer_id === row.casino_offer_id
    )
  );
  expect(created).toMatchObject({
    offer_type: "Free Spins",
    result: "Lose",
    status: "Settled",
    free_spins_value: "0.00",
    final_net_pnl: "0.00",
    own_cash_committed: "0.00",
  });
});

test("Casino Free Spins Quick Add More Details does not persist and can return to Quick Add", async ({ page, request }) => {
  const profileId = "profile-demo-001";
  const beforeResponse = await request.get(`http://127.0.0.1:8010/profiles/${profileId}/casino-offers`);
  const beforeRows = await beforeResponse.json();

  await page.goto(`/profiles/${profileId}/tracker/casino-offers`);
  await page.getByRole("button", { name: "Quick add Free Spins" }).click();
  const dialog = page.getByRole("dialog", { name: "Free Spins" });
  await dialog.getByLabel("Quick add Free Spins converted win amount").fill("1.25");
  await dialog.getByRole("button", { name: "More Details" }).click();

  const editor = page.getByRole("dialog", { name: "Create casino row" });
  await expect(editor.getByLabel("Offer type")).toHaveValue("Free Spins");
  await expect(editor.getByLabel("Converted win amount")).toHaveValue("1.25");
  await editor.getByRole("button", { name: "Back To Quick Add" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Quick add Free Spins converted win amount")).toHaveValue("1.25");
  const afterResponse = await request.get(`http://127.0.0.1:8010/profiles/${profileId}/casino-offers`);
  expect((await afterResponse.json())).toHaveLength(beforeRows.length);
});

test("Casino Free Spins Quick Add normalizes decimal shorthand and shows quick-select chips", async ({ page }) => {
  const profileId = "profile-demo-001";
  await page.goto(`/profiles/${profileId}/tracker/casino-offers`);
  await page.getByRole("button", { name: "Quick add Free Spins" }).click();

  const dialog = page.getByRole("dialog", { name: "Free Spins" });
  const convertedWin = dialog.getByLabel("Quick add Free Spins converted win amount");
  await convertedWin.fill(".30");
  await convertedWin.blur();
  await expect(convertedWin).toHaveValue("0.30");
  await expect(convertedWin.locator("xpath=..")).toHaveClass(/financial-text-input-positive/);
  await expect(dialog.getByText("£", { exact: true }).nth(1)).toBeVisible();
  await expect(dialog.locator("[data-pd-id='casino-quick-add.converted-win-chips']").getByRole("button", { name: "£ 0.20" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "1 spins" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "4 spins" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "5 spins" })).toBeVisible();
  await expect(dialog.locator("[data-pd-id='casino-quick-add.bookmaker-chips'] button").first()).toBeVisible();
  await expect(dialog.locator("[data-pd-id='casino-quick-add.game-chips']").getByRole("button", { name: "Big Bass Bonanza" })).toBeVisible();
  await dialog.getByRole("button", { name: "Big Bass Bonanza" }).click();
  await expect(dialog.getByLabel("Quick add Free Spins game or slot")).toHaveValue("Big Bass Bonanza");
  await dialog.locator("[data-pd-id='casino-quick-add.converted-win-chips']").getByRole("button", { name: "£ 0.20" }).click();
  await expect(convertedWin).toHaveValue("0.20");
  await convertedWin.fill("-.30");
  await convertedWin.blur();
  await expect(convertedWin).toHaveValue("-0.30");
  await expect(convertedWin.locator("xpath=..")).toHaveClass(/financial-text-input-negative/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("Casino Free Spins Quick Add keeps the close control circular and financial input singular", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/casino-offers");
  await page.getByRole("button", { name: "Quick add Free Spins" }).click();
  const dialog = page.getByRole("dialog", { name: "Free Spins" });
  const close = dialog.getByRole("button", { name: "Close Free Spins quick add" });
  const bounds = await close.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { height: rect.height, padding: style.padding, width: rect.width };
  });
  expect(Math.abs(bounds.width - bounds.height)).toBeLessThanOrEqual(1);
  expect(bounds.padding).toBe("0px");

  const convertedWin = dialog.getByLabel("Quick add Free Spins converted win amount");
  await convertedWin.fill("-0.20");
  await convertedWin.blur();
  await expect(convertedWin.locator("xpath=..")).toHaveClass(/financial-text-input-negative/);
  const inputSurface = await convertedWin.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, borderTopWidth: style.borderTopWidth };
  });
  expect(inputSurface.borderTopWidth).toBe("0px");
  expect(inputSurface.background).toBe("rgba(0, 0, 0, 0)");
});
