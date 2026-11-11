import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const evidence = "data/private/evidence/cp117-rejected-parity";
const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";

test("paired actual Lab and integrated Today and Sportsbook composition", async ({ page }) => {
  test.setTimeout(90_000);
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await mkdir(evidence, { recursive: true });
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  expect((await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "This Year", selected_range_custom_start: null, selected_range_custom_end: null } })).status()).toBe(200);
  for (const variant of [
    { name: "split-dark", width: 900, height: 900, theme: "dark" },
    { name: "mobile-light", width: 390, height: 844, theme: "light" },
  ]) {
    for (const section of ["tasks", "sportsbook"] as const) {
      await page.setViewportSize({ width: 1440, height: variant.height });
      await page.goto("/design-lab");
      await expect(page.locator('[data-pd-id="design-lab-connected.root"]')).toBeVisible();
      await page.locator(`[data-pd-id="lab.nav.${section}"]`).click();
      if (section === "sportsbook") { await page.locator('[data-pd-id="lab.profile"]').click(); await page.getByRole("option", { name: "Profile A", exact: true }).click(); }
      await page.locator('[data-pd-id="lab.range"]').click();
      await page.getByRole("option", { name: "This Year", exact: true }).click();
      await page.setViewportSize({ width: variant.width, height: variant.height });
      await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), variant.theme);
      await page.screenshot({ path: `${evidence}/${variant.name}-${section}-lab.png`, fullPage: true });
      if (section === "tasks") {
        const now = Date.now();
        const make = (id: string, type: string, hours: number, ledger: string) => ({ audience: "fund_manager", security_tag: "fund_manager_only", kind: "task", task_state: "new", notification_id: id, notification_type: type, title: `Review ${id}`, ledger_label: ledger, bookmaker_label: "Bookmaker A", message: `Synthetic source ${id}`, profile_id: "profile-demo-001", profile_name: "Subscriber Alpha", record_id: id, due_at: new Date(now + hours * 3_600_000).toISOString(), settles_at: "", created_at: new Date(now).toISOString(), href: `/profiles/profile-demo-001/tracker/${ledger === "Free Bets" ? "free-bets" : "sportsbook-bets"}?record=${id}`, completion_href: "", tone: "warning" });
        await page.route(/\/fund-manager\/notifications$/, route => route.fulfill({ status: 200, json: [make("SB-PAST", "settlement_review", -72, "Sportsbook Bets"), make("SB-PART", "partial_lay_reminder", 2, "Sportsbook Bets"), make("FB-EXP", "free_bet_expiry", 24, "Free Bets"), make("SB-FUT", "settlement_review", 72, "Sportsbook Bets")] }));
        await page.route("**/profiles/profile-demo-001/sportsbook-bets", route => route.fulfill({ status: 200, json: [
          { profile_id: "profile-demo-001", sportsbook_bet_id: "SB-PAST", status: "Placed", result: "Pending", lay_status: "Fully Laid" },
          { profile_id: "profile-demo-001", sportsbook_bet_id: "SB-PART", status: "Placed", result: "Pending", lay_status: "Part Laid", calculated_liability_1: "42.50" },
          { profile_id: "profile-demo-001", sportsbook_bet_id: "SB-FUT", status: "Placed", result: "Pending", lay_status: "Fully Laid" },
        ] }));
        await page.route("**/profiles/profile-demo-001/free-bets", route => route.fulfill({ status: 200, json: [{ profile_id: "profile-demo-001", free_bet_id: "FB-EXP", status: "Available", expiry_datetime: new Date(now + 24 * 3_600_000).toISOString() }] }));
      } else { await page.unroute(/\/fund-manager\/notifications$/); await page.unroute("**/profiles/profile-demo-001/sportsbook-bets"); await page.unroute("**/profiles/profile-demo-001/free-bets"); }
      await page.goto(section === "tasks" ? "/tasks" : "/profiles/profile-demo-001/tracker/sportsbook-bets");
      await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), variant.theme);
      await expect(page.getByRole("heading", { name: section === "tasks" ? "Today" : "Sportsbook Bets", level: 1 })).toBeVisible();
      if (section === "tasks") await expect(page.locator('[data-pd-id="tasks.v2.collection"]')).toBeVisible({ timeout: 45_000 });
      else {
        await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
        await expect(page.locator('[data-pd-id="sportsbook.design-screen"]')).toBeVisible();
        const range = page.locator('[data-pd-id="tracker.range-card.select"]');
        if (!await range.getByText("This Year", { exact: true }).count()) {
          await range.click();
          await page.getByRole("option", { name: "This Year", exact: true }).click();
        }
        await expect(page.locator('td[data-ledger-row]')).not.toHaveCount(0);
      }
      await page.screenshot({ path: `${evidence}/${variant.name}-${section}-real.png`, fullPage: true });
    }
  }
});
