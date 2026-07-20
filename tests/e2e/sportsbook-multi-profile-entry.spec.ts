import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:8010";

async function archiveTemporaryAccount(
  request: APIRequestContext,
  profileId: string,
  accountName: string
) {
  const response = await request.get(`${apiBaseUrl}/profiles/${profileId}/accounts`);
  if (!response.ok()) return;
  const account = ((await response.json()) as Array<Record<string, unknown>>).find(
    (row) => row.account === accountName && row.status !== "Archived"
  );
  if (!account) return;
  await request.put(`${apiBaseUrl}/profiles/${profileId}/accounts/${account.account_id}`, {
    data: { ...account, status: "Archived" },
  });
}

test("Fund Manager reviews and submits a sportsbook copy one profile at a time", async ({
  page,
  request,
}) => {
  const sourceProfileId = "profile-demo-001";
  const targetProfileId = "profile-demo-002";
  const nonce = Date.now();
  const bookmaker = `Copy Profile Bookmaker ${nonce}`;
  const eventName = `Copy Profile Match ${nonce}`;

  expect(
    (
      await request.patch(`http://127.0.0.1:8010/profiles/${targetProfileId}`, {
        data: { status: "Active" },
      })
    ).ok()
  ).toBeTruthy();
  expect(
    (
      await request.post(`http://127.0.0.1:8010/profiles/${targetProfileId}/accounts`, {
        data: {
          account: bookmaker,
          type: "Bookie",
          status: "Active",
          channel: "Online",
        },
      })
    ).ok()
  ).toBeTruthy();
  expect(
    (
      await request.post(`http://127.0.0.1:8010/profiles/${targetProfileId}/accounts`, {
        data: {
          account: `Copy Exchange ${nonce}`,
          type: "Exchange",
          status: "Active",
          channel: "Online",
        },
      })
    ).ok()
  ).toBeTruthy();
  expect(
    (
      await request.put(
        `http://127.0.0.1:8010/profiles/${targetProfileId}/exchange-commissions`,
        { data: { exchange_name: `Copy Exchange ${nonce}`, commission_rate: "0.03" } }
      )
    ).ok()
  ).toBeTruthy();

  const sourceResponse = await request.post(
    `http://127.0.0.1:8010/profiles/${sourceProfileId}/sportsbook-bets`,
    {
      data: {
        event_name: eventName,
        offer_text: "Synthetic shared offer",
        bookmaker,
        offer_type: "Bet & Get",
        bet_type: "Single",
        offer_name: "Bet 10 Get 5",
        fixture_type: "Football",
        market: "Match Odds",
        status: "Prospecting",
        result: "Pending",
        back_stake: "10.00",
        back_odds: "2.10",
        match_strategy: "Standard",
        lay_odds_1: "2.20",
        lay_actual: "",
        lay_matched_stake_1: "",
        lay_commission_1: "",
        exchange_name: "",
        date_settled: "2026-07-22T18:00:00",
        user_notes: "",
        manual_override_value: "",
        manual_override_reason: "",
      },
    }
  );
  expect(sourceResponse.ok()).toBeTruthy();
  const source = await sourceResponse.json();

  await page.goto(`/profiles/${sourceProfileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");
  const row = page.locator(".data-table tbody tr", { hasText: eventName }).first();
  await expect(row).toBeVisible();
  await row
    .getByRole("button", { name: `Copy ${source.sportsbook_bet_id} to other profiles` })
    .click();

  const dialog = page.getByRole("dialog", { name: "Copy sportsbook bet to profiles" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Eligible", { exact: true })).toBeVisible();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Review 1 selected profile" }).click();

  await expect(dialog.getByText("Profile 1 of 1")).toBeVisible();
  await dialog.getByLabel("Back odds").fill("2.14");
  await dialog.getByLabel("Exchange").selectOption(`Copy Exchange ${nonce}`);
  await dialog.getByLabel("Lay odds").fill("2.24");
  await dialog.getByLabel("Actual lay stake").fill("9.55");
  await dialog.getByLabel("Status").selectOption("Placed");
  await dialog.getByRole("button", { name: /Submit for/ }).click();

  await expect(dialog.getByText("Copy review complete")).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toHaveCount(0);

  const targetRows = await (
    await request.get(`http://127.0.0.1:8010/profiles/${targetProfileId}/sportsbook-bets`)
  ).json();
  const copied = targetRows.find((entry: Record<string, string>) => entry.event_name === eventName);
  expect(copied).toBeTruthy();
  expect(copied.back_odds).toBe("2.14");
  expect(copied.exchange_name).toBe(`Copy Exchange ${nonce}`);
  expect(copied.lay_commission_1).toBe("0.03");

  await archiveTemporaryAccount(request, targetProfileId, bookmaker);
  await archiveTemporaryAccount(request, targetProfileId, `Copy Exchange ${nonce}`);
});
