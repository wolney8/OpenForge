// Read-only CP-022 owner-load evidence. Uses normal authentication but never mutates records.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "@playwright/test";

const baseUrl = process.env.OPENFORGE_CP022_WEB ?? "http://localhost:3010";
const tokenPath = process.env.OPENFORGE_CP022_TOKEN ?? "/tmp/openforge-cp022-normal-session-token";
assert(fs.existsSync(tokenPath), "CP-022 normal-owner evidence session is required");
const token = fs.readFileSync(tokenPath, "utf8").trim();
const browser = await chromium.launch({ headless: true });
const samples = [];
const interactionTimings = {};

async function measure(path, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport });
  await context.addCookies([{ name: "pd_session", value: token, domain: "localhost", path: "/" }]);
  const page = await context.newPage();
  const requests = [];
  const starts = new Map();
  page.on("request", (request) => starts.set(request, Date.now()));
  page.on("response", async (response) => {
    const url = new URL(response.url());
    if (!url.pathname.startsWith("/api/") && url.port !== "8010") return;
    const record = {
      bytes: 0,
      milliseconds: Date.now() - (starts.get(response.request()) ?? Date.now()),
      path: url.pathname,
      status: response.status(),
    };
    requests.push(record);
    try { record.bytes = (await response.body()).length; } catch {}
  });
  const started = Date.now();
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const shellMilliseconds = Date.now() - started;
  await page.locator("#combined-analytics-title").waitFor({ timeout: 15_000 });
  const usefulMilliseconds = Date.now() - started;
  await page.locator('[data-pd-id="profiles.visual-summary"]').waitFor({ timeout: 15_000 });
  await page.getByText("Loading combined profile reporting").waitFor({ state: "detached", timeout: 15_000 });
  const settledMilliseconds = Date.now() - started;
  await page.waitForTimeout(150);
  const summaryRequests = requests.filter((request) => request.path.endsWith("/tracker-summary-sources"));
  assert.equal(summaryRequests.length, 3, `${path} must load only the three active Profiles by default`);
  assert(settledMilliseconds < 8_000, `${path} exceeded the bounded local usability budget`);
  const width = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  assert(width.scroll <= width.client + 1, `${path} has page-level horizontal overflow`);
  const result = {
    path,
    shellMilliseconds,
    usefulMilliseconds,
    settledMilliseconds,
    requestCount: requests.length,
    summaryRequestCount: summaryRequests.length,
    responseBytes: requests.reduce((total, request) => total + request.bytes, 0),
  };
  samples.push(result);
  await context.close();
  return result;
}

for (const path of ["/profiles", "/", "/reports"]) {
  await measure(path);
}

{
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: "pd_session", value: token, domain: "localhost", path: "/" }]);
  const page = await context.newPage();
  await page.goto(`${baseUrl}/profiles`);
  await page.locator('[data-pd-id="profiles.visual-summary"]').waitFor();
  const switchStarted = Date.now();
  await page.locator('[data-pd-id^="profiles."][data-pd-id$=".actions.dashboard"]').first().click();
  await page.waitForURL(/\/profiles\/[^/]+\/tracker\/dashboard/);
  await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  interactionTimings.profileSwitchMilliseconds = Date.now() - switchStarted;
  const search = page.locator('[data-pd-id="global-search.input"]');
  const activeProfileName = await page.evaluate(async () => {
    const profiles = await fetch("/api/profiles").then((response) => response.json());
    return profiles.find((profile) => profile.status.toLowerCase() === "active")?.display_name ?? "";
  });
  assert(activeProfileName, "An active Profile is required for the Global Search timing");
  const searchStarted = Date.now();
  await search.fill(activeProfileName);
  await page.locator('[data-pd-id^="global-search.result."]').first().waitFor();
  interactionTimings.globalSearchMilliseconds = Date.now() - searchStarted;
  await context.close();
}

const context = await browser.newContext({
  colorScheme: "dark",
  reducedMotion: "reduce",
  viewport: { width: 390, height: 760 },
});
await context.addCookies([{ name: "pd_session", value: token, domain: "localhost", path: "/" }]);
const page = await context.newPage();
await page.goto(`${baseUrl}/profiles`);
await page.locator("#combined-analytics-title").waitFor();
await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
const warning = page.locator('[data-pd-id="account-money.incomplete"]');
await expectVisible(warning.locator("summary"));
assert.match((await warning.locator("summary").innerText()).replace(/\s+/g, " "), /incomplete for \d+ Accounts/i);
assert.equal(await warning.locator("summary").innerText().then((text) => /account-[a-z0-9-]+/i.test(text)), false);
await warning.locator("summary").focus();
await warning.locator("summary").press("Enter");
assert.equal(await warning.getAttribute("open"), "");
const width = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
assert(width.scroll <= width.client + 1, "grouped Account warning overflows at narrow 200% text");

const search = page.locator('[data-pd-id="global-search.input"]');
await search.fill("no-owner-result-cp022");
await page.getByText("No matching profiles, providers or pages.").waitFor();
await context.close();
await browser.close();

console.log(JSON.stringify({
  result: "PASS",
  samples,
  interactionTimings,
  warning: "grouped-warning-keyboard-narrow-dark-200-percent",
}));

async function expectVisible(locator) {
  await locator.waitFor({ state: "visible", timeout: 15_000 });
}
