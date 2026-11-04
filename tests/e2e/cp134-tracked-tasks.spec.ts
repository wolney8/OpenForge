import { expect, test } from "@playwright/test";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";

test("CP-134 tracked Today persists through refresh and header navigation", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.goto(authURL);
  await page.goto("/tasks");
  await expect(page.locator('[data-pd-id="tasks.v2.collections"]')).toBeVisible();
  const rows = page.locator('[data-pd-id^="tasks.v2.row."]');
  await expect(rows.first()).toBeVisible();
  await page.locator('[data-pd-id="tasks.v2.filter-toggle"]').click();
  await expect(page.locator('[data-pd-id="tasks.v2.page-size"]')).toHaveValue("8");
  await page.locator('[data-pd-id="tasks.v2.filter-toggle"]').click();
  const pagination = await page.locator('[data-pd-id="tasks.v2.pagination"]').innerText();
  const total = Number(pagination.match(/of (\d+)/)?.[1] ?? 0);
  expect(total).toBeGreaterThan(0);
  await expect(rows).toHaveCount(Math.min(8, total));
  const first = rows.first();
  const id = (await first.getAttribute("data-pd-id"))!.replace("tasks.v2.row.", "");
  await page.locator(`[data-pd-id="tasks.v2.track.${id}"]`).click();
  await expect(page.locator(`[data-pd-id="tasks.v2.track.${id}"]`)).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator(`[data-pd-id="tasks.v2.track.${id}"]`)).toHaveAttribute("aria-pressed", "true");
  const separateContext = await page.context().browser()!.newContext();
  try {
    const newPage = await separateContext.newPage();
    await newPage.goto(authURL);
    await newPage.goto(`${new URL(page.url()).origin}/tasks`);
    await expect(newPage.locator(`[data-pd-id="tasks.v2.track.${id}"]`)).toHaveAttribute("aria-pressed", "true");
  } finally { await separateContext.close(); }
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await expect(page.locator('[data-pd-id="ux-v2.header.tracked-panel"]')).toContainText("Tracked Tasks (1)");
  await page.locator('[data-pd-id="ux-v2.header.tracked-panel"] a[href*="&task="]').click();
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toBeVisible();
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await page.locator('[data-pd-id="ux-v2.header.tracked-view-all"]').click();
  await expect(page).toHaveURL(/collection=tracked/);
  await expect(page.locator('[data-pd-id="tasks.v2.collections"]')).toContainText("Tracked Tasks (1)");
  await expect(page.locator('[data-pd-id^="tasks.v2.row."]')).toHaveCount(1);
  await rows.first().click();
  await expect(page.getByRole("button", { name: "Untrack", exact: true })).toBeVisible();
  await page.locator(`[data-pd-id="tasks.v2.work-state.${id}"]`).click();
  await page.getByRole("option", { name: "Blocked" }).click();
  await page.locator('[data-pd-id="tasks.v2.inspector"] input[aria-label$="blocked reason"]').fill("Awaiting synthetic evidence");
  await page.getByRole("button", { name: "Save Work State" }).click();
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toContainText("Blocked");
  await page.reload();
  await rows.first().click();
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"] input[aria-label$="blocked reason"]')).toHaveValue("Awaiting synthetic evidence");
  await page.locator(`[data-pd-id="tasks.v2.work-state.${id}"]`).click();
  await page.getByRole("option", { name: "Do Later" }).click();
  await page.locator('[data-pd-id="tasks.v2.inspector"] input[type="date"]').fill("2026-11-12");
  const rejectOnce = async (route: import("@playwright/test").Route) => {
    if (route.request().method() === "PATCH") await route.fulfill({ status: 409, json: { detail: "Version conflict" } });
    else await route.continue();
  };
  await page.route(/\/fund-manager\/tasks\/annotations$/, rejectOnce);
  await page.getByRole("button", { name: "Save Work State" }).click();
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"] [role="alert"]')).toContainText("Refresh and retry");
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"] input[type="date"]')).toHaveValue("2026-11-12");
  await page.unroute(/\/fund-manager\/tasks\/annotations$/, rejectOnce);
  await page.getByRole("button", { name: "Save Work State" }).click();
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"] input[type="date"]')).toHaveValue("2026-11-12");
  await page.getByRole("button", { name: "Close Task Details" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => localStorage.setItem("openforge-theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(`[data-pd-id="tasks.v2.track.${id}"]`)).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('[data-pd-id="tasks.v2.row.' + id + '"]').click();
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toContainText("Do Later");
  await page.getByRole("button", { name: "Close Task Details" }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('[data-pd-id="tasks.v2.row.' + id + '"]').click();
  await page.getByRole("button", { name: "Untrack", exact: true }).click();
  await expect(page.locator('[data-pd-id="tasks.v2.collections"]')).toContainText("Tracked Tasks (0)");
});

test("CP-136 saved tracking remains visible when its source occurrence changes", async ({ page }) => {
  await page.goto(authURL);
  await page.goto("/tasks");
  const first = page.locator('[data-pd-id^="tasks.v2.row."]').first();
  await expect(first).toBeVisible();
  const id = (await first.getAttribute("data-pd-id"))!.replace("tasks.v2.row.", "");
  await page.locator(`[data-pd-id="tasks.v2.track.${id}"]`).click();
  await expect(page.locator(`[data-pd-id="tasks.v2.track.${id}"]`)).toHaveAttribute("aria-pressed", "true");
  const changedSource = async (route: import("@playwright/test").Route) => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    const rows = await response.json() as Array<{ occurrence_key: string; source_status: string }>;
    await route.fulfill({ response, json: rows.map(row => row.occurrence_key === id ? { ...row, source_status: "changed" } : row) });
  };
  await page.route(/\/fund-manager\/tasks\/annotations$/, changedSource);
  await page.reload();
  await page.locator('[data-pd-id="tasks.v2.collections"]').getByRole("button", { name: /Tracked Tasks/ }).click();
  await expect(page.locator('[data-pd-id="tasks.v2.collections"]')).toContainText("Tracked Tasks (1)");
  const history = page.locator('[data-pd-id="tasks.v2.tracked-history"]');
  await expect(history).toHaveAttribute("open", "");
  await expect(history).toContainText("Source Changed");
  await page.unroute(/\/fund-manager\/tasks\/annotations$/, changedSource);
  await history.getByRole("button", { name: /Untrack .* from history/ }).click();
});

test("CP-134 page-two tracking and bulk controls affect only the visible page", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  await page.goto(authURL);
  const due = new Date(Date.now() - 3_600_000).toISOString();
  const tasks = Array.from({ length: 20 }, (_, index) => ({
    audience: "fund_manager", security_tag: "fund_manager_only", kind: "task", task_state: "new",
    notification_id: `SYN-TRACK-${index + 1}`, notification_type: "settlement_review",
    title: `Review synthetic record ${index + 1}`, ledger_label: "Sportsbook Bets",
    bookmaker_label: "Bookmaker A", message: "Synthetic source evidence", profile_id: "profile-demo-001",
    profile_name: "Subscriber Alpha", record_id: `SYN-TRACK-${index + 1}`, due_at: due,
    settles_at: "", created_at: due, href: "/profiles/profile-demo-001/tracker/sportsbook-bets",
    completion_href: "", tone: "warning",
  }));
  const saved = new Map<string, Record<string, unknown>>();
  await page.route(/\/fund-manager\/notifications$/, route => route.fulfill({ status: 200, json: tasks }));
  await page.route(/\/fund-manager\/tasks\/annotations$/, async route => {
    if (route.request().method() === "PATCH") {
      const changes = (route.request().postDataJSON() as { changes: Record<string, unknown>[] }).changes;
      for (const change of changes) {
        const id = String(change.occurrence_key);
        saved.set(id, { ...change, source_key: `settlement_review:profile-demo-001:${id}`,
          title: `Review synthetic record ${id.replace("SYN-TRACK-", "")}`,
          profile_name: "Subscriber Alpha",
          source_status: "active", version: Number(saved.get(id)?.version ?? 0) + 1,
          updated_at: new Date().toISOString() });
      }
      await route.fulfill({ status: 200, json: changes.map(change => saved.get(String(change.occurrence_key))) });
    } else await route.fulfill({ status: 200, json: [...saved.values()] });
  });
  await page.goto("/tasks");
  const next = page.getByRole("button", { name: "Next Today page" });
  await expect(next).toBeEnabled();
  await next.click();
  const pageTwoRow = page.locator('[data-pd-id^="tasks.v2.row."]').first();
  const id = (await pageTwoRow.getAttribute("data-pd-id"))!.replace("tasks.v2.row.", "");
  await page.locator(`[data-pd-id="tasks.v2.track.${id}"]`).click();
  await page.getByRole("button", { name: "Previous Today page" }).click();
  await page.locator('[data-pd-id="tasks.v2.bulk-track"]').click();
  await expect(page.locator('[data-pd-id="tasks.v2.collections"]')).toContainText("Tracked Tasks (9)");
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await expect(page.locator('[data-pd-id="ux-v2.header.tracked-panel"] a[href*="&task="]')).toHaveCount(5);
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await page.locator('[data-pd-id="tasks.v2.bulk-track"]').click();
  await expect(page.locator('[data-pd-id="tasks.v2.collections"]')).toContainText("Tracked Tasks (1)");
  await page.reload();
  await next.click();
  await expect(page.locator(`[data-pd-id="tasks.v2.track.${id}"]`)).toHaveAttribute("aria-pressed", "true");
});
