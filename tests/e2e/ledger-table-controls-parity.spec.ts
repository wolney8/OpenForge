import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

function rgbChannels(value: string) {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) throw new Error(`Could not parse rgb colour: ${value}`);
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
  };
}

async function expectLedgerToolbarAfterStats(
  page: import("@playwright/test").Page,
  statLabel: string,
  toolbarLabel: string,
  addAction: string
) {
  const stats = page.getByRole("region", { name: statLabel });
  const toolbar = page.getByRole("toolbar", { name: toolbarLabel });
  const [statsBox, toolbarBox] = await Promise.all([stats.boundingBox(), toolbar.boundingBox()]);
  expect(statsBox).not.toBeNull();
  expect(toolbarBox).not.toBeNull();
  expect(toolbarBox!.y).toBeGreaterThan(statsBox!.y + statsBox!.height - 1);
  const addButton = toolbar.getByRole("button", { name: addAction });
  const filterButton = toolbar.getByRole("button", { name: /filter and column controls/i });
  const filterIcon = filterButton.locator(".table-filter-icon");
  await expect(addButton).toBeVisible();
  await expect(addButton.locator(".material-symbols-outlined")).toHaveText("add");
  await expect(addButton).toContainText("Add Row");
  const [addBox, filterBox, filterIconBox] = await Promise.all([
    addButton.boundingBox(),
    filterButton.boundingBox(),
    filterIcon.boundingBox(),
  ]);
  expect(addBox).not.toBeNull();
  expect(filterBox).not.toBeNull();
  expect(filterIconBox).not.toBeNull();
  expect(addBox!.x + addBox!.width).toBeLessThanOrEqual(filterBox!.x + 1);
  expect(addBox!.width).toBeGreaterThan(filterBox!.width * 2);
  expect(Math.abs(addBox!.height - filterBox!.height)).toBeLessThanOrEqual(3);
  const filterCentreX = filterBox!.x + filterBox!.width / 2;
  const filterCentreY = filterBox!.y + filterBox!.height / 2;
  const iconCentreX = filterIconBox!.x + filterIconBox!.width / 2;
  const iconCentreY = filterIconBox!.y + filterIconBox!.height / 2;
  expect(Math.abs(iconCentreX - filterCentreX)).toBeLessThanOrEqual(2);
  expect(Math.abs(iconCentreY - filterCentreY)).toBeLessThanOrEqual(2);
  const addBackground = rgbChannels(
    await addButton.evaluate((element) => getComputedStyle(element).backgroundColor)
  );
  expect(addBackground.g).toBeGreaterThan(addBackground.r);
  expect(addBackground.g).toBeGreaterThan(addBackground.b);
  await expect(page.getByRole("button", { name: /Collapse ledger|Expand ledger/ })).toHaveCount(0);
}

async function waitForLedgerReady(page: import("@playwright/test").Page, loadingText: string) {
  await expect(page.getByText(loadingText)).toBeHidden({ timeout: 90_000 });
}

test("Sportsbook places its shared controls after the stat cards", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await waitForLedgerReady(page, "Loading sportsbook ledger");
  await expectLedgerToolbarAfterStats(
    page,
    "Sportsbook quick view",
    "Sportsbook ledger controls",
    "Add sportsbook row"
  );
});

test("Free Bets mirrors sportsbook-style table controls", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/free-bets");
  await waitForLedgerReady(page, "Loading free-bet ledger");

  await expect(page.getByRole("columnheader", { name: "Expiry" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Lay Bet" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Back Bet" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Actions" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Delete free-bet row / }).first()).toBeVisible();
  await expectLedgerToolbarAfterStats(page, "Free-bet quick view", "Free-bet ledger controls", "Add free-bet row");

  await page.getByRole("button", { name: "Open free-bet filter and column controls" }).click();
  const dialog = page.getByRole("dialog", { name: "Free-bet filter controls" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Bookmaker", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Offer type (promotion mechanism)", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Issue type", { exact: true })).toBeVisible();
  await expect(dialog.locator('option[value="expiry-watch"]')).toHaveCount(1);
});

test("Casino Offers exposes consistent filter controls and actions column", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/casino-offers");
  await waitForLedgerReady(page, "Loading casino-offer ledger");

  await expect(page.getByRole("columnheader", { name: "Actions" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Delete casino-offer row / }).first()).toBeVisible();
  await expectLedgerToolbarAfterStats(page, "Casino quick view", "Casino-offer ledger controls", "Add casino row");

  await page.getByRole("button", { name: "Open casino-offer filter and column controls" }).click();
  const dialog = page.getByRole("dialog", { name: "Casino-offer filter controls" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Bookmaker", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Offer type", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Result", { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText("Issue type", { exact: true })).toBeVisible();
});

test("Cash Adjustments exposes consistent filter controls and actions column", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/cash-adjustments");
  await waitForLedgerReady(page, "Loading cash-adjustment ledger");

  await expect(page.getByRole("columnheader", { name: "Actions" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Delete cash-adjustment row / }).first()).toBeVisible();
  await expectLedgerToolbarAfterStats(page, "Cash-adjustment quick view", "Cash-adjustment ledger controls", "Add cash adjustment");

  await page.getByRole("button", { name: "Open cash-adjustment filter and column controls" }).click();
  const dialog = page.getByRole("dialog", { name: "Cash-adjustment filter controls" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Direction", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Type", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Calc state", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Issue type", { exact: true })).toBeVisible();
});
