import { expect, test, type Page } from "@playwright/test";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const evidence = "data/private/evidence/cp117-sportsbook-proposals";
const placementEvidence = "data/private/evidence/cp117-placement-640";
async function capture(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true });
}

for (const { width, theme } of [
  { width: 2048, theme: "dark" },
  { width: 1440, theme: "light" },
  { width: 390, theme: "dark" },
] as const) {
  test(`approved Placement secondary card matches preview and PD at ${width}px ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(selectedTheme => { localStorage.setItem("pd-required-storage-notice", "acknowledged"); localStorage.setItem("openforge-theme", selectedTheme); }, theme);
    await page.goto(authURL);
    await page.goto("/design-lab/sportsbook-proposals?amendment=matching");
    await page.getByRole("button", { name: "Partial fill" }).click();
    await page.getByRole("button", { name: "Placement", exact: true }).first().click();
    await page.getByRole("button", { name: "Confirm external Back" }).click();
    await page.getByRole("button", { name: "Confirm external Lay · £5.00" }).click();
    const previewDisabledOpacity = await page.getByRole("button", { name: "Confirm external Back" }).evaluate(node => getComputedStyle(node).opacity);
    expect(Number(previewDisabledOpacity)).toBeLessThan(1);
    const previewDetail = page.locator('[data-pd-id="sportsbook.workbench.partial-fill"]');
    await expect(previewDetail).not.toHaveAttribute("open", "");
    await page.screenshot({ path: `${placementEvidence}/lab-collapsed-${width}-${theme}.png`, fullPage: true });
    await previewDetail.locator("summary").click();
    const previewCard = previewDetail.locator('[data-pd-id="sportsbook.workbench.placement-secondary-card"]');
    await expect(previewCard).toBeVisible();
    await expect(previewCard.locator('[data-pd-id="sportsbook.workbench.recorded-legs"]')).toContainText("£5.00 matched");
    const headingStyle = async (section: ReturnType<Page["locator"]>) => section.locator("strong").first().evaluate(node => ({
      text: node.textContent?.trim(), tag: node.tagName,
      transform: getComputedStyle(node).textTransform,
      color: getComputedStyle(node).color,
      fontSize: getComputedStyle(node).fontSize,
      fontWeight: getComputedStyle(node).fontWeight,
      lineHeight: getComputedStyle(node).lineHeight,
    }));
    const previewLegHeading = await headingStyle(previewCard.locator('[data-pd-id="sportsbook.workbench.recorded-legs"]'));
    const previewReminderHeading = await headingStyle(previewCard.locator('[data-pd-id="sportsbook.workbench.follow-up"]'));
    const reminderButtonStyle = async (section: ReturnType<Page["locator"]>) => section.locator("button").filter({ hasText: "Set Reminder" }).first().evaluate(node => {
      const style = getComputedStyle(node);
      return { background: style.backgroundColor, border: style.borderColor, color: style.color,
        padding: style.padding, radius: style.borderRadius, minHeight: style.minHeight, fontWeight: style.fontWeight };
    });
    const previewReminderButton = await reminderButtonStyle(previewCard.locator('[data-pd-id="sportsbook.workbench.follow-up"]'));
    const reminderTextStyle = async (section: ReturnType<Page["locator"]>) => section.locator("p").first().evaluate(node => ({
      color: getComputedStyle(node).color, margin: getComputedStyle(node).margin,
      parentGap: getComputedStyle(node.parentElement!).gap,
    }));
    const previewReminderText = await reminderTextStyle(previewCard.locator('[data-pd-id="sportsbook.workbench.follow-up"]'));
    await expect(previewCard.locator('[data-pd-id="sportsbook.workbench.follow-up"] p').first()).toHaveText("Not set");
    const previewStyle = await previewCard.evaluate(node => ({ background: getComputedStyle(node).backgroundColor, border: getComputedStyle(node).borderColor, padding: getComputedStyle(node).padding }));
    await page.screenshot({ path: `${placementEvidence}/lab-expanded-${width}-${theme}.png`, fullPage: true });

    const id = `PD-FIX-640-${width}-${Date.now()}`;
    const base = "/api/profiles/profile-demo-001/sportsbook-bets";
    const created = await page.request.post(base, { data: {
      sportsbook_bet_id: id, event_name: "Synthetic partial placement", offer_text: "Synthetic source only",
      offer_name: "Synthetic offer", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
      fixture_type: "Football", market: "Match Odds", status: "Placed", result: "Pending",
      back_stake: "10.00", back_odds: "2.00", match_strategy: "Standard", lay_odds_1: "2.00",
      requested_lay_stake: "8.00", lay_actual: "8.00", lay_matched_stake_1: "5.00",
      lay_commission_1: "0", exchange_name: "Matchbook", back_placement_confirmed: true,
      multi_lay_outcomes_json: JSON.stringify([{ id: "leg-1", label: "Lay leg 1", layOdds: "2.00", exchangeName: "Matchbook", matchedStake: "5.00", isFinal: false }]),
      date_settled: "2026-11-03T18:00", user_notes: "Synthetic only",
    } });
    expect(created.status(), await created.text()).toBe(201);
    await page.goto(`/profiles/profile-demo-001/tracker/sportsbook-bets?record=${id}`);
    const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
    await workbench.locator('[data-pd-id="bet-workbench.stage.placement"]').click();
    await expect(workbench.getByRole("button", { name: "Confirm external Back" })).toBeDisabled();
    expect(await workbench.getByRole("button", { name: "Confirm external Back" }).evaluate(node => getComputedStyle(node).opacity)).toBe(previewDisabledOpacity);
    const detail = workbench.locator('[data-pd-id="ledger-editor.panel.placement"] [data-pd-id="sportsbook.workbench.partial-fill"]');
    await expect(detail).not.toHaveAttribute("open", "");
    await page.screenshot({ path: `${placementEvidence}/pd-collapsed-${width}-${theme}.png`, fullPage: true });
    await detail.locator("summary").click();
    const card = detail.locator('[data-pd-id="sportsbook.workbench.placement-secondary-card"]');
    await expect(card).toBeVisible();
    const actualStyle = await card.evaluate(node => ({ background: getComputedStyle(node).backgroundColor, border: getComputedStyle(node).borderColor, padding: getComputedStyle(node).padding }));
    expect(actualStyle).toEqual(previewStyle);
    await expect(card.locator('[data-pd-id="sportsbook.workbench.recorded-legs"]')).toContainText("5.00");
    await expect(card.locator('[data-pd-id="sportsbook.workbench.recorded-legs"]')).toContainText("Recorded legs");
    await expect(card.locator('[data-pd-id="sportsbook.workbench.follow-up"]')).toBeVisible();
    await expect(card.locator('[data-pd-id="sportsbook.workbench.follow-up"]')).toContainText("Follow-up reminder");
    expect(await headingStyle(card.locator('[data-pd-id="sportsbook.workbench.recorded-legs"]'))).toEqual(previewLegHeading);
    expect(await headingStyle(card.locator('[data-pd-id="sportsbook.workbench.follow-up"]'))).toEqual(previewReminderHeading);
    await expect(card.locator('[data-pd-id="sportsbook.workbench.follow-up"] p').first()).toHaveText("Not set");
    expect(await reminderTextStyle(card.locator('[data-pd-id="sportsbook.workbench.follow-up"]'))).toEqual(previewReminderText);
    expect(await reminderButtonStyle(card.locator('[data-pd-id="sportsbook.workbench.follow-up"]'))).toEqual(previewReminderButton);
    await expect(card.locator('[data-pd-id="sportsbook.workbench.lay-reversal"]')).toContainText("Review Lay reversal");
    await page.screenshot({ path: `${placementEvidence}/pd-expanded-${width}-${theme}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
}

for (const { width, theme } of [
  { width: 2048, theme: "dark" },
  { width: 1440, theme: "light" },
  { width: 390, theme: "dark" },
] as const) {
  test(`separate proposal keeps approved Lab shell and workbench treatment at ${width}px ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: Math.max(width, 1440), height: 900 });
    await page.addInitScript(selectedTheme => { localStorage.setItem("pd-required-storage-notice", "acknowledged"); localStorage.setItem("openforge-theme", selectedTheme); }, theme);
    await page.goto(authURL);
    await page.goto("/design-lab");
    await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
    await page.locator('tr[data-lab-row-id="LAB-SB-001"] button[aria-label^="Open "]').click();
    await page.getByRole("button", { name: "Edit Bet", exact: true }).click();
    await page.setViewportSize({ width, height: 900 });
    const approved = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('[data-pd-id="lab.header"]')!;
      const rail = document.querySelector<HTMLElement>('[data-pd-id="bet-workbench.stages"]')!;
      const entry = document.querySelector<HTMLElement>('[data-pd-id="lab.entry.page"]')!;
      const aside = entry.querySelector<HTMLElement>("aside")!;
      const fields = entry.querySelector<HTMLElement>("fieldset")!;
      const footer = entry.querySelector<HTMLElement>('[class*="entryFooter"]')!;
      const main = document.querySelector<HTMLElement>("main")!;
      const breadcrumb = document.querySelector<HTMLElement>('[data-pd-id="lab.breadcrumb"]')!;
      const heading = main.querySelector<HTMLElement>("h1")!;
      return { headerHeight: header.getBoundingClientRect().height, railHeight: rail.getBoundingClientRect().height,
        railGap: getComputedStyle(rail).gap, asideBackground: getComputedStyle(aside).backgroundColor,
        asideBorder: getComputedStyle(aside).borderColor, entryWidth: entry.getBoundingClientRect().width,
        breadcrumbLeft: breadcrumb.getBoundingClientRect().left, breadcrumbPadding: getComputedStyle(breadcrumb).padding,
        mainLeft: main.getBoundingClientRect().left, mainPadding: getComputedStyle(main).padding,
        headingFont: getComputedStyle(heading).fontSize, headingWeight: getComputedStyle(heading).fontWeight,
        fieldsBackground: getComputedStyle(fields).backgroundColor, fieldsBorder: getComputedStyle(fields).borderColor,
        fieldsPadding: getComputedStyle(fields).padding, fieldsRadius: getComputedStyle(fields).borderRadius,
        footerGap: getComputedStyle(footer).gap, footerPadding: getComputedStyle(footer).padding };
    });
    await capture(page, `approved-${width}-${theme}`);
    await page.goto("/design-lab/sportsbook-proposals?amendment=offer");
    const proposal = page.locator('[data-pd-id="lab.proposal.workbench"]');
    await expect(proposal).toBeVisible();
    const actual = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('[data-pd-id="lab.proposal.header"]')!;
      const rail = document.querySelector<HTMLElement>('[data-pd-id="bet-workbench.stages"]')!;
      const entry = document.querySelector<HTMLElement>('[data-pd-id="lab.proposal.workbench"]')!;
      const aside = entry.querySelector<HTMLElement>("aside")!;
      const fields = entry.querySelector<HTMLElement>("fieldset")!;
      const footer = entry.querySelector<HTMLElement>('[data-pd-id="lab.proposal.footer"]')!;
      const main = document.querySelector<HTMLElement>('[data-pd-id="lab.proposal.main"]')!;
      const breadcrumb = document.querySelector<HTMLElement>('[data-pd-id="lab.proposal.breadcrumb"]')!;
      const heading = main.querySelector<HTMLElement>("h1")!;
      return { headerHeight: header.getBoundingClientRect().height, railHeight: rail.getBoundingClientRect().height,
        railGap: getComputedStyle(rail).gap, asideBackground: getComputedStyle(aside).backgroundColor,
        asideBorder: getComputedStyle(aside).borderColor, entryWidth: entry.getBoundingClientRect().width,
        breadcrumbLeft: breadcrumb.getBoundingClientRect().left, breadcrumbPadding: getComputedStyle(breadcrumb).padding,
        mainLeft: main.getBoundingClientRect().left, mainPadding: getComputedStyle(main).padding,
        headingFont: getComputedStyle(heading).fontSize, headingWeight: getComputedStyle(heading).fontWeight,
        fieldsBackground: getComputedStyle(fields).backgroundColor, fieldsBorder: getComputedStyle(fields).borderColor,
        fieldsPadding: getComputedStyle(fields).padding, fieldsRadius: getComputedStyle(fields).borderRadius,
        footerGap: getComputedStyle(footer).gap, footerPadding: getComputedStyle(footer).padding,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
    });
    await capture(page, `offer-${width}-${theme}`);
    expect(actual.headerHeight).toBe(approved.headerHeight);
    expect(actual.railHeight).toBe(approved.railHeight);
    expect(actual.railGap).toBe(approved.railGap);
    expect(actual.asideBackground).toBe(approved.asideBackground);
    expect(actual.asideBorder).toBe(approved.asideBorder);
    expect(Math.abs(actual.entryWidth - approved.entryWidth), JSON.stringify({ approved, actual })).toBeLessThanOrEqual(1);
    for (const key of ["breadcrumbPadding", "mainPadding", "headingFont", "headingWeight", "fieldsBackground", "fieldsBorder", "fieldsPadding", "fieldsRadius", "footerGap", "footerPadding"] as const) {
      expect(actual[key], key).toBe(approved[key]);
    }
    expect(Math.abs(actual.breadcrumbLeft - approved.breadcrumbLeft)).toBeLessThanOrEqual(1);
    expect(Math.abs(actual.mainLeft - approved.mainLeft)).toBeLessThanOrEqual(1);
    expect(actual.overflow).toBe(false);
  });
}

test("each amendment opens directly and its proposal states respond without writes", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  await page.goto("/design-lab/sportsbook-proposals?amendment=protected");
  const footer = page.locator('[data-pd-id="lab.proposal.footer"]');
  await expect(footer.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(1);
  await capture(page, `protected-before`);
  await footer.getByRole("button", { name: "Review Correction" }).click();
  await expect(footer.getByRole("button", { name: "Cancel Correction" })).toBeVisible();
  await expect(footer.getByRole("button", { name: "Save Audited Correction" })).toBeVisible();
  await expect(footer.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(0);
  await capture(page, `protected-correction`);
  await footer.getByRole("button", { name: "Cancel Correction" }).click();
  await expect(footer.getByRole("button", { name: "Cancel", exact: true })).toBeVisible();

  await page.getByRole("link", { name: /Additional Offer details/ }).click();
  await expect(page.getByLabel("Fixture Type")).toBeVisible();
  await expect(page.getByLabel("Back Stake · if known")).toBeVisible();
  const disclosure = page.locator("details", { has: page.getByText("Additional offer details", { exact: true }) });
  await disclosure.locator("summary").click();
  const market = page.getByLabel("Market");
  await market.fill("Match Odds");
  await disclosure.locator("summary").click();
  await expect(disclosure).not.toHaveAttribute("open", "");
  await disclosure.locator("summary").click();
  await expect(market).toHaveValue("Match Odds");
  await page.getByRole("button", { name: "Trigger validation error" }).click();
  await expect(page.getByText("Market requires review before continuing.")).toBeVisible();
  await expect(market).toBeFocused();
  await expect(page.getByText("Additional offer details", { exact: true })).toBeVisible();
  await capture(page, `offer-validation`);

  await page.getByRole("link", { name: /Requirements and outcomes/ }).click();
  await page.getByRole("button", { name: "Extra scenarios" }).click();
  const outcomes = page.locator('[data-pd-id="lab.proposal.workbench"] aside');
  await expect(page.getByRole("heading", { name: "Edit Sportsbook Bet · DEMO-EXTRA" })).toBeVisible();
  await expect(outcomes).toContainText("Double Delight · Placed");
  await expect(outcomes.locator("dl > div:visible")).toHaveCount(2);
  await expect(outcomes.locator('[data-pd-id="lab.proposal.outcome.back-wins"]')).toContainText("£ (2.10)");
  await outcomes.getByText("Detailed outcomes", { exact: true }).click();
  await expect(outcomes.locator("dl > div:visible")).toHaveCount(4);
  await capture(page, `requirements-exceptional`);
  await page.locator('[data-pd-id="bet-workbench.stage.0"]').click();
  await expect(page.getByRole("heading", { name: "Edit Sportsbook Bet · DEMO-EXTRA" })).toBeVisible();
  await expect(outcomes).toContainText("Double Delight · Placed");
  await page.locator('[data-pd-id="bet-workbench.stage.1"]').click();
  await page.getByRole("button", { name: "Unavailable data" }).click();
  await expect(outcomes).toContainText("Outcome unavailable");
  await page.locator('[data-pd-id="bet-workbench.stage.4"]').click();
  await expect(page.getByRole("heading", { name: "Edit Sportsbook Bet · DEMO-INCOMPLETE" })).toBeVisible();
  await expect(outcomes).toContainText("Standard · Prospecting");
  await expect(outcomes).toContainText("Outcome unavailable: required source values are not recorded.");
  await capture(page, `requirements-unavailable-finish`);

  await page.locator('[data-pd-id="bet-workbench.stage.1"]').click();
  await page.getByRole("button", { name: "Ordinary result" }).click();
  await page.getByRole("link", { name: /Matching and Placement/ }).click();
  await expect(page.getByLabel("Exchange")).toBeVisible();
  await expect(page.getByLabel("Strategy")).toBeVisible();
  await expect(page.getByLabel("Lay Stake", { exact: true })).toHaveValue("8.00");
  await page.getByRole("button", { name: "Show Not recorded example" }).click();
  await expect(page.getByLabel("Lay Stake", { exact: true })).toHaveValue("");
  await capture(page, `matching-not-recorded`);
  await page.getByRole("button", { name: "Show recorded example" }).click();
  await capture(page, `matching-collapsed`);
  await page.getByText("Advanced calculator options", { exact: true }).click();
  await expect(page.getByLabel("Calculator Type")).toBeVisible();
  await expect(page.getByLabel("Back bet")).toBeVisible();
  await expect(page.getByLabel("Lay bet")).toBeVisible();
  await capture(page, `matching-expanded`);
  await page.getByRole("button", { name: "Partial fill" }).click();
  await page.getByRole("button", { name: "Placement", exact: true }).last().click();
  await capture(page, `placement-collapsed`);
  await page.getByText("Actual stakes and partial-fill details", { exact: true }).click();
  await expect(page.getByLabel("Matched so far")).toHaveValue("");
  await expect(page.getByLabel("Actual lay amount")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm external Lay · £5.00" })).toBeVisible();
  await expect(page.getByText("Back: Not recorded · Lay: Not recorded")).toBeVisible();
  await page.getByRole("button", { name: "Confirm external Back" }).click();
  await expect(page.getByText("Back: Confirmed · Lay: Not recorded")).toBeVisible();
  await capture(page, `placement-back-only`);
  await page.getByRole("button", { name: "Confirm external Lay" }).click();
  await expect(page.getByText("Back: Confirmed · Lay: Partially matched")).toBeVisible();
  await expect(page.getByLabel("Actual matched lay stake")).toHaveValue("5.00");
  await expect(page.getByLabel("Matched so far")).toHaveValue("5.00");
  await capture(page, `placement-expanded`);
  await page.getByLabel("Matched Lay amount to confirm").fill("3.00");
  await page.getByRole("button", { name: "Confirm external Lay · £3.00" }).click();
  await expect(page.getByText("Back: Confirmed · Lay: Fully matched")).toBeVisible();
  await expect(page.getByLabel("Matched so far")).toHaveValue("8.00");
  await expect(page.getByLabel("Matched Lay amount to confirm")).toHaveCount(0);
  const secondLeg = page.locator('[data-pd-id="lab.proposal.leg-2"]');
  await expect(secondLeg).toContainText("Leg 2");
  await expect(secondLeg).toContainText("Exchange A");
  await expect(secondLeg).toContainText("Odds 2.20");
  await expect(secondLeg).toContainText("£3.00 matched");
  await capture(page, `placement-second-fill`);

  await page.getByRole("link", { name: /Finish \/ Review/ }).click();
  await expect(page.getByLabel("Status")).toBeVisible();
  await expect(page.getByLabel("Settles")).toBeVisible();
  await expect(page.getByLabel("Result")).toBeVisible();
  await expect(page.locator('[data-pd-id="lab.proposal.additional-review"]')).not.toHaveAttribute("open", "");
  await expect(page.locator('[data-pd-id="lab.proposal.history"]')).not.toHaveAttribute("open", "");
  await expect(footer.getByRole("button", { name: "Save Existing Bet" })).toBeVisible();
  await expect(footer.getByText("More actions", { exact: true })).toBeVisible();
  await page.getByText("Linked Free Bets", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Review linked Free Bet" })).toBeVisible();
  await capture(page, `finish-linked`);
  await page.getByRole("button", { name: "Without linked reward" }).click();
  await expect(page.getByText("No linked reward is recorded")).toBeVisible();
  await capture(page, `finish-no-link`);
  await page.getByRole("button", { name: "New placed-record example" }).click();
  await expect(page.getByRole("heading", { name: "New Sportsbook Bet" })).toBeVisible();
  await expect(footer.getByRole("button", { name: "Finish Placed Record" })).toBeVisible();
  await capture(page, `finish-new`);
});

for (const width of [2048, 390] as const) {
  test(`approved amendment preview renders all Sportsbook stages at ${width}px dark`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => { localStorage.setItem("pd-required-storage-notice", "acknowledged"); localStorage.setItem("openforge-theme", "dark"); });
    await page.goto(authURL);
    await page.goto("/design-lab/sportsbook-proposals?amendment=offer");
    const workbench = page.locator('[data-pd-id="lab.proposal.workbench"]');
    await expect(workbench).toBeVisible();
    await capture(page, `adopted-offer-${width}-dark`);
    await page.getByRole("link", { name: /Requirements and outcomes/ }).click();
    await expect(workbench.getByText("Recorded requirements")).toBeVisible();
    await capture(page, `adopted-requirements-${width}-dark`);
    await page.getByRole("link", { name: /Matching and Placement/ }).click();
    await page.getByRole("button", { name: "Partial fill" }).click();
    await capture(page, `adopted-matching-${width}-dark`);
    await page.getByText("Advanced calculator options", { exact: true }).click();
    await capture(page, `adopted-matching-expanded-${width}-dark`);
    await page.getByRole("button", { name: "Placement", exact: true }).last().click();
    await capture(page, `adopted-placement-${width}-dark`);
    await page.getByText("Actual stakes and partial-fill details", { exact: true }).click();
    await capture(page, `adopted-placement-expanded-${width}-dark`);
    await page.getByRole("link", { name: /Finish \/ Review/ }).click();
    await capture(page, `adopted-finish-${width}-dark`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
  });
}
