import { expect, test, type Page } from "@playwright/test";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const evidence = "data/private/evidence/cp117-sportsbook-proposals";
async function capture(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true });
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
  await expect(page.getByLabel("Requested Lay Stake")).toHaveValue("9.54");
  await page.getByRole("button", { name: "Show Not recorded example" }).click();
  await expect(page.getByLabel("Requested Lay Stake")).toHaveValue("");
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
  await expect(page.getByLabel("Remaining unmatched stake")).toHaveValue("4.54");
  await expect(page.getByLabel("Actual lay odds")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm external Lay" })).toBeVisible();
  await expect(page.getByText("Back: Not recorded · Lay: Not recorded")).toBeVisible();
  await page.getByRole("button", { name: "Confirm external Back" }).click();
  await expect(page.getByText("Back: Confirmed · Lay: Not recorded")).toBeVisible();
  await capture(page, `placement-back-only`);
  await page.getByRole("button", { name: "Confirm external Lay" }).click();
  await expect(page.getByText("Back: Confirmed · Lay: Confirmed")).toBeVisible();
  await capture(page, `placement-expanded`);

  await page.getByRole("link", { name: /Finish \/ Review/ }).click();
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
