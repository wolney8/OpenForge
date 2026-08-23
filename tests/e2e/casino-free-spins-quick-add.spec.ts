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

test("Casino Free Spins Quick Add More Details does not persist", async ({ page, request }) => {
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
  const afterResponse = await request.get(`http://127.0.0.1:8010/profiles/${profileId}/casino-offers`);
  expect((await afterResponse.json())).toHaveLength(beforeRows.length);
});
