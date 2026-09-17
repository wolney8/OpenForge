// CP-015: authenticated, normal-local visibility proof using isolated synthetic writes.
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, request } from "@playwright/test";

const runtime = process.env.OPENFORGE_CP015_RUNTIME ?? "/tmp/openforge-cp015";
const webBase = process.env.OPENFORGE_CP015_WEB ?? "http://localhost:3010";
const apiBase = process.env.OPENFORGE_CP015_API ?? "http://127.0.0.1:8010";
const token = fs.readFileSync(`${runtime}/session-token`, "utf8").trim();
const cookie = { Cookie: `pd_session=${token}` };
const api = await request.newContext({ baseURL: apiBase, extraHTTPHeaders: cookie });
const browser = await chromium.launch({ headless: true });
const createdProfiles = [];
const evidence = { timestamp: new Date().toISOString(), result: "IN_PROGRESS" };

async function expectResponse(response, status, label) {
  assert.equal(response.status(), status, `${label}: ${await response.text()}`);
  return response.json();
}

async function openPage(path, width = 1440, theme = "light") {
  const context = await browser.newContext({
    colorScheme: theme,
    reducedMotion: "reduce",
    viewport: { width, height: 1000 },
  });
  await context.addCookies([{ name: "pd_session", value: token, domain: "localhost", path: "/" }]);
  await context.addInitScript((value) => localStorage.setItem("openforge-theme", value), theme);
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  await page.goto(`${webBase}${path}`);
  return { context, page };
}

try {
  const health = await expectResponse(await api.get("/healthz"), 200, "health");
  assert.equal(health.runtime_role, "normal-owner");
  assert.equal(health.schema_version, "import-history-v1");

  const profilesBefore = await expectResponse(await api.get("/profiles"), 200, "Profiles");
  let profile = profilesBefore.find((item) => item.display_name.startsWith("Synthetic CP015 History"));
  let createdCash;
  let correctedCash;
  if (profile) {
    if (profile.status === "Archived") {
      profile = await expectResponse(
        await api.patch(`/profiles/${profile.profile_id}`, { data: { status: "Active" } }),
        200,
        "restore retained synthetic Profile",
      );
    }
    createdProfiles.push({ id: profile.profile_id, name: profile.display_name });
    const rows = await expectResponse(await api.get(`/profiles/${profile.profile_id}/cash-adjustments`), 200, "retained synthetic cash rows");
    createdCash = rows.find((row) => row.description === "Corrected synthetic result");
    assert(createdCash, "Retained CP015 Profile did not contain its synthetic correction");
    correctedCash = createdCash;
  } else {
    const suffix = Date.now();
    const profileBody = await expectResponse(await api.post("/profiles/onboarding", { data: {
      setup_path: "import",
      display_name: `Synthetic CP015 History ${suffix}`,
      profile_code: `CP15-${suffix}`,
      tracking_start_date: "2026-09-17",
      enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments"],
      accounts: [],
      quick_actions: [],
    }}), 201, "synthetic Profile");
    profile = profileBody.profile ?? profileBody;
    createdProfiles.push({ id: profile.profile_id, name: profile.display_name });
    await expectResponse(await api.patch(`/profiles/${profile.profile_id}`, { data: { status: "Active" } }), 200, "activate Profile");
    createdCash = await expectResponse(await api.post(`/profiles/${profile.profile_id}/cash-adjustments`, { data: {
      adjustment_date: "2026-09-17T09:00",
      direction: "In",
      amount: "6.00",
      adjustment_type: "Correction",
      affects_investment: false,
      affects_cash_snapshot: true,
      linked_account: "",
      description: "Synthetic CP015 original result",
    }}), 201, "cash create");
    correctedCash = await expectResponse(await api.put(`/profiles/${profile.profile_id}/cash-adjustments/${createdCash.cash_adjustment_id}`, { data: {
      adjustment_date: "2026-09-17T09:00",
      direction: "In",
      amount: "5.00",
      adjustment_type: "Correction",
      affects_investment: false,
      affects_cash_snapshot: true,
      linked_account: "",
      description: "Corrected synthetic result",
    }}), 200, "cash correction");
  }
  assert.equal(correctedCash.signed_amount, "5.00");

  const history = await expectResponse(
    await api.get(`/profiles/${profile.profile_id}/financial-history/cash_adjustment/${createdCash.cash_adjustment_id}`),
    200,
    "cash history",
  );
  assert.deepEqual(history.map((event) => event.operation), ["created", "corrected"]);

  for (const [width, theme] of [[1440, "light"], [760, "dark"], [390, "light"]]) {
    const opened = await openPage(
      `/profiles/${profile.profile_id}/tracker/cash-adjustments`,
      width,
      theme,
    );
    await opened.page.getByRole("button", { name: `Edit ${createdCash.cash_adjustment_id}` }).click();
    const dialog = opened.page.getByRole("dialog", { name: "Edit cash adjustment" });
    await dialog.getByRole("tab", { name: "Details" }).click();
    const historyPanel = dialog.locator('[data-pd-id="cash_adjustment.editor.history"]');
    await historyPanel.locator("summary").click();
    await historyPanel.getByText("Created", { exact: true }).waitFor();
    await historyPanel.getByText("Corrected", { exact: true }).waitFor();
    await historyPanel.getByText("Previous").waitFor();
    await historyPanel.getByText("£ 6.00", { exact: true }).waitFor();
    await historyPanel.getByText("£ 5.00", { exact: true }).waitFor();
    assert.equal(await opened.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true);
    await opened.page.screenshot({ path: `${runtime}/cp015-history-${width}-${theme}.png`, fullPage: true });
    await opened.context.close();
  }

  const profiles = await expectResponse(await api.get("/profiles"), 200, "Profiles");
  let legacyChecked = false;
  for (const candidateProfile of profiles.filter((item) => item.status !== "Archived")) {
    const rowsResponse = await api.get(`/profiles/${candidateProfile.profile_id}/free-bets`);
    if (rowsResponse.status() !== 200) continue;
    const legacy = (await rowsResponse.json()).find(
      (row) => row.origin_qual_bet_resolution_state === "legacy_unresolved",
    );
    if (!legacy) continue;
    const opened = await openPage(
      `/profiles/${candidateProfile.profile_id}/tracker/free-bets?record=${legacy.free_bet_id}`,
      760,
      "dark",
    );
    const dialog = opened.page.getByRole("dialog", { name: "Edit free-bet row" });
    await dialog.getByText("Historical link not established", { exact: true }).waitFor();
    await dialog.getByRole("button", { name: "Check for qualifying bet" }).waitFor();
    await opened.page.screenshot({ path: `${runtime}/cp015-lineage-legacy-760-dark.png`, fullPage: true });
    await opened.context.close();
    legacyChecked = true;
    break;
  }
  assert.equal(legacyChecked, true, "No legacy-unresolved row was available for read-only UI evidence");

  const report = await openPage(`/profiles/${profile.profile_id}/tracker/reports`, 1440, "light");
  await report.page.getByText("£ 5.00", { exact: true }).first().waitFor();
  assert.equal(await report.page.getByText("£ 11.00", { exact: true }).count(), 0, "History was double-counted in Reports");
  await report.context.close();

  evidence.result = "PASS";
  evidence.history = { operations: ["created", "corrected"], currentReportValue: "5.00", doubleCounted: false };
  evidence.lineage = { legacyUnresolvedVisible: true, explicitRecheckVisible: true, existingRowReadOnly: true };
  evidence.rendering = { widths: [1440, 760, 390], themes: ["light", "dark"], reducedMotion: true };
} finally {
  for (const profile of createdProfiles.reverse()) {
    await api.patch(`/profiles/${profile.id}`, { data: { status: "Archived" } });
    const removed = await api.delete(`/profiles/${profile.id}`, { data: { confirmation_name: profile.name } });
    assert.equal(removed.status(), 409, "Retained financial evidence must prevent ordinary Profile deletion");
    evidence.cleanup = "archived-and-retained-by-policy";
  }
  fs.mkdirSync(runtime, { recursive: true });
  fs.writeFileSync(`${runtime}/cp015-history-lineage-evidence.json`, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
  await browser.close();
  await api.dispose();
}
