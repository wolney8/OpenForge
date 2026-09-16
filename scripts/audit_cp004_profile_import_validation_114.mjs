// CP-004: verify a mixed Profile workbook with an invalid Account fails before import.
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, expect, request } from "@playwright/test";

const webBase = process.env.OPENFORGE_CP004_WEB_BASE ?? "http://localhost:3010";
const apiBase = process.env.OPENFORGE_CP004_API_BASE ?? "http://127.0.0.1:8010";
const runtime = process.env.OPENFORGE_CP004_RUNTIME ?? "/tmp/openforge-cp003-normal";
const profileId = process.env.OPENFORGE_CP004_PROFILE;
const workbook = process.env.OPENFORGE_CP004_INVALID_WORKBOOK;
assert(profileId, "OPENFORGE_CP004_PROFILE is required");
assert(workbook && fs.existsSync(workbook), "OPENFORGE_CP004_INVALID_WORKBOOK must exist");
const token = fs.readFileSync(`${runtime}/session-token`, "utf8").trim();
const api = await request.newContext({ baseURL: apiBase, extraHTTPHeaders: { Cookie: `pd_session=${token}` } });
const counts = async () => {
  const paths = ["accounts", "sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments"];
  return Object.fromEntries(await Promise.all(paths.map(async (path) => [path, (await (await api.get(`/profiles/${profileId}/${path}`)).json()).length])));
};
const before = await counts();
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await context.addCookies([{ name: "pd_session", value: token, domain: "localhost", path: "/" }]);
  const page = await context.newPage();
  await page.goto(`${webBase}/profiles/${profileId}/tracker/settings`);
  await page.getByRole("tab", { name: "Import/Export" }).click();
  await page.getByLabel("Choose Profile workbook").setInputFiles(workbook);
  await page.getByLabel("Workbook effective date and time").fill("2026-09-16T12:00");
  await page.getByRole("button", { name: "Analyse workbook" }).click();
  await page.waitForURL(/\/imports\/[^/]+\/review/);
  await expect(page.locator("p.error-text").filter({ hasText: "Account row(s) failed field validation" })).toBeVisible();
  await expect(page.getByText("FAILED", { exact: true })).toBeVisible();
  const after = await counts();
  assert.deepEqual(after, before);
  const importRunId = page.url().match(/\/imports\/([^/]+)\/review/)?.[1];
  assert(importRunId);
  const workspace = await (await api.get(`/profiles/${profileId}/workbook-imports/${importRunId}`)).json();
  assert.equal(workspace.run_status, "FAILED");
  assert.equal(workspace.source_summary.readiness.validation_blocked_rows, 1);
  const evidence = { date: new Date().toISOString(), profileId, importRunId, result: "PASS", before, after, error: workspace.source_summary.job.error };
  fs.writeFileSync(`${runtime}/cp004-invalid-profile-import-evidence.json`, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
  await context.close();
} finally {
  await browser.close();
  await api.dispose();
}
