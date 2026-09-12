#!/usr/bin/env node
// Reuse the protected candidate, existing synthetic fixture and browser. Never reseed/reset.
import { chromium } from "@playwright/test";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync, openSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const baseline = resolve(root, ".worktrees/manual-calculator-baseline");
const expected = "f7a3b35073ecc87cdf8f8f881129f221ec44d395";
const owner = "notification-acceptance@example.invalid";
const secret = "synthetic-notification-acceptance-secret-not-used-in-production";
const shell = (command, args) => execFileSync(command, args, { encoding: "utf8" }).trim();
const listener = (port) => {
  try { return shell("lsof", ["-t", `-iTCP:${port}`, "-sTCP:LISTEN"]).split("\n")[0]; }
  catch { return null; }
};
const healthy = async (url) => { try {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  return response.ok || (url.endsWith(":8020/health") && response.status === 401);
} catch { return false; } };
const wait = async (url) => {
  for (let attempt = 0; attempt < 90; attempt++) {
    if (await healthy(url)) return;
    await new Promise((done) => setTimeout(done, 1000));
  }
  throw new Error(`Service did not become healthy: ${url}. Existing processes were not stopped.`);
};

if (shell("git", ["-C", baseline, "rev-parse", "HEAD"]) !== expected)
  throw new Error("Protected manual baseline is not f7a3b35; refusing to launch another revision.");
const changed = shell("git", ["-C", baseline, "diff", "--name-only", "HEAD"]).split("\n")
  .filter((path) => path && path !== "apps/web/next-env.d.ts");
if (changed.length) throw new Error("Protected baseline has tracked edits; refusing a non-reproducible launch.");

const apiPid = listener(8020);
const command = apiPid ? shell("ps", ["-p", apiPid, "-o", "command="]) : "";
const activeRuntime = command.match(/--runtime-directory\s+(\S+)/)?.[1];
const candidates = readdirSync("/tmp").filter((name) => name.startsWith("openforge-manual-f7a3b35."))
  .map((name) => resolve("/tmp", name, "runtime"))
  .filter((path) => existsSync(resolve(path, "acceptance.sqlite3")) && existsSync(resolve(path, "session-token")));
const runtime = activeRuntime ?? (candidates.length === 1 ? candidates[0] : undefined);
if (!runtime || !candidates.includes(runtime)) throw new Error("Cannot identify the existing synthetic manual runtime; no data was created or reset.");
const env = { ...process.env, OPENFORGE_AUTH_REQUIRED: "true", OPENFORGE_AUTH_OWNER_EMAILS: owner,
  OPENFORGE_AUTH_SESSION_SECRET: secret, OPENFORGE_DATABASE_MODE: "local",
  OPENFORGE_DATABASE_URL: `sqlite:///${resolve(runtime, "acceptance.sqlite3")}`,
  OPENFORGE_INTERNAL_API_BASE_URL: "http://127.0.0.1:8020" };
const start = (executable, args, cwd, log) => {
  const fd = openSync(resolve(runtime, log), "a", 0o600);
  const child = spawn(executable, args, { cwd, env, detached: true, stdio: ["ignore", fd, fd] });
  child.unref();
};
if (!apiPid) start(resolve(baseline, "scripts/run-python.sh"), ["-m", "uvicorn", "openforge_api.main:app", "--app-dir", "apps/api/src", "--host", "127.0.0.1", "--port", "8020"], baseline, "api.log");
else if (!activeRuntime && !(command.includes("uvicorn openforge_api.main:app") &&
  shell("lsof", ["-a", "-p", apiPid, "-d", "cwd", "-Fn"]).includes(`n${baseline}`)))
  throw new Error("8020 belongs to an unrecognised process; refusing to replace it.");
await wait("http://127.0.0.1:8020/health");
const webPid = listener(3020);
if (webPid && !shell("lsof", ["-a", "-p", webPid, "-d", "cwd", "-Fn"]).includes(`n${baseline}/apps/web`))
  throw new Error("3020 belongs to another worktree; refusing to change the running manual build.");
if (!listener(3020)) start(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "--port", "3020"], resolve(baseline, "apps/web"), "web.log");
await wait("http://localhost:3020/login");

let token = readFileSync(resolve(runtime, "session-token"), "utf8").trim();
const authority = await fetch("http://127.0.0.1:8020/auth/session", { headers: { Cookie: `pd_session=${token}` } });
if (authority.status === 401) {
  // Existing fixture owner only. Reissue via the existing session API implementation; retain DB.
  token = execFileSync(resolve(baseline, "scripts/run-python.sh"), ["-c",
    `import sys; sys.path.insert(0,'apps/api/src'); from openforge_api.auth import create_session_token; print(create_session_token(subject='synthetic-notification-acceptance',email='${owner}',name='Synthetic Fund Manager'))`],
    { cwd: baseline, env, encoding: "utf8" }).trim();
  writeFileSync(resolve(runtime, "session-token"), token, { mode: 0o600 });
} else if (!authority.ok) throw new Error("Session authority unavailable; refusing to reset or replace state.");
const validated = await fetch("http://127.0.0.1:8020/auth/session", { headers: { Cookie: `pd_session=${token}` } });
if (!validated.ok || (await validated.json()).role !== "fund_manager")
  throw new Error("Synthetic Fund Manager authority was not validated; no browser was opened.");

if (process.argv.includes("--check")) {
  console.log(`Manual baseline ${expected}; existing data retained at ${runtime}; web 3020 / API 8020 healthy.`);
  process.exit(0);
}
let context;
if (await healthy("http://127.0.0.1:9220/json/version")) {
  const browserPid = listener(9220);
  if (!browserPid || !shell("ps", ["-p", browserPid, "-o", "command="]).includes(resolve(runtime, "manual-browser")))
    throw new Error("9220 belongs to another browser; refusing to reuse or terminate it.");
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9220");
  context = browser.contexts()[0];
  await context.addCookies([{ name: "pd_session", value: token, url: "http://localhost:3020" }]);
  const existing = context.pages().find((page) => page.url().startsWith("http://localhost:3020/fund-manager/calculators"));
  if (existing) await existing.bringToFront();
  else { const page = await context.newPage(); await page.goto("http://localhost:3020/fund-manager/calculators"); }
  // Disconnect this launcher, not the existing manual browser or its session.
  process.exit(0);
}
context = await chromium.launchPersistentContext(resolve(runtime, "manual-browser"), { headless: false,
  viewport: null, args: ["--remote-debugging-address=127.0.0.1", "--remote-debugging-port=9220"] });
await context.addCookies([{ name: "pd_session", value: token, url: "http://localhost:3020" }]);
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3020/fund-manager/calculators");
console.log("Authenticated manual calculator opened on 3020; API/data on 8020. No seed/reset or baseline change.");
await new Promise((done) => context.on("close", done));
