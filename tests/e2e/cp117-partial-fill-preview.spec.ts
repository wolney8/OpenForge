import { expect, test } from "@playwright/test";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const evidence = "data/private/evidence/cp117-partial-fill-preview";

for (const { width, theme } of [
  { width: 2048, theme: "dark" },
  { width: 1440, theme: "light" },
  { width: 390, theme: "dark" },
] as const) {
  test(`proposed leg review and current PD at ${width}px ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(value => {
      localStorage.setItem("pd-required-storage-notice", "acknowledged");
      localStorage.setItem("openforge-theme", value);
    }, theme);
    await page.goto(authURL);
    await page.goto("/design-lab/sportsbook-proposals?amendment=matching&view=partial-leg");
    await expect(page.locator('[data-pd-id="lab.proposal.leg-controls-1"]')).toBeVisible();
    const proposedCard = page.locator('[data-pd-id="sportsbook.workbench.placement-secondary-card"]');
    await expect(proposedCard).toContainText("£3 remaining of the £8 request");
    await expect(proposedCard.locator('[data-pd-id="lab.proposal.leg-1"]')).toContainText("Matchbook");
    await expect(proposedCard.locator('[data-pd-id="lab.proposal.leg-1"]')).toContainText("Odds 2.00");
    await expect(proposedCard.locator('[data-pd-id="lab.proposal.leg-1"]')).toContainText("£5.00 matched");
    await expect(proposedCard.locator('[data-pd-id="lab.proposal.leg-controls-1"]')).toContainText("Exchange");
    await expect(proposedCard.locator('[data-pd-id="lab.proposal.leg-controls-1"]')).toContainText("Lay odds");
    await expect(proposedCard.locator('[data-pd-id="lab.proposal.leg-controls-1"]')).toContainText("Matched stake");
    const sectionOrder = await proposedCard.locator(":scope > section").evaluateAll(nodes => nodes.map(node => node.getAttribute("aria-label")));
    expect(sectionOrder).toEqual(["Recorded legs", "Follow-up reminder", "Lay reversal"]);
    const actionOrder = await proposedCard.getByRole("button", { name: /Review (Lay|Back) reversal/ }).allTextContents();
    expect(actionOrder).toEqual(["Review Lay reversal", "Review Back reversal"]);
    await expect(page.locator('[data-pd-id="sportsbook.workbench.partial-fill"]')).toHaveAttribute("open", "");
    const proposedStyles = await proposedCard.evaluate(node => {
      const style = getComputedStyle(node);
      return { background: style.backgroundColor, border: style.borderColor, padding: style.padding, radius: style.borderRadius };
    });
    await page.screenshot({ path: `${evidence}/lab-full-${width}-${theme}.png`, fullPage: true });
    await proposedCard.screenshot({ path: `${evidence}/lab-card-${width}-${theme}.png` });

    const id = `PD-FIX-648-${width}-${Date.now()}`;
    const created = await page.request.post("/api/profiles/profile-demo-001/sportsbook-bets", { data: {
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
    const actualDetail = workbench.locator('[data-pd-id="ledger-editor.panel.placement"] [data-pd-id="sportsbook.workbench.partial-fill"]');
    await actualDetail.locator("summary").click();
    const actualCard = actualDetail.locator('[data-pd-id="sportsbook.workbench.placement-secondary-card"]');
    await expect(actualCard).toContainText("Recorded legs");
    await expect(actualCard).toContainText("5.00");
    const actualStyles = await actualCard.evaluate(node => {
      const style = getComputedStyle(node);
      return { background: style.backgroundColor, border: style.borderColor, padding: style.padding, radius: style.borderRadius };
    });
    expect(actualStyles).toEqual(proposedStyles);
    await page.screenshot({ path: `${evidence}/pd-full-${width}-${theme}.png`, fullPage: true });
    await actualCard.screenshot({ path: `${evidence}/pd-card-${width}-${theme}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
}

test("proposal leg controls and reversal confirmations remain independent", async ({ page }) => {
  await page.goto(authURL);
  await page.goto("/design-lab/sportsbook-proposals?amendment=matching&view=partial-leg");
  const leg = page.locator('[data-pd-id="lab.proposal.leg-1"]');
  await leg.getByLabel("Exchange").selectOption("Exchange A");
  await leg.getByRole("button", { name: "Review leg 1" }).click();
  await expect(leg).toContainText("Exchange A");
  await expect(leg.locator('[data-pd-id="lab.proposal.leg-controls-1"]')).toBeHidden();
  await leg.getByRole("button", { name: "Review leg 1" }).click();
  await expect(leg.getByLabel("Exchange")).toHaveValue("Exchange A");
  await page.getByRole("button", { name: "Review Back reversal" }).click();
  await expect(page.getByRole("button", { name: "Remove Back Placement" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel reversal" }).click();
  await expect(page.getByRole("button", { name: "Review Lay reversal" })).toBeVisible();
  await page.getByRole("button", { name: "Review Lay reversal" }).click();
  await expect(page.getByRole("button", { name: "Remove Lay" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel reversal" }).click();
  await expect(page.getByText("Back: Confirmed · Lay: Partially matched")).toBeVisible();
  await page.getByLabel("Matched Lay amount to confirm").fill("3.00");
  await page.getByRole("button", { name: "Confirm external Lay · £3.00" }).click();
  await expect(page.locator('[data-pd-id="lab.proposal.leg-2"]')).toContainText("£3.00 matched");
  await expect(page.locator('[data-pd-id="sportsbook.workbench.recorded-legs"]')).toContainText("£0 remaining of the £8 request");
  await page.getByRole("button", { name: "Review Back reversal" }).click();
  await page.getByRole("button", { name: "Remove Back Placement" }).click();
  await expect(page.getByText("Back: Not recorded · Lay: Confirmed")).toBeVisible();
  await page.goto("/design-lab/sportsbook-proposals?amendment=matching&view=partial-leg");
  await page.getByRole("button", { name: "Review Lay reversal" }).click();
  await page.getByRole("button", { name: "Remove Lay" }).click();
  await expect(page.getByText("Back: Confirmed · Lay: Not recorded")).toBeVisible();
});
