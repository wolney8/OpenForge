import { expect, test } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:8010";
const temporaryAccounts: Array<{ account: string; profileId: string }> = [];
const temporaryOffers = new Set<string>();

test.afterEach(async ({ request }) => {
  const offers = [...temporaryOffers];
  temporaryOffers.clear();
  for (const profileId of ["profile-demo-001", "profile-demo-002"]) {
    const response = await request.get(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`);
    if (!response.ok()) continue;
    const rows = (await response.json()) as Array<Record<string, unknown>>;
    for (const row of rows) {
      if (!offers.includes(String(row.offer_text))) continue;
      await request.delete(
        `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${row.sportsbook_bet_id}`
      );
    }
  }
  const opportunitiesResponse = await request.get(
    `${apiBaseUrl}/multi-profile-opportunities?include_complete=true`
  );
  if (opportunitiesResponse.ok()) {
    for (const opportunity of (await opportunitiesResponse.json()) as Array<
      Record<string, unknown>
    >) {
      if (!offers.includes(String(opportunity.offer_text))) continue;
      await request.delete(
        `${apiBaseUrl}/multi-profile-opportunities/${opportunity.opportunity_id}`
      );
    }
  }
  for (const { account, profileId } of temporaryAccounts.splice(0)) {
    const response = await request.get(`${apiBaseUrl}/profiles/${profileId}/accounts`);
    if (!response.ok()) continue;
    const matches = ((await response.json()) as Array<Record<string, unknown>>).filter(
      (row) => row.account === account && row.status !== "Archived"
    );
    for (const row of matches) {
      await request.put(`${apiBaseUrl}/profiles/${profileId}/accounts/${row.account_id}`, {
        data: { ...row, status: "Archived" },
      });
    }
  }
});

test("Opportunity loading state remains contained and omits the duplicate header close action", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.route("**/multi-profile-opportunities", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 750));
    await route.continue();
  });
  await page.route("**/account-catalogue/source", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await route.continue();
  });

  await page.goto("/profiles");
  await page.getByRole("button", { name: "Add Opportunity" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Add sportsbook opportunity across profiles",
  });
  await expect(dialog).toBeVisible();
  const loadingIndicator = dialog.locator('[data-pd-id="multi-profile-opportunity.loading"]');
  await expect(loadingIndicator).toBeVisible();
  await expect(loadingIndicator).toContainText("Loading opportunity setup");
  await expect(dialog.getByRole("button", { name: "Close opportunity workflow" })).toHaveCount(0);

  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  });
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  await expect(dialog.locator('[data-pd-id="multi-profile-opportunity.header"]')).toBeInViewport();
  await expect(dialog.locator('[data-pd-id="multi-profile-opportunity.footer"]')).toBeInViewport();

  await expect(loadingIndicator).toBeHidden({
    timeout: 20_000,
  });
  await expect(dialog.getByRole("button", { name: "Close opportunity workflow" })).toBeVisible();
  await expect(dialog.getByLabel("Expected Settlement date")).toBeVisible();
  await expect(dialog.getByLabel("Expected Settlement time")).toBeDisabled();
});

test("Fund Manager creates and records one opportunity across eligible profiles", async ({
  page,
  request,
}) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://127.0.0.1:3010",
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  const profileIds = ["profile-demo-001", "profile-demo-002"];
  const profiles = await Promise.all(
    profileIds.map(async (profileId) => {
      const response = await request.get(`http://127.0.0.1:8010/profiles/${profileId}`);
      expect(response.ok()).toBeTruthy();
      return response.json() as Promise<{ profile_id: string; display_name: string }>;
    })
  );
  const exchange = `Opportunity Exchange ${Date.now()}`;
  const bookmaker = `Opportunity Bookmaker ${Date.now()}`;

  for (const [profileIndex, profileId] of profileIds.entries()) {
    temporaryAccounts.push({ account: bookmaker, profileId }, { account: exchange, profileId });
    expect(
      (
        await request.patch(`http://127.0.0.1:8010/profiles/${profileId}`, {
          data: { status: "Active" },
        })
      ).ok()
    ).toBeTruthy();
    expect(
      (
        await request.post(`http://127.0.0.1:8010/profiles/${profileId}/accounts`, {
          data: {
            account: bookmaker,
            type: "Bookie",
            status: profileIndex === 1 ? "Limited" : "Active",
            channel: "Online",
          },
        })
      ).ok()
    ).toBeTruthy();
    expect(
      (
        await request.post(`http://127.0.0.1:8010/profiles/${profileId}/accounts`, {
          data: {
            account: exchange,
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
          `http://127.0.0.1:8010/profiles/${profileId}/exchange-commissions`,
          { data: { exchange_name: exchange, commission_rate: "0.02" } }
        )
      ).ok()
    ).toBeTruthy();
  }

  const offer = `World Cup cross-profile offer ${Date.now()}`;
  temporaryOffers.add(offer);
  await page.goto("/profiles");
  await page.getByRole("button", { name: "Add Opportunity" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Add sportsbook opportunity across profiles",
  });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Offer", { exact: true }).fill(offer);
  await dialog.getByRole("combobox", { name: "Bookmaker" }).selectOption(bookmaker);
  await dialog.getByRole("combobox", { name: "Offer Type" }).selectOption("Bet & Get");
  await dialog.getByRole("combobox", { name: "Bet Type" }).selectOption("Single");
  await dialog.getByRole("combobox", { name: "Fixture Type" }).selectOption("Football");
  await dialog.getByLabel("Minimum Odds", { exact: true }).fill("2.00");
  await dialog.getByLabel("Default Back Stake", { exact: true }).fill("10.00");
  await dialog.getByRole("button", { name: "Check Availability" }).click();

  for (const profile of profiles) {
    await dialog.locator("label", { hasText: profile.display_name }).getByRole("checkbox").check();
  }
  await dialog.getByRole("button", { name: "Create 2 Prospecting Rows" }).click();
  await expect(dialog.getByRole("heading", { name: "Profile Placement" })).toBeVisible();

  const dialogGeometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(dialogGeometry.top).toBeGreaterThanOrEqual(0);
  expect(dialogGeometry.bottom).toBeLessThanOrEqual(dialogGeometry.viewportHeight);
  expect(dialogGeometry.left).toBeGreaterThanOrEqual(0);
  expect(dialogGeometry.right).toBeLessThanOrEqual(dialogGeometry.viewportWidth);
  expect(dialogGeometry.pageScrollWidth).toBeLessThanOrEqual(dialogGeometry.viewportWidth);
  await expect(dialog.locator('[data-pd-id="multi-profile-opportunity.header"]')).toBeInViewport();
  await expect(dialog.locator('[data-pd-id="multi-profile-opportunity.footer"]')).toBeInViewport();
  const tableScroll = dialog.locator('[data-pd-id="multi-profile-opportunity.placement.table-scroll"]');
  const tableGeometry = await tableScroll.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(tableGeometry.scrollWidth).toBeGreaterThan(tableGeometry.clientWidth);

  const firstBackStake = dialog.getByLabel(`${profiles[0].display_name} ${bookmaker} back stake`);
  await expect(firstBackStake).toHaveClass(/opportunity-table-control/);
  const firstControlGeometry = await firstBackStake.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return {
      borderRadius: style.borderRadius,
      height: rect.height,
      width: rect.width,
    };
  });
  expect(firstControlGeometry.width).toBeLessThan(180);
  expect(firstControlGeometry.height).toBeGreaterThanOrEqual(40);
  expect(firstControlGeometry.height).toBeLessThanOrEqual(52);
  expect(firstControlGeometry.borderRadius).not.toBe("0px");
  await expect(
    dialog.getByRole("button", {
      name: `Manage ${profiles[0].display_name} ${bookmaker} opportunity row`,
    })
  ).toContainText("delete");

  const placementRows = dialog.locator("tbody tr");
  const firstRow = placementRows.nth(0);
  await expect(
    firstRow.getByRole("button", { name: /Copy .* placement values down/ })
  ).toBeDisabled();
  await expect(firstRow.getByRole("button", { name: /Use suggested lay/ })).toHaveCount(0);
  const pendingMetrics = firstRow.locator(".opportunity-pending-metric");
  await expect(pendingMetrics).toHaveCount(3);
  const pendingMetricSizes = await pendingMetrics.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { height: rect.height, width: rect.width };
    })
  );
  expect(pendingMetricSizes.every(({ height, width }) => height <= 28 && width <= 28)).toBeTruthy();
  const firstBackOdds = firstRow.getByRole("textbox", { name: /back odds/ });
  const firstLayOdds = firstRow.getByRole("textbox", { name: /lay odds/ });
  await firstBackOdds.fill("2.1");
  await firstBackOdds.blur();
  await expect(firstBackOdds).toHaveValue("2.10");
  await firstRow.getByRole("combobox", { name: /exchange/ }).selectOption(exchange);
  await firstLayOdds.fill("2.2");
  await firstLayOdds.blur();
  await expect(firstLayOdds).toHaveValue("2.20");
  const firstStrategy = firstRow.getByRole("combobox", { name: /strategy/ });
  await firstStrategy.selectOption("Underlay");
  await expect(firstRow.getByRole("button", { name: /Use suggested lay/ })).toBeVisible();
  await firstStrategy.selectOption("Standard");
  const suggestedLay = firstRow.getByRole("button", { name: /Use suggested lay/ });
  await expect(suggestedLay).toBeVisible();
  await expect(suggestedLay.locator(".material-symbols-outlined")).toHaveText("calculate");
  await expect(suggestedLay).not.toContainText("£");
  const layStakeWidth = await firstRow.getByRole("textbox", { name: /lay stake/ }).evaluate(
    (element) => element.getBoundingClientRect().width
  );
  expect(layStakeWidth).toBeGreaterThanOrEqual(108);
  const suggestionWidthBeforeHover = await suggestedLay.evaluate(
    (element) => element.getBoundingClientRect().width
  );
  await suggestedLay.hover();
  await expect(suggestedLay).toHaveAttribute("data-suggestion", /^\d+\.\d{2}$/);
  await expect.poll(() => suggestedLay.evaluate(
    (element) => element.getBoundingClientRect().width
  )).toBeGreaterThan(suggestionWidthBeforeHover);
  expect(await suggestedLay.evaluate((element) => {
    const button = element.getBoundingClientRect();
    const shell = element.parentElement?.getBoundingClientRect();
    return shell ? button.left >= shell.left && button.right <= shell.right : false;
  })).toBeTruthy();
  await expect(firstRow.getByRole("tooltip")).toHaveCount(0);
  await suggestedLay.click();
  const copyAppliedLay = firstRow.getByRole("button", { name: /Copy applied lay/ });
  await expect(copyAppliedLay).toBeVisible();
  await expect(copyAppliedLay.locator(".material-symbols-outlined")).toHaveText("copy_all");
  await expect(firstRow.getByRole("textbox", { name: /lay stake/ })).toHaveValue(/^\d+\.\d{2}$/);
  const copyFeedback = firstRow.getByText("copied to clipboard!", { exact: false });
  await expect(copyFeedback).toBeVisible();
  await expect(copyFeedback).toHaveCSS("position", "absolute");
  await expect(copyFeedback).toHaveCSS("font-weight", "400");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toMatch(/^\d+\.\d{2}$/);
  await copyAppliedLay.click();
  await expect(copyFeedback).toBeVisible();
  await firstStrategy.selectOption("Overlay");
  await expect(firstRow.getByRole("button", { name: /Use suggested lay/ })).toBeVisible();
  await firstStrategy.selectOption("Standard");
  await firstRow.getByRole("button", { name: /Use suggested lay/ }).click();
  await expect(
    firstRow.getByRole("button", { name: /Copy .* placement values down/ })
  ).toBeEnabled();
  await firstRow.getByRole("button", { name: /Copy .* placement values down/ }).click();

  const secondRow = placementRows.nth(1);
  const limitedProfile = profiles.find((profile) => profile.profile_id === profileIds[1])!;
  const limitedRow = placementRows.filter({ hasText: limitedProfile.display_name });
  const limitedBookmakerCell = limitedRow.getByRole("combobox", { name: /bookmaker/ }).locator("xpath=..");
  await expect(limitedBookmakerCell.locator(".field-warning-text")).toHaveClass(/visually-hidden/);
  expect(await limitedBookmakerCell.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBeTruthy();
  await expect(secondRow.getByRole("textbox", { name: /back odds/ })).toHaveValue("2.10");
  await expect(secondRow.getByRole("textbox", { name: /lay odds/ })).toHaveValue("2.20");
  await secondRow.getByRole("button", { name: /Use suggested lay/ }).click();
  const deleteButtons = dialog.getByRole("button", { name: /Manage .* opportunity row/ });
  const deleteCentres = await deleteButtons.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left + rect.width / 2;
    })
  );
  expect(Math.abs(deleteCentres[0] - deleteCentres[1])).toBeLessThan(1);
  const expectedDangerColour = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--danger)";
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  });
  const deleteStyles = await deleteButtons.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { colour: getComputedStyle(element).color, height: rect.height, width: rect.width };
    })
  );
  expect(deleteStyles.every((style) => style.colour === expectedDangerColour)).toBeTruthy();
  expect(deleteStyles.every((style) => style.width === deleteStyles[0].width)).toBeTruthy();
  expect(deleteStyles.every((style) => style.height === deleteStyles[0].height)).toBeTruthy();
  await deleteButtons.first().click();
  const rowDecision = dialog.getByRole("alertdialog");
  await expect(rowDecision).toContainText("Reset row data or remove from this opportunity?");
  await expect(rowDecision.getByRole("button", { name: "Reset Row Data" })).toBeVisible();
  await expect(rowDecision.getByRole("button", { name: "Remove from Opportunity" })).toBeVisible();
  await rowDecision.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog.getByText("Saved").first()).toBeVisible();
  await dialog.getByRole("button", { name: "Record Selected as Placed" }).click();

  for (const profile of profiles) {
    await expect(dialog.getByRole("row", { name: new RegExp(profile.display_name) })).toContainText("Placed");
    const rows = await (
      await request.get(`http://127.0.0.1:8010/profiles/${profile.profile_id}/sportsbook-bets`)
    ).json();
    const created = rows.find((row: Record<string, string>) => row.offer_text === offer);
    expect(created).toBeTruthy();
    expect(created.status).toBe("Placed");
  }
});

test("Fund Manager creates and deletes a multi-bookmaker mug-bet opportunity", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const profileResponse = await request.get(`http://127.0.0.1:8010/profiles/${profileId}`);
  expect(profileResponse.ok()).toBeTruthy();
  const profile = (await profileResponse.json()) as { display_name: string };
  const bookmakerOne = `Mug Bookmaker A ${Date.now()}`;
  const bookmakerTwo = `Mug Bookmaker B ${Date.now()}`;

  expect(
    (
      await request.patch(`http://127.0.0.1:8010/profiles/${profileId}`, {
        data: { status: "Active" },
      })
    ).ok()
  ).toBeTruthy();
  for (const bookmaker of [bookmakerOne, bookmakerTwo]) {
    temporaryAccounts.push({ account: bookmaker, profileId });
    expect(
      (
        await request.post(`http://127.0.0.1:8010/profiles/${profileId}/accounts`, {
          data: {
            account: bookmaker,
            type: "Bookie",
            status: "Active",
            channel: "Online",
          },
        })
      ).ok()
    ).toBeTruthy();
  }

  const offer = `Two-bookmaker mug opportunity ${Date.now()}`;
  temporaryOffers.add(offer);
  await page.goto("/profiles");
  await page.getByRole("button", { name: "Add Opportunity" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Add sportsbook opportunity across profiles",
  });
  await dialog.getByRole("combobox", { name: "Preset" }).selectOption("Mug Bet");
  await dialog.getByLabel("Offer", { exact: true }).fill(offer);
  await dialog.getByLabel("Mug bet target 1 profile").selectOption(profileId);
  await dialog.getByLabel("Mug bet target 1 bookmaker").selectOption(bookmakerOne);
  const addTargetButton = dialog.getByRole("button", { name: "Add Target" });
  await expect(addTargetButton.locator(".material-symbols-outlined")).toHaveText("group_add");
  await addTargetButton.click();
  await dialog.getByLabel("Mug bet target 2 profile").selectOption(profileId);
  await dialog.getByLabel("Mug bet target 2 bookmaker").selectOption(bookmakerTwo);
  await dialog.getByRole("button", { name: "Create 2 Prospecting Rows" }).click();

  await expect(dialog.getByRole("heading", { name: "Profile Placement" })).toBeVisible();
  const bookmakerFields = dialog.getByRole("combobox", { name: /bookmaker$/ });
  await expect(bookmakerFields).toHaveCount(2);
  await expect(bookmakerFields.nth(0)).toHaveValue(bookmakerOne);
  await expect(bookmakerFields.nth(1)).toHaveValue(bookmakerTwo);
  await bookmakerFields.nth(0).selectOption(bookmakerTwo);
  await expect(bookmakerFields.nth(0)).toHaveValue(bookmakerTwo);
  await dialog.getByRole("combobox", { name: new RegExp(`${bookmakerTwo} bookmaker$`) }).first().selectOption(bookmakerOne);
  const strategies = dialog.getByRole("combobox", { name: new RegExp(`${profile.display_name} .* strategy`) });
  await expect(strategies).toHaveCount(2);
  await expect(strategies.first()).toHaveValue("No Lay");

  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Add Opportunity" }).click();
  const reopened = page.getByRole("dialog", {
    name: "Add sportsbook opportunity across profiles",
  });
  await reopened.getByRole("button", { name: `Delete ${offer} opportunity` }).click();
  const cancelDelete = reopened.getByRole("button", { name: `Cancel deleting ${offer}` });
  await expect(cancelDelete.locator(".material-symbols-outlined")).toHaveText("close");
  await reopened.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(reopened.getByRole("button", { name: `Continue ${offer}` })).toHaveCount(0);
  await expect(reopened.getByRole("status")).toContainText("unplaced drafts were removed");

  const rows = await (
    await request.get(`http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`)
  ).json();
  expect(rows.some((row: Record<string, string>) => row.offer_text === offer)).toBeFalsy();
});

test("Fund Manager removes and restores an unplaced opportunity target", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const profileResponse = await request.get(`${apiBaseUrl}/profiles/${profileId}`);
  expect(profileResponse.ok()).toBeTruthy();
  const profile = (await profileResponse.json()) as { display_name: string };
  const bookmaker = `Restore Bookmaker ${Date.now()}`;
  const offer = `Restore target opportunity ${Date.now()}`;
  temporaryAccounts.push({ account: bookmaker, profileId });
  temporaryOffers.add(offer);
  await request.patch(`${apiBaseUrl}/profiles/${profileId}`, { data: { status: "Active" } });
  const accountResponse = await request.post(`${apiBaseUrl}/profiles/${profileId}/accounts`, {
    data: { account: bookmaker, type: "Bookie", status: "Active", channel: "Online" },
  });
  expect(accountResponse.ok()).toBeTruthy();
  const opportunityResponse = await request.post(`${apiBaseUrl}/multi-profile-opportunities`, {
    data: {
      preset: "Offer",
      offer_text: offer,
      bookmaker,
      offer_type: "Bet & Get",
      bet_type: "Single",
      selected_profile_ids: [profileId],
    },
  });
  expect(opportunityResponse.ok()).toBeTruthy();

  await page.goto("/profiles");
  await page.getByRole("button", { name: "Add Opportunity" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Add sportsbook opportunity across profiles",
  });
  await dialog.getByRole("button", { name: `Continue ${offer}` }).click();
  await dialog.getByRole("button", { name: `Manage ${profile.display_name} ${bookmaker} opportunity row` }).click();
  const decision = dialog.getByRole("alertdialog");
  await decision.getByRole("button", { name: "Remove from Opportunity" }).click();
  await expect(dialog.getByRole("row", { name: new RegExp(profile.display_name) })).toHaveCount(0);
  await expect(dialog.getByRole("status")).toContainText("removed from this opportunity");

  await dialog.getByRole("button", { name: "Add Target" }).click();
  const headingActionGeometry = await dialog.locator(".opportunity-heading-action").evaluateAll(
    (elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        borderRadius: style.borderRadius,
        centreY: rect.top + rect.height / 2,
        height: rect.height,
        paddingBottom: style.paddingBottom,
        paddingTop: style.paddingTop,
      };
    })
  );
  expect(headingActionGeometry).toHaveLength(2);
  expect(headingActionGeometry[0].height).toBe(headingActionGeometry[1].height);
  expect(headingActionGeometry[0].paddingTop).toBe(headingActionGeometry[1].paddingTop);
  expect(headingActionGeometry[0].paddingBottom).toBe(headingActionGeometry[1].paddingBottom);
  expect(headingActionGeometry[0].borderRadius).toBe(headingActionGeometry[1].borderRadius);
  expect(Math.abs(headingActionGeometry[0].centreY - headingActionGeometry[1].centreY)).toBeLessThan(1);
  const addTargetPanel = dialog.getByRole("region", { name: "Add profile target" });
  await addTargetPanel.getByLabel("Profile").selectOption(profileId);
  await addTargetPanel.getByLabel("Bookmaker").selectOption(bookmaker);
  await addTargetPanel.getByRole("button", { name: "Add to Opportunity" }).click();
  const restoredRow = dialog.getByRole("row", { name: new RegExp(profile.display_name) });
  await expect(restoredRow).toContainText(bookmaker);
  await expect(restoredRow).toContainText("Prospecting");
});

test("Fund Manager resume list shows the two most recent opportunities first", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  expect(
    (
      await request.patch(`http://127.0.0.1:8010/profiles/${profileId}`, {
        data: { status: "Active" },
      })
    ).ok()
  ).toBeTruthy();
  const resumeBookmaker = `Resume Bookmaker ${Date.now()}`;
  temporaryAccounts.push({ account: resumeBookmaker, profileId });
  await request.post(`http://127.0.0.1:8010/profiles/${profileId}/accounts`, {
    data: { account: resumeBookmaker, type: "Bookie", status: "Active", channel: "Online" },
  });

  const offers = [1, 2, 3].map((index) => `Resume ordering ${index} ${Date.now()}`);
  offers.forEach((offer) => temporaryOffers.add(offer));
  const opportunityIds: string[] = [];
  for (const offer of offers) {
    const response = await request.post("http://127.0.0.1:8010/multi-profile-opportunities", {
      data: {
        preset: "Offer",
        offer_text: offer,
        bookmaker: resumeBookmaker,
        offer_type: "Bet & Get",
        bet_type: "Single",
        selected_profile_ids: [profileId],
      },
    });
    expect(response.ok()).toBeTruthy();
    opportunityIds.push(((await response.json()) as { opportunity_id: string }).opportunity_id);
  }

  await page.goto("/profiles");
  await page.getByRole("button", { name: "Add Opportunity" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Add sportsbook opportunity across profiles",
  });
  await expect(dialog.getByRole("button", { name: `Continue ${offers[2]}` })).toBeVisible();
  await expect(dialog.getByRole("button", { name: `Continue ${offers[1]}` })).toBeVisible();
  await expect(dialog.getByRole("button", { name: `Continue ${offers[0]}` })).toHaveCount(0);
  await dialog.getByRole("button", { name: /Show \d+ More/ }).click();
  await expect(dialog.getByRole("button", { name: `Continue ${offers[0]}` })).toBeVisible();

  for (const opportunityId of opportunityIds) {
    expect(
      (
        await request.delete(
          `http://127.0.0.1:8010/multi-profile-opportunities/${opportunityId}`
        )
      ).ok()
    ).toBeTruthy();
  }
});
