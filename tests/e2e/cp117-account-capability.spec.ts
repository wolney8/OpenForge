import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const route = "/profiles/profile-demo-001/tracker/accounts";

test("isolated Account capability entry, correction, summary and reload", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pd-required-storage-notice", "acknowledged");
    localStorage.setItem("openforge-theme", "dark");
  });
  await page.goto(authURL);
  await page.goto(route);
  await expect(page.locator('[data-pd-id="accounts.design-screen"]')).toBeVisible();
  await page.getByRole("button", { name: /Edit Bookmaker A/ }).first().click();
  const editor = page.getByRole("dialog", { name: "Edit account" });
  await expect(editor).toBeVisible();
  const history = editor.locator('[data-pd-id="accounts.capability.history"]');
  await history.locator("summary").click();
  await expect(history.locator('[data-pd-id="accounts.capability.summary"]')).toBeVisible();
  const form = history.locator('[data-pd-id="accounts.capability.form"]');
  await form.getByLabel("Observed state").selectOption("HeavilyRestricted");
  await form.getByLabel("Interpretation").selectOption("confirmed");
  await form.getByLabel("Confidence").selectOption("verified");
  await form.getByLabel("Evidence and context").fill("Synthetic Account access review");
  await form.getByLabel("Observed date precision").selectOption("day");
  await form.getByLabel("Observed date", { exact: true }).fill("2026-11-20");
  await form.getByRole("button", { name: "Record review" }).click();
  await expect(history.getByRole("status")).toHaveText("Observation saved.");
  await expect(history.locator('[data-pd-id="accounts.capability.summary"]')).toContainText("HeavilyRestricted");
  const citation = history.locator('[data-pd-id="accounts.capability.summary"]').getByRole("link", { name: /GeneralSportsbookPromotions.*Observation/ });
  await citation.click();
  const cited = history.locator('[data-pd-id="accounts.capability.timeline"] li:focus');
  await expect(cited).toContainText("Synthetic Account access review");
  await editor.getByRole("button", { name: "Close account editor" }).click();
  await page.reload();
  await page.getByRole("button", { name: /Edit Bookmaker A/ }).first().click();
  const reopened = page.getByRole("dialog", { name: "Edit account" });
  const loaded = reopened.locator('[data-pd-id="accounts.capability.history"]');
  await loaded.locator("summary").click();
  await expect(loaded).toContainText("Synthetic Account access review");
  await loaded.getByRole("button", { name: "Correct this observation" }).first().click();
  const correction = loaded.locator('[data-pd-id="accounts.capability.form"]');
  await correction.getByLabel("Observed state").selectOption("WorkingWithLimits");
  await correction.getByLabel("Reason for correction").fill("Synthetic original assessment was too broad");
  await correction.getByRole("button", { name: "Record review" }).click();
  await expect(loaded.getByRole("status")).toHaveText("Observation saved.");
  await expect(loaded.locator('[data-pd-id="accounts.capability.summary"]')).toContainText("WorkingWithLimits");
  await expect(loaded).toContainText("Synthetic original assessment was too broad");
});

for (const fixture of [
  { name: "BST", exact: "2026-07-20T19:30:42.123456+01:00", local: "2026-07-20T19:30:42.123" },
  { name: "GMT", exact: "2026-11-20T19:30:42.123456+00:00", local: "2026-11-20T19:30:42.123" },
]) {
  test(`note-only correction preserves exact ${fixture.name} timestamp and citation`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
    await page.goto(authURL);
    const suffix = `${fixture.name}-${Date.now().toString(36).toUpperCase()}`;
    const created = await page.request.post("/api/profiles/onboarding", { data: {
      profile_relationship: "Managed subscriber", display_name: "Synthetic exact-time review",
      profile_code: `TIME-${suffix}`, setup_path: "import", tracking_start_date: "2026-09-01",
      management_fee_percent: "0.00", investment_fee_percent: "0.00",
      enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments"],
      accounts: [], quick_actions: [],
    } });
    expect(created.status(), await created.text()).toBe(201);
    const profileId = (await created.json()).profile.profile_id as string;
    const account = await page.request.post(`/api/profiles/${profileId}/accounts`, { data: {
      account: "Bookmaker A", type: "Bookie", status: "Active", lifecycle_status: "Active",
      current_balance: "", channel: "Online", restrictions: [],
    } });
    expect(account.status(), await account.text()).toBe(201);
    const accountId = (await account.json()).account_id as string;
    const endpoint = `/api/profiles/${profileId}/accounts/${accountId}/capability-history`;
    const initial = await page.request.post(endpoint, { data: {
      operation_id: crypto.randomUUID(), expected_revision: 0,
      capability: "LoginAccess", scope_kind: "general", entry_kind: "observation",
      state: "Working", interpretation: "confirmed", confidence: "verified",
      evidence_type: "ManualReview", evidence_note: "Synthetic exact timestamp",
      observed_at: fixture.exact, observed_precision: "exact",
      effective_from: fixture.exact, effective_precision: "exact",
    } });
    expect(initial.status(), await initial.text()).toBe(201);
    await page.goto(`/profiles/${profileId}/tracker/accounts`);
    await page.getByRole("button", { name: /^(Edit|Review attention for) Bookmaker A$/ }).click();
    const history = page.getByRole("dialog", { name: "Edit account" }).locator('[data-pd-id="accounts.capability.history"]');
    await history.locator("summary").click();
    await expect(history.locator('[data-pd-id="accounts.capability.timeline"]')).toContainText("Account added to this Profile.");
    await expect(history.locator('[data-pd-id="accounts.capability.timeline"] time').last()).not.toContainText(/T\d{2}:/);
    await history.locator('[data-pd-id="accounts.capability.summary"]').getByRole("link", { name: /LoginAccess.*Observation/ }).click();
    const evidence = history.locator('[data-pd-id="accounts.capability.timeline"] li:focus');
    await expect(evidence).toContainText("Synthetic exact timestamp");
    await evidence.getByRole("button", { name: "Correct this observation" }).click();
    const form = history.locator('[data-pd-id="accounts.capability.form"]');
    await expect(form.getByLabel("Observed date and time")).toHaveValue(fixture.local);
    await expect(form.getByLabel("Effective date and time")).toHaveValue(fixture.local);
    await form.getByLabel("Evidence and context").fill("Clarified note only");
    await form.getByLabel("Reason for correction").fill("Synthetic note clarification");
    await form.getByRole("button", { name: "Record review" }).click();
    await expect(history.getByRole("status")).toHaveText("Observation saved.");
    const read = await page.request.get(endpoint);
    expect(read.status()).toBe(200);
    const latest = (await read.json()).entries[0];
    expect(latest.observed_at).toBe(fixture.exact);
    expect(latest.effective_from).toBe(fixture.exact);
    const day = fixture.name === "BST" ? "2026-07-20" : "2026-11-20";
    const utcHour = fixture.name === "BST" ? "19" : "20";
    for (const [local, expected] of [
      [`${day}T20:31`, `${day}T${utcHour}:31:00.000Z`],
      [`${day}T20:32:42.1`, `${day}T${utcHour}:32:42.100Z`],
      [`${day}T20:33:42.12`, `${day}T${utcHour}:33:42.120Z`],
      [`${day}T20:34:42.123`, `${day}T${utcHour}:34:42.123Z`],
    ]) {
      const correctionRow = history.locator('[data-pd-id="accounts.capability.timeline"] li').first();
      await correctionRow.getByRole("button", { name: "Correct this observation" }).click();
      await form.getByLabel("Observed date and time").fill(local);
      await form.getByLabel("Reason for correction").fill("Synthetic time correction");
      await form.getByRole("button", { name: "Record review" }).click();
      await expect(history.getByRole("status")).toHaveText("Observation saved.");
      const changed = (await (await page.request.get(endpoint)).json()).entries[0];
      expect(changed.observed_at).toBe(expected);
      expect(changed.effective_from).toBe(fixture.exact);
    }
    if (fixture.name === "BST") {
      const before = (await (await page.request.get(endpoint)).json()).summary.revision;
      await history.locator('[data-pd-id="accounts.capability.timeline"] li').first().getByRole("button", { name: "Correct this observation" }).click();
      await form.getByLabel("Observed date and time").fill("2026-03-29T01:30");
      await form.getByLabel("Reason for correction").fill("Synthetic nonexistent time check");
      await form.getByRole("button", { name: "Record review" }).click();
      await expect(history.getByRole("alert")).toContainText("does not exist in Europe/London");
      await expect(form.getByLabel("Observed date and time")).toHaveValue("2026-03-29T01:30");
      expect((await (await page.request.get(endpoint)).json()).summary.revision).toBe(before);
    }
  });
}

test("Account timeline distinguishes unavailable commission from recorded zero", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  await page.route("**/capability-history", async route => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    const body = await response.json();
    body.account_audit = [null, "", "   ", "0", "0.025"].map((rate, index) => ({
      audit_id: `SYNTHETIC-COMMISSION-${index}`,
      action: "updated",
      changed_at: `2026-11-${String(index + 10).padStart(2, "0")}T12:00:00Z`,
      payload_json: JSON.stringify({ commission_rate: rate }),
    }));
    await route.fulfill({ response, json: body });
  });
  await page.goto(route);
  await page.getByRole("button", { name: /Edit Bookmaker A/ }).first().click();
  const history = page.getByRole("dialog", { name: "Edit account" }).locator('[data-pd-id="accounts.capability.history"]');
  await history.locator("summary").click();
  const auditRows = history.locator('[data-pd-id="accounts.capability.timeline"] li:has(time)');
  await expect(auditRows).toHaveCount(5);
  for (const index of [0, 1, 2]) await expect(auditRows.nth(index)).toContainText("Base commission recorded as unavailable.");
  await expect(auditRows.nth(3)).toContainText("Base commission set to 0.00%.");
  await expect(auditRows.nth(4)).toContainText("Base commission set to 2.50%.");
});

test("isolated Account capability failed write retains the draft for retry", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  await page.goto(route);
  await page.getByRole("button", { name: /Edit Bookmaker A/ }).first().click();
  const history = page.getByRole("dialog", { name: "Edit account" }).locator('[data-pd-id="accounts.capability.history"]');
  await history.locator("summary").click();
  const form = history.locator('[data-pd-id="accounts.capability.form"]');
  await form.getByLabel("Evidence and context").fill("Synthetic retry evidence retained");
  let failed = false;
  await page.route("**/capability-history", async request => {
    if (request.request().method() === "POST" && !failed) {
      failed = true;
      await request.abort("failed");
    } else await request.continue();
  });
  await form.getByRole("button", { name: "Record review" }).click();
  await expect(history.getByRole("alert")).toContainText("Failed to fetch");
  await expect(form.getByLabel("Evidence and context")).toHaveValue("Synthetic retry evidence retained");
  await form.getByRole("button", { name: "Record review" }).click();
  await expect(history.getByRole("status")).toHaveText("Observation saved.");
  await expect(history.locator('[data-pd-id="accounts.capability.timeline"]')).toContainText("Synthetic retry evidence retained");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("isolated Account capability UI history survives portable export and restore", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  const suffix = Date.now().toString(36).toUpperCase();
  const created = await page.request.post("/api/profiles/onboarding", { data: {
    profile_relationship: "Managed subscriber", display_name: "Synthetic capability source",
    profile_code: `CAP-${suffix}`, setup_path: "import", tracking_start_date: "2026-09-01",
    management_fee_percent: "0.00", investment_fee_percent: "0.00",
    enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments"],
    accounts: [], quick_actions: [],
  } });
  expect(created.status(), await created.text()).toBe(201);
  const profileId = (await created.json()).profile.profile_id as string;
  const account = await page.request.post(`/api/profiles/${profileId}/accounts`, { data: {
    account: "Bookmaker A", type: "Bookie", status: "Active", lifecycle_status: "Active",
    current_balance: "", channel: "Online", restrictions: [],
  } });
  expect(account.status(), await account.text()).toBe(201);
  await page.goto(`/profiles/${profileId}/tracker/accounts`);
  await page.getByRole("button", { name: /^(Edit|Review attention for) Bookmaker A$/ }).click();
  const editor = page.getByRole("dialog", { name: "Edit account" });
  const history = editor.locator('[data-pd-id="accounts.capability.history"]');
  await history.locator("summary").click();
  await history.getByLabel("Evidence and context").fill("Synthetic portable capability evidence");
  await history.getByRole("button", { name: "Record review" }).click();
  await expect(history.getByRole("status")).toHaveText("Observation saved.");
  await editor.getByRole("button", { name: "Close account editor" }).click();
  await page.goto(`/profiles/${profileId}/tracker/settings#import-export`);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator('[data-pd-id="profile-portable-export.generate"]').click(),
  ]);
  const backup = await readFile(await download.path() as string);
  await page.goto("/profiles/restore");
  await page.getByLabel("Portable backup").setInputFiles({
    buffer: backup, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    name: download.suggestedFilename(),
  });
  await page.getByLabel("New Profile code").fill(`REST-${suffix}`);
  await page.locator('[data-pd-id="portable-profile-restore.analyse"]').click();
  await expect(page.locator('[data-pd-id="portable-profile-restore.ready"]')).toBeVisible();
  await page.getByLabel("I confirm this backup should create a fresh Profile.").check();
  await page.locator('[data-pd-id="portable-profile-restore.execute"]').click();
  const complete = page.locator('[data-pd-id="portable-profile-restore.complete"]');
  await expect(complete).toBeVisible();
  const restoredHref = await complete.getByRole("link", { name: "View restored Profile" }).getAttribute("href");
  const restoredProfile = restoredHref?.match(/\/profiles\/([^/]+)/)?.[1];
  expect(restoredProfile).toBeTruthy();
  await page.goto(`/profiles/${restoredProfile}/tracker/accounts`);
  await page.getByRole("button", { name: /^(Edit|Review attention for) Bookmaker A$/ }).click();
  const restoredHistory = page.getByRole("dialog", { name: "Edit account" }).locator('[data-pd-id="accounts.capability.history"]');
  await restoredHistory.locator("summary").click();
  await expect(restoredHistory).toContainText("Synthetic portable capability evidence");
});
